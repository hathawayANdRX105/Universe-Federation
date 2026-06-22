/*
 * SPDX-FileCopyrightText: Universe Federation contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type * as Misskey from 'misskey-js';

export type NoteContentBadgeKind = 'featured' | 'hot' | 'discussion' | 'resource' | 'game' | 'channel';

export type NoteContentBadge = {
	kind: NoteContentBadgeKind;
	label: string;
	icon: string;
};

export function getNoteContentBadges(note: Misskey.entities.Note): NoteContentBadge[] {
	const badges: NoteContentBadge[] = [];
	const tags = note.tags ?? [];
	const text = note.text ?? '';
	const compactText = text.replace(/\s+/g, '');
	const reactionCount = note.reactionCount ?? Object.values(note.reactions ?? {}).reduce((acc, value) => acc + Number(value), 0);
	const engagement = reactionCount + note.repliesCount * 2 + note.renoteCount * 2 + note.clippedCount * 3;
	const pinnedNoteIds = note.channel?.pinnedNoteIds ?? [];

	if (note.channel != null && pinnedNoteIds.includes(note.id)) {
		badges.push({
			kind: 'featured',
			label: '精华',
			icon: 'ti ti-sparkles',
		});
	}

	if (engagement >= 10 || reactionCount >= 8 || note.clippedCount >= 2) {
		badges.push({
			kind: 'hot',
			label: '热门',
			icon: 'ti ti-flame',
		});
	}

	if (note.repliesCount >= 3 || tags.some(tag => ['Bug', 'bug', '问题', '讨论', '公告', '更新'].includes(tag))) {
		badges.push({
			kind: 'discussion',
			label: '热议',
			icon: 'ti ti-messages',
		});
	}

	if (
		tags.some(tag => ['教程', 'AI', 'ai', '资源', '指南', 'Token', 'token'].includes(tag))
		|| /(教程|指南|配置|部署|使用方法|怎么|如何|说明|ai|gpt|claude|codex|资源|token|key)/i.test(text)
		|| compactText.length >= 120
	) {
		badges.push({
			kind: 'resource',
			label: '资源/教程',
			icon: 'ti ti-book-2',
		});
	}

	if (
		tags.some(tag => ['游戏', '我的世界', 'Minecraft', 'minecraft', 'Apex', 'apex', 'LOL', 'lol', 'GTA', 'gta', 'Steam', 'steam', '电竞', 'Gaming', 'gaming'].includes(tag))
		|| /(游戏|我的世界|麦块|minecraft|apex|league\s*of\s*legends|\blol\b|gta\s*5?|gtav|gta\s*online|steam|pc\s*gaming|playstation|xbox|nintendo|fortnite|roblox|counter\s*strike|\bcs2\b|dota\s*2|overwatch|电竞|gaming|videogames?|esports?)/i.test(text)
	) {
		badges.push({
			kind: 'game',
			label: '游戏',
			icon: 'ti ti-device-gamepad-2',
		});
	}

	if (note.channel != null && !badges.some(badge => badge.kind === 'channel')) {
		badges.push({
			kind: 'channel',
			label: '频道',
			icon: 'ti ti-device-tv',
		});
	}

	return badges.slice(0, 3);
}
