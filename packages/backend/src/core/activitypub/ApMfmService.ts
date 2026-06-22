/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import * as mfm from 'mfm-js';
import { MfmService, Appender } from '@/core/MfmService.js';
import type { MiNote } from '@/models/Note.js';
import { bindThis } from '@/decorators.js';
import { extractApHashtagObjects } from './models/tag.js';
import type { IObject } from './type.js';

// 移除 Sharkey 的图文混排占位符 $[file N] — 联邦端用不认识,留着会显示成字面 [file 0]
const INLINE_FILE_PLACEHOLDER_RE = /\$\[file\s+\d+\]/g;
export function stripInlineFilePlaceholders(text: string): string {
	return text.replace(INLINE_FILE_PLACEHOLDER_RE, '').replace(/\n{3,}/g, '\n\n').trim();
}

@Injectable()
export class ApMfmService {
	constructor(
		private mfmService: MfmService,
	) {
	}

	@bindThis
	public htmlToMfm(html: string, tag?: IObject | IObject[]): string {
		const hashtagNames = extractApHashtagObjects(tag).map(x => x.name);
		return this.mfmService.fromHtml(html, hashtagNames);
	}

	@bindThis
	public getNoteHtml(note: Pick<MiNote, 'text' | 'mentionedRemoteUsers'>, additionalAppender: Appender[] = []) {
		let noMisskeyContent = false;
		// 联邦输出:剥离 Sharkey-specific 的图文混排占位符 $[file N]。
		// 远程实例(Mastodon/其它 Misskey)看不懂这个 fn,直接去掉,附件仍走 attachment 字段。
		const srcMfm = stripInlineFilePlaceholders(note.text ?? '');

		const parsed = mfm.parse(srcMfm);

		if (!additionalAppender.length && parsed.every(n => ['text', 'unicodeEmoji', 'emojiCode', 'mention', 'hashtag', 'url'].includes(n.type))) {
			noMisskeyContent = true;
		}

		const content = this.mfmService.toHtml(parsed, note.mentionedRemoteUsers ? JSON.parse(note.mentionedRemoteUsers) : [], additionalAppender);

		return {
			content,
			noMisskeyContent,
		};
	}
}
