/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { ApiError } from '@/server/api/error.js';
import type { AccessTokensRepository, ApiAccessGrantsRepository } from '@/models/_.js';
import type { MiMeta } from '@/models/Meta.js';
import { IdService } from '@/core/IdService.js';
import { NotificationService } from '@/core/NotificationService.js';
import { TimeService } from '@/global/TimeService.js';
import { unique } from '@/misc/prelude/array.js';
import { secureRndstr } from '@/misc/secure-rndstr.js';
import { DI } from '@/di-symbols.js';
import { apiAccessErrors, getApiPublicPermissions, isAdminApiScope } from '@/server/api/api-access-utils.js';

export const meta = {
	tags: ['api'],

	requireCredential: true,

	secure: true,

	res: {
		type: 'object',
		optional: false, nullable: false,
		properties: {
			token: { type: 'string' },
			id: { type: 'string', format: 'misskey:id' },
		},
	},

	limit: {
		duration: 1000 * 60,
		max: 10,
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		name: { type: 'string', nullable: true, maxLength: 128 },
		description: { type: 'string', nullable: true, maxLength: 512 },
		iconUrl: { type: 'string', nullable: true, maxLength: 512 },
		permission: { type: 'array', uniqueItems: true, items: { type: 'string' } },
		rank: { type: 'string', enum: ['admin', 'mod', 'user'], nullable: true },
		rateLimitPerMinute: { type: 'integer', minimum: 1, maximum: 10000, nullable: true },
	},
	required: ['permission'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.meta)
		private readonly instanceMeta: MiMeta,

		@Inject(DI.apiAccessGrantsRepository)
		private readonly apiAccessGrantsRepository: ApiAccessGrantsRepository,

		@Inject(DI.accessTokensRepository)
		private readonly accessTokensRepository: AccessTokensRepository,

		private readonly idService: IdService,
		private readonly notificationService: NotificationService,
		private readonly timeService: TimeService,
	) {
		super(meta, paramDef, async (ps, me) => {
			if (this.instanceMeta.apiAccessMode === 'closed') {
				throw new ApiError(apiAccessErrors.apiClosed);
			}

			if (this.instanceMeta.apiAccessMode === 'approval') {
				const grant = await this.apiAccessGrantsRepository.findOneBy({ userId: me.id });
				if (grant?.status !== 'approved') {
					throw new ApiError(apiAccessErrors.apiApprovalRequired);
				}
			}

			const publicPermissions = getApiPublicPermissions(this.instanceMeta);
			const permission = unique(ps.permission.map(v => v.replace(/^(.+)(\/|-)(read|write)$/, '$3:$1')))
				.filter(scope => !isAdminApiScope(scope) && publicPermissions.includes(scope));
			if (permission.length === 0) {
				throw new ApiError(apiAccessErrors.apiScopeDisabled);
			}

			const now = this.timeService.date;
			const accessToken = secureRndstr(32);
			const token = await this.accessTokensRepository.insertOne({
				id: this.idService.gen(now.getTime()),
				lastUsedAt: now,
				session: null,
				userId: me.id,
				token: accessToken,
				hash: accessToken,
				name: ps.name,
				description: ps.description,
				iconUrl: ps.iconUrl,
				permission,
				rank: 'user',
				rateLimitPerMinute: null,
				status: 'active',
				isDeveloperToken: true,
				granteeIds: [],
			});

			this.notificationService.createNotification(me.id, 'createToken', {});

			return {
				id: token.id,
				token: accessToken,
			};
		});
	}
}
