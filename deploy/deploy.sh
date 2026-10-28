#!/bin/bash
# 게임 업데이트 배포: 이 폴더에서  bash deploy.sh
set -e
cd "$(dirname "$0")"
echo "▶ 1/2 대전 중계 서버 (orbitbreaker-pvp)"
(cd pvp && npx --yes wrangler@3 deploy)
echo "▶ 2/2 게임 사이트 (arclight-game.pages.dev)"
npx --yes wrangler@3 pages deploy public --project-name arclight-game --branch main --commit-dirty=true
