import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1759312941630 implements MigrationInterface {
  name = 'InitSchema1759312941630';

  public async up(q: QueryRunner): Promise<void> {
    // 확장자 (없어도 동작하지만 있으면 uuid_generate_v4() 사용 시 편의)
    await q.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // users
    await q.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying NOT NULL,
        "name" character varying,
        "picture" character varying,
        "provider" character varying,
        CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"),
        CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")
      )
    `);

    // favorite (FK는 아래에서 조건부로 추가)
    await q.query(`
      CREATE TABLE IF NOT EXISTS "favorite" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "itemId" bigint,
        "matchKey" character varying(200),
        "name" character varying NOT NULL,
        "grade" character varying NOT NULL,
        "tier" integer,
        "icon" character varying NOT NULL,
        "quality" integer,
        "currentPrice" numeric(12,2) NOT NULL,
        "previousPrice" numeric(12,2),
        "targetPrice" numeric(12,2) NOT NULL DEFAULT '0',
        "source" character varying NOT NULL,
        "auctionInfo" jsonb,
        "marketInfo" jsonb,
        "options" jsonb,
        "isAlerted" boolean NOT NULL DEFAULT false,
        "lastCheckedAt" TIMESTAMP WITH TIME ZONE,
        "lastNotifiedAt" TIMESTAMP WITH TIME ZONE,
        "active" boolean NOT NULL DEFAULT true,
        "userId" uuid,
        CONSTRAINT "PK_495675cec4fb09666704e4f610f" PRIMARY KEY ("id")
      )
    `);

    // 인덱스 (존재하면 스킵)
    await q.query(`
      CREATE INDEX IF NOT EXISTS "idx_favorite_matchkey"
      ON "favorite" ("matchKey")
    `);

    // fcm_tokens (FK는 아래에서 조건부로 추가)
    await q.query(`
      CREATE TABLE IF NOT EXISTS "fcm_tokens" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "token" character varying NOT NULL,
        "userId" uuid,
        CONSTRAINT "PK_0802a779d616597e9330bb9a7cc" PRIMARY KEY ("id")
      )
    `);

    // ---- FK 조건부 추가 (Postgres는 ADD CONSTRAINT IF NOT EXISTS 미지원 → 존재여부 확인 후 추가)
    await q.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint c
          JOIN pg_class t ON t.oid = c.conrelid
          WHERE t.relname = 'favorite' AND c.conname = 'FK_83b775fdebbe24c29b2b5831f2d'
        ) THEN
          ALTER TABLE "favorite"
          ADD CONSTRAINT "FK_83b775fdebbe24c29b2b5831f2d"
          FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END$$;
    `);

    await q.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint c
          JOIN pg_class t ON t.oid = c.conrelid
          WHERE t.relname = 'fcm_tokens' AND c.conname = 'FK_642d4f7ba5c6e019c2d8f5332a5'
        ) THEN
          ALTER TABLE "fcm_tokens"
          ADD CONSTRAINT "FK_642d4f7ba5c6e019c2d8f5332a5"
          FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END$$;
    `);
  }

  public async down(q: QueryRunner): Promise<void> {
    // FK 제거 (있을 때만)
    await q.query(
      `ALTER TABLE "fcm_tokens" DROP CONSTRAINT IF EXISTS "FK_642d4f7ba5c6e019c2d8f5332a5"`,
    );
    await q.query(
      `ALTER TABLE "favorite" DROP CONSTRAINT IF EXISTS "FK_83b775fdebbe24c29b2b5831f2d"`,
    );

    // 인덱스/테이블 제거 (있을 때만)
    await q.query(`DROP INDEX IF EXISTS "idx_favorite_matchkey"`);
    await q.query(`DROP TABLE IF EXISTS "favorite"`);
    await q.query(`DROP TABLE IF EXISTS "fcm_tokens"`);
    await q.query(`DROP TABLE IF EXISTS "users"`);
  }
}
