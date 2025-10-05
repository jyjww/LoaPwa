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

# ===== Compose up helpers =====
compose_up_all() {
  need docker
  say "🐳 Docker Compose build --no-cache && up (DB + Server + Frontend)"
  (cd "$INFRA_DIR" && docker compose build --no-cache --pull)   # ← 캐시 미사용으로 빌드
  (cd "$INFRA_DIR" && docker compose up -d)                     # ← 컨테이너 기동
  (cd "$INFRA_DIR" && docker compose ps)
}

compose_up_service() {
  need docker
  local svc="$1"
  say "🐳 Docker Compose build --no-cache $svc && up (서비스만)"
  (cd "$INFRA_DIR" && docker compose build --no-cache --pull "$svc")  # ← 서비스만 재빌드
  (cd "$INFRA_DIR" && docker compose up -d --no-deps "$svc")          # ← 의존성 재기동 없이
  (cd "$INFRA_DIR" && docker compose ps)
}

compose_up_interactive() {
  say "무엇을 재빌드할까요?"
  say "  a) 전체 (db + server + frontend)"
  say "  s) server 만"
  say "  f) frontend 만"
  read -rp "선택 (a/s/f): " sub
  case "$sub" in
    a|A) compose_up_all ;;
    s|S) compose_up_service server ;;
    f|F) compose_up_service frontend ;;
    *) say "❌ 잘못된 선택"; exit 1 ;;
  esac
  say "📜 로그 보기: (예) cd Infra && docker compose logs -f server"
}

compose_down() {
  need docker
  say "🛑 Docker Compose down"
  (cd "$INFRA_DIR" && docker compose down -v)
}

compose_logs() {
  need docker
  local svc="${1:-server}"
  say "📜 로그: $svc"
  (cd "$INFRA_DIR" && docker compose logs -f "$svc")
}

docker_logs_frontend() {
  need docker
  say "🖥️  프론트엔드 컨테이너 로그 (docker logs -f loa-frontend)"
  docker logs -f loa-frontend
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
  say "2) Docker Compose 실행 (전체/서버만/프론트만 선택)"
  say "3) Docker Compose 중지"
  say "4) 서버만 로컬 실행"
  say "5) 프론트만 로컬 실행"
  say "6) 로그 보기 (server - docker compose logs)"
  say "7) 프론트 로그 보기 (docker logs -f loa-frontend)"
  read -rp "선택하세요 (1/2/3/4/5/6/7): " choice
  case "$choice" in
    1) install_deps ;;
    2) compose_up_interactive ;;
    3) compose_down ;;
    4) run_server_local ;;
    5) run_front_local ;;
    6) compose_logs server ;;
    7) docker_logs_frontend ;;
    *) say "❌ 잘못된 선택"; exit 1 ;;
  esac
}

# ===== CLI entrypoint =====
cmd="${1:-}"
case "$cmd" in
  up)                    compose_up_interactive ;;                                # 대화형
  up:all)               compose_up_all ;;                                         # 전체 재빌드
  up:server)            compose_up_service server ;;                               # 서버만
  up:frontend)          compose_up_service frontend ;;                             # 프론트만
  down)                 compose_down ;;
  logs)                 shift || true; compose_logs "${1:-server}" ;;
  flog|flogs|frontend-logs) docker_logs_frontend ;;
  server)               run_server_local ;;
  front)                run_front_local ;;
  deps)                 install_deps ;;
  "" )                  menu ;;
  * )                   say "사용법: ./dev.sh [deps|up|up:all|up:server|up:frontend|down|logs [svc]|flogs|server|front]"; exit 1 ;;
esac
