/*
 * SPDX-FileCopyrightText: hazelnoot and other Sharkey contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { MastodonClientService } from '@/server/api/mastodon/MastodonClientService.js';
import type { Config } from '@/config.js';
import type { AuthenticateService } from '@/server/api/AuthenticateService.js';
import type { FastifyRequest } from 'fastify';

describe(MastodonClientService, () => {
	it('uses the configured instance URL for internal clients instead of the request host', () => {
		const service = new MastodonClientService(
			{ url: 'https://example.test' } as Config,
			{} as AuthenticateService,
		);
		const request = {
			protocol: 'https',
			host: 'evil.example',
			headers: {
				'user-agent': 'test',
				authorization: 'Bearer token',
			},
		} as unknown as FastifyRequest;

		const client = service.getClient(request);

		expect(client.baseUrl).toBe('https://example.test');
	});
});
