import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixAnonUserIdColumn1760979000000 implements MigrationInterface {
  name = 'FixAnonUserIdColumn1760979000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add anonUserId column if not exists (TypeORM convention)
    await queryRunner.query(`
      ALTER TABLE "favorite" 
      ADD COLUMN IF NOT EXISTS "anonUserId" uuid
    `);

    // Add foreign key constraint if not exists
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint c
          JOIN pg_class t ON t.oid = c.conrelid
          WHERE t.relname = 'favorite' AND c.conname = 'FK_favorite_anonUserId'
        ) THEN
          ALTER TABLE "favorite" 
          ADD CONSTRAINT "FK_favorite_anonUserId" 
          FOREIGN KEY ("anonUserId") REFERENCES "anon_users"("id") ON DELETE CASCADE;
        END IF;
      END$$;
    `);

    // Add unique constraints if not exists
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint c
          JOIN pg_class t ON t.oid = c.conrelid
          WHERE t.relname = 'favorite' AND c.conname = 'UQ_favorite_user_item'
        ) THEN
          ALTER TABLE "favorite" 
          ADD CONSTRAINT "UQ_favorite_user_item" 
          UNIQUE ("userId", "matchKey");
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint c
          JOIN pg_class t ON t.oid = c.conrelid
          WHERE t.relname = 'favorite' AND c.conname = 'UQ_favorite_anon_item'
        ) THEN
          ALTER TABLE "favorite" 
          ADD CONSTRAINT "UQ_favorite_anon_item" 
          UNIQUE ("anonUserId", "matchKey");
        END IF;
      END$$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop unique constraints
    await queryRunner.query(
      `ALTER TABLE "favorite" DROP CONSTRAINT IF EXISTS "UQ_favorite_anon_item"`,
    );
    await queryRunner.query(
      `ALTER TABLE "favorite" DROP CONSTRAINT IF EXISTS "UQ_favorite_user_item"`,
    );

    // Drop foreign key constraint
    await queryRunner.query(
      `ALTER TABLE "favorite" DROP CONSTRAINT IF EXISTS "FK_favorite_anonUserId"`,
    );

    // Drop column
    await queryRunner.query(`ALTER TABLE "favorite" DROP COLUMN IF EXISTS "anonUserId"`);
  }
}
