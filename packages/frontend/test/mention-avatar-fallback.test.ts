/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { afterEach, assert, describe, test, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/vue';
import { nextTick } from 'vue';
import type { Slots } from 'vue';

vi.mock('@/i.js', () => ({
	$i: null,
	iAmAdmin: false,
	iAmModerator: false,
	ensureSignin: () => {
		throw new Error('signin required');
	},
}));

vi.mock('@/instance.js', () => ({
	instance: {},
}));

vi.mock('@/utility/media-proxy.js', () => ({
	getStaticImageUrl: (src: string) => `/static${src}`,
}));

vi.mock('@/components/global/MkA.vue', async () => {
	const { h } = await import('vue');
		return {
			default: {
				props: ['to'],
				setup(props: { to: string }, { slots }: { slots: Slots }) {
					return () => h('a', { href: props.to }, slots.default?.());
				},
			},
	};
});

describe('MkMention avatar fallback', () => {
	afterEach(() => {
		cleanup();
	});

	test('replaces a failed mention avatar image with a local fallback', async () => {
		const { default: MkMention } = await import('@/components/MkMention.vue');
		const view = render(MkMention, {
			props: {
				username: 'key',
				host: 'example.com',
			},
			global: {
				directives: {
					'user-preview': {},
					userPreview: {},
				},
			},
		});

		const img = view.container.querySelector<HTMLImageElement>('img');
		if (img != null) {
			assert.strictEqual(img.getAttribute('src'), '/avatar/@key@example.com');
			await fireEvent.error(img);
			await nextTick();
		}

		assert.strictEqual(view.container.querySelector('img'), null);
		assert.ok(view.container.querySelector('[data-mention-avatar-fallback]') != null);
		assert.ok(view.getByText('@key') != null);
	}, 10000);
});
