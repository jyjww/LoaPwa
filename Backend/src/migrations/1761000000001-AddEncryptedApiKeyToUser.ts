import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEncryptedApiKeyToUser1761000000001 implements MigrationInterface {
  name = 'AddEncryptedApiKeyToUser1761000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "encrypted_api_key" TEXT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "encrypted_api_key"
    `);
  }
}
