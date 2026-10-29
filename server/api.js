// ORBIT BREAKER ranking API (Cloudflare Pages Functions + D1)
// Server owns the sortie count (max 3 per student id — contest rule: up to 3 plays, best score ranks) and the best score; the client only reports results.
const MAX_SORTIE = 3, MAX_SCORE = 3000000;
const J = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const bad = (msg, status = 400) => J({ error: msg }, status);
const clean = (v, n) => String(v == null ? "" : v).replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, n);
const validSid = (s) => /^\d{8,10}$/.test(s);
const mask = (s) => s.length > 4 ? s.slice(0, 4) + "*".repeat(s.length - 6) + s.slice(-2) : s;

async function board(DB, sid) {
  const { results } = await DB.prepare("SELECT sid,name,dept,best,unit,frame FROM players WHERE best>0 ORDER BY best DESC, best_at ASC LIMIT 100").all();
  const total = (await DB.prepare("SELECT COUNT(*) AS n FROM players WHERE best>0").first()).n;
  let me = null;
  if (sid && validSid(sid)) {
    const p = await DB.prepare("SELECT best,best_at FROM players WHERE sid=?").bind(sid).first();
    if (p && p.best > 0) {
      const ahead = (await DB.prepare("SELECT COUNT(*) AS n FROM players WHERE best>? OR (best=? AND best_at<?)").bind(p.best, p.best, p.best_at || "").first()).n;
      me = { rank: ahead + 1, best: p.best };
    }
  }
  return { rows: results.map((r) => ({ name: r.name, dept: r.dept, best: r.best, unit: r.unit, frame: r.frame, sidm: mask(r.sid), me: r.sid === sid })), total, me };
}

export async function onRequest({ request, env, params }) {
  const DB = env.DB;
  if (!DB) return bad("DB binding missing", 500);
  const route = (params.route || []).join("/");
  const url = new URL(request.url);
  try {
    if (request.method === "GET" && route === "board") return J(await board(DB, url.searchParams.get("sid")));
    if (request.method === "GET" && route === "player") {
      const sid = url.searchParams.get("sid") || "";
      if (!validSid(sid)) return bad("학번 형식 오류");
      const p = await DB.prepare("SELECT name,dept,best,attempts,unit,frame,kills,chain,combo FROM players WHERE sid=?").bind(sid).first();
      return J(p ? { exists: true, sid, ...p } : { exists: false });
    }
    if (route.startsWith("duel")) return duel(DB, request, route, url);
    if (route.startsWith("admin/")) return admin(DB, env, request, route, url);
    if (request.method !== "POST") return bad("not found", 404);
    const body = await request.json().catch(() => ({}));

    if (route === "start") {
      const sid = clean(body.sid, 10), name = clean(body.name, 12), dept = clean(body.dept, 24);
      if (!validSid(sid) || !name || !dept) return bad("이름·학과·학번을 확인하세요.");
      if (await isClosed(DB)) return bad("대회가 마감되어 더 이상 출격 기록을 받지 않습니다.", 403);
      const now = new Date().toISOString();
      let p = await DB.prepare("SELECT name,attempts FROM players WHERE sid=?").bind(sid).first();
      if (p && p.name !== name) return bad(`이 학번은 '${p.name}' 이름으로 등록돼 있습니다.`, 409);
      if (!p) { await DB.prepare("INSERT INTO players(sid,name,dept,created_at) VALUES(?,?,?,?)").bind(sid, name, dept, now).run(); p = { attempts: 0 }; }
      // atomic: only increments while attempts < MAX
      const r = await DB.prepare("UPDATE players SET attempts=attempts+1, dept=? WHERE sid=? AND attempts<?").bind(dept, sid, MAX_SORTIE).run();
      if (!r.meta.changes) return bad("이 학번은 출격 3회를 모두 사용했습니다.", 403);
      const id = crypto.randomUUID();
      await DB.prepare("INSERT INTO runs(id,sid,started,unit,frame) VALUES(?,?,?,?,?)").bind(id, sid, Date.now(), clean(body.unit, 12), clean(body.frame, 12)).run();
      const q = await DB.prepare("SELECT attempts,best FROM players WHERE sid=?").bind(sid).first();
      return J({ runId: id, attempts: q.attempts, best: q.best });
    }

    if (route === "finish") {
      const id = clean(body.runId, 40);
      const run = await DB.prepare("SELECT sid,started,finished,unit,frame FROM runs WHERE id=?").bind(id).first();
      if (!run) return bad("unknown run", 404);
      if (run.finished) return bad("already finished", 409);
      const score = Math.max(0, Math.min(MAX_SCORE, Math.floor(Number(body.score) || 0)));
      const elapsed = (Date.now() - run.started) / 1000;
      // a run lasts at most ~2 min (+ cutscene, pauses); flag impossible results instead of trusting them
      const ok = elapsed >= 3 && !(score > 0 && elapsed < 6);
      await DB.prepare("UPDATE runs SET finished=?, score=? WHERE id=? AND finished=0").bind(Date.now(), ok ? score : -score, id).run();
      if (ok) {
        await DB.prepare("UPDATE players SET best=?, kills=?, chain=?, combo=?, unit=?, frame=?, best_at=? WHERE sid=? AND best<?")
          .bind(score, Math.floor(body.kills || 0), Math.floor(body.chain || 0), Math.floor(body.combo || 0), run.unit, run.frame, new Date().toISOString(), run.sid, score).run();
      }
      const p = await DB.prepare("SELECT best,attempts FROM players WHERE sid=?").bind(run.sid).first();
      const b = await board(DB, run.sid);
      return J({ best: p.best, attempts: p.attempts, accepted: ok, ...b });
    }
    return bad("not found", 404);
  } catch (e) {
    return bad("server error: " + (e && e.message), 500);
  }
}

/* ---- 1:1 showdown: two PCs, same 120s rules, live score exchange (not ranked, no sortie used) ---- */
let duelReady = false;
async function duel(DB, request, route, url) {
  if (!duelReady) {
    await DB.prepare("CREATE TABLE IF NOT EXISTS duels(code TEXT PRIMARY KEY, a_name TEXT, b_name TEXT, a_score INTEGER DEFAULT 0, b_score INTEGER DEFAULT 0, a_state TEXT DEFAULT 'wait', b_state TEXT DEFAULT 'wait', a_seen INTEGER, b_seen INTEGER, start_at INTEGER, created INTEGER)").run();
    duelReady = true;
  }
  const now = Date.now();
  const view = (r) => r ? { code: r.code, a: { name: r.a_name, score: r.a_score, state: r.a_state, seen: r.a_seen }, b: { name: r.b_name, score: r.b_score, state: r.b_state, seen: r.b_seen }, startAt: r.start_at, now } : null;
  const get = (code) => DB.prepare("SELECT * FROM duels WHERE code=?").bind(code).first();
  if (request.method === "GET" && route === "duel/state") {
    const r = await get(clean(url.searchParams.get("code"), 4));
    return r ? J(view(r)) : bad("방을 찾을 수 없습니다.", 404);
  }
  const body = await request.json().catch(() => ({}));
  if (route === "duel/create") {
    const name = clean(body.name, 12);
    if (!name) return bad("이름을 입력하세요.");
    await DB.prepare("DELETE FROM duels WHERE created<?").bind(now - 3 * 3600e3).run();
    for (let i = 0; i < 8; i++) {
      const code = String(1000 + Math.floor(Math.random() * 9000));
      const r = await DB.prepare("INSERT OR IGNORE INTO duels(code,a_name,a_seen,created) VALUES(?,?,?,?)").bind(code, name, now, now).run();
      if (r.meta.changes) return J({ side: "a", ...view(await get(code)) });
    }
    return bad("방을 만들지 못했습니다. 다시 시도하세요.", 503);
  }
  if (route === "duel/join") {
    const code = clean(body.code, 4), name = clean(body.name, 12);
    if (!name) return bad("이름을 입력하세요.");
    const r = await get(code);
    if (!r || now - r.created > 30 * 60e3) return bad("방 번호를 확인하세요.", 404);
    if (r.b_name) return bad("이미 두 명이 들어간 방입니다.", 409);
    await DB.prepare("UPDATE duels SET b_name=?, b_seen=?, start_at=? WHERE code=? AND b_name IS NULL").bind(name, now, now + 10000, code).run();
    return J({ side: "b", ...view(await get(code)) });
  }
  if (route === "duel/push") {
    const code = clean(body.code, 4), side = body.side === "b" ? "b" : "a";
    const st = ["play", "done", "lost", "left"].includes(body.state) ? body.state : "play";
    const score = Math.max(0, Math.min(MAX_SCORE, Math.floor(Number(body.score) || 0)));
    await DB.prepare(`UPDATE duels SET ${side}_score=?, ${side}_state=?, ${side}_seen=? WHERE code=?`).bind(score, st, now, code).run();
    const r = await get(code);
    return r ? J(view(r)) : bad("방을 찾을 수 없습니다.", 404);
  }
  return bad("not found", 404);
}

/* ---- admin (/admin page): roster, per-player run history, deletes with backup, reset, close the event ----
   Auth: header x-admin-key must equal the ADMIN_KEY secret (set at deploy time, never in this public repo).
   Every destructive action first writes the rows it removes to admin_backup, so it can be restored. */
const adminReady = new WeakSet();
async function adminInit(DB) {
  if (adminReady.has(DB)) return;
  await DB.batch([
    DB.prepare("CREATE TABLE IF NOT EXISTS settings(k TEXT PRIMARY KEY, v TEXT)"),
    DB.prepare("CREATE TABLE IF NOT EXISTS admin_backup(id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT NOT NULL, kind TEXT NOT NULL, label TEXT, payload TEXT NOT NULL, restored INTEGER DEFAULT 0)"),
  ]);
  adminReady.add(DB);
}
async function isClosed(DB) {
  await adminInit(DB);
  const r = await DB.prepare("SELECT v FROM settings WHERE k='closed'").first();
  return !!(r && r.v === "1");
}
async function sameKey(a, b) {
  const enc = new TextEncoder();
  const [x, y] = await Promise.all([crypto.subtle.digest("SHA-256", enc.encode(a)), crypto.subtle.digest("SHA-256", enc.encode(b))]);
  const u = new Uint8Array(x), v = new Uint8Array(y);let d = 0;
  for (let i = 0; i < u.length; i++) d |= u[i] ^ v[i];
  return d === 0;
}
// best score for a player, recomputed from the runs that are left (flagged runs are stored negative and never count)
async function recomputeBest(DB, sid) {
  const top = await DB.prepare("SELECT score,finished FROM runs WHERE sid=? AND finished>0 AND score>0 ORDER BY score DESC, finished ASC LIMIT 1").bind(sid).first();
  const p = await DB.prepare("SELECT best FROM players WHERE sid=?").bind(sid).first();
  if (!p) return;
  const best = top ? top.score : 0;
  if (best === p.best) return;
  // kills/chain/combo were stored for the old best run only; clear them when the best changes
  await DB.prepare("UPDATE players SET best=?, best_at=?, kills=0, chain=0, combo=0 WHERE sid=?").bind(best, top ? new Date(top.finished).toISOString() : null, sid).run();
}
async function backup(DB, kind, label, payload) {
  await DB.prepare("INSERT INTO admin_backup(at,kind,label,payload) VALUES(?,?,?,?)").bind(new Date().toISOString(), kind, label, JSON.stringify(payload)).run();
}
const PCOLS = ["sid", "name", "dept", "best", "attempts", "kills", "chain", "combo", "unit", "frame", "best_at", "created_at"];
const RCOLS = ["id", "sid", "started", "finished", "score", "unit", "frame"];

async function admin(DB, env, request, route, url) {
  if (!env.ADMIN_KEY) return bad("관리자 비밀번호(ADMIN_KEY)가 아직 설정되지 않았습니다.", 503);
  const key = request.headers.get("x-admin-key") || "";
  if (!key || !(await sameKey(key, env.ADMIN_KEY))) {
    await new Promise((r) => setTimeout(r, 900)); // slow down guessing
    return bad("비밀번호가 맞지 않습니다.", 401);
  }
  await adminInit(DB);
  const GET = request.method === "GET";
  const body = GET ? {} : await request.json().catch(() => ({}));
  const sid = clean(GET ? url.searchParams.get("sid") : body.sid, 10);

  if (GET && route === "admin/overview") {
    const { results: players } = await DB.prepare(
      "SELECT p.*, (SELECT COUNT(*) FROM runs r WHERE r.sid=p.sid) AS runs, (SELECT COUNT(*) FROM runs r WHERE r.sid=p.sid AND r.score<0) AS flagged, (SELECT MAX(started) FROM runs r WHERE r.sid=p.sid) AS last_play FROM players p ORDER BY p.best DESC, p.best_at ASC, p.created_at ASC").all();
    const runs = (await DB.prepare("SELECT COUNT(*) AS n, SUM(CASE WHEN score<0 THEN 1 ELSE 0 END) AS f, SUM(CASE WHEN finished=0 THEN 1 ELSE 0 END) AS u FROM runs").first()) || {};
    let rank = 0;
    for (const p of players) p.rank = p.best > 0 ? ++rank : null;
    return J({ players, stats: { players: players.length, ranked: rank, runs: runs.n || 0, flagged: runs.f || 0, unfinished: runs.u || 0 }, closed: await isClosed(DB), maxSortie: MAX_SORTIE });
  }
  if (GET && route === "admin/runs") {
    const { results } = sid
      ? await DB.prepare("SELECT * FROM runs WHERE sid=? ORDER BY started ASC").bind(sid).all()
      : await DB.prepare("SELECT r.*, p.name, p.dept FROM runs r LEFT JOIN players p ON p.sid=r.sid ORDER BY r.started ASC").all();
    return J({ runs: results });
  }
  if (GET && route === "admin/backups") {
    const { results } = await DB.prepare("SELECT id,at,kind,label,restored,length(payload) AS size FROM admin_backup ORDER BY id DESC LIMIT 100").all();
    return J({ backups: results });
  }
  if (GET) return bad("not found", 404);

  if (route === "admin/run/delete") {
    const id = clean(body.id, 40);
    const run = await DB.prepare("SELECT * FROM runs WHERE id=?").bind(id).first();
    if (!run) return bad("기록을 찾을 수 없습니다.", 404);
    const p = await DB.prepare("SELECT * FROM players WHERE sid=?").bind(run.sid).first();
    await backup(DB, "run", `${p ? p.name : run.sid} · ${run.score == null ? "미완료" : run.score}점 기록 삭제`, { runs: [run], players: p ? [p] : [] });
    await DB.prepare("DELETE FROM runs WHERE id=?").bind(id).run();
    if (body.refund) await DB.prepare("UPDATE players SET attempts=MAX(0,attempts-1) WHERE sid=?").bind(run.sid).run();
    await recomputeBest(DB, run.sid);
    return J({ ok: true });
  }
  if (route === "admin/player/delete") {
    const p = await DB.prepare("SELECT * FROM players WHERE sid=?").bind(sid).first();
    if (!p) return bad("플레이어를 찾을 수 없습니다.", 404);
    const { results: runs } = await DB.prepare("SELECT * FROM runs WHERE sid=?").bind(sid).all();
    await backup(DB, "player", `${p.name}(${p.sid}) 플레이어 삭제`, { players: [p], runs });
    await DB.batch([DB.prepare("DELETE FROM runs WHERE sid=?").bind(sid), DB.prepare("DELETE FROM players WHERE sid=?").bind(sid)]);
    return J({ ok: true });
  }
  if (route === "admin/player/refund") {
    const r = await DB.prepare("UPDATE players SET attempts=MAX(0,attempts-1) WHERE sid=?").bind(sid).run();
    if (!r.meta.changes) return bad("플레이어를 찾을 수 없습니다.", 404);
    return J({ ok: true });
  }
  if (route === "admin/reset") {
    if (body.confirm !== "초기화") return bad("확인 문구가 맞지 않습니다.");
    const { results: players } = await DB.prepare("SELECT * FROM players").all();
    const { results: runs } = await DB.prepare("SELECT * FROM runs").all();
    await backup(DB, "reset", `전체 초기화 (플레이어 ${players.length}명 · 기록 ${runs.length}개)`, { players, runs });
    await DB.batch([DB.prepare("DELETE FROM runs"), DB.prepare("DELETE FROM players")]);
    return J({ ok: true, players: players.length, runs: runs.length });
  }
  if (route === "admin/restore") {
    const b = await DB.prepare("SELECT * FROM admin_backup WHERE id=?").bind(Math.floor(Number(body.id) || 0)).first();
    if (!b) return bad("백업을 찾을 수 없습니다.", 404);
    const data = JSON.parse(b.payload);
    const players = data.players || [], runs = data.runs || [];
    // never overwrite newer data: rows that still exist are kept, missing ones come back,
    // then each affected player's best / sortie count is rebuilt from their runs
    const ins = (table, cols, rows) => rows.map((r) => DB.prepare(`INSERT OR IGNORE INTO ${table}(${cols.join(",")}) VALUES(${cols.map(() => "?").join(",")})`).bind(...cols.map((c) => r[c] === undefined ? null : r[c])));
    const stmts = [...ins("players", PCOLS, players), ...ins("runs", RCOLS, runs)];
    for (let i = 0; i < stmts.length; i += 50) await DB.batch(stmts.slice(i, i + 50));
    for (const s of new Set(runs.map((r) => r.sid))) {
      await DB.prepare("UPDATE players SET attempts=MIN(?,MAX(attempts,(SELECT COUNT(*) FROM runs WHERE sid=?))) WHERE sid=?").bind(MAX_SORTIE, s, s).run();
      await recomputeBest(DB, s);
    }
    await DB.prepare("UPDATE admin_backup SET restored=restored+1 WHERE id=?").bind(b.id).run();
    return J({ ok: true, players: players.length, runs: runs.length });
  }
  if (route === "admin/close") {
    await DB.prepare("INSERT OR REPLACE INTO settings(k,v) VALUES('closed',?)").bind(body.closed ? "1" : "0").run();
    return J({ ok: true, closed: !!body.closed });
  }
  return bad("not found", 404);
}
