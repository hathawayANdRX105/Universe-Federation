/*
 * SPDX-FileCopyrightText: hhhl contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test } from '@jest/globals';
import { Connection, MaxWsBufferedAmount } from '@/server/api/stream/Connection.js';

describe('Connection Redis message fast path', () => {
	test('skips parsing valid events when this connection has no matching listener', () => {
		const message = JSON.stringify({
			channel: 'chatRoomStream:room',
			message: {
				type: 'message',
				body: { id: 'message-id' },
			},
		});

		expect(Connection.shouldParseRedisMessage(message, () => false)).toBe(false);
		expect(Connection.shouldParseRedisMessage(message, channel => channel === 'chatRoomStream:room')).toBe(true);
	});

	test('keeps malformed or legacy payloads on the parse path', () => {
		expect(Connection.shouldParseRedisMessage('{"message":{"type":"x"}}', () => false)).toBe(true);
		expect(Connection.shouldParseRedisMessage('not json', () => false)).toBe(true);
	});
});

describe('Connection websocket backpressure', () => {
	test('closes clients only after the send buffer exceeds the limit', () => {
		expect(Connection.shouldCloseForBackpressure(MaxWsBufferedAmount - 1)).toBe(false);
		expect(Connection.shouldCloseForBackpressure(MaxWsBufferedAmount)).toBe(false);
		expect(Connection.shouldCloseForBackpressure(MaxWsBufferedAmount + 1)).toBe(true);
	});
});
