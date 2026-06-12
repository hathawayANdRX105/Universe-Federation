/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class ChannelHiddenSearchTrendTerms1780900000000 {
	name = 'ChannelHiddenSearchTrendTerms1780900000000'

	async up(queryRunner) {
		await queryRunner.query(`ALTER TABLE "channel" ADD "hiddenSearchTrendTerms" character varying(128) array NOT NULL DEFAULT '{}'`);
	}

	async down(queryRunner) {
		await queryRunner.query(`ALTER TABLE "channel" DROP COLUMN "hiddenSearchTrendTerms"`);
	}
}
