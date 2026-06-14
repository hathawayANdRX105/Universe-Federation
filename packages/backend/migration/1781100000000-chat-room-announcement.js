/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class ChatRoomAnnouncement1781100000000 {
	name = 'ChatRoomAnnouncement1781100000000'

	async up(queryRunner) {
		await queryRunner.query(`ALTER TABLE "chat_room" ADD "announcement" character varying(2048) NOT NULL DEFAULT ''`);
		await queryRunner.query(`ALTER TABLE "chat_room" ADD "announcementPinned" boolean NOT NULL DEFAULT false`);
	}

	async down(queryRunner) {
		await queryRunner.query(`ALTER TABLE "chat_room" DROP COLUMN "announcementPinned"`);
		await queryRunner.query(`ALTER TABLE "chat_room" DROP COLUMN "announcement"`);
	}
}
