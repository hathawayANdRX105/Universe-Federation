/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/// <reference types="vite/client" />

import { assert, describe, test } from 'vitest';
import navbarSource from '@/ui/_common_/navbar.vue?raw';

describe('icon-only navbar', () => {
	test('centers collapsed sidebar icons with explicit flex sizing', () => {
		assert.match(navbarSource, /\.root\.iconOnly\s*\{[\s\S]*\.instance\s*\{[\s\S]*display: flex;[\s\S]*justify-content: center;[\s\S]*\}/);
		assert.match(navbarSource, /\.root\.iconOnly\s*\{[\s\S]*\.item\s*\{[\s\S]*display: flex;[\s\S]*align-items: center;[\s\S]*justify-content: center;[\s\S]*height: 52px;[\s\S]*line-height: 1;[\s\S]*\}/);
		assert.match(navbarSource, /\.root\.iconOnly\s*\{[\s\S]*\.itemIcon\s*\{[\s\S]*display: inline-flex;[\s\S]*align-items: center;[\s\S]*justify-content: center;[\s\S]*width: 32px;[\s\S]*height: 32px;[\s\S]*line-height: 1;[\s\S]*\}/);
		assert.match(navbarSource, /\.root\.iconOnly\s*\{[\s\S]*\.post\s*\{[\s\S]*display: flex;[\s\S]*align-items: center;[\s\S]*justify-content: center;[\s\S]*\}/);
		assert.match(navbarSource, /\.root\.iconOnly\s*\{[\s\S]*\.postIcon\s*\{[\s\S]*display: inline-flex;[\s\S]*align-items: center;[\s\S]*justify-content: center;[\s\S]*\}/);
		assert.strictEqual(/\.root\.iconOnly\s*\{[\s\S]*\.itemIcon\s*\{[\s\S]*display: block;/.test(navbarSource), false);
	});
});
