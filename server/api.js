// ORBIT BREAKER ranking API (Cloudflare Pages Functions + D1)
// Server owns the sortie count (max 3 per student id) and the best score; the client only reports results.
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
    if (request.method !== "POST") return bad("not found", 404);
    const body = await request.json().catch(() => ({}));

    if (route === "start") {
      const sid = clean(body.sid, 10), name = clean(body.name, 12), dept = clean(body.dept, 24);
      if (!validSid(sid) || !name || !dept) return bad("이름·학과·학번을 확인하세요.");
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
