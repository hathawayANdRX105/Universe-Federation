/*
 * SPDX-FileCopyrightText: Universe Federation contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class NoteSentiment1781400000000 {
	name = 'NoteSentiment1781400000000';

	async up(queryRunner) {
		await queryRunner.query(`CREATE TABLE IF NOT EXISTS "note_sentiment" (
			"noteId" varchar(32) NOT NULL,
			"score" real NOT NULL DEFAULT 0,
			"label" varchar(16) NOT NULL,
			"magnitude" real NOT NULL DEFAULT 0,
			"analyzedAt" timestamp with time zone NOT NULL,
			CONSTRAINT "PK_note_sentiment_noteId" PRIMARY KEY ("noteId")
		)`);
		await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_note_sentiment_score" ON "note_sentiment" ("score")`);
		await queryRunner.query(`ALTER TABLE "note_sentiment" ADD CONSTRAINT "FK_note_sentiment_noteId" FOREIGN KEY ("noteId") REFERENCES "note"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
	}

	async down(queryRunner) {
		await queryRunner.query(`ALTER TABLE "note_sentiment" DROP CONSTRAINT "FK_note_sentiment_noteId"`);
		await queryRunner.query(`DROP INDEX "IDX_note_sentiment_score"`);
		await queryRunner.query(`DROP TABLE "note_sentiment"`);
	}
}
