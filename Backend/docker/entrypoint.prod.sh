#!/usr/bin/env bash
set -euo pipefail
echo "[entry] NODE_ENV=${NODE_ENV:-}"

# DATABASE_URL이 없으면 개별 환경변수로 구성
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "[entry] Building DATABASE_URL from individual env vars..."
  echo "[entry] DB_USER=${DB_USER}"
  echo "[entry] DB_HOST=${DB_HOST}"
  echo "[entry] DB_PORT=${DB_PORT:-5432}"
  echo "[entry] DB_NAME=${DB_NAME}"
  export DATABASE_URL="postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT:-5432}/${DB_NAME}"
  echo "[entry] DATABASE_URL=${DATABASE_URL}"
fi

# ---- Cloud Run 다중 인스턴스 중복 방지 (advisory lock) ----
try_lock() {
  node -e 'const { Client } = require("pg");
    (async () => {
      const c = new Client({ connectionString: process.env.DATABASE_URL });
      await c.connect();
      const r = await c.query("SELECT pg_try_advisory_lock($1,$2) ok",[42,9001]);
      console.log("lock?", r.rows[0].ok);
      process.exit(r.rows[0].ok ? 0 : 2);
    })().catch(e=>{console.error(e);process.exit(1)})'
}

unlock() {
  node -e 'const { Client } = require("pg");
    (async () => {
      const c = new Client({ connectionString: process.env.DATABASE_URL });
      await c.connect();
      await c.query("SELECT pg_advisory_unlock($1,$2)",[42,9001]);
      process.exit(0);
    })().catch(()=>process.exit(0))'
}

if [[ "${MIGRATE_ON_BOOT:-0}" == "1" ]]; then
  echo "[entry] run migrations..."
  if try_lock; then
    echo "[entry] acquired lock, running migrations..."
    # TypeScript로 직접 실행 (ts-node 사용)
    if TS_NODE_TRANSPILE_ONLY=1 node -r ts-node/register -r tsconfig-paths/register ./node_modules/typeorm/cli.js -d src/data-source.ts migration:run; then
      echo "[entry] migrations completed successfully"
    else
      echo "[entry] migration failed, but continuing..."
    fi
    unlock || true
  else
    echo "[entry] another instance migrating; skip"
  fi
fi

echo "[entry] start app..."
exec node dist/main.js
