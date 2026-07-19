/*
 * SPDX-FileCopyrightText: Universe Federation contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, jest, test } from '@jest/globals';
import MuteRoomEndpoint from '@/server/api/endpoints/chat/rooms/mute.js';
import LeaveRoomEndpoint from '@/server/api/endpoints/chat/rooms/leave.js';
import IgnoreRoomInvitationEndpoint from '@/server/api/endpoints/chat/rooms/invitations/ignore.js';

function entityNotFoundError(): Error {
	return Object.assign(new Error('not found'), { name: 'EntityNotFoundError' });
}

describe('chat room state endpoints', () => {
	const me = { id: 'me' } as never;

	function createChatService(overrides: Record<string, unknown>) {
		return {
			checkChatAvailability: jest.fn(async () => undefined),
			...overrides,
		} as any;
	}

	test('mute maps missing room membership to no such room', async () => {
		const chatService = createChatService({
			muteRoom: jest.fn(async () => {
				throw entityNotFoundError();
			}),
		});
		const endpoint = new MuteRoomEndpoint(chatService);

		await expect(endpoint.exec({ roomId: 'room', mute: true }, me, null)).rejects.toMatchObject({
			code: 'NO_SUCH_ROOM',
		});
		expect(chatService.muteRoom).toHaveBeenCalledWith('me', 'room', true);
	});

	test('leave maps missing room membership to no such room', async () => {
		const chatService = createChatService({
			leaveRoom: jest.fn(async () => {
				throw entityNotFoundError();
			}),
		});
		const endpoint = new LeaveRoomEndpoint(chatService);

		await expect(endpoint.exec({ roomId: 'room' }, me, null)).rejects.toMatchObject({
			code: 'NO_SUCH_ROOM',
		});
		expect(chatService.leaveRoom).toHaveBeenCalledWith('me', 'room');
	});

	test('ignore invitation maps missing invitation to no such room', async () => {
		const chatService = createChatService({
			ignoreRoomInvitation: jest.fn(async () => {
				throw entityNotFoundError();
			}),
		});
		const endpoint = new IgnoreRoomInvitationEndpoint(chatService);

		await expect(endpoint.exec({ roomId: 'room' }, me, null)).rejects.toMatchObject({
			code: 'NO_SUCH_ROOM',
		});
		expect(chatService.ignoreRoomInvitation).toHaveBeenCalledWith('me', 'room');
	});

	test('mute propagates internal failures', async () => {
		const dbError = new Error('db down');
		const chatService = createChatService({
			muteRoom: jest.fn(async () => {
				throw dbError;
			}),
		});
		const endpoint = new MuteRoomEndpoint(chatService);

		await expect(endpoint.exec({ roomId: 'room', mute: true }, me, null)).rejects.toBe(dbError);
	});

	test('leave propagates internal failures', async () => {
		const dbError = new Error('db down');
		const chatService = createChatService({
			leaveRoom: jest.fn(async () => {
				throw dbError;
			}),
		});
		const endpoint = new LeaveRoomEndpoint(chatService);

		await expect(endpoint.exec({ roomId: 'room' }, me, null)).rejects.toBe(dbError);
	});

	test('ignore invitation propagates internal failures', async () => {
		const dbError = new Error('db down');
		const chatService = createChatService({
			ignoreRoomInvitation: jest.fn(async () => {
				throw dbError;
			}),
		});
		const endpoint = new IgnoreRoomInvitationEndpoint(chatService);

		await expect(endpoint.exec({ roomId: 'room' }, me, null)).rejects.toBe(dbError);
	});
});
