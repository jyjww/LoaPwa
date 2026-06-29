import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDailyPriceSummaryAndRetention1761000000000 implements MigrationInterface {
  name = 'CreateDailyPriceSummaryAndRetention1761000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create daily_price_summary table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "daily_price_summary" (
        "id"           BIGSERIAL     PRIMARY KEY,
        "item_id"      VARCHAR(64)   NOT NULL,
        "date"         DATE          NOT NULL,
        "min_price"    NUMERIC(12,2) NOT NULL,
        "max_price"    NUMERIC(12,2) NOT NULL,
        "avg_price"    NUMERIC(12,2) NOT NULL,
        "open_price"   NUMERIC(12,2) NOT NULL,
        "close_price"  NUMERIC(12,2) NOT NULL,
        "sample_count" INTEGER       NOT NULL DEFAULT 0,
        "source"       VARCHAR(32)   NOT NULL DEFAULT 'api',
        CONSTRAINT "uq_daily_price_summary_item_date" UNIQUE ("item_id", "date")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_daily_price_summary_item_date"
        ON "daily_price_summary" ("item_id", "date")
    `);

    // 2. Add index on price_history.captured_at for efficient range deletes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_price_history_captured_at"
        ON "price_history" ("captured_at")
    `);

    // 3. Add index on price_history.item_id for efficient aggregation
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_price_history_item_id"
        ON "price_history" ("item_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_price_history_item_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_price_history_captured_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_daily_price_summary_item_date"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "daily_price_summary"`);
  }
}
