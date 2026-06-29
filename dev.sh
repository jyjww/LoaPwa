#!/usr/bin/env bash
# dev.sh — 로컬 개발 환경 시작/관리
# DB + 백엔드: Docker  |  프론트엔드: 로컬 (npm run dev)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA="$ROOT/Infra"
FRONT="$ROOT/PwaFrontend"
SERVER_CTN="loa-server"

# ── 색상 ─────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
say()  { echo -e "${CYAN}▶${NC} $*"; }
ok()   { echo -e "${GREEN}✔${NC} $*"; }
warn() { echo -e "${YELLOW}⚠${NC} $*"; }
die()  { echo -e "${RED}✖${NC} $*"; exit 1; }
need() { command -v "$1" >/dev/null 2>&1 || die "$1 이(가) 필요합니다."; }

# ── Docker Compose 헬퍼 ───────────────────────────────────────────────────────
dc() { (cd "$INFRA" && docker compose "$@"); }

docker_up() {
  say "DB + 서버 컨테이너 시작 (docker compose up -d db server)"
  dc up -d --build db server
  ok "컨테이너 기동 완료"
  dc ps
}

docker_down() {
  say "컨테이너 중지"
  dc down
  ok "중지 완료"
}

docker_reset() {
  warn "컨테이너 및 볼륨을 모두 삭제합니다. DB 데이터가 초기화돼요."
  read -rp "계속할까요? (y/N) " ans
  [[ "$ans" =~ ^[Yy]$ ]] || { say "취소"; exit 0; }
  dc down -v --remove-orphans
  ok "볼륨 포함 전체 삭제 완료"
}

wait_server() {
  say "백엔드 준비 대기 중..."
  local max=40 i=0
  until curl -sf http://localhost:4000/api/health >/dev/null 2>&1; do
    i=$((i + 1))
    [[ $i -ge $max ]] && { warn "타임아웃 — 서버 로그 확인: ./dev.sh logs"; return; }
    printf "."
    sleep 2
  done
  echo ""
  ok "백엔드 준비 완료 → http://localhost:4000"
}

# ── 프론트엔드 로컬 실행 ──────────────────────────────────────────────────────
front_dev() {
  need node
  say "프론트엔드 의존성 확인"
  (cd "$FRONT" && [[ -d node_modules ]] || npm ci)
  ok "프론트엔드 시작 → http://localhost:5173"
  (cd "$FRONT" && npm run dev)
}

# ── dev: 한번에 시작 ──────────────────────────────────────────────────────────
cmd_dev() {
  need docker; need node
  say "로컬 개발 환경 시작"
  # 기존 서버/DB 컨테이너가 있으면 재시작
  dc stop server db 2>/dev/null || true
  docker_up
  wait_server
  # Ctrl+C 시 컨테이너 정리
  trap 'echo ""; say "종료 중..."; dc stop server db 2>/dev/null; ok "정리 완료"' INT TERM
  front_dev
}

# ── reset-dev: 초기화 후 재시작 ───────────────────────────────────────────────
cmd_reset_dev() {
  docker_reset
  docker_up
  wait_server
  trap 'echo ""; say "종료 중..."; dc stop server db 2>/dev/null; ok "정리 완료"' INT TERM
  front_dev
}

# ── 로그 ─────────────────────────────────────────────────────────────────────
cmd_logs() {
  local svc="${1:-server}"
  say "로그: $svc  (Ctrl+C로 종료)"
  dc logs -f "$svc"
}

# ── 마이그레이션 ──────────────────────────────────────────────────────────────
_need_server() {
  docker ps --format '{{.Names}}' | grep -q "^${SERVER_CTN}\$" \
    || die "loa-server 컨테이너가 실행 중이 아닙니다. 먼저 ./dev.sh dev 로 시작해주세요."
}
_ts_cli() {
  _need_server
  docker exec -it "$SERVER_CTN" sh -lc \
    "node -r ts-node/register -r tsconfig-paths/register ./node_modules/typeorm/cli.js -d src/data-source.ts $*"
}

cmd_m_run()    { _ts_cli migration:run; }
cmd_m_revert() { _ts_cli migration:revert; }
cmd_m_status() { _ts_cli migration:show; }
cmd_m_gen() {
  [[ -n "${1:-}" ]] || die "사용법: ./dev.sh m:gen <MigrationName>"
  _ts_cli "migration:generate src/migrations/$1 --pretty"
}

# ── 메뉴 ─────────────────────────────────────────────────────────────────────
show_menu() {
  echo ""
  echo -e "${BOLD}🛠  LoA PWA 개발 환경${NC}"
  echo "────────────────────────────────"
  echo "  1) dev        DB+서버(Docker) + 프론트(로컬) 한번에 시작"
  echo "  2) reset-dev  전체 초기화 후 재시작 (DB 데이터 삭제)"
  echo "  3) down        컨테이너 중지"
  echo "  4) logs        서버 로그 보기"
  echo "  5) m:run       마이그레이션 실행"
  echo ""
  read -rp "선택 (1-5): " ch
  case "$ch" in
    1) cmd_dev ;;
    2) cmd_reset_dev ;;
    3) docker_down ;;
    4) cmd_logs server ;;
    5) cmd_m_run ;;
    *) die "잘못된 선택" ;;
  esac
}

# ── 진입점 ───────────────────────────────────────────────────────────────────
CMD="${1:-}"
shift || true

case "$CMD" in
  dev)         cmd_dev ;;
  reset-dev)   cmd_reset_dev ;;
  down)        docker_down ;;
  reset)       docker_reset ;;
  logs)        cmd_logs "${1:-server}" ;;
  front)       front_dev ;;
  m:run)       cmd_m_run ;;
  m:revert)    cmd_m_revert ;;
  m:status)    cmd_m_status ;;
  m:gen)       cmd_m_gen "${1:-}" ;;
  "")          show_menu ;;
  *)
    echo -e "${BOLD}사용법:${NC} ./dev.sh <커맨드>"
    echo ""
    echo "  dev          DB+서버(Docker) + 프론트(로컬) 한번에 시작"
    echo "  reset-dev    전체 초기화 후 재시작 (DB 볼륨 삭제)"
    echo "  down         컨테이너 중지"
    echo "  reset        볼륨 포함 컨테이너 삭제만 (재시작 없음)"
    echo "  logs [svc]   로그 follow (기본: server)"
    echo "  front        프론트엔드만 로컬 실행"
    echo "  m:run        마이그레이션 실행"
    echo "  m:revert     마이그레이션 롤백"
    echo "  m:status     마이그레이션 상태"
    echo "  m:gen <Name> 마이그레이션 생성"
    exit 1 ;;
esac
