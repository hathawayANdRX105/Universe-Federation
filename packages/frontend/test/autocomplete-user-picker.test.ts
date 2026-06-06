/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/// <reference types="vite/client" />

import { assert, describe, test } from 'vitest';
import autocompleteSource from '@/components/MkAutocomplete.vue?raw';

describe('autocomplete user picker', () => {
	test('keeps the explicit user picker above autocomplete results', () => {
		const pickerIndex = autocompleteSource.indexOf('data-autocomplete-select-user');
		const resultsIndex = autocompleteSource.indexOf('v-for="user in users"');

		assert.isAtLeast(pickerIndex, 0);
		assert.isAtLeast(resultsIndex, 0);
		assert.isBelow(pickerIndex, resultsIndex);
		assert.match(autocompleteSource, /\.userPickerAction\s*\{[\s\S]*position:\s*sticky;[\s\S]*top:\s*0;/);
	});
});
