/*
 * SPDX-FileCopyrightText: hhhl contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Brackets } from 'typeorm';
import { Inject, Injectable } from '@nestjs/common';
import type { ChannelsRepository, NotesRepository, UsersRepository } from '@/models/_.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { NoteEntityService } from '@/core/entities/NoteEntityService.js';
import { ChannelEntityService } from '@/core/entities/ChannelEntityService.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';
import { QueryService } from '@/core/QueryService.js';
import { SearchTrendService } from '@/core/SearchTrendService.js';
import { IdService } from '@/core/IdService.js';
import { TimeService } from '@/global/TimeService.js';
import { DI } from '@/di-symbols.js';

const DISCOVERY_WINDOW = 1000 * 60 * 60 * 24 * 7;
const DISCOVERY_FRESH_PRIORITY_HOURS = 48;

export const meta = {
	tags: ['notes'],

	requireCredential: false,

	res: {
		type: 'object',
		optional: false, nullable: false,
		properties: {
			trends: {
				type: 'object',
				optional: false, nullable: false,
				properties: {
					popularSearches: { type: 'array', optional: false, nullable: false, items: { type: 'string', optional: false, nullable: false } },
					recentTerms: { type: 'array', optional: false, nullable: false, items: { type: 'string', optional: false, nullable: false } },
					hashtags: { type: 'array', optional: false, nullable: false, items: { type: 'string', optional: false, nullable: false } },
				},
			},
			coverNotes: {
				type: 'array',
				optional: false, nullable: false,
				items: { type: 'object', optional: false, nullable: false, ref: 'Note' },
			},
			hotNotes: {
				type: 'array',
				optional: false, nullable: false,
				items: { type: 'object', optional: false, nullable: false, ref: 'Note' },
			},
			tutorialNotes: {
				type: 'array',
				optional: false, nullable: false,
				items: { type: 'object', optional: false, nullable: false, ref: 'Note' },
			},
			channels: {
				type: 'array',
				optional: false, nullable: false,
				items: { type: 'object', optional: false, nullable: false, ref: 'Channel' },
			},
			users: {
				type: 'array',
				optional: false, nullable: false,
				items: { type: 'object', optional: false, nullable: false, ref: 'User' },
			},
		},
	},

	limit: {
		duration: 1000,
		max: 3,
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		limit: { type: 'integer', minimum: 1, maximum: 10, default: 6 },
	},
	required: [],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.notesRepository)
		private notesRepository: NotesRepository,

		@Inject(DI.channelsRepository)
		private channelsRepository: ChannelsRepository,

		@Inject(DI.usersRepository)
		private usersRepository: UsersRepository,

		private noteEntityService: NoteEntityService,
		private channelEntityService: ChannelEntityService,
		private userEntityService: UserEntityService,
		private queryService: QueryService,
		private searchTrendService: SearchTrendService,
		private idService: IdService,
		private readonly timeService: TimeService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const sinceId = this.idService.gen(this.timeService.now - DISCOVERY_WINDOW);
			const [trends, coverNotes, hotNotes, tutorialNotes, channels, users] = await Promise.all([
				this.searchTrendService.getTrends(ps.limit),
				this.getCoverNotes(sinceId, ps.limit, me),
				this.getHotNotes(sinceId, ps.limit, me),
				this.getTutorialNotes(sinceId, ps.limit, me),
				this.getChannels(ps.limit, me),
				this.getUsers(ps.limit, me),
			]);

			return {
				trends,
				coverNotes,
				hotNotes,
				tutorialNotes,
				channels,
				users,
			};
		});
	}

	private baseNotesQuery(sinceId: string, me: Parameters<QueryService['generateVisibilityQuery']>[1]) {
		const query = this.notesRepository.createQueryBuilder('note')
			.where('note.id > :sinceId', { sinceId })
			.andWhere('note.visibility = \'public\'')
			.innerJoinAndSelect('note.user', 'user')
			.leftJoinAndSelect('note.reply', 'reply')
			.leftJoinAndSelect('note.renote', 'renote')
			.leftJoinAndSelect('reply.user', 'replyUser')
			.leftJoinAndSelect('renote.user', 'renoteUser')
			.leftJoinAndSelect('note.channel', 'channel');
		query
			.andWhere('LOWER(COALESCE(note.text, \'\')) !~ :discoveryLowValuePattern')
			.andWhere(new Brackets(qb => {
				qb.orWhere('note.tags IS NULL');
				qb.orWhere('NOT (note.tags && CAST(:discoveryLowValueTags AS varchar[]))');
			}))
			.setParameter('discoveryLowValuePattern', '签到|打卡|限时密钥|限时\\s*key|私\\s*key|tp-[a-z0-9_-]{16,}|sk-[a-z0-9_-]{12,}|白嫖|注册送|倍率|号池|强不强|偷着乐|点\\s*star|点\\s*start|买不了吃亏|买不了上当')
			.setParameter('discoveryLowValueTags', ['签到', '打卡', '水贴', 'Key', 'key']);
		this.queryService.generateVisibilityQuery(query, me);
		this.queryService.generateReplyTargetVisibilityQuery(query, me);
		this.queryService.generateBlockedHostQueryForNote(query);
		this.queryService.generateSuspendedUserQueryForNote(query);
		this.queryService.generateSilencedUserQueryForNotes(query, me);
		if (me) {
			this.queryService.generateMutedUserQueryForNotes(query, me);
			this.queryService.generateBlockedUserQueryForNotes(query, me);
			this.queryService.generateMutedNoteThreadQuery(query, me);
		}
		return query;
	}

	private async getCoverNotes(sinceId: string, limit: number, me: Parameters<NoteEntityService['packMany']>[1]) {
		const fresh48hId = this.idService.gen(this.timeService.now - 1000 * 60 * 60 * DISCOVERY_FRESH_PRIORITY_HOURS);
		const fresh3dId = this.idService.gen(this.timeService.now - 1000 * 60 * 60 * 24 * 3);
		const query = this.baseNotesQuery(sinceId, me)
			.andWhere('note.fileIds != \'{}\'')
			.andWhere('user.isBot = FALSE')
			.andWhere(new Brackets(qb => {
				qb.orWhere('note.id > :fresh3dId');
				qb.orWhere('note."repliesCount" + note."renoteCount" + note."clippedCount" >= 2');
				qb.orWhere('note.id = ANY(COALESCE(channel."pinnedNoteIds", ARRAY[]::varchar[]))');
			}))
			.orderBy(`(
				note."repliesCount" * 4
				+ note."renoteCount" * 3
				+ note."clippedCount" * 4
				+ CASE WHEN note.id > :fresh48hId THEN 46 ELSE -34 END
				+ CASE WHEN note.id > :fresh3dId THEN 12 ELSE -18 END
			)`, 'DESC')
			.addOrderBy('note.id', 'DESC')
			.setParameter('fresh48hId', fresh48hId)
			.setParameter('fresh3dId', fresh3dId)
			.limit(limit);
		return this.noteEntityService.packMany(await query.getMany(), me);
	}

	private async getHotNotes(sinceId: string, limit: number, me: Parameters<NoteEntityService['packMany']>[1]) {
		const fresh48hId = this.idService.gen(this.timeService.now - 1000 * 60 * 60 * DISCOVERY_FRESH_PRIORITY_HOURS);
		const fresh3dId = this.idService.gen(this.timeService.now - 1000 * 60 * 60 * 24 * 3);
		const query = this.baseNotesQuery(sinceId, me)
			.andWhere('user.isBot = FALSE')
			.andWhere('LENGTH(COALESCE(note.text, \'\')) >= 20')
			.andWhere(new Brackets(qb => {
				qb.orWhere('note.id > :fresh48hId');
				qb.orWhere('note."repliesCount" > 0');
				qb.orWhere('note."renoteCount" > 0');
				qb.orWhere('note."clippedCount" > 0');
				qb.orWhere('note."channelId" IS NOT NULL');
			}))
			.andWhere(new Brackets(qb => {
				qb.orWhere('note.id > :fresh3dId');
				qb.orWhere('note."repliesCount" + note."renoteCount" + note."clippedCount" >= 2');
				qb.orWhere('note.id = ANY(COALESCE(channel."pinnedNoteIds", ARRAY[]::varchar[]))');
			}))
			.orderBy(`(
				note."repliesCount" * 5
				+ note."renoteCount" * 4
				+ note."clippedCount" * 5
				+ CASE WHEN note."channelId" IS NOT NULL THEN 8 ELSE 0 END
				+ CASE WHEN note.id > :fresh48hId THEN 52 ELSE -38 END
				+ CASE WHEN note.id > :fresh3dId THEN 12 ELSE -18 END
				+ CASE WHEN LOWER(COALESCE(note.text, '')) ~ '(教程|指南|配置|部署|使用方法|怎么|如何|说明|公告|更新|修复|bug|问题|讨论|求助|ai|claude|codex|gpt)' THEN 12 ELSE 0 END
			)`, 'DESC')
			.addOrderBy('note.id', 'DESC')
			.setParameter('fresh48hId', fresh48hId)
			.setParameter('fresh3dId', fresh3dId)
			.limit(limit);
		return this.noteEntityService.packMany(await query.getMany(), me);
	}

	private async getTutorialNotes(sinceId: string, limit: number, me: Parameters<NoteEntityService['packMany']>[1]) {
		const fresh48hId = this.idService.gen(this.timeService.now - 1000 * 60 * 60 * DISCOVERY_FRESH_PRIORITY_HOURS);
		const fresh3dId = this.idService.gen(this.timeService.now - 1000 * 60 * 60 * 24 * 3);
		const query = this.baseNotesQuery(sinceId, me)
			.andWhere('user.isBot = FALSE')
			.andWhere(new Brackets(qb => {
				qb.orWhere('note.tags && CAST(:tutorialTags AS varchar[])');
				qb.orWhere('LOWER(COALESCE(note.text, \'\')) ~ :tutorialPattern');
			}))
			.andWhere(new Brackets(qb => {
				qb.orWhere('note.id > :fresh3dId');
				qb.orWhere('note."repliesCount" + note."renoteCount" + note."clippedCount" >= 2');
				qb.orWhere('LENGTH(COALESCE(note.text, \'\')) >= 120');
			}))
			.setParameter('tutorialTags', ['教程', 'AI', 'ai', 'Token', 'token', '资源', '指南', 'Bug', 'bug', '问题', '讨论'])
			.setParameter('tutorialPattern', '教程|指南|配置|部署|api|claude|codex|ai|gpt|token|key|资源|问题|讨论|求助')
			.orderBy(`(
				note."repliesCount" * 4
				+ note."renoteCount" * 3
				+ note."clippedCount" * 4
				+ CASE WHEN note."channelId" IS NOT NULL THEN 10 ELSE 0 END
				+ CASE WHEN note.id > :fresh48hId THEN 46 ELSE -36 END
				+ CASE WHEN note.id > :fresh3dId THEN 12 ELSE -18 END
				+ CASE WHEN LENGTH(COALESCE(note.text, '')) >= 80 THEN 10 ELSE 0 END
			)`, 'DESC')
			.addOrderBy('note.id', 'DESC')
			.setParameter('fresh48hId', fresh48hId)
			.setParameter('fresh3dId', fresh3dId)
			.limit(limit);
		return this.noteEntityService.packMany(await query.getMany(), me);
	}

	private async getChannels(limit: number, me: Parameters<ChannelEntityService['packMany']>[1]) {
		const channels = await this.channelsRepository.createQueryBuilder('channel')
			.where('channel.isArchived = FALSE')
			.andWhere('channel.isSensitive = FALSE')
			.andWhere('channel."notesCount" > 0')
			.andWhere('channel.name !~* :lowValueChannelPattern')
			.orderBy(`(
				LEAST(channel."notesCount", 500) * 0.35
				+ LEAST(channel."usersCount", 200) * 1.6
				+ CASE WHEN channel."lastNotedAt" > now() - interval '48 hours' THEN 45 ELSE 0 END
				+ CASE WHEN channel."lastNotedAt" > now() - interval '7 days' THEN 20 ELSE -20 END
				+ cardinality(channel."pinnedNoteIds") * 6
			)`, 'DESC')
			.setParameter('lowValueChannelPattern', '^(Key|key|白嫖|签到|打卡)$')
			.addOrderBy('channel.lastNotedAt', 'DESC', 'NULLS LAST')
			.limit(limit)
			.getMany();
		return this.channelEntityService.packMany(channels, me);
	}

	private async getUsers(limit: number, me: Parameters<UserEntityService['packMany']>[1]) {
		const users = await this.usersRepository.createQueryBuilder('user')
			.where('user.host IS NULL')
			.andWhere('user.isSuspended = FALSE')
			.andWhere('user.isDeleted = FALSE')
			.andWhere('user.isBot = FALSE')
			.orderBy('"user"."followersCount"', 'DESC')
			.addOrderBy('"user"."notesCount"', 'DESC')
			.limit(limit)
			.getMany();
		return this.userEntityService.packMany(users, me);
	}
}
