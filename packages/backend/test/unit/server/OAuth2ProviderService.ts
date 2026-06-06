/*
 * SPDX-FileCopyrightText: hazelnoot and other Sharkey contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { decodeClientRedirectUri } from '@/server/oauth/OAuth2ProviderService.js';

describe(decodeClientRedirectUri, () => {
	const selfUrl = 'https://example.test';

	it('accepts a base64-encoded same-origin auth URL', () => {
		const url = 'https://example.test/auth/session-token';
		const clientId = Buffer.from(url).toString('base64');

		expect(decodeClientRedirectUri(clientId, selfUrl)?.toString()).toBe(url);
	});

	it('rejects a cross-origin URL', () => {
		const clientId = Buffer.from('https://evil.example/auth/session-token').toString('base64');

		expect(decodeClientRedirectUri(clientId, selfUrl)).toBeNull();
	});

	it('rejects malformed client IDs', () => {
		expect(decodeClientRedirectUri('not a url', selfUrl)).toBeNull();
	});
});
