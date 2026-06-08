/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as Misskey from 'misskey-js';

type NoteWithViews = Misskey.entities.Note & {
	viewsCount?: number | null;
	viewCount?: number | null;
	exposureCount?: number | null;
};

export function getNoteViewsCount(note: Misskey.entities.Note): number {
	const maybeNote = note as NoteWithViews;
	const value = maybeNote.viewsCount ?? maybeNote.viewCount ?? maybeNote.exposureCount ?? 0;
	const count = Number(value);
	return Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
}
