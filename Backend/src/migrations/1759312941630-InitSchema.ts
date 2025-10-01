import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1759312941630 implements MigrationInterface {
    name = 'InitSchema1759312941630'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "favorite" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "itemId" bigint, "matchKey" character varying(200), "name" character varying NOT NULL, "grade" character varying NOT NULL, "tier" integer, "icon" character varying NOT NULL, "quality" integer, "currentPrice" numeric(12,2) NOT NULL, "previousPrice" numeric(12,2), "targetPrice" numeric(12,2) NOT NULL DEFAULT '0', "source" character varying NOT NULL, "auctionInfo" jsonb, "marketInfo" jsonb, "options" jsonb, "isAlerted" boolean NOT NULL DEFAULT false, "lastCheckedAt" TIMESTAMP WITH TIME ZONE, "lastNotifiedAt" TIMESTAMP WITH TIME ZONE, "active" boolean NOT NULL DEFAULT true, "userId" uuid, CONSTRAINT "PK_495675cec4fb09666704e4f610f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_favorite_matchkey" ON "favorite" ("matchKey") `);
        await queryRunner.query(`CREATE TABLE "fcm_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "token" character varying NOT NULL, "userId" uuid, CONSTRAINT "PK_0802a779d616597e9330bb9a7cc" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "name" character varying, "picture" character varying, "provider" character varying, CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "favorite" ADD CONSTRAINT "FK_83b775fdebbe24c29b2b5831f2d" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "fcm_tokens" ADD CONSTRAINT "FK_642d4f7ba5c6e019c2d8f5332a5" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "fcm_tokens" DROP CONSTRAINT "FK_642d4f7ba5c6e019c2d8f5332a5"`);
        await queryRunner.query(`ALTER TABLE "favorite" DROP CONSTRAINT "FK_83b775fdebbe24c29b2b5831f2d"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TABLE "fcm_tokens"`);
        await queryRunner.query(`DROP INDEX "public"."idx_favorite_matchkey"`);
        await queryRunner.query(`DROP TABLE "favorite"`);
    }

}
