/*
 * SPDX-FileCopyrightText: Universe Federation contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class RecommendationConfig1781300000000 {
	name = 'RecommendationConfig1781300000000';

	async up(queryRunner) {
		await queryRunner.query(`ALTER TABLE "meta" ADD COLUMN IF NOT EXISTS "recommendationConfig" jsonb NOT NULL DEFAULT '{}'`);
	}

	async down(queryRunner) {
		await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN IF EXISTS "recommendationConfig"`);
	}
}
