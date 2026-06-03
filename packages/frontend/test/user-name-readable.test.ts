/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { afterEach, assert, describe, test } from 'vitest';
import { cleanup, render } from '@testing-library/vue';
import type * as Misskey from 'misskey-js';
import MkUserName from '@/components/global/MkUserName.vue';

describe('MkUserName readable mode', () => {
	afterEach(() => {
		cleanup();
	});

	test('wraps the MFM-rendered display name with a readable style hook', () => {
		const view = render(MkUserName, {
			props: {
				forceReadable: true,
				user: {
					id: 'user',
					username: 'user',
					name: '$[fg.color=ffffff White Name]',
					host: null,
					emojis: {},
				} as unknown as Misskey.entities.User,
			},
			global: {
				stubs: {
					Mfm: {
						props: ['text'],
						template: '<span style="color: #fff">{{ text }}</span>',
					},
				},
			},
		});

		const readable = view.container.querySelector('span[class*="readable"]');
		assert.ok(readable != null);
	});
});
