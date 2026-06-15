/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as crypto from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { AccessTokensRepository, ApiAccessGrantsRepository, AppsRepository, AuthSessionsRepository } from '@/models/_.js';
import type { MiMeta } from '@/models/Meta.js';
import { IdService } from '@/core/IdService.js';
import { TimeService } from '@/global/TimeService.js';
import { secureRndstr } from '@/misc/secure-rndstr.js';
import { DI } from '@/di-symbols.js';
import { apiAccessErrors, isApprovalRequiredForScopes, isDeveloperApiAccessApproved } from '@/server/api/api-access-utils.js';
import { ApiError } from '../../error.js';

export const meta = {
	tags: ['auth'],

	requireCredential: true,

	secure: true,

	errors: {
		noSuchSession: {
			message: 'No such session.',
			code: 'NO_SUCH_SESSION',
			id: '9c72d8de-391a-43c1-9d06-08d29efde8df',
		},
	},

	// 2 calls per second
	limit: {
		duration: 1000,
		max: 2,
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		token: { type: 'string' },
	},
	required: ['token'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.meta)
		private readonly instanceMeta: MiMeta,

		@Inject(DI.appsRepository)
		private appsRepository: AppsRepository,

		@Inject(DI.authSessionsRepository)
		private authSessionsRepository: AuthSessionsRepository,

		@Inject(DI.apiAccessGrantsRepository)
		private readonly apiAccessGrantsRepository: ApiAccessGrantsRepository,

		@Inject(DI.accessTokensRepository)
		private accessTokensRepository: AccessTokensRepository,

		private idService: IdService,
		private readonly timeService: TimeService,
	) {
		super(meta, paramDef, async (ps, me) => {
			// Fetch token
			const session = await this.authSessionsRepository
				.findOneBy({ token: ps.token });

			if (session == null) {
				throw new ApiError(meta.errors.noSuchSession);
			}

			const accessToken = secureRndstr(32);

			// Fetch exist access token
			const exist = await this.accessTokensRepository.exists({
				where: {
					appId: session.appId,
					userId: me.id,
				},
			});

			const app = await this.appsRepository.findOneByOrFail({ id: session.appId });
			if (this.instanceMeta.apiAccessMode === 'closed') {
				throw new ApiError(apiAccessErrors.apiClosed);
			}
			if (app.status !== 'approved') {
				throw new ApiError(apiAccessErrors.apiAppUnavailable);
			}
			// 免申请：应用请求的 scope 全在免申请白名单内时跳过开发者审批。
			if (isApprovalRequiredForScopes(this.instanceMeta.apiAccessMode, this.instanceMeta.apiNoApprovalPermissions, app.permission)) {
				const developerApproved = await isDeveloperApiAccessApproved(this.instanceMeta, this.apiAccessGrantsRepository, app.userId);
				if (!developerApproved) {
					throw new ApiError(apiAccessErrors.apiApprovalRequired);
				}
			}

			if (!exist) {
				// Generate Hash
				const sha256 = crypto.createHash('sha256');
				sha256.update(accessToken + app.secret);
				const hash = sha256.digest('hex');

				const now = this.timeService.date;

				await this.accessTokensRepository.insert({
					id: this.idService.gen(now.getTime()),
					lastUsedAt: now,
					appId: session.appId,
					userId: me.id,
					token: accessToken,
					hash: hash,
				});
			}

			// Update session
			await this.authSessionsRepository.update(session.id, {
				userId: me.id,
			});
		});
	}
}
