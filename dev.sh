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

ensure_env_files() {
  say "📝 .env 파일 확인/생성"

  # Server/.env
  if [ ! -f "$SERVER_DIR/.env" ]; then
    if [ -f "$SERVER_DIR/.env.example" ]; then
      cp "$SERVER_DIR/.env.example" "$SERVER_DIR/.env"
    else
      cat > "$SERVER_DIR/.env" <<'EOF'
NODE_ENV=development
PORT=4000
CORS_ORIGIN=http://localhost:5173
DATABASE_URL=postgres://loa:loa@db:5432/loa
VAPID_PUBLIC=changeme
VAPID_PRIVATE=changeme
STOVE_JWT=changeme
EOF
    fi
    say "✅ Server/.env 생성"
  else
    say "ℹ️  Server/.env 이미 존재"
  fi

  # PwaFrontend/.env
  if [ ! -f "$FRONT_DIR/.env" ]; then
    if [ -f "$FRONT_DIR/.env.example" ]; then
      cp "$FRONT_DIR/.env.example" "$FRONT_DIR/.env"
    else
      cat > "$FRONT_DIR/.env" <<'EOF'
VITE_API_BASE_URL=http://localhost:4000/api
VITE_VAPID_PUBLIC=changeme
EOF
    fi
    say "✅ PwaFrontend/.env 생성"
  else
    say "ℹ️  PwaFrontend/.env 이미 존재"
  fi
}

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

init_all() {
  ensure_env_files
  install_deps
  say "🎉 초기 세팅 완료! 다음: ./dev.sh up  (또는 ./dev.sh 로 메뉴 실행)"
}

menu() {
  say "🛠️  개발 환경 시작"
  say "=================="
  say "1) 초기 세팅 (ENV 생성 + 의존성 설치)"
  say "2) Docker Compose (DB + Server + Frontend) 실행"
  say "3) Docker Compose 중지"
  say "4) 서버만 로컬 실행"
  say "5) 프론트만 로컬 실행"
  say "6) 로그 보기 (server)"
  read -rp "선택하세요 (1/2/3/4/5/6): " choice
  case "$choice" in
    1) init_all ;;
    2) compose_up ;;
    3) compose_down ;;
    4) run_server_local ;;
    5) run_front_local ;;
    6) compose_logs server ;;
    *) say "❌ 잘못된 선택"; exit 1 ;;
  esac
}

# ===== CLI =====
cmd="${1:-}"
case "$cmd" in
  init)    init_all ;;
  up)      compose_up ;;
  down)    compose_down ;;
  logs)    shift || true; compose_logs "${1:-server}" ;;
  server)  run_server_local ;;
  front)   run_front_local ;;
  "" )     menu ;;
  * )      say "사용법: ./dev.sh [init|up|down|logs [svc]|server|front]"; exit 1 ;;
esac
