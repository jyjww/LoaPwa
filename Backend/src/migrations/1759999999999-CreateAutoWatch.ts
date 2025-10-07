import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAutoWatch1759999999999 implements MigrationInterface {
  name = 'CreateAutoWatch1759999999999';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE IF NOT EXISTS auto_watch (
        id BIGSERIAL PRIMARY KEY,
        user_id UUID NOT NULL,
        item_key VARCHAR(128) NOT NULL,   -- "market:123" | "auction:auc:xxxx"
        enabled BOOLEAN NOT NULL DEFAULT true,
        last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        last_snapshot_at TIMESTAMPTZ NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (user_id, item_key)
      );
    `);

    await q.query(`CREATE INDEX IF NOT EXISTS idx_auto_watch_enabled ON auto_watch (enabled);`);
    await q.query(`
      CREATE INDEX IF NOT EXISTS idx_auto_watch_last_seen
      ON auto_watch (last_seen_at DESC);
    `);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP INDEX IF EXISTS idx_auto_watch_last_seen;`);
    await q.query(`DROP INDEX IF EXISTS idx_auto_watch_enabled;`);
    await q.query(`DROP TABLE IF EXISTS auto_watch;`);
  }
}
