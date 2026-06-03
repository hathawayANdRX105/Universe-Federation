/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type * as Misskey from 'misskey-js';

export type PostFormChannel = Pick<Misskey.entities.Channel, 'id' | 'name' | 'color'>;

export interface PostFormProps {
	reply?: Misskey.entities.Note;
	renote?: Misskey.entities.Note;
	channel?: PostFormChannel;
	mention?: Misskey.entities.User;
	specified?: Misskey.entities.UserDetailed;
	initialText?: string;
	initialCw?: string;
	initialVisibility?: (typeof Misskey.noteVisibilities)[number];
	initialFiles?: Misskey.entities.DriveFile[];
	initialLocalOnly?: boolean;
	initialVisibleUsers?: Misskey.entities.UserDetailed[];
	/* TODO inline this into the entity */
	initialNote?: Misskey.entities.Note & {
		isSchedule?: boolean,
	};
	instant?: boolean;
}
