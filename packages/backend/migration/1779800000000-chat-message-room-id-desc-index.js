/*
 * SPDX-FileCopyrightText: Universe Federation contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { isConcurrentIndexMigrationEnabled } from './js/migration-config.js';

export class ChatMessageRoomIdDescIndex1779800000000 {
	name = 'ChatMessageRoomIdDescIndex1779800000000';
	transaction = isConcurrentIndexMigrationEnabled() ? false : undefined;

	async up(queryRunner) {
		const concurrently = isConcurrentIndexMigrationEnabled() ? 'CONCURRENTLY' : '';
		await queryRunner.query(`
			CREATE INDEX ${concurrently} IF NOT EXISTS "IDX_chat_message_room_id_desc"
			ON "chat_message" ("toRoomId", "id" DESC)
			WHERE "toRoomId" IS NOT NULL
		`);
	}

	async down(queryRunner) {
		const concurrently = isConcurrentIndexMigrationEnabled() ? 'CONCURRENTLY' : '';
		await queryRunner.query(`DROP INDEX ${concurrently} IF EXISTS "IDX_chat_message_room_id_desc"`);
	}
}
