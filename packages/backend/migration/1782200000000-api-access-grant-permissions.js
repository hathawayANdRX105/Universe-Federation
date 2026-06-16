/*
 * SPDX-FileCopyrightText: Universe Federation contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class ApiAccessGrantPermissions1782200000000 {
	name = 'ApiAccessGrantPermissions1782200000000';

	async up(queryRunner) {
		await queryRunner.query(`ALTER TABLE "api_access_grant" ADD COLUMN IF NOT EXISTS "requestedPermissions" character varying(256) array NOT NULL DEFAULT '{}'`);
	}

	async down(queryRunner) {
		await queryRunner.query(`ALTER TABLE "api_access_grant" DROP COLUMN "requestedPermissions"`);
	}
}
