# ORBIT BREAKER — 작업 인수인계 문서

2026 SCHU AI·SW Festival 게임개발 경진대회(E-Sports 부문) 출품작.
마감 **10/30(금) 18:00**. 제출물은 웹 링크, 5분 시연영상, 10쪽 기획서 PDF.
라이브 주소: **https://orbitbreaker.pages.dev** (Cloudflare Pages + D1 + Durable Object)

## 1. 폴더 (두 폴더를 ~/Desktop 에 나란히 두기)
- `orbit-breaker-src/` : 이 폴더. 소스 코드.
- `orbit-breaker-deploy/` : 배포 폴더. 이미 바탕화면에 있음. `public/`, `wrangler.toml`, `pvp/`, `deploy.sh`가 들어 있음.

## 2. 빌드 & 배포
> **현재 방식 (10/27~): GitHub `kjm030131-cell/orbit-breaker` main에 push하면 GitHub Actions가 빌드 → 테스트 → 대전 워커 + Pages 배포를 자동으로 함.** 아래 수동 방식은 예비용.

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
