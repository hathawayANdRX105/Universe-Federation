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

export const meta = {
	tags: ['admin', 'api'],

	requireCredential: true,
	requireAdmin: true,
	kind: 'read:admin:api',
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		status: { type: 'string', enum: apiAccessGrantStatuses, nullable: true },
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
			const grants = await this.apiAccessGrantsRepository.find({
				where: ps.status ? { status: ps.status } : {},
				relations: { user: true, reviewer: true },
				order: { updatedAt: 'DESC' },
				take: ps.limit,
				skip: ps.offset,
			});

			return await promiseMap(grants, async grant => ({
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
		});
	}
}
