# ORBIT BREAKER — 작업 인수인계 문서

## 0. 새 세션 시작 규칙 (필독 · 10/28 갱신)
**배포는 오직 GitHub main 에 push 하는 것 하나뿐.** push 하면 GitHub Actions 가 빌드 → `node --check` → 테스트 → 대전 워커 → Pages 를 자동 배포한다.
- ❌ 금지: `wrangler pages deploy`, `deploy.sh`, 바탕화면 `orbit-breaker-deploy/` 폴더 업로드, Cloudflare 대시보드 직접 업로드, zip 로 받은 옛 소스로 작업.
  (10/28 새벽 다른 세션이 옛 폴더를 직접 올려서 사이트가 초기 버전으로 덮어써진 사고가 있었음)
- ✅ 시작할 때: 저장소를 GitHub 에서 새로 clone(또는 `git pull`)하고, 이 문서를 끝까지 읽고 시작.
- ✅ 수정 흐름: `src/*.js`·`head2.html` 수정 → `python3 build.py` → `node --check game.js` → `node --test tests/*.test.mjs` → commit → `git push` → `gh run watch` 로 배포 성공 확인.
- ✅ 큰 작업은 브랜치에서 하고 테스트 후 main 에 merge (main 이외 브랜치는 배포 안 됨).
- 롤백: Actions 에서 이전 성공 run 을 `gh run rerun <id>` 하거나, `origin/stable-pre-tutorial`(튜토리얼 이전) 같은 백업 브랜치를 main 으로 되돌려 push.
- 대전 서버 프로토콜 VERSION(pvp/src/arena.js) 을 바꾸면 클라이언트 `src/12c-versus.js` 의 `&v=` 도 같이 바꿀 것.
- 사용자 규칙: 항상 한국어로 답, 쉬지 말고 이어서 작업, AI 에셋 프롬프트는 에셋 하나당 공통 문구까지 합친 완성형 1개, 프롬프트 요청 시 한국어로.
- 테스트 팁: 클라우드 환경엔 GPU 가 없어 브라우저 테스트가 매우 느림(프레임당 2~3초). 오래 걸리는 시각 검증은 사용자 PC 에서 확인 요청.

## 0-1. 현재 상태 요약 (10/28 오전)
- 스토리 「유성우 예보」(17절), 오프닝 컷씬 + 튜토리얼 8단계(첫 방문 시 메인에 추천 안내), 빔샤벨 v2 + 사용자 에셋(칼날·잔상·손잡이), Mixamo 검술 모션(내 기체·대전 상대),
  타격감 레이어, 근접 검투기 적, 1:1 쇼다운 근접전 v4(가드·패리·가드 브레이크·칼날 격돌·콤보), 대전 동기화 30Hz+예측 보간, 락온 경보음 구분, 굵은 SVG 조준선.
- 진행 중: 오프닝 내레이션 확장(헬리오스 발전망 · 비밀 협정 · 기상청 '유성우 예보' 설정) → 사용자가 다른 채팅에서 대사 정리 후 음성(vo_*.mp3) 녹음 예정 → 컷씬 타이밍 반영 필요.
- 남은 일: 음성 대사 적용, 기획서 PDF(약 10쪽, AI 사용 내역·라이선스 포함), 5분 시연 영상, D1 테스트 기록(sid 99990001) 마감 전 삭제.


2026 SCHU AI·SW Festival 게임개발 경진대회(E-Sports 부문) 출품작.
마감 **10/30(금) 18:00**. 제출물은 웹 링크, 5분 시연영상, 10쪽 기획서 PDF.
라이브 주소: **https://orbitbreaker.pages.dev** (Cloudflare Pages + D1 + Durable Object)

## 1. 폴더 (두 폴더를 ~/Desktop 에 나란히 두기)
- `orbit-breaker-src/` : 이 폴더. 소스 코드.
- `orbit-breaker-deploy/` : 배포 폴더. 이미 바탕화면에 있음. `public/`, `wrangler.toml`, `pvp/`, `deploy.sh`가 들어 있음.

## 2. 빌드 & 배포
> **현재 방식 (10/27~): GitHub `kjm030131-cell/orbit-breaker` main에 push하면 GitHub Actions가 빌드 → 테스트 → 대전 워커 + Pages 배포를 자동으로 함.** ⚠️ 아래 수동 방식은 **사용 금지**(옛 버전 덮어쓰기 사고). 기록용으로만 남김.

```
cd ~/Desktop/orbit-breaker-src
npm install                  # three@0.147.0 설치 (배포본에 three를 직접 포함하는 데 씀)
python3 build.py             # src/*.js + head2.html → orbit-breaker.html (한 파일로 합침)
node --check game.js         # 문법 검사
python3 build_deploy.py      # → ../orbit-breaker-deploy/public 을 새로 생성
cd ../orbit-breaker-deploy && bash deploy.sh    # 대전 중계 워커 + Pages 사이트 배포
```
- `build.py`가 만드는 html은 Claude 아티팩트용이라 base64 모델(mech_glb.js 등)을 참조함. 배포본은 `build_deploy.py`가 이 참조를 지우고, `models/*.glb`(meshopt 압축)를 fetch로 불러오게 바꿈.
- 배포 후 브라우저에서 Cmd+Shift+R로 새로고침해야 함 (service worker 캐시 때문).

## 3. 코드 구조
`src/` 안의 파일이 숫자 순서대로 하나의 IIFE로 합쳐짐.

| 파일 | 역할 |
|---|---|
| 00-core | 렌더러, 씬, 블룸, 조명 |
| 01-fx | 파티클, 빔 볼트, 빔 궤적, 명중 이펙트 |
| 02-mech | 플레이어 기체, 모션(POSE/ACT), 기체 목록 FRAMES(mk2 / swift) |
| 03-enemies | 적 템플릿, knock(날리기) |
| 04-input | 키보드·마우스, 감도(SENS, localStorage에 저장) |
| 05-audio | 절차적 효과음과 음악 |
| 06-combat | 타게팅(조준 원뿔 + E 포커스), 베기, 사격(조준 후 70ms 뒤 발사) |
| 07-pose | 관절 스프링 포즈, 사격 조준 IK |
| 08-gameplay | 단계(PHASES), 점수, 피격(1발 = 기체 1기), 무피격 배율, 돌격 드론 |
| 09-catapult | 출격 컷씬, 전함 |
| 10-items | 아이템, 필살기 |
| 10b-units | 옵션 유닛 4종 |
| 10c-boss | 보스 케르베로스 |
| 11-loop | 메인 루프, 카메라 |
| 12-ui | 등록, 랭킹, HUD, 서버 API 호출 |
| 12b-duel | 쇼다운 로비, 점수 대결 |
| 12c-versus | 1:1 기체 대전 (WebSocket) |
| 13-boot | 모델 로딩. 여기 있는 `bakeGLTF()`가 압축 모델의 크기 정보를 복원함 |

- `rig.js`: 기체별 리깅 레이아웃(`LAYOUTS.mk2`, `LAYOUTS.swift`). 새 기체를 추가하면 관절 좌표 레이아웃도 같이 추가해야 함.
- `head2.html`: HTML/CSS 껍데기 (HUD와 각 화면). UI 이미지는 `ui/*.webp`.

## 4. 서버
- **`server/api.js`:** 빌드할 때 `public/_worker.js`로 들어감. 경로는 세 가지.
  - `/api/board`, `/api/player`, `/api/start`, `/api/finish` : D1 `orbit-breaker-db` 사용. 학번당 3회 제한과 최고점은 서버가 관리.
  - `/api/duel/*` : 점수 대결 방.
  - `/pvp?room=` : Durable Object(pvp 워커)로 WebSocket 중계.
- **`pvp/`:** 워커 `orbitbreaker-pvp`. PvpRoom Durable Object가 두 자리를 중계함. Pages의 `wrangler.toml`에 `script_name`으로 바인딩돼 있음.
- **D1 id:** `ff24e7fc-93f1-44f0-8717-8b61ae610fbc` (wrangler.toml에 있음). 스키마는 `server/schema.sql`이고 이미 적용됨.

## 5. 주의사항
- **대회 필수 요구사항:** 이름·학과·학번 입력, 학번당 3회, 최고점만 순위 반영, 전체 순위와 본인 순위 표시, 밸런스(특정 전략이 압도하지 않게), 안정성.
- **압축 모델:** 압축 GLB는 노드에 스케일이 들어 있음. `bakeGLTF()`를 거치지 않으면 모델, 리깅, 컷씬이 전부 깨짐.
- **비순위 모드:** 쇼다운과 대전은 순위와 출격 횟수에 반영하지 않음.
- **수정 후 확인 순서:**
  1. `node --check game.js`로 문법 검사
  2. 실제 브라우저에서 확인
  3. 배포 폴더의 파일이 새 버전으로 바뀌었는지 확인

## 6. 남은 일 (우선순위 순)
1. **대전 실기 테스트:** PC 2대로 1:1 기체 대전 손맛과 지연 확인. 그 결과로 데미지(`12c-versus.js`의 `VS_DMG`), 빔 속도(170), 감도 튜닝.
2. **보스와 밸런스:** 90초 보스를 실제 화면에서 확인. 옵션 유닛 밸런스 조정 (포드 유닛의 올 레인지가 강함).
3. **기획서 PDF (10쪽):**
   - 필수 목차: 개요, 기술, 플레이 방법과 스크린샷, 차별성과 팀 역할, 규칙과 e스포츠 적용 계획
   - **AI 사용 내역** (필수, 빠지면 감점·실격): Claude는 코드·기획, Tripo AI는 3D 모델, 나노바나나는 이미지·UI
   - **오픈소스 라이선스:** three.js(MIT), Google Fonts(OFL), meshoptimizer(MIT)
4. **시연 영상** (5분 이내).
5. **선택 작업:** 추가 기체(프롬프트 준비돼 있음), 보스 전용 모델, 첫 출격 튜토리얼 힌트, 화면 밖 적 경고.

## 7. 2026-10-27 Codex 1:1 개편
- 메뉴: 데모 화면의 적 표시/이동/생성 중단. 출격 시 복원.
- PvP 프로토콜 v2: `pvp/src/arena.js`가 공통 규칙, 준비, 라운드 시계, 체력, 탄도, 공격 간격/거리, 회피 자원, 승패를 관리. `index.js`는 WebSocket과 Durable Object 저장/알람을 연결.
- 방 생성자만 기체 패시브와 옵션(옵션 패시브+R+F)을 각각 변경 가능. 기본 OFF/OFF. 규칙/장비 변경 시 양쪽 준비 해제, 시작 이후 변경 금지.
- 양쪽 준비 후 공통 3초 카운트다운, 99초 2선승. 시간 종료는 체력 비율, 동률은 같은 라운드 재경기.
- PvP 일반 베기 14 / 3타 22, 돌진 접근 18m 이내, 공격 동작+후딜 동안 다른 공격/회피 불가. 라이플 8 피해/0.4초/170m/s, 발사 방향 고정. 회피 비용25/쿨다운0.65초/무적0.18초; 저스트 회피 +15 부스트와 1초 내 다음 베기 +20%.
- 기체 패시브 ON: Mk-II HP110, 스위프트 HP90/이동+15%/회복+10%. OFF: 모두 HP100, 동일 성능.
- 옵션 ON: 대전 전용 R/F(직선 돌진, 포드 확산사격, 미사일 연사, 짧은 반사 장벽). PvE 광역 날리기 로직은 호출하지 않음. 필살기 게이지는 시간/명중/저스트 회피로 충전. `VS_UNIT_TEXT`와 arena.js 참조.
- Esc는 대전을 멈추지 않으며 조작만 해제. 슬롯/프로토콜/메시지 검증, 기본 이동 상한 검사 포함. 서버는 클라이언트 위치를 받아 사용하므로 완전한 서버 이동 시뮬레이션은 아님.
- 타임어택의 체력·옵션·점수·3회 제한은 변경하지 않음. bakeGLTF 그대로 보존.
- `build_deploy.py`가 PvP 서버 소스도 배포 폴더에 복사함. 기존 빌드 3단계 후 deploy.sh 실행.
- 자동 검증: `node --test tests/pvp-arena.test.mjs`. 실제 2PC에서 조작감/지연 최종 확인 필요.

## 8. 효과음
- `sfx/*.mp3`: Kenney Sci-Fi / Impact / Interface Sounds (CC0)를 겹쳐 만든 효과음. 만든 방법은 `sfx/_mix.py`(ffmpeg).
- 파일이 있는 키만 합성음 대신 재생 (`05-audio.js`의 SFX_KEYS). 없는 키는 기존 합성음.
- 기획서 라이선스 표기: Kenney 효과음(CC0).

## 9. 맵 오브젝트 (src/10d-field.js)
- 모델: `models/obj_*.glb` (Tripo 원본을 1~2만 폴리곤, 1K 텍스처, meshopt로 압축). rock_lo는 작은 떠다니는 돌(924폴리곤).
- 고정 배치 `FLAYOUT` (매판 같은 맵). 전장 중심 (0,0,140), 반경 185를 넘으면 경고와 함께 안쪽으로 당겨짐.
- 함선 잔해·엔진·위성: 내구도가 있어서 사격·베기·날려 보낸 적에 맞으면 깎이고, 0이 되면 폭발해 주변 적을 날림(연쇄로 이어짐). 35초 뒤 다시 생김.
- 모든 오브젝트는 빔을 막음(엄폐물). 날려 보낸 적이 부딪히면 "충돌 격파" 보너스.
- 1:1 대전에서는 숨김(서버 판정과 어긋나지 않게).

## 10. 이족보행 적 MS (src/08b-ms.js)
- 모델: `models/enemy_ms.glb` (적용 완료, T자 자세 원본). rig.js의 `ms` 레이아웃으로 관절을 달아 팔 내림·조준 자세(msPose). 다른 모델로 바꾸면 ms 레이아웃 좌표도 맞춰야 함.
- 새 모델은 Tripo 원본을 `gltf-transform weld → simplify(1~2만 폴리곤) → resize 1024 → jpeg → meshopt`으로 줄여서 넣기.
- 장갑 1회(첫 타격은 경직+밀려남), 두 번째 타격에 날아감. 22~30m 거리 유지, 옆으로 대시, 예고 후 3연사. 격파 1200점.
- 단계별 등장 수: PHASES의 `ms` (0/1/1/2).

## 11. 다음 세션 할 일 (10/27 밤 기준)
- 적 MS 애셋 적용 완료 (10/27). 난이도 실플레이 확인 필요.
- 스토리·컷씬·나레이션은 보류 상태 (사용자가 나중에 정하기로 함). 배경음악도 아직 합성음.
- 합성음 그대로인 효과음: slash, just, phase, tele.
- 확인 필요: 기체 관절 소프트 스키닝 후 큰 동작에서 어깨 늘어짐 정도, 맵 돌 밀도, 적 MS 난이도.
- 테스트 학번 99990001("테스트")로 출격 기록 있음 → 마감 전 D1에서 지우기.
- 기획서 PDF, 시연 영상 (마감 10/30 18:00). AI 사용 내역에 Claude·GPT/Codex·Tripo·나노바나나, 라이선스에 Kenney(CC0) 추가.

## 12. Mixamo 리깅 기체 (10/27 적용)
- `models/mech.glb`(Mk-II), `models/swift.glb`(스위프트) = Tripo 리토폴로지+자동 리깅(Mixamo 스켈레톤) 버전.
- `src/02a-mixrig.js`: 기존 관절 11개는 보이지 않는 "조종용 뼈대"로 남기고, 매 프레임 `sync()`가 각 관절의 회전을 Mixamo 뼈에 옮김(기본 자세 회전 위에 곱함). 포즈·전투·대전 전송 코드는 그대로.
- Mk-II 소총은 손 뼈에 붙은 정점 988개를 따로 떼어 `gun` 뼈로 옮김 → 칼을 뽑을 때 숨김. 총구 위치도 소총 정점에서 계산.
- 주의: three r147의 `boneTransform(i,v)`는 v에 정점 위치를 먼저 넣어야 함. `bakeGLTF`는 스킨 메시를 건너뜀(바인드 행렬이 깨지므로).
- 대전 상대 기체는 `THREE.SkeletonUtils.clone`으로 복제하고, 처음 저장한 기본 자세로 되돌린 뒤 연결함.

## 13. UI 개편 (10/27~28)
- 글꼴: Pretendard 하나로 통일, `build_deploy.py`가 node_modules/pretendard를 lib/에 자체 호스팅.
- 설정 창(`#settings`, src/12d-menu.js): 감도·화질·사운드·볼륨·화면 흔들림(SHAKE_K)·FPS 표시. 일시정지 메뉴: 계속하기·설정·작전 종료(현재 점수로 기록).
- 기체 선택 화면: 왼쪽 패널, 오른쪽에 선택 기체 3D 미리보기(카메라는 11-loop의 S.demo + SCREEN==="load").
- UI 아트(ui/): ic_*.webp 아이콘, btn_pri/btn_sec(버튼 border-image), radio(무전창), medal1~3(랭킹), grade_S~C(결과 등급: 25만/15만/7만 기준), bossbar, reticle/lockon.
- 무전 얼굴: ui/face_op.webp(CIC), face_ace.webp(적), face_cap.webp(함장) 파일만 넣으면 radio()가 자동 표시.
- 최적화: 패널 backdrop-filter(blur) 제거.

## 14. 이펙트 아트 (src/01b-fxart.js)
- ui/fx_*.webp: expl(4x4 폭발 연속 프레임, 알파), beam(빔 라이플 띠), saber(빔 사벨), slash(베기 궤적), muzzle, hit(→TX.flare), ring(→TX.ring), smoke(→TX.smoke), thruster(추진기), charge(필살기), electric(실드 방어).
- 로딩 성공한 것만 교체(FXOK), 실패하면 기존 절차적 이펙트 유지.

## 15. 타격감 레이어 + 근접 검투기 (10/28)
- src/06b-impact.js: `impactPunch(k)` FOV 펀치(히트스톱 동안 유지 후 복귀, 11-loop S.fovB/S.punch), `hitMark(kind)` 레티클 히트마커(#hitm .hit/.kill/.block), `sfx("thud",pos,heavy)` 저역 쿵 레이어.
- 베기 히트스톱 .085/.13/.17, 사격 명중·MS 장갑·처치에도 마커/펀치/쿵.
- 사격: 조준선 직진 + 스윕 판정(01-fx stepBolts), 2.5° 안만 보조. 적 조준은 고정 순간 플레이어 이동 리드(0.6).
- src/08c-blade.js: `spawnMS(pos,true)` = 검투기. hunt→wind(0.6s, 붉은 링 수축)→strike(돌진 베기)→rec(빈틈).
  · wind 중 베기 = 카운터(즉시 격파), 회피로 피하면 간파(rec 1.3s), 서로 베면 칼날 격돌(양쪽 튕김, 적 경직 1.15s), hunt 중 베기 = 막힘(경직 .6s).
  · 빔은 rec/경직 외엔 튕겨냄(bladeDeflect). PHASES.blade 로 단계별 수.
- 사벨 사운드(10/28): 사용자 ElevenLabs 9종 → sfx/_saber.py 로 slash/slash2/slash3(콤보 단별), ignite, clash(칼날 격돌), sizzle(베기 명중 지글), humtex(대기 험 질감 루프, 05-audio audioFrame LOOP.tex) 생성.

## 16. 빔샤벨 v2 + Mixamo 검술 모션 (10/28)
- src/01c-saber.js: saberMesh(축 빌보드 플라즈마 셰이더), makeArc/stepArc(캣멀롬 호 잔상). 플레이어 P.saber, 검투기 e.blade.glow/e.arc.
- Mixamo FBX 6종(Outward/Inward Slash, High Spin, Jump Attack, Blocking, Body Block) → tools/mixamo_bake.mjs(three@0.147 FBXLoader, node) → models/sword.json
  (프레임별 각 키의 월드 회전 델타 vs Mixamo T포즈). build_deploy가 models/*.json 복사.
- src/07b-clips.js clipLayer: 우리 리그 rest(팔 내린 포즈)에 뼈 방향 정렬(A_k) 후 드라이버 로컬 회전으로 기록, 상체+힙만, 다리는 비행 포즈 유지.
  CLIP_MAP: 액트별 클립 구간 w0..w1, 클립의 타격 프레임 hit 을 액트 strike 프레임에 맞춤, 타격 순간 상체가 정면 보게 yaw 보정.
  손목(rifle) 회전 → 칼날 그룹(P.beam.parent) 회전. mixrig sync 에 RightHand 매핑 추가(기본값 동일).
- ACT 길이: slash1 .56/.38, slash2 .52/.36, slash3 .86/.52, guard(칼날 격돌 시) 추가.
- 사용자 빔샤벨 에셋(10/28): ui/fx_blade.webp(R=코어,G=글로우, 칼날 텍스처 채널 분리), ui/fx_trail.webp(잔상), models/hilt.glb(Tripo 67MB→weld/simplify/resize512/jpeg/meshopt 580KB, 방출구 +Y).
  saberMat/makeArc 가 텍스처 로드되면 사용(SABER_ON/TRAIL_ON), 아니면 절차적. attachHilt()로 플레이어·검투기에 손잡이. 플레이어 사벨 핑크(0xff3aa8), 과열 시 빨강. 칼날 길이 L .52→.7.

## 17. 스토리 「유성우 예보」 + 인트로 + 튜토리얼 (10/28)
- 세계관: 궤도 전쟁 3년째, 지상엔 '궤도 정비'로 발표. 격추된 기체는 대기권에서 불타 유성이 됨 → 사람들은 소원을 빔. 120초 = 전장이 서울 상공을 지나는 시간, 점수/격파 수 = 오늘 밤 유성 수.
  인물: 앰버 1(나), 동생 유나(메시지), 한서윤 중위(CIC), 적 에이스 카인(붉은 검투기). 일반 출격 대사·결과 문구도 이 톤으로 교체.
- src/09b-intro.js: playIntro() ~30초(검은 카드 → 궤도 전투·추락 유성 → 유성우 → 동생 문자/답장 → 타이틀) → playCatapult 로 이어짐. Space 스킵.
- src/12e-tutorial.js: TUT, 타이틀 메뉴 '튜토리얼'(#tutBtn). 타이머·게임오버 없음(hurt→tutHurt), fillEnemies 막음.
  단계 8개(이동 웨이포인트/회피/사격 3기/3타 콤보/저스트 회피/특수기 2종/카인 카운터/귀환) → 엔딩 카드 "그날 밤 서울 하늘에는 유성 N개" → 실전 출격/메인.
  카운터 훅: dodge, justDodge, onKill, slashStrike(slash3), special, unitSkill, throwGrav, bladeParry.
- 롤백용: origin/stable-pre-tutorial (튜토리얼 이전 main).
- 튜토리얼 수정(10/28 아침): 단계별 keep{n,passive,d} 로 표적 자동 보충(tutKeep), 에이스 사라지면 재등장. 3연속 베기는 3타 스윙 자체로 인정. 렉 완화: 목표/조준선/경고 DOM은 변경 시에만, 경고 테두리 box-shadow→radial-gradient, 조준선 drop-shadow 필터 제거.

## 18. 1:1 쇼다운 근접전 개편 (PvP 프로토콜 v4, 10/28)
- 서버(pvp/src/arena.js): guard {t:'guard',on} · 가드 게이지 gp(100, 미사용 0.8초 후 30/s 회복). 정면 가드 시 근접 칩 12%·게이지 -24(강 -50), 0이면 가드 브레이크(0.9초 경직, 1.6초 가드 불가).
  가드 올린 지 180ms 안에 맞으면 패리(공격자 0.75초 경직, 방어자 크리 1.2초). 양쪽 베기가 150ms 안에 겹치면 칼날 격돌(피해 없음, 둘 다 0.45초 경직).
  콤보: 약공격 피격 경직 650ms/무적 60ms(연결됨), 강공격 경직 900ms/무적 800ms(다운). 공격 후 딜레이 520/950ms. 사거리 10/11. 정면 빔은 가드로 막힘(게이지 -12).
  swing 이벤트에 combo 인덱스, pose 릴레이에 g(가드), state 에 gp/guard/gb. 테스트 6개 추가.
- 클라: Q 길게 = 가드(대전만, 솔로 Q는 중력탄), 가드 중 이동 45%. 07b clipDrive 로 상대 기체도 Mixamo 모션(swing combo → slash1~3, 가드 홀드 포즈) 재생.
  대전에서도 짧은 히트스톱·슬로우·약한 흔들림·히트마커·FOV 펀치·쿵/지글 사운드. 격돌·패리·가드 브레이크 연출. HP 바 아래 가드 게이지.
- 메인: 튜토리얼 안 한 사람에게 안내 문구 + 튜토리얼 버튼 '추천' 강조(localStorage ob.tutDone, 엔딩 카드에서 기록).
- 대전 동기화(10/28): 포즈 30Hz + 속도 v 전송, 서버가 st(서버시각)·v 릴레이. 상대 표시 = 서버 위치 + v×경과(≤0.22s) 예측을 부드럽게 따라감(v.rdisp, 25m 넘는 오차만 즉시 보정). 락온 사격은 상대 속도로 리드. 빔 판정 반경 2.3→2.6.

## 19. 조작감·적 리젠·하이퍼 메가 런처 (10/28 오전)
- 적 수/리젠(08-gameplay): PHASES count 7/9/9/6 + gap(클러스터 간 2~3초). 즉시 보충 없음, 출격 전(데모·카타풀트)만 한 번에 채움.
  큰 적(검투기·MS·정예·돌격)은 G.bigT 쿨다운(3.5~7초). 새 무리는 주로 카메라 앞쪽(aheadPlayer)에서 등장.
- 조작감(11-loop/06-combat/04-input): 이동 가감속 강화(입력 중 drag 2.6, 손 떼면 4.2, 최고속 동일), 회피·밀림은 S.freeT 동안 예전 미끄러짐 유지.
  베기/사격 선입력 버퍼(S.buf/S.bufT ~0.2초), 3타 콤보 창 COMBO_WIN .9초, E 추적 중에도 마우스 35% 반영.
- 타격감: 3타·크리티컬 마무리 = 짧은 슬로우 + 폭발 플립북 + 파편 + 섬광, 날린 적 충돌 반경↑(연쇄 잘 남). 화면 흔들림은 늘리지 않음.
  저스트 회피 후 크리 창 동안 사벨이 하늘색(_SAB_CRIT) + "반격 찬스!".
- 오버부스트 유닛 삭제 → 하이퍼 메가 런처 HM-1 (`mega`, src/10e-mega.js). 기본 유닛.
  R 메가 빔: 0.6초 충전 → 0.9초 관통 빔(쿨 9초). F 하이퍼 메가 빔(궁극기): 1초 충전 → 굵은 빔 5초 계속 조사, 마우스로 쓸기(회전 제한), 무적.
  패시브: 라이플 명중 시 필살 +2. 빔은 맵 엄폐물에 막힘(파괴물은 피해). 회피는 R 빔만 취소. 빔 중엔 카메라가 왼쪽 어깨 너머로 이동(S.megaCam).
  이펙트: fx_beam/fx_charge 를 흑백화한 ui/fx_mbeam·fx_mcharge(틴트용) + 튜브 셰이더 + 리본 3겹 + expl/ring/flare/electric. 사운드: cataCharge 샘플 + LOOP.mega 합성 드론.
  아이콘 ui/u_mega·r_mega·f_mega 는 기존 아이콘 프레임 + 이펙트로 합성한 임시본(교체 가능).
- PvP 프로토콜 v5: 서버 유닛 'mega'(R 0.7초 후 직선 빔 20, F 0.9초 후 굵은 빔 30, 정면 가드 시 게이지 -40/-70 + 칩), 라이플 명중 시 필살 +6. 클라 &v=5. 테스트 추가.
