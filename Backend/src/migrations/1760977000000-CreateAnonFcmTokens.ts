import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAnonFcmTokens1760977000000 implements MigrationInterface {
  name = 'CreateAnonFcmTokens1760977000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "anon_fcm_tokens" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "token" character varying NOT NULL,
        "anonUserId" uuid NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "lastUsedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_anon_fcm_tokens_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_anon_fcm_tokens_token" ON "anon_fcm_tokens" ("token")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_anon_fcm_tokens_anonUserId" ON "anon_fcm_tokens" ("anonUserId")
    `);

    await queryRunner.query(`
      ALTER TABLE "anon_fcm_tokens" 
      ADD CONSTRAINT "FK_anon_fcm_tokens_anonUserId" 
      FOREIGN KEY ("anonUserId") REFERENCES "anon_users"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_anon_fcm_tokens_anonUserId"`);
    await queryRunner.query(`DROP INDEX "IDX_anon_fcm_tokens_token"`);
    await queryRunner.query(`DROP TABLE "anon_fcm_tokens"`);
  }
}
