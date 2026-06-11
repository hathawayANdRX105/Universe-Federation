/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class MarkPersonalApiTokensDeveloper1780700000003 {
	name = 'MarkPersonalApiTokensDeveloper1780700000003'

	async up(queryRunner) {
		await queryRunner.query(`UPDATE "access_token" SET "isDeveloperToken" = true, "status" = 'active' WHERE "appId" IS NULL AND "status" = 'active' AND "isDeveloperToken" = false`);
	}

	async down() {
		// No-op: after marking legacy personal tokens as manageable API tokens, their previous origin cannot be inferred safely.
	}
}
