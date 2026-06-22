/*
 * SPDX-FileCopyrightText: Universe Federation contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { RolePolicies } from '@/core/RoleService.js';
import { IdentifiableError } from '@/misc/identifiable-error.js';

export const NOTE_TEXT_SCHEMA_MAX_LENGTH = 100000;
export const NOTE_CW_SCHEMA_MAX_LENGTH = 100000;
export const NOTE_FILES_SCHEMA_MAX_ITEMS = 100;
export const NOTE_POLL_CHOICES_SCHEMA_MAX_ITEMS = 50;
export const NOTE_POLL_CHOICE_SCHEMA_MAX_LENGTH = 1000;

export const NOTE_LIMIT_ERROR_IDS = {
	NOTE_TEXT_TOO_LONG: '6d6f4edb-7f24-4c5a-92b8-dbb0cf8f0901',
	NOTE_CW_TOO_LONG: '930b59b7-f6ec-4cf5-a2f5-c50c0f64d6f8',
	NOTE_FILES_TOO_MANY: 'bdc4eb31-4d9b-4d15-9188-4f2f5e8b8a1c',
	NOTE_IMAGES_TOO_MANY: 'cf0c1d0e-4f2a-40bb-bb7e-59a86d9f5fc0',
	NOTE_VIDEOS_TOO_MANY: '0d71acac-9d52-49d1-a0f6-96499f52887f',
	NOTE_AUDIO_TOO_MANY: '0a3a689c-5834-4dd7-93d2-b0a9cdd2739f',
	NOTE_OTHER_FILES_TOO_MANY: 'a9b44bbb-8d9d-49c9-a9ef-16c34e67b49e',
	NOTE_POLL_CHOICES_TOO_MANY: '2d822b4f-5d0f-47ce-9988-561f69a7716e',
	NOTE_POLL_CHOICE_TOO_LONG: 'ea749189-9063-4eb8-aa1f-94e7222f5070',
} as const;

export type NoteLimitViolationCode = keyof typeof NOTE_LIMIT_ERROR_IDS;

export type NoteLimitInput = {
	text?: string | null;
	cw?: string | null;
	files?: readonly { type?: string | null }[] | null;
	poll?: { choices?: readonly string[] | null } | null;
};

export type NoteLimitViolation = {
	ok: false;
	code: NoteLimitViolationCode;
	current: number;
	limit: number;
};

export type NoteLimitResult = { ok: true } | NoteLimitViolation;

function normalizeLimit(value: number): number {
	return Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));
}

function violation(code: NoteLimitViolationCode, current: number, limit: number): NoteLimitViolation {
	return {
		ok: false,
		code,
		current,
		limit,
	};
}

function classifyFile(file: { type?: string | null }): 'image' | 'video' | 'audio' | 'other' {
	const type = file.type ?? '';
	if (type.startsWith('image/')) return 'image';
	if (type.startsWith('video/')) return 'video';
	if (type.startsWith('audio/')) return 'audio';
	return 'other';
}

export function validateLocalNoteContentLimits(input: NoteLimitInput, policies: RolePolicies): NoteLimitResult {
	const textLimit = normalizeLimit(policies.noteMaxTextLength);
	if (input.text != null && input.text.length > textLimit) {
		return violation('NOTE_TEXT_TOO_LONG', input.text.length, textLimit);
	}

	const cwLimit = normalizeLimit(policies.noteMaxCwLength);
	if (input.cw != null && input.cw.length > cwLimit) {
		return violation('NOTE_CW_TOO_LONG', input.cw.length, cwLimit);
	}

	const files = input.files ?? [];
	const totalFileLimit = normalizeLimit(policies.noteMaxFiles);
	if (files.length > totalFileLimit) {
		return violation('NOTE_FILES_TOO_MANY', files.length, totalFileLimit);
	}

	const counts = {
		image: 0,
		video: 0,
		audio: 0,
		other: 0,
	};
	for (const file of files) {
		counts[classifyFile(file)]++;
	}

	const imageLimit = normalizeLimit(policies.noteMaxImages);
	if (counts.image > imageLimit) {
		return violation('NOTE_IMAGES_TOO_MANY', counts.image, imageLimit);
	}

	const videoLimit = normalizeLimit(policies.noteMaxVideos);
	if (counts.video > videoLimit) {
		return violation('NOTE_VIDEOS_TOO_MANY', counts.video, videoLimit);
	}

	const audioLimit = normalizeLimit(policies.noteMaxAudio);
	if (counts.audio > audioLimit) {
		return violation('NOTE_AUDIO_TOO_MANY', counts.audio, audioLimit);
	}

	const otherLimit = normalizeLimit(policies.noteMaxOtherFiles);
	if (counts.other > otherLimit) {
		return violation('NOTE_OTHER_FILES_TOO_MANY', counts.other, otherLimit);
	}

	const choices = input.poll?.choices ?? [];
	const pollChoicesLimit = normalizeLimit(policies.noteMaxPollChoices);
	if (choices.length > pollChoicesLimit) {
		return violation('NOTE_POLL_CHOICES_TOO_MANY', choices.length, pollChoicesLimit);
	}

	const pollChoiceLengthLimit = normalizeLimit(policies.noteMaxPollChoiceLength);
	const longestPollChoice = choices.reduce((max, choice) => Math.max(max, choice.length), 0);
	if (longestPollChoice > pollChoiceLengthLimit) {
		return violation('NOTE_POLL_CHOICE_TOO_LONG', longestPollChoice, pollChoiceLengthLimit);
	}

	return { ok: true };
}

export function assertLocalNoteContentLimits(input: NoteLimitInput, policies: RolePolicies): void {
	const result = validateLocalNoteContentLimits(input, policies);
	if (!result.ok) {
		throw new IdentifiableError(NOTE_LIMIT_ERROR_IDS[result.code], result.code);
	}
}

export function isNoteLimitIdentifiableError(error: IdentifiableError): boolean {
	return (Object.values(NOTE_LIMIT_ERROR_IDS) as string[]).includes(error.id);
}
