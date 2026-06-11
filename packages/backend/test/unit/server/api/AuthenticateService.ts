/*
 * SPDX-FileCopyrightText: hhhl contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, jest, test } from '@jest/globals';
import { AuthenticateService } from '@/server/api/AuthenticateService.js';

describe(AuthenticateService, () => {
	function createService() {
		const user = { id: 'user-1' };
		const accessToken = {
			id: 'token-1',
			token: 'oauth-token',
			hash: 'oauth-token',
			userId: 'user-1',
			user,
			appId: 'app-1',
			permission: ['read:profile'],
			status: 'active',
		};
		let app = {
			id: 'app-1',
			userId: 'developer-1',
			permission: ['read:profile'],
			status: 'approved',
			rateLimitPerMinute: 60,
		};
		const appsRepository = {
			findOneByOrFail: jest.fn(async () => app),
		};
		const accessTokensRepository = {
			findOne: jest.fn(async () => accessToken),
		};

		const service = new AuthenticateService(
			{} as never,
			accessTokensRepository as never,
			appsRepository as never,
			{} as never,
			{ date: new Date('2026-06-09T00:00:00.000Z') } as never,
			{ updateAccessTokenQueue: { enqueue: jest.fn() } } as never,
		);

		return {
			service,
			appsRepository,
			setApp: (nextApp: typeof app) => {
				app = nextApp;
			},
		};
	}

	test('loads OAuth app details on every token authentication so admin changes take effect immediately', async () => {
		const ctx = createService();

		const [, firstToken] = await ctx.service.authenticate('oauth-token');
		expect(firstToken?.permission).toStrictEqual(['read:profile']);
		expect(firstToken?.app?.status).toBe('approved');

		ctx.setApp({
			id: 'app-1',
			userId: 'developer-1',
			permission: ['write:notes'],
			status: 'suspended',
			rateLimitPerMinute: 10,
		});

		const [, secondToken] = await ctx.service.authenticate('oauth-token');
		expect(ctx.appsRepository.findOneByOrFail).toHaveBeenCalledTimes(2);
		expect(secondToken?.permission).toStrictEqual(['write:notes']);
		expect(secondToken?.app?.status).toBe('suspended');
		expect(secondToken?.app?.rateLimitPerMinute).toBe(10);
	});
});
