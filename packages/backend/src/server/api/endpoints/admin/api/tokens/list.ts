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
import { sqlLikeEscape } from '@/misc/sql-like-escape.js';

export const meta = {
	tags: ['admin', 'api'],

	requireCredential: true,
	requireAdmin: true,
	kind: 'read:admin:api',
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		status: { type: 'string', enum: [...apiTokenStatuses, null], nullable: true },
		query: { type: 'string', nullable: true, maxLength: 128 },
		userId: { type: 'string', nullable: true, format: 'misskey:id' },
		withTotal: { type: 'boolean', default: false },
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
			const query = this.accessTokensRepository.createQueryBuilder('token')
				.leftJoinAndSelect('token.user', 'user')
				.leftJoinAndSelect('token.app', 'app')
				.where('(token."isDeveloperToken" = true OR token."appId" IS NULL)')
				.orderBy('token.id', 'DESC')
				.take(ps.limit)
				.skip(ps.offset);

			if (ps.status) {
				query.andWhere('token.status = :status', { status: ps.status });
			}

			if (ps.userId) {
				query.andWhere('token."userId" = :userId', { userId: ps.userId });
			}

			const q = ps.query?.trim();
			if (q) {
				const like = `%${sqlLikeEscape(q)}%`;
				query.andWhere(`(
					"token"."id" = :exactQuery OR
					"token"."userId" = :exactQuery OR
					"token"."appId" = :exactQuery OR
					"token"."name" ILIKE :like OR
					"token"."description" ILIKE :like OR
					"app"."name" ILIKE :like OR
					"user"."username" ILIKE :like OR
					"user"."name" ILIKE :like
				)`, { exactQuery: q, like });
			}

			const [tokens, total] = ps.withTotal ? await query.getManyAndCount() : [await query.getMany(), 0];

			const items = await promiseMap(tokens, async token => ({
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

			return ps.withTotal ? { items, total } : items;
		});
	}
}
