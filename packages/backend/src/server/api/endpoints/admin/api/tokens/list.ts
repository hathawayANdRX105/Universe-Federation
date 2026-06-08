/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { AccessTokensRepository } from '@/models/_.js';
import { apiTokenStatuses } from '@/const.js';
import { IdService } from '@/core/IdService.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';
import { DI } from '@/di-symbols.js';
import { promiseMap } from '@/misc/promise-map.js';

export const meta = {
	tags: ['admin', 'api'],

	requireCredential: true,
	requireAdmin: true,
	kind: 'read:admin:api',
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		status: { type: 'string', enum: apiTokenStatuses, nullable: true },
		limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
		offset: { type: 'integer', minimum: 0, default: 0 },
	},
	required: [],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.accessTokensRepository)
		private readonly accessTokensRepository: AccessTokensRepository,

		private readonly idService: IdService,
		private readonly userEntityService: UserEntityService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const tokens = await this.accessTokensRepository.find({
				where: {
					isDeveloperToken: true,
					...(ps.status ? { status: ps.status } : {}),
				},
				relations: { user: true, app: true },
				order: { id: 'DESC' },
				take: ps.limit,
				skip: ps.offset,
			});

			return await promiseMap(tokens, async token => ({
				id: token.id,
				name: token.name ?? token.app?.name ?? null,
				description: token.description,
				createdAt: this.idService.parse(token.id).date.toISOString(),
				lastUsedAt: token.lastUsedAt?.toISOString() ?? null,
				status: token.status,
				permission: token.app ? token.app.permission : token.permission,
				rank: token.rank,
				rateLimitPerMinute: token.rateLimitPerMinute,
				appId: token.appId,
				appName: token.app?.name ?? null,
				user: token.user ? await this.userEntityService.pack(token.user, me) : null,
			}), {
				limiter: 4,
			});
		});
	}
}
