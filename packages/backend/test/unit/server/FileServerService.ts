/*
 * SPDX-FileCopyrightText: hazelnoot and other Sharkey contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { parseRange } from '@/server/FileServerService.js';

describe(parseRange, () => {
	it('parses a closed byte range', () => {
		expect(parseRange('bytes=0-9', 100)).toStrictEqual({ start: 0, end: 9 });
	});

	it('parses an open-ended byte range', () => {
		expect(parseRange('bytes=90-', 100)).toStrictEqual({ start: 90, end: 99 });
	});

	it('parses a suffix byte range', () => {
		expect(parseRange('bytes=-10', 100)).toStrictEqual({ start: 90, end: 99 });
	});

	it('clamps an end past the file size', () => {
		expect(parseRange('bytes=90-1000', 100)).toStrictEqual({ start: 90, end: 99 });
	});

	it.each([
		'bytes=abc-def',
		'bytes=10-9',
		'bytes=100-',
		'bytes=-0',
		'bytes=0-1,3-4',
		'items=0-1',
	])('rejects invalid range %s', (range) => {
		expect(parseRange(range, 100)).toBeNull();
	});
});
