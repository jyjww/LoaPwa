import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFavoriteTimestampsAndIndexes1759312941631 implements MigrationInterface {
  name = 'AddFavoriteTimestampsAndIndexes1759312941631';

  public async up(q: QueryRunner): Promise<void> {
    // 컬럼: 이미 있으면 스킵
    await q.query(`
      ALTER TABLE "favorite"
      ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    `);
    await q.query(`
      ALTER TABLE "favorite"
      ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
    `);

    // 필요한 인덱스가 있다면 모두 IF NOT EXISTS로
    // 예시) matchKey 인덱스는 InitSchema에서 이미 만들었으니 여기선 생략하거나 안전하게 IF NOT EXISTS로 한 번 더
    await q.query(`
      CREATE INDEX IF NOT EXISTS "idx_favorite_matchkey"
      ON "favorite" ("matchKey")
    `);

    // (선택) updatedAt 자동 갱신 트리거가 필요하다면 여기에서 생성 (없다면 생략)
    // DO $$ ... $$ 블록으로 존재 체크 후 생성하는 패턴을 쓰면 안전합니다.
    // 이번엔 기존 로직 변경하지 말자고 하셨으니 생략합니다.
  }

  public async down(q: QueryRunner): Promise<void> {
    // 인덱스/컬럼 제거 시에도 IF EXISTS로 안전하게
    await q.query(`DROP INDEX IF EXISTS "idx_favorite_matchkey"`);

    await q.query(`
      ALTER TABLE "favorite" DROP COLUMN IF EXISTS "updatedAt"
    `);
    await q.query(`
      ALTER TABLE "favorite" DROP COLUMN IF EXISTS "createdAt"
    `);
  }
}
