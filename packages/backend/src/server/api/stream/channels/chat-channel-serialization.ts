/*
 * SPDX-FileCopyrightText: Universe Federation contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { ChatEventPayload } from '@/core/GlobalEventService.js';

type SerializedChatChannelEvent = {
	readonly typeJson: string;
	readonly bodyJson: string;
	readonly serializedByChannelId: Map<string, string>;
};

const serializedChatChannelEventCache = new WeakMap<ChatEventPayload, SerializedChatChannelEvent>();

export function serializeChatChannelEventForWs(channelConnectionId: string, data: ChatEventPayload): string {
	let serializedEvent = serializedChatChannelEventCache.get(data);
	if (serializedEvent == null) {
		serializedEvent = {
			typeJson: JSON.stringify(data.type),
			bodyJson: JSON.stringify(data.body),
			serializedByChannelId: new Map(),
		};
		serializedChatChannelEventCache.set(data, serializedEvent);
	}

	const cached = serializedEvent.serializedByChannelId.get(channelConnectionId);
	if (cached != null) return cached;

	const serialized = `{"type":"channel","body":{"id":${JSON.stringify(channelConnectionId)},"type":${serializedEvent.typeJson},"body":${serializedEvent.bodyJson}}}`;
	serializedEvent.serializedByChannelId.set(channelConnectionId, serialized);
	return serialized;
}
