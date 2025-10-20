#!/usr/bin/env bash
set -euo pipefail
echo "[entry] NODE_ENV=${NODE_ENV:-}"

# ---- Cloud Run 다중 인스턴스 중복 방지 (advisory lock) ----
try_lock() {
  node -e "const { Client } = require('pg');
    (async () => {
      const c = new Client({ connectionString: process.env.DATABASE_URL });
      await c.connect();
      const r = await c.query('SELECT pg_try_advisory_lock($1,$2) ok',[42,9001]);
      console.log('lock?', r.rows[0].ok);
      process.exit(r.rows[0].ok ? 0 : 2);
    })().catch(e=>{console.error(e);process.exit(1)})"
}

unlock() {
  node -e "const { Client } = require('pg');
    (async () => {
      const c = new Client({ connectionString: process.env.DATABASE_URL });
      await c.connect();
      await c.query('SELECT pg_advisory_unlock($1,$2)',[42,9001]);
      process.exit(0);
    })().catch(()=>process.exit(0))"
}

if [[ "${MIGRATE_ON_BOOT:-0}" == "1" ]]; then
  echo "[entry] run migrations..."
  if try_lock; then
    node ./node_modules/typeorm/cli.js -d dist/data-source.js migration:run || true
    unlock || true
  else
    echo "[entry] another instance migrating; skip"
  fi
fi

echo "[entry] start app..."
exec node dist/main.js
