/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class ChatRoomModeration1781000000000 {
	name = 'ChatRoomModeration1781000000000'

	async up(queryRunner) {
		await queryRunner.query(`ALTER TABLE "chat_room" ADD "avatarId" character varying(32)`);
		await queryRunner.query(`ALTER TABLE "chat_room" ADD "avatarUrl" character varying(512)`);
		await queryRunner.query(`ALTER TABLE "chat_room" ADD "isSilenced" boolean NOT NULL DEFAULT false`);
		await queryRunner.query(`CREATE INDEX "IDX_chat_room_avatarId" ON "chat_room" ("avatarId") `);
		await queryRunner.query(`ALTER TABLE "chat_room" ADD CONSTRAINT "FK_chat_room_avatarId" FOREIGN KEY ("avatarId") REFERENCES "drive_file"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
		await queryRunner.query(`ALTER TABLE "chat_room_membership" ADD "mutedUntil" TIMESTAMP WITH TIME ZONE`);
		await queryRunner.query(`CREATE TABLE "chat_room_banning" ("id" character varying(32) NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "roomId" character varying(32) NOT NULL, "userId" character varying(32) NOT NULL, CONSTRAINT "PK_chat_room_banning_id" PRIMARY KEY ("id"))`);
		await queryRunner.query(`CREATE INDEX "IDX_chat_room_banning_createdAt" ON "chat_room_banning" ("createdAt") `);
		await queryRunner.query(`CREATE INDEX "IDX_chat_room_banning_roomId" ON "chat_room_banning" ("roomId") `);
		await queryRunner.query(`CREATE INDEX "IDX_chat_room_banning_userId" ON "chat_room_banning" ("userId") `);
		await queryRunner.query(`CREATE UNIQUE INDEX "IDX_chat_room_banning_unique" ON "chat_room_banning" ("roomId", "userId") `);
		await queryRunner.query(`ALTER TABLE "chat_room_banning" ADD CONSTRAINT "FK_chat_room_banning_roomId" FOREIGN KEY ("roomId") REFERENCES "chat_room"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
		await queryRunner.query(`ALTER TABLE "chat_room_banning" ADD CONSTRAINT "FK_chat_room_banning_userId" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
	}

	async down(queryRunner) {
		await queryRunner.query(`ALTER TABLE "chat_room_banning" DROP CONSTRAINT "FK_chat_room_banning_userId"`);
		await queryRunner.query(`ALTER TABLE "chat_room_banning" DROP CONSTRAINT "FK_chat_room_banning_roomId"`);
		await queryRunner.query(`DROP INDEX "public"."IDX_chat_room_banning_unique"`);
		await queryRunner.query(`DROP INDEX "public"."IDX_chat_room_banning_userId"`);
		await queryRunner.query(`DROP INDEX "public"."IDX_chat_room_banning_roomId"`);
		await queryRunner.query(`DROP INDEX "public"."IDX_chat_room_banning_createdAt"`);
		await queryRunner.query(`DROP TABLE "chat_room_banning"`);
		await queryRunner.query(`ALTER TABLE "chat_room_membership" DROP COLUMN "mutedUntil"`);
		await queryRunner.query(`ALTER TABLE "chat_room" DROP CONSTRAINT "FK_chat_room_avatarId"`);
		await queryRunner.query(`DROP INDEX "public"."IDX_chat_room_avatarId"`);
		await queryRunner.query(`ALTER TABLE "chat_room" DROP COLUMN "isSilenced"`);
		await queryRunner.query(`ALTER TABLE "chat_room" DROP COLUMN "avatarUrl"`);
		await queryRunner.query(`ALTER TABLE "chat_room" DROP COLUMN "avatarId"`);
	}
}
