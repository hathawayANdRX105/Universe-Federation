/*
 * SPDX-FileCopyrightText: Universe Federation contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class ApiNoApproval1781900000000 {
	name = 'ApiNoApproval1781900000000';

	async up(queryRunner) {
		await queryRunner.query(`ALTER TABLE "meta" ADD COLUMN IF NOT EXISTS "apiNoApprovalPermissions" character varying(64) array NOT NULL DEFAULT '{}'`);
		await queryRunner.query(`ALTER TABLE "meta" ADD COLUMN IF NOT EXISTS "apiAllowDeveloperTokens" boolean NOT NULL DEFAULT true`);
	}

	async down(queryRunner) {
		await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN "apiAllowDeveloperTokens"`);
		await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN "apiNoApprovalPermissions"`);
	}
}
