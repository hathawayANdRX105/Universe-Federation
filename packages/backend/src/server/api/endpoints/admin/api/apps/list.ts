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

export const meta = {
	tags: ['admin', 'api'],

	requireCredential: true,
	requireAdmin: true,
	kind: 'read:admin:api',
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		status: { type: 'string', enum: apiAppStatuses, nullable: true },
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
			const apps = await this.appsRepository.find({
				where: ps.status ? { status: ps.status } : {},
				relations: { user: true },
				order: { id: 'DESC' },
				take: ps.limit,
				skip: ps.offset,
			});

			return await promiseMap(apps, async app => ({
				...await this.appEntityService.pack(app, me, {
					detail: true,
					includeSecret: true,
				}),
				user: app.user ? await this.userEntityService.pack(app.user, me) : null,
			}), {
				limiter: 4,
			});
		});
	}
}
