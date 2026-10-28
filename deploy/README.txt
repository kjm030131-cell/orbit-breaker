ARCLIGHT 배포 폴더  →  https://arclight-game.pages.dev

[업데이트 배포]  터미널에서:
  cd ~/Desktop/orbit-breaker-deploy && bash deploy.sh
  (= npx wrangler pages deploy public --project-name arclight-game --branch main)

- public/        사이트 파일 (게임 + _worker.js 랭킹 API + 앱 설치 manifest/sw)
- wrangler.toml  프로젝트 이름 + D1 랭킹 DB(orbit-breaker-db) 연결 정보
- schema.sql     랭킹 DB 테이블 (이미 적용됨)
