/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class DropApiDefaultOAuthCallbackUrl1780700000002 {
	name = 'DropApiDefaultOAuthCallbackUrl1780700000002'

	async up(queryRunner) {
		await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN IF EXISTS "apiDefaultOAuthCallbackUrl"`);
	}

	async down(queryRunner) {
		await queryRunner.query(`ALTER TABLE "meta" ADD COLUMN IF NOT EXISTS "apiDefaultOAuthCallbackUrl" character varying(512)`);
	}
}
