/*
 * SPDX-FileCopyrightText: Universe Federation contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import type { NotesRepository } from '@/models/_.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { DI } from '@/di-symbols.js';
import { IdService } from '@/core/IdService.js';
import { TimeService } from '@/global/TimeService.js';
import { QueueService } from '@/core/QueueService.js';

export const meta = {
	tags: ['admin'],

	requireCredential: true,
	requireModerator: true,
	kind: 'write:admin:recommendation',

	// モデルDL+推論を伴うため、短時間の多重実行を避ける
	limit: {
		duration: 1000 * 60,
		max: 3,
	},

	res: {
		type: 'object',
		optional: false, nullable: false,
		properties: {
			enqueued: { type: 'number', optional: false, nullable: false },
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		// 直近何日分を対象にするか
		days: { type: 'integer', minimum: 1, maximum: 30, default: 3 },
		// 1回で投入する最大件数
		limit: { type: 'integer', minimum: 1, maximum: 5000, default: 1000 },
	},
	required: [],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.notesRepository)
		private notesRepository: NotesRepository,

		private idService: IdService,
		private queueService: QueueService,
		private readonly timeService: TimeService,
	) {
		super(meta, paramDef, async (ps) => {
			const sinceId = this.idService.gen(this.timeService.now - 1000 * 60 * 60 * 24 * ps.days);
			// ローカルの公開テキスト投稿のみ。新しい順に limit 件。
			const notes = await this.notesRepository.createQueryBuilder('note')
				.select('note.id')
				.where('note.id > :sinceId', { sinceId })
				.andWhere('note.userHost IS NULL')
				.andWhere('note.visibility = \'public\'')
				.andWhere('note.text IS NOT NULL')
				.orderBy('note.id', 'DESC')
				.limit(ps.limit)
				.getMany();

			for (const note of notes) {
				await this.queueService.createAnalyzeSentimentJob(note.id);
			}

			return { enqueued: notes.length };
		});
	}
}
