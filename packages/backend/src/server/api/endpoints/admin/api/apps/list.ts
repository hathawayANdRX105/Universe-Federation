/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { AppsRepository } from '@/models/_.js';
import { apiAppStatuses } from '@/const.js';
import { AppEntityService } from '@/core/entities/AppEntityService.js';
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
		status: { type: 'string', enum: [...apiAppStatuses, null], nullable: true },
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
		@Inject(DI.appsRepository)
		private readonly appsRepository: AppsRepository,

		private readonly appEntityService: AppEntityService,
		private readonly userEntityService: UserEntityService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const query = this.appsRepository.createQueryBuilder('app')
				.leftJoinAndSelect('app.user', 'user')
				.orderBy('app.id', 'DESC')
				.take(ps.limit)
				.skip(ps.offset);

			if (ps.status) {
				query.andWhere('app.status = :status', { status: ps.status });
			}

			if (ps.userId) {
				query.andWhere('app."userId" = :userId', { userId: ps.userId });
			}

			const q = ps.query?.trim();
			if (q) {
				const like = `%${sqlLikeEscape(q)}%`;
				query.andWhere(`(
					"app"."id" = :exactQuery OR
					"app"."userId" = :exactQuery OR
					"app"."name" ILIKE :like OR
					"app"."description" ILIKE :like OR
					"app"."callbackUrl" ILIKE :like OR
					"app"."callbackUrls"::text ILIKE :like OR
					"user"."id" = :exactQuery OR
					"user"."username" ILIKE :like OR
					"user"."name" ILIKE :like
				)`, { exactQuery: q, like });
			}

			const [apps, total] = ps.withTotal ? await query.getManyAndCount() : [await query.getMany(), 0];

			const items = await promiseMap(apps, async app => ({
				...await this.appEntityService.pack(app, me, {
					detail: true,
					includeSecret: true,
				}),
				user: app.user ? await this.userEntityService.pack(app.user, me) : null,
			}), {
				limiter: 4,
			});

			return ps.withTotal ? { items, total } : items;
		});
	}
}
