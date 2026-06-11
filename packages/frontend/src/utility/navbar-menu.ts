/*
 * SPDX-FileCopyrightText: Universe Federation contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export function normalizePrimaryMenu(items: string[], available: Record<string, { show?: unknown }>): string[] {
	let next = items.filter(item => item !== 'search');
	next = ensureAfter(next, 'explore', null);
	next = ensureAfter(next, 'channels', 'explore');
	if (available.chat?.show !== false) {
		next = ensureAfter(next, 'chat', null);
	}
	if (available.ai?.show !== false) {
		next = ensureAfter(next, 'ai', null);
	}
	return next;
}

function ensureAfter(items: string[], item: string, after: string | null): string[] {
	const withoutItem = items.filter(value => value !== item);
	if (after == null) return [item, ...withoutItem];
	const afterIndex = withoutItem.indexOf(after);
	if (afterIndex < 0) return [item, ...withoutItem];
	return [
		...withoutItem.slice(0, afterIndex + 1),
		item,
		...withoutItem.slice(afterIndex + 1),
	];
}
