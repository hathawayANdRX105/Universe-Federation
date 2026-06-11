/*
 * SPDX-FileCopyrightText: Universe Federation contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type * as Misskey from 'misskey-js';
import { i18n } from '@/i18n.js';

export type SearchTrendSource = Misskey.Endpoints['notes/discovery-sections']['res']['trends'];

export type SearchTrendRow = {
	type: 'search' | 'tag';
	term: string;
	label: string;
};

export function buildSearchTrendRows(trends: SearchTrendSource, limit = 10): SearchTrendRow[] {
	const rows: SearchTrendRow[] = [];
	const seen = new Set<string>();
	const push = (type: SearchTrendRow['type'], term: string, label: string) => {
		if (!isGoodSearchTrendTerm(term)) return;
		const normalized = normalizeSearchTrendKey(term);
		if (seen.has(normalized)) return;
		seen.add(normalized);
		rows.push({ type, term: term.trim(), label });
	};

	for (const term of trends.popularSearches) push('search', term, i18n.ts.popularSearches);
	for (const term of trends.hashtags) push('tag', term, i18n.ts.popularTags);
	for (const term of trends.recentTerms) push('search', term, i18n.ts.recentContentTerms);

	return rows.slice(0, limit);
}

export function isGoodSearchTrendTerm(term: string): boolean {
	const normalized = term.trim().replace(/\s+/g, ' ');
	const compact = normalized.replace(/[\s._\-·・,，。:：/\\|()[\]{}]+/g, '');
	if (normalized.length < 2 || compact.length < 2) return false;
	if (normalized.length > 36 || compact.length > 30) return false;
	if (/codex\s*verify|verify\s*channel/i.test(normalized)) return false;
	if (/^\d+$/.test(compact)) return false;
	if (/^[a-z0-9]{18,}$/i.test(compact)) return false;
	if (/^(.)\1{3,}$/.test(compact)) return false;
	if (/^[0-9a-f]{12,}$/i.test(compact)) return false;
	const digitRatio = compact.replace(/\D/g, '').length / compact.length;
	if (compact.length >= 8 && digitRatio > 0.65) return false;
	return true;
}

export function normalizeSearchTrendKey(term: string): string {
	return term.trim().replace(/^#/, '').normalize('NFKC').toLowerCase();
}
