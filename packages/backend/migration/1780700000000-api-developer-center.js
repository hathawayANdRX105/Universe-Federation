/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class ApiDeveloperCenter1780700000000 {
	name = 'ApiDeveloperCenter1780700000000'

	async up(queryRunner) {
		await queryRunner.query(`CREATE TYPE "public"."meta_apiaccessmode_enum" AS ENUM('approval', 'open', 'closed')`);
		await queryRunner.query(`CREATE TYPE "public"."api_access_grant_status_enum" AS ENUM('none', 'pending', 'approved', 'rejected', 'suspended')`);
		await queryRunner.query(`CREATE TYPE "public"."app_status_enum" AS ENUM('pending', 'approved', 'suspended', 'rejected')`);
		await queryRunner.query(`CREATE TYPE "public"."access_token_status_enum" AS ENUM('active', 'suspended', 'revoked')`);

		await queryRunner.query(`ALTER TABLE "meta" ADD "apiAccessMode" "public"."meta_apiaccessmode_enum" NOT NULL DEFAULT 'open'`);
		await queryRunner.query(`ALTER TABLE "meta" ADD "enableOAuthLogin" boolean NOT NULL DEFAULT true`);
		await queryRunner.query(`ALTER TABLE "meta" ADD "enableOidc" boolean NOT NULL DEFAULT true`);
		await queryRunner.query(`ALTER TABLE "meta" ADD "apiRequireAppApproval" boolean NOT NULL DEFAULT false`);
		await queryRunner.query(`ALTER TABLE "meta" ADD "apiPublicPermissions" character varying(64) array NOT NULL DEFAULT '{read:profile,write:notes,read:drive,write:drive,read:channels,write:channels,read:following,write:following,read:blocks,write:blocks,read:mutes,write:mutes,read:notifications,write:notifications,read:chat,write:chat}'`);
		await queryRunner.query(`ALTER TABLE "meta" ADD "apiDefaultTokenRateLimit" integer NOT NULL DEFAULT 60`);
		await queryRunner.query(`ALTER TABLE "meta" ADD "apiWriteTokenRateLimit" integer NOT NULL DEFAULT 20`);

		await queryRunner.query(`ALTER TABLE "app" ADD "callbackUrls" character varying(512) array NOT NULL DEFAULT '{}'`);
		await queryRunner.query(`UPDATE "app" SET "callbackUrls" = ARRAY["callbackUrl"]::varchar[] WHERE "callbackUrl" IS NOT NULL`);
		await queryRunner.query(`ALTER TABLE "app" ADD "status" "public"."app_status_enum" NOT NULL DEFAULT 'approved'`);
		await queryRunner.query(`ALTER TABLE "app" ADD "websiteUrl" character varying(1024)`);
		await queryRunner.query(`ALTER TABLE "app" ADD "iconUrl" character varying(512)`);
		await queryRunner.query(`ALTER TABLE "app" ADD "rateLimitPerMinute" integer`);
		await queryRunner.query(`ALTER TABLE "app" ADD "approvedAt" TIMESTAMP WITH TIME ZONE`);
		await queryRunner.query(`ALTER TABLE "app" ADD "suspendedAt" TIMESTAMP WITH TIME ZONE`);
		await queryRunner.query(`ALTER TABLE "app" ADD "reviewNote" text`);
		await queryRunner.query(`CREATE INDEX "IDX_app_status" ON "app" ("status") `);

		await queryRunner.query(`ALTER TABLE "access_token" ADD "status" "public"."access_token_status_enum" NOT NULL DEFAULT 'active'`);
		await queryRunner.query(`ALTER TABLE "access_token" ADD "rateLimitPerMinute" integer`);
		await queryRunner.query(`ALTER TABLE "access_token" ADD "isDeveloperToken" boolean NOT NULL DEFAULT false`);
		await queryRunner.query(`CREATE INDEX "IDX_access_token_status" ON "access_token" ("status") `);
		await queryRunner.query(`CREATE INDEX "IDX_access_token_isDeveloperToken" ON "access_token" ("isDeveloperToken") `);

		await queryRunner.query(`CREATE TABLE "api_access_grant" ("id" character varying(32) NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "userId" character varying(32) NOT NULL, "status" "public"."api_access_grant_status_enum" NOT NULL DEFAULT 'pending', "reason" text, "reviewerId" character varying(32), "reviewedAt" TIMESTAMP WITH TIME ZONE, "reviewNote" text, CONSTRAINT "PK_api_access_grant_id" PRIMARY KEY ("id"))`);
		await queryRunner.query(`CREATE INDEX "IDX_api_access_grant_createdAt" ON "api_access_grant" ("createdAt") `);
		await queryRunner.query(`CREATE INDEX "IDX_api_access_grant_updatedAt" ON "api_access_grant" ("updatedAt") `);
		await queryRunner.query(`CREATE INDEX "IDX_api_access_grant_userId" ON "api_access_grant" ("userId") `);
		await queryRunner.query(`CREATE INDEX "IDX_api_access_grant_status" ON "api_access_grant" ("status") `);
		await queryRunner.query(`CREATE UNIQUE INDEX "IDX_api_access_grant_userId_unique" ON "api_access_grant" ("userId") `);
		await queryRunner.query(`ALTER TABLE "api_access_grant" ADD CONSTRAINT "FK_api_access_grant_userId" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
		await queryRunner.query(`ALTER TABLE "api_access_grant" ADD CONSTRAINT "FK_api_access_grant_reviewerId" FOREIGN KEY ("reviewerId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
	}

	async down(queryRunner) {
		await queryRunner.query(`ALTER TABLE "api_access_grant" DROP CONSTRAINT "FK_api_access_grant_reviewerId"`);
		await queryRunner.query(`ALTER TABLE "api_access_grant" DROP CONSTRAINT "FK_api_access_grant_userId"`);
		await queryRunner.query(`DROP INDEX "public"."IDX_api_access_grant_userId_unique"`);
		await queryRunner.query(`DROP INDEX "public"."IDX_api_access_grant_status"`);
		await queryRunner.query(`DROP INDEX "public"."IDX_api_access_grant_userId"`);
		await queryRunner.query(`DROP INDEX "public"."IDX_api_access_grant_updatedAt"`);
		await queryRunner.query(`DROP INDEX "public"."IDX_api_access_grant_createdAt"`);
		await queryRunner.query(`DROP TABLE "api_access_grant"`);

		await queryRunner.query(`DROP INDEX "public"."IDX_access_token_isDeveloperToken"`);
		await queryRunner.query(`DROP INDEX "public"."IDX_access_token_status"`);
		await queryRunner.query(`ALTER TABLE "access_token" DROP COLUMN "isDeveloperToken"`);
		await queryRunner.query(`ALTER TABLE "access_token" DROP COLUMN "rateLimitPerMinute"`);
		await queryRunner.query(`ALTER TABLE "access_token" DROP COLUMN "status"`);

		await queryRunner.query(`DROP INDEX "public"."IDX_app_status"`);
		await queryRunner.query(`ALTER TABLE "app" DROP COLUMN "reviewNote"`);
		await queryRunner.query(`ALTER TABLE "app" DROP COLUMN "suspendedAt"`);
		await queryRunner.query(`ALTER TABLE "app" DROP COLUMN "approvedAt"`);
		await queryRunner.query(`ALTER TABLE "app" DROP COLUMN "rateLimitPerMinute"`);
		await queryRunner.query(`ALTER TABLE "app" DROP COLUMN "iconUrl"`);
		await queryRunner.query(`ALTER TABLE "app" DROP COLUMN "websiteUrl"`);
		await queryRunner.query(`ALTER TABLE "app" DROP COLUMN "status"`);
		await queryRunner.query(`ALTER TABLE "app" DROP COLUMN "callbackUrls"`);

		await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN "apiWriteTokenRateLimit"`);
		await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN "apiDefaultTokenRateLimit"`);
		await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN "apiPublicPermissions"`);
		await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN "apiRequireAppApproval"`);
		await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN "enableOidc"`);
		await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN "enableOAuthLogin"`);
		await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN "apiAccessMode"`);

		await queryRunner.query(`DROP TYPE "public"."access_token_status_enum"`);
		await queryRunner.query(`DROP TYPE "public"."app_status_enum"`);
		await queryRunner.query(`DROP TYPE "public"."api_access_grant_status_enum"`);
		await queryRunner.query(`DROP TYPE "public"."meta_apiaccessmode_enum"`);
	}
}
