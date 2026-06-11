/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { ApiAccessGrantsRepository } from '@/models/_.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';
import { apiAccessGrantStatuses } from '@/const.js';
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
		status: { type: 'string', enum: [...apiAccessGrantStatuses, null], nullable: true },
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
		@Inject(DI.apiAccessGrantsRepository)
		private readonly apiAccessGrantsRepository: ApiAccessGrantsRepository,

		private readonly userEntityService: UserEntityService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const query = this.apiAccessGrantsRepository.createQueryBuilder('accessGrant')
				.leftJoinAndSelect('accessGrant.user', 'user')
				.leftJoinAndSelect('accessGrant.reviewer', 'reviewer')
				.orderBy('accessGrant.updatedAt', 'DESC')
				.take(ps.limit)
				.skip(ps.offset);

			if (ps.status) {
				query.andWhere('accessGrant.status = :status', { status: ps.status });
			}

			if (ps.userId) {
				query.andWhere('accessGrant."userId" = :userId', { userId: ps.userId });
			}

			const q = ps.query?.trim();
			if (q) {
				const like = `%${sqlLikeEscape(q)}%`;
				query.andWhere(`(
					"accessGrant"."id" = :exactQuery OR
					"accessGrant"."userId" = :exactQuery OR
					"accessGrant"."reviewerId" = :exactQuery OR
					"accessGrant"."reason" ILIKE :like OR
					"accessGrant"."reviewNote" ILIKE :like OR
					"user"."id" = :exactQuery OR
					"user"."username" ILIKE :like OR
					"user"."name" ILIKE :like OR
					"reviewer"."id" = :exactQuery OR
					"reviewer"."username" ILIKE :like OR
					"reviewer"."name" ILIKE :like
				)`, { exactQuery: q, like });
			}

			const [grants, total] = ps.withTotal ? await query.getManyAndCount() : [await query.getMany(), 0];

			const items = await promiseMap(grants, async grant => ({
				id: grant.id,
				status: grant.status,
				reason: grant.reason,
				reviewNote: grant.reviewNote,
				createdAt: grant.createdAt.toISOString(),
				updatedAt: grant.updatedAt.toISOString(),
				reviewedAt: grant.reviewedAt?.toISOString() ?? null,
				user: grant.user ? await this.userEntityService.pack(grant.user, me) : null,
				reviewer: grant.reviewer ? await this.userEntityService.pack(grant.reviewer, me) : null,
			}), {
				limiter: 4,
			});

			return ps.withTotal ? { items, total } : items;
		});
	}
}
