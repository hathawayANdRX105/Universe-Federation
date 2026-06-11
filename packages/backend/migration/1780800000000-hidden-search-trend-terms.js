/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class HiddenSearchTrendTerms1780800000000 {
	name = 'HiddenSearchTrendTerms1780800000000'

	async up(queryRunner) {
		await queryRunner.query(`ALTER TABLE "meta" ADD "hiddenSearchTrendTerms" character varying(1024) array NOT NULL DEFAULT '{}'`);
	}

	async down(queryRunner) {
		await queryRunner.query(`ALTER TABLE "meta" DROP COLUMN "hiddenSearchTrendTerms"`);
	}
}
