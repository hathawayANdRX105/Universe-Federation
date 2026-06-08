/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { MiMeta } from '@/models/Meta.js';
import { DI } from '@/di-symbols.js';
import { getApiPublicPermissions } from '@/server/api/api-access-utils.js';

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
		@Inject(DI.meta)
		private readonly instanceMeta: MiMeta,
	) {
		super(meta, paramDef, async () => {
			return {
				mode: this.instanceMeta.apiAccessMode,
				oauthEnabled: this.instanceMeta.enableOAuthLogin,
				oidcEnabled: this.instanceMeta.enableOidc,
				requireAppApproval: this.instanceMeta.apiRequireAppApproval,
				publicPermissions: getApiPublicPermissions(this.instanceMeta),
				defaultTokenRateLimit: this.instanceMeta.apiDefaultTokenRateLimit,
				writeTokenRateLimit: this.instanceMeta.apiWriteTokenRateLimit,
			};
		});
	}
}
