/*
 * SPDX-FileCopyrightText: Universe Federation contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class SignupEmailRules1781800000000 {
	name = 'SignupEmailRules1781800000000';

	async up(queryRunner) {
		await queryRunner.query(`ALTER TABLE "meta" ADD COLUMN IF NOT EXISTS "signupEmailRestriction" boolean NOT NULL DEFAULT false`);
		await queryRunner.query(`ALTER TABLE "meta" ADD COLUMN IF NOT EXISTS "signupEmailRules" jsonb NOT NULL DEFAULT '[]'`);
	}

	async down(queryRunner) {
		await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN "signupEmailRules"`);
		await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN "signupEmailRestriction"`);
	}
}
