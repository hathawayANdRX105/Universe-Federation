/*
 * SPDX-FileCopyrightText: Universe Federation contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class ChatRoomModeration1781600000000 {
	name = 'ChatRoomModeration1781600000000';

	async up(queryRunner) {
		await queryRunner.query(`ALTER TABLE "chat_room" ADD COLUMN IF NOT EXISTS "slowModeSeconds" integer NOT NULL DEFAULT 0`);
		await queryRunner.query(`ALTER TABLE "chat_room" ADD COLUMN IF NOT EXISTS "bannedKeywords" character varying(256) array NOT NULL DEFAULT '{}'`);
		await queryRunner.query(`ALTER TABLE "chat_room" ADD COLUMN IF NOT EXISTS "keywordMuteSeconds" integer NOT NULL DEFAULT 0`);
	}

	async down(queryRunner) {
		await queryRunner.query(`ALTER TABLE "chat_room" DROP COLUMN "keywordMuteSeconds"`);
		await queryRunner.query(`ALTER TABLE "chat_room" DROP COLUMN "bannedKeywords"`);
		await queryRunner.query(`ALTER TABLE "chat_room" DROP COLUMN "slowModeSeconds"`);
	}
}
