import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAnonUsers1760976123456 implements MigrationInterface {
  name = 'CreateAnonUsers1760976123456';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "anon_users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "lastSeenAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "userAgent" character varying,
        "lastIp" character varying,
        CONSTRAINT "PK_anon_users_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_anon_users_lastSeenAt" ON "anon_users" ("lastSeenAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_anon_users_lastSeenAt"`);
    await queryRunner.query(`DROP TABLE "anon_users"`);
  }
}
