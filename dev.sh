#!/usr/bin/env bash
set -euo pipefail

# ===== Paths =====
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$ROOT_DIR/Backend"
FRONT_DIR="$ROOT_DIR/PwaFrontend"
INFRA_DIR="$ROOT_DIR/Infra"

# ===== Containers (compose service names) =====
SERVER_CTN="loa-server"
FRONT_CTN="loa-frontend"
DB_CTN="loa-postgres"

# ===== Helpers =====
say() { echo -e "$@"; }
need() { command -v "$1" >/dev/null 2>&1 || { say "❌ $1 이(가) 필요합니다."; exit 1; }; }
ensure_running() {
  local name="$1"
  if ! docker ps --format '{{.Names}}' | grep -q "^${name}\$"; then
    say "❌ 컨테이너 ${name} 가 실행 중이 아닙니다. 먼저 ./dev.sh up 또는 docker compose up 해주세요."
    exit 1
  fi
}

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
  (cd "$INFRA_DIR" && docker compose build --no-cache --pull)
  (cd "$INFRA_DIR" && docker compose up -d)
  (cd "$INFRA_DIR" && docker compose ps)
  # 옵션: up 직후 자동 마이그레이션 실행 (환경변수 MIGRATE=1 일 때)
  if [[ "${MIGRATE:-0}" == "1" ]]; then
    say "🧱 up 완료 → 마이그레이션 실행(MIGRATE=1)"
    migrate_run_ts
  fi
}

compose_up_service() {
  need docker
  local svc="$1"
  say "🐳 Docker Compose build --no-cache $svc && up (서비스만)"
  (cd "$INFRA_DIR" && docker compose build --no-cache --pull "$svc")
  (cd "$INFRA_DIR" && docker compose up -d --no-deps "$svc")
  (cd "$INFRA_DIR" && docker compose ps)
  if [[ "${MIGRATE:-0}" == "1" && "$svc" == "server" ]]; then
    say "🧱 server 재빌드 후 마이그레이션 실행(MIGRATE=1)"
    migrate_run_ts
  fi
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
  say "🖥️  프론트엔드 컨테이너 로그 (docker logs -f ${FRONT_CTN})"
  docker logs -f "${FRONT_CTN}"
}

run_server_local() {
  say "🔧 Server 로컬 실행 (Nest start:dev)"
  (cd "$SERVER_DIR" && npm run start:dev)
}

run_front_local() {
  say "🎨 Frontend 로컬 실행 (Vite dev)"
  (cd "$FRONT_DIR" && npm run dev)
}

# ===== Migration helpers (inside container) =====
# 개발 컨테이너는 start:dev로 TS 실행 → ts-node 방식 사용
# 배포 이미지/운영 리허설은 dist 기반 사용

migrate_run_ts() {
  need docker; ensure_running "$SERVER_CTN"
  say "🧱 마이그레이션 실행 (TS, 컨테이너 내부)"
  docker exec -it "$SERVER_CTN" \
    sh -lc 'command -v node >/dev/null && node -v >/dev/null || exit 1; \
      if ! npm ls ts-node >/dev/null 2>&1; then echo "📥 ts-node 설치"; npm i -D ts-node tsconfig-paths >/dev/null 2>&1; fi; \
      node -r ts-node/register -r tsconfig-paths/register ./node_modules/typeorm/cli.js -d src/data-source.ts migration:run'
}

migrate_revert_ts() {
  need docker; ensure_running "$SERVER_CTN"
  say "↩️  마이그레이션 되돌리기 (TS)"
  docker exec -it "$SERVER_CTN" \
    sh -lc 'node -r ts-node/register -r tsconfig-paths/register ./node_modules/typeorm/cli.js -d src/data-source.ts migration:revert'
}

migrate_status_ts() {
  need docker; ensure_running "$SERVER_CTN"
  say "📋 마이그레이션 상태 (TS)"
  docker exec -it "$SERVER_CTN" \
    sh -lc 'node -r ts-node/register -r tsconfig-paths/register ./node_modules/typeorm/cli.js -d src/data-source.ts migration:show'
}

migrate_generate_ts() {
  need docker; ensure_running "$SERVER_CTN"
  local name="${1:-}"
  if [[ -z "$name" ]]; then
    say "사용법: ./dev.sh m:gen <MigrationName>"; exit 1
  fi
  say "📝 마이그레이션 생성 (TS): $name"
  docker exec -it "$SERVER_CTN" \
    sh -lc "node -r ts-node/register -r tsconfig-paths/register ./node_modules/typeorm/cli.js -d src/data-source.ts migration:generate src/migrations/${name} --pretty"
}

migrate_run_dist() {
  need docker; ensure_running "$SERVER_CTN"
  say "🧱 마이그레이션 실행 (dist, 컨테이너 내부)"
  docker exec -it "$SERVER_CTN" \
    sh -lc 'test -d dist || { echo "❌ dist 가 없습니다. 먼저 컨테이너 안에서 npm run build 후 다시 시도하세요."; exit 1; }; \
      node ./node_modules/typeorm/cli.js -d dist/data-source.js migration:run'
}

# ===== Interactive helpers =====

run_local_interactive() {
  say "무엇을 로컬로 실행할까요?"
  say "  s) server (Nest start:dev)"
  say "  f) frontend (Vite dev)"
  read -rp "선택 (s/f): " sub
  case "$sub" in
    s|S) run_server_local ;;
    f|F) run_front_local ;;
    *) say "❌ 잘못된 선택"; exit 1 ;;
  esac
}

logs_interactive() {
  say "어떤 로그를 볼까요?"
  say "  s) server (docker compose logs -f server)"
  say "  f) frontend (docker logs -f ${FRONT_CTN})"
  read -rp "선택 (s/f): " sub
  case "$sub" in
    s|S) compose_logs server ;;
    f|F) docker_logs_frontend ;;
    *) say "❌ 잘못된 선택"; exit 1 ;;
  esac
}

migrate_interactive_ts() {
  say "마이그레이션(TS) 작업을 선택하세요"
  say "  1) 실행 (run)"
  say "  2) 되돌리기 (revert)"
  say "  3) 상태 보기 (show)"
  say "  g) 생성 (generate)"
  read -rp "선택 (1/2/3/g): " sub
  case "$sub" in
    1) migrate_run_ts ;;
    2) migrate_revert_ts ;;
    3) migrate_status_ts ;;
    g|G)
      read -rp "생성할 마이그레이션 이름: " name
      migrate_generate_ts "$name"
      ;;
    *) say "❌ 잘못된 선택"; exit 1 ;;
  esac
}


# ===== Menu =====
menu() {
  say "🛠️  개발 환경 시작"
  say "=================="
  say "1) 의존성 설치"
  say "2) Docker Compose 실행 (전체/서버만/프론트만 선택)"
  say "3) Docker Compose 중지"
  say "4) 로컬 실행 (s/f 서브메뉴)"
  say "5) 로그 보기 (s/f 서브메뉴)"
  say "6) 마이그레이션 (run/revert/show/generate 서브메뉴)"
  read -rp "선택하세요 (1~6): " choice
  case "$choice" in
    1) install_deps ;;
    2) compose_up_interactive ;;
    3) compose_down ;;
    4) run_local_interactive ;;
    5) logs_interactive ;;
    6) migrate_interactive_ts ;;
    *) say "❌ 잘못된 선택"; exit 1 ;;
  esac
}

# ===== CLI entrypoint =====
cmd="${1:-}"
case "$cmd" in
  up)                    compose_up_interactive ;;
  up:all)               compose_up_all ;;
  up:server)            compose_up_service server ;;
  up:frontend)          compose_up_service frontend ;;
  down)                 compose_down ;;
  logs)                 shift || true; compose_logs "${1:-server}" ;;
  flog|flogs|frontend-logs) docker_logs_frontend ;;
  server)               run_server_local ;;
  front)                run_front_local ;;
  deps)                 install_deps ;;

  # --- migrations ---
  m:run)                migrate_run_ts ;;
  m:run:dist)           migrate_run_dist ;;
  m:revert)             migrate_revert_ts ;;
  m:status)             migrate_status_ts ;;
  m:gen)                shift || true; migrate_generate_ts "${1:-}" ;;

  "" )                  menu ;;
  * )                   say "사용법: ./dev.sh [deps|up|up:all|up:server|up:frontend|down|logs [svc]|flogs|server|front|m:run|m:run:dist|m:revert|m:status|m:gen <Name>]"; exit 1 ;;
esac
