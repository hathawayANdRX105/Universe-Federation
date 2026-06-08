/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { AccessTokensRepository, ApiAccessGrantsRepository, AppsRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';

export const meta = {
	tags: ['admin', 'api'],

	requireCredential: true,
	requireAdmin: true,
	kind: 'read:admin:api',
} as const;

export const paramDef = {
	type: 'object',
	properties: {},
	required: [],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.apiAccessGrantsRepository)
		private readonly apiAccessGrantsRepository: ApiAccessGrantsRepository,

		@Inject(DI.appsRepository)
		private readonly appsRepository: AppsRepository,

		@Inject(DI.accessTokensRepository)
		private readonly accessTokensRepository: AccessTokensRepository,
	) {
		super(meta, paramDef, async () => {
			const [
				pendingRequests,
				approvedRequests,
				pendingApps,
				approvedApps,
				suspendedApps,
				activeTokens,
				suspendedTokens,
				revokedTokens,
			] = await Promise.all([
				this.apiAccessGrantsRepository.countBy({ status: 'pending' }),
				this.apiAccessGrantsRepository.countBy({ status: 'approved' }),
				this.appsRepository.countBy({ status: 'pending' }),
				this.appsRepository.countBy({ status: 'approved' }),
				this.appsRepository.countBy({ status: 'suspended' }),
				this.accessTokensRepository.countBy({ isDeveloperToken: true, status: 'active' }),
				this.accessTokensRepository.countBy({ isDeveloperToken: true, status: 'suspended' }),
				this.accessTokensRepository.countBy({ isDeveloperToken: true, status: 'revoked' }),
			]);

			return {
				accessRequests: {
					pending: pendingRequests,
					approved: approvedRequests,
				},
				apps: {
					pending: pendingApps,
					approved: approvedApps,
					suspended: suspendedApps,
				},
				tokens: {
					active: activeTokens,
					suspended: suspendedTokens,
					revoked: revokedTokens,
				},
			};
		});
	}
}
