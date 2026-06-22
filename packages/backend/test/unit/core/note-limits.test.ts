/*
 * SPDX-FileCopyrightText: Universe Federation contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

process.env.NODE_ENV = 'test';

import { describe, test, expect } from '@jest/globals';
import type { RolePolicies } from '@/core/RoleService.js';
import {
	validateLocalNoteContentLimits,
	type NoteLimitInput,
} from '@/core/note-limits.js';

const basePolicies: RolePolicies = {
	gtlAvailable: true,
	ltlAvailable: true,
	btlAvailable: false,
	canPublicNote: true,
	scheduleNoteMax: 5,
	mentionLimit: 20,
	canInvite: false,
	inviteLimit: 0,
	inviteLimitCycle: 60 * 24 * 7,
	inviteExpirationTime: 0,
	canManageCustomEmojis: false,
	canManageAvatarDecorations: false,
	canSearchNotes: false,
	canUseTranslator: false,
	canHideAds: false,
	driveCapacityMb: 100,
	maxFileSizeMb: 25,
	alwaysMarkNsfw: false,
	canUpdateBioMedia: true,
	pinLimit: 5,
	antennaLimit: 5,
	wordMuteLimit: 1000,
	webhookLimit: 3,
	clipLimit: 10,
	noteEachClipsLimit: 200,
	userListLimit: 10,
	userEachUserListsLimit: 50,
	rateLimitFactor: 1,
	canImportNotes: true,
	avatarDecorationLimit: 1,
	canImportAntennas: true,
	canImportBlocking: true,
	canImportFollowing: true,
	canImportMuting: true,
	canImportUserLists: true,
	chatAvailability: 'available',
	canTrend: true,
	canViewFederation: true,
	noteMaxTextLength: 3000,
	noteMaxCwLength: 500,
	noteMaxFiles: 16,
	noteMaxImages: 16,
	noteMaxVideos: 16,
	noteMaxAudio: 16,
	noteMaxOtherFiles: 16,
	noteMaxPollChoices: 10,
	noteMaxPollChoiceLength: 150,
};

function input(overrides: Partial<NoteLimitInput> = {}): NoteLimitInput {
	return {
		text: 'ok',
		cw: null,
		files: [],
		poll: null,
		...overrides,
	};
}

describe('note content limits', () => {
	test('rejects local note text above role policy without truncating it', () => {
		const policies = { ...basePolicies, noteMaxTextLength: 5 };
		const text = '123456';

		const result = validateLocalNoteContentLimits(input({ text }), policies);

		expect(result).toMatchObject({
			ok: false,
			code: 'NOTE_TEXT_TOO_LONG',
			current: 6,
			limit: 5,
		});
		expect(text).toBe('123456');
	});

	test('rejects media by total and mime category limits', () => {
		const policies = {
			...basePolicies,
			noteMaxFiles: 3,
			noteMaxImages: 1,
			noteMaxVideos: 1,
			noteMaxAudio: 1,
			noteMaxOtherFiles: 1,
		};

		expect(validateLocalNoteContentLimits(input({
			files: [
				{ type: 'image/png' },
				{ type: 'image/jpeg' },
			],
		}), policies)).toMatchObject({
			ok: false,
			code: 'NOTE_IMAGES_TOO_MANY',
			current: 2,
			limit: 1,
		});

		expect(validateLocalNoteContentLimits(input({
			files: [
				{ type: 'image/png' },
				{ type: 'video/mp4' },
				{ type: 'audio/mpeg' },
				{ type: 'application/pdf' },
			],
		}), policies)).toMatchObject({
			ok: false,
			code: 'NOTE_FILES_TOO_MANY',
			current: 4,
			limit: 3,
		});
	});

	test('rejects poll choices above role policy', () => {
		const policies = {
			...basePolicies,
			noteMaxPollChoices: 2,
			noteMaxPollChoiceLength: 3,
		};

		expect(validateLocalNoteContentLimits(input({
			poll: { choices: ['a', 'b', 'c'] },
		}), policies)).toMatchObject({
			ok: false,
			code: 'NOTE_POLL_CHOICES_TOO_MANY',
			current: 3,
			limit: 2,
		});

		expect(validateLocalNoteContentLimits(input({
			poll: { choices: ['abcd', 'ok'] },
		}), policies)).toMatchObject({
			ok: false,
			code: 'NOTE_POLL_CHOICE_TOO_LONG',
			current: 4,
			limit: 3,
		});
	});
});
