/*
 * SPDX-FileCopyrightText: Universe Federation contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class UrlPreviewOutboundProxy1782400000000 {
	name = 'UrlPreviewOutboundProxy1782400000000';

	async up(queryRunner) {
		await queryRunner.query(`ALTER TABLE "meta" ADD COLUMN IF NOT EXISTS "urlPreviewProxyMode" character varying(16) NOT NULL DEFAULT 'outbound'`);
		await queryRunner.query(`ALTER TABLE "meta" ADD COLUMN IF NOT EXISTS "urlPreviewOutboundProxies" jsonb NOT NULL DEFAULT '[]'`);
		await queryRunner.query(`ALTER TABLE "meta" ADD COLUMN IF NOT EXISTS "urlPreviewProxyStrategy" character varying(16) NOT NULL DEFAULT 'failover'`);
		await queryRunner.query(`UPDATE "meta" SET "urlPreviewProxyMode" = 'summaly' WHERE "urlPreviewSummaryProxyUrl" IS NOT NULL AND btrim("urlPreviewSummaryProxyUrl") <> ''`);
	}

	async down(queryRunner) {
		await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN IF EXISTS "urlPreviewProxyStrategy"`);
		await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN IF EXISTS "urlPreviewOutboundProxies"`);
		await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN IF EXISTS "urlPreviewProxyMode"`);
	}
}
