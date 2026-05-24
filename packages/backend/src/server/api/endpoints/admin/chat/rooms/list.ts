/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Brackets } from 'typeorm';
import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { DI } from '@/di-symbols.js';
import type { ChatMessagesRepository, ChatRoomMembershipsRepository, ChatRoomsRepository } from '@/models/_.js';
import { ChatEntityService } from '@/core/entities/ChatEntityService.js';
import { ChatService } from '@/core/ChatService.js';
import { QueryService } from '@/core/QueryService.js';
import { IdService } from '@/core/IdService.js';
import type { MiMeta } from '@/models/Meta.js';
import { sqlLikeEscape } from '@/misc/sql-like-escape.js';
import { chatRoomJoinModes } from '@/models/ChatRoom.js';

export const meta = {
	tags: ['admin', 'chat'],

	requireCredential: true,
	requireModerator: true,
	kind: 'read:admin:meta',

	res: {
		type: 'array',
		optional: false, nullable: false,
		items: {
			type: 'object',
			optional: false, nullable: false,
			properties: {
				id: {
					type: 'string',
					optional: false, nullable: false,
					format: 'id',
				},
				createdAt: {
					type: 'string',
					format: 'date-time',
					optional: false, nullable: false,
				},
				room: {
					type: 'object',
					optional: false, nullable: false,
					ref: 'ChatRoom',
				},
				memberCount: {
					type: 'integer',
					optional: false, nullable: false,
				},
				defaultMemberLimit: {
					type: 'integer',
					optional: false, nullable: false,
				},
				memberLimitOverride: {
					type: 'integer',
					optional: false, nullable: true,
				},
				memberLimit: {
					type: 'integer',
					optional: false, nullable: false,
				},
				lastMessageAt: {
					type: 'string',
					format: 'date-time',
					optional: false, nullable: true,
				},
			},
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
		sinceId: { type: 'string', format: 'misskey:id' },
		untilId: { type: 'string', format: 'misskey:id' },
		query: { type: 'string', nullable: true, default: null },
		joinMode: { type: 'string', enum: ['all', ...chatRoomJoinModes], default: 'all' },
		ownerId: { type: 'string', format: 'misskey:id', nullable: true, default: null },
	},
	required: [],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.chatRoomsRepository)
		private chatRoomsRepository: ChatRoomsRepository,

		@Inject(DI.chatRoomMembershipsRepository)
		private chatRoomMembershipsRepository: ChatRoomMembershipsRepository,

		@Inject(DI.chatMessagesRepository)
		private chatMessagesRepository: ChatMessagesRepository,

		@Inject(DI.meta)
		private serverSettings: MiMeta,

		private chatService: ChatService,
		private chatEntityService: ChatEntityService,
		private queryService: QueryService,
		private idService: IdService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const query = this.queryService.makePaginationQuery(this.chatRoomsRepository.createQueryBuilder('room'), ps.sinceId, ps.untilId)
				.leftJoinAndSelect('room.owner', 'owner');

			if (ps.ownerId != null) {
				query.andWhere('room.ownerId = :ownerId', { ownerId: ps.ownerId });
			}

			if (ps.joinMode !== 'all') {
				query.andWhere('room.joinMode = :joinMode', { joinMode: ps.joinMode });
			}

			if (ps.query != null && ps.query.trim() !== '') {
				const q = `%${sqlLikeEscape(ps.query.trim().toLowerCase())}%`;
				query.andWhere(new Brackets(qb => {
					qb
						.where('LOWER(room.id) LIKE :q', { q })
						.orWhere('LOWER(room.name) LIKE :q', { q })
						.orWhere('LOWER(owner.username) LIKE :q', { q })
						.orWhere('LOWER(owner.name) LIKE :q', { q });
				}));
			}

			const rooms = await query.take(ps.limit).getMany();
			if (rooms.length === 0) return [];

			const roomIds = rooms.map(room => room.id);
			const [memberCounts, lastMessages, packedRooms] = await Promise.all([
				this.chatRoomMembershipsRepository.createQueryBuilder('membership')
					.select('membership.roomId', 'roomId')
					.addSelect('COUNT(*)', 'count')
					.where('membership.roomId IN (:...roomIds)', { roomIds })
					.groupBy('membership.roomId')
					.getRawMany<{ roomId: string; count: string; }>(),
				this.chatMessagesRepository.createQueryBuilder('message')
					.select('message.toRoomId', 'roomId')
					.addSelect('MAX(message.id)', 'lastMessageId')
					.where('message.toRoomId IN (:...roomIds)', { roomIds })
					.groupBy('message.toRoomId')
					.getRawMany<{ roomId: string; lastMessageId: string | null; }>(),
				this.chatEntityService.packRooms(rooms, me),
			]);

			const memberCountMap = new Map(memberCounts.map(row => [row.roomId, Number(row.count)]));
			const lastMessageMap = new Map(lastMessages.map(row => [row.roomId, row.lastMessageId]));
			const packedRoomMap = new Map(packedRooms.map(room => [room.id, room]));

			return rooms.map(room => {
				const lastMessageId = lastMessageMap.get(room.id);

				return {
					id: room.id,
					createdAt: this.idService.parse(room.id).date.toISOString(),
					room: packedRoomMap.get(room.id)!,
					memberCount: memberCountMap.get(room.id) ?? 0,
					defaultMemberLimit: this.serverSettings.chatRoomDefaultMemberLimit,
					memberLimitOverride: room.memberLimitOverride,
					memberLimit: this.chatService.getEffectiveRoomMemberLimit(room),
					lastMessageAt: lastMessageId != null ? this.idService.parse(lastMessageId).date.toISOString() : null,
				};
			});
		});
	}
}
