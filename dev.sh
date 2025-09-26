#!/usr/bin/env bash
set -euo pipefail

# ===== Paths =====
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$ROOT_DIR/Backend"
FRONT_DIR="$ROOT_DIR/PwaFrontend"
INFRA_DIR="$ROOT_DIR/Infra"

# ===== Helpers =====
say() { echo -e "$@"; }
need() { command -v "$1" >/dev/null 2>&1 || { say "❌ $1 이(가) 필요합니다."; exit 1; }; }

install_deps() {
  need node; need npm
  say "📦 의존성 설치 (Server)"
  (cd "$SERVER_DIR" && (npm ci || npm install))
  say "📦 의존성 설치 (PwaFrontend)"
  (cd "$FRONT_DIR" && (npm ci || npm install))
}

compose_up() {
  need docker
  say "🐳 Docker Compose up (DB + Server + Frontend)"
  (cd "$INFRA_DIR" && docker compose up -d --build)
  (cd "$INFRA_DIR" && docker compose ps)
  say "📜 로그 보기: (예) cd Infra && docker compose logs -f server"
}

compose_down() {
  need docker
  say "🛑 Docker Compose down"
  (cd "$INFRA_DIR" && docker compose down)
}

compose_logs() {
  need docker
  local svc="${1:-server}"
  say "📜 로그: $svc"
  (cd "$INFRA_DIR" && docker compose logs -f "$svc")
}

run_server_local() {
  say "🔧 Server 로컬 실행 (Nest start:dev)"
  (cd "$SERVER_DIR" && npm run start:dev)
}

run_front_local() {
  say "🎨 Frontend 로컬 실행 (Vite dev)"
  (cd "$FRONT_DIR" && npm run dev)
}

menu() {
  say "🛠️  개발 환경 시작"
  say "=================="
  say "1) 의존성 설치"
  say "2) Docker Compose 실행"
  say "3) Docker Compose 중지"
  say "4) 서버만 로컬 실행"
  say "5) 프론트만 로컬 실행"
  say "6) 로그 보기 (server)"
  read -rp "선택하세요 (1/2/3/4/5/6): " choice
  case "$choice" in
    1) install_deps ;;
    2) compose_up ;;
    3) compose_down ;;
    4) run_server_local ;;
    5) run_front_local ;;
    6) compose_logs server ;;
    *) say "❌ 잘못된 선택"; exit 1 ;;
  esac
}

cmd="${1:-}"
case "$cmd" in
  up)      compose_up ;;
  down)    compose_down ;;
  logs)    shift || true; compose_logs "${1:-server}" ;;
  server)  run_server_local ;;
  front)   run_front_local ;;
  deps)    install_deps ;;
  "" )     menu ;;
  * )      say "사용법: ./dev.sh [deps|up|down|logs [svc]|server|front]"; exit 1 ;;
esac