# 로컬 테스트 도구 (GPU 없는 클라우드 세션용)

브라우저 렌더는 프레임당 2~3초라 느리지만, 게임 로직(update)은 JS 로 직접 돌려서 빠르게 검증할 수 있다.

## 준비
```
npm ci && npm i --no-save ws          # ws 는 로컬 대전 서버용
python3 build.py && OUT=/tmp/obd python3 build_deploy.py
```
테스트용 페이지(test.html)는 index.html 의 마지막 `})();\n</script>` 앞에 `window.__T={...}` 훅을 끼워 만든다
(IIFE 안의 함수·상태를 밖에서 부르기 위해). 각 스크립트가 필요로 하는 훅 목록은 스크립트 안 evaluate 코드를 보면 된다. 예:
```
python3 - <<'P'
p='/tmp/obd/public/index.html';s=open(p).read()
hook='window.__T={update,restart,show,S,G,enemies,unitSkill,special,PHASES,attack,shoot,dodge,get VS(){return VS},VS_MEGA,vsSkill,scene,camera:()=>camera,setPaused(v){PAUSED=v},FIELD,FLAYOUT,VSC,TUT,TUT_STEPS,tutStep,VST,vstStepGo};\n})();\n</script>'
i=s.rindex('})();\n</script>');open('/tmp/obd/public/test.html','w').write(s[:i]+hook+s[i+len('})();\n</script>'):])
P
```
(훅에 넣은 이름이 그 빌드에 없으면 페이지 스크립트가 통째로 죽으니, 필요한 것만 넣을 것.)

## 스크립트 (Python Playwright, chromium --use-gl=swiftshader)
- `local-pvp-server.mjs` : 정적 파일(ROOT) + `/pvp` 웹소켓 방(실제 arena.js 규칙). `ROOT=/tmp/obd/public node tools/test/local-pvp-server.mjs` → http://localhost:8790
- `two_clients.py` : 같은 브라우저에 페이지 2개 → 방 만들기/참가/준비 → 옵션 스킬·엄폐물·체력 확인, 스크린샷 /tmp/claude-0/prev/
  (페이지에서 `window.PVP_URL="ws://localhost:8790/pvp"` 를 넣어야 방 만들기 버튼이 켜짐)
- `solo_sim.py` : 솔로 60초를 update(.05) 로 시뮬레이션(적 수·리젠, 메가 R/F, 피격·경직 풀기 카운트)
- `vs_tutorial.py` : 쇼다운 튜토리얼(오프라인 arena + 봇) 단계 진행 확인
- `bake_vs_cover.py` : 대전 맵(VS_COVER) 재생성 — 싱글 FLAYOUT 을 0.5배 위치·0.62배 크기로 옮기고 실제 메시에서 충돌 구를 구워 JSON 출력.
  결과를 pvp/src/arena.js 의 VS_COVER 배열로 교체(서버·클라 공용, build.py 가 LOCAL_ARENA 로 클라에 넣음).
스크립트 안의 /tmp 경로는 세션마다 맞게 바꿔 쓸 것.
