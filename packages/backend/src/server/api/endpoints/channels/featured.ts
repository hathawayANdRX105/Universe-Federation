/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { ChannelsRepository } from '@/models/_.js';
import { ChannelEntityService } from '@/core/entities/ChannelEntityService.js';
import { DI } from '@/di-symbols.js';

export const meta = {
	tags: ['channels'],

	requireCredential: false,

	res: {
		type: 'array',
		optional: false, nullable: false,
		items: {
			type: 'object',
			optional: false, nullable: false,
			ref: 'Channel',
		},
	},

	// 3 calls per second
	limit: {
		duration: 1000,
		max: 3,
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {},
	required: [],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.channelsRepository)
		private channelsRepository: ChannelsRepository,

		private channelEntityService: ChannelEntityService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const query = this.channelsRepository.createQueryBuilder('channel')
				.where('channel.lastNotedAt IS NOT NULL')
				.andWhere('channel.isArchived = FALSE')
				.andWhere('channel.isSensitive = FALSE')
				.andWhere('channel.name !~* :lowValueChannelPattern')
				.orderBy(`(
					LEAST(channel."notesCount", 500) * 0.35
					+ LEAST(channel."usersCount", 200) * 1.6
					+ CASE WHEN channel."lastNotedAt" > now() - interval '48 hours' THEN 45 ELSE 0 END
					+ CASE WHEN channel."lastNotedAt" > now() - interval '7 days' THEN 20 ELSE -20 END
					+ cardinality(channel."pinnedNoteIds") * 6
				)`, 'DESC')
				.setParameter('lowValueChannelPattern', '^(Key|key|白嫖|签到|打卡)$')
				.addOrderBy('channel.lastNotedAt', 'DESC', 'NULLS LAST');

			const channels = await query.limit(10).getMany();

			return await Promise.all(channels.map(x => this.channelEntityService.pack(x, me)));
		});
	}
}
