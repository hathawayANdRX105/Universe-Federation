/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { MetasRepository } from '@/models/_.js';
import type { MiMeta } from '@/models/Meta.js';
import { DI } from '@/di-symbols.js';
import { getApiNoApprovalPermissions, getApiPublicPermissions } from '@/server/api/api-access-utils.js';

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
		@Inject(DI.metasRepository)
		private readonly metasRepository: MetasRepository,

		@Inject(DI.meta)
		private readonly instanceMeta: MiMeta,
	) {
		super(meta, paramDef, async () => {
			const freshMeta = await this.metasRepository.findOneByOrFail({ id: this.instanceMeta.id });

			return {
				mode: freshMeta.apiAccessMode,
				oauthEnabled: freshMeta.enableOAuthLogin,
				oidcEnabled: freshMeta.enableOidc,
				requireAppApproval: freshMeta.apiRequireAppApproval,
				publicPermissions: getApiPublicPermissions(freshMeta),
				noApprovalPermissions: getApiNoApprovalPermissions(freshMeta),
				allowDeveloperTokens: freshMeta.apiAllowDeveloperTokens,
				defaultTokenRateLimit: freshMeta.apiDefaultTokenRateLimit,
				writeTokenRateLimit: freshMeta.apiWriteTokenRateLimit,
			};
		});
	}
}
