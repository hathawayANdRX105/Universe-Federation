/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { ChatService } from '@/core/ChatService.js';
import { ApiError } from '@/server/api/error.js';

export const meta = {
	tags: ['chat'],

	requireCredential: true,

	kind: 'write:chat',

	errors: {
		noSuchRoom: {
			message: 'No such room.',
			code: 'NO_SUCH_ROOM',
			id: 'cb4fd585-80df-4681-a033-e172c3a5f7e2',
		},
		accessDenied: {
			message: 'Only the room owner can unmute members.',
			code: 'ACCESS_DENIED',
			id: '0c6f32f4-3308-4f10-8f91-dc924c3e2de0',
		},
		notAMember: {
			message: 'The user is not a member of the room.',
			code: 'NOT_A_MEMBER',
			id: '7702df04-57e5-4bfa-bc5a-5156de62695b',
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		roomId: { type: 'string', format: 'misskey:id' },
		userId: { type: 'string', format: 'misskey:id' },
	},
	required: ['roomId', 'userId'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		private chatService: ChatService,
	) {
		super(meta, paramDef, async (ps, me) => {
			await this.chatService.checkChatAvailability(me.id, 'write');

			const room = await this.chatService.findRoomById(ps.roomId);
			if (room == null) {
				throw new ApiError(meta.errors.noSuchRoom);
			}

			if (!(await this.chatService.hasPermissionToManageRoom(me, room))) {
				throw new ApiError(meta.errors.accessDenied);
			}

			await this.chatService.muteRoomMember(room, ps.userId, null).catch(err => {
				if (err instanceof Error && err.message === 'not a member') {
					throw new ApiError(meta.errors.notAMember);
				}
				throw err;
			});
		});
	}
}
