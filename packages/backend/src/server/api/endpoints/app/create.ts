/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { ApiError } from '@/server/api/error.js';
import type { AppsRepository } from '@/models/_.js';
import type { MiMeta } from '@/models/Meta.js';
import { IdService } from '@/core/IdService.js';
import { unique } from '@/misc/prelude/array.js';
import { secureRndstr } from '@/misc/secure-rndstr.js';
import { AppEntityService } from '@/core/entities/AppEntityService.js';
import { DI } from '@/di-symbols.js';
import { apiAccessErrors, getApiPublicPermissions, hasUnsafeOAuthRedirectUri, isAdminApiScope, normalizeOAuthRedirectUris } from '@/server/api/api-access-utils.js';

export const meta = {
	tags: ['app'],

	requireCredential: false,

	res: {
		type: 'object',
		optional: false, nullable: false,
		ref: 'App',
	},

	// 3 calls per second
	limit: {
		duration: 1000,
		max: 3,
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		name: { type: 'string' },
		description: { type: 'string' },
		permission: { type: 'array', uniqueItems: true, items: {
			type: 'string',
		} },
		callbackUrl: { type: 'string', nullable: true, maxLength: 512 },
		callbackUrls: { type: 'array', uniqueItems: true, maxItems: 20, items: { type: 'string', maxLength: 512 } },
	},
	required: ['name', 'description', 'permission'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.meta)
		private readonly instanceMeta: MiMeta,

		@Inject(DI.appsRepository)
		private appsRepository: AppsRepository,

		private appEntityService: AppEntityService,
		private idService: IdService,
	) {
		super(meta, paramDef, async (ps, me) => {
			if (this.instanceMeta.apiAccessMode === 'closed') {
				throw new ApiError(apiAccessErrors.apiClosed);
			}

			if (this.instanceMeta.apiAccessMode !== 'open' || this.instanceMeta.apiRequireAppApproval) {
				throw new ApiError(apiAccessErrors.apiApprovalRequired);
			}

			// Generate secret
			const secret = secureRndstr(32);

			// for backward compatibility
			const publicPermissions = getApiPublicPermissions(this.instanceMeta);
			const permission = unique(ps.permission.map(v => v.replace(/^(.+)(\/|-)(read|write)$/, '$3:$1')))
				.filter(scope => !isAdminApiScope(scope) && publicPermissions.includes(scope));
			if (permission.length === 0) {
				throw new ApiError(apiAccessErrors.apiScopeDisabled);
			}

			const requestedCallbackUrls = ps.callbackUrls !== undefined
				? ps.callbackUrls
				: ps.callbackUrl !== undefined
					? [ps.callbackUrl ?? '']
					: [];
			const rawCallbackUrls = unique(requestedCallbackUrls.map(url => url.trim())).slice(0, 20);
			if (rawCallbackUrls.length === 0 || hasUnsafeOAuthRedirectUri(rawCallbackUrls)) {
				throw new ApiError(apiAccessErrors.apiInvalidRedirectUri);
			}
			const callbackUrls = normalizeOAuthRedirectUris(rawCallbackUrls);
			if (callbackUrls.length === 0) {
				throw new ApiError(apiAccessErrors.apiInvalidRedirectUri);
			}
			const callbackUrl = callbackUrls[0];

			// Create account
			const app = await this.appsRepository.insertOne({
				id: this.idService.gen(),
				userId: me ? me.id : null,
				name: ps.name,
				description: ps.description,
				permission,
				callbackUrl,
				callbackUrls,
				status: 'approved',
				approvedAt: new Date(),
				secret: secret,
			});

			return await this.appEntityService.pack(app, me, {
				detail: true,
				includeSecret: true,
			});
		});
	}
}
