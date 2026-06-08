/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { AppsRepository } from '@/models/_.js';
import { AppEntityService } from '@/core/entities/AppEntityService.js';
import { DI } from '@/di-symbols.js';
import { promiseMap } from '@/misc/promise-map.js';

export const meta = {
	tags: ['api', 'app'],

	requireCredential: true,
	kind: 'read:account',
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
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
	) {
		super(meta, paramDef, async (ps, me) => {
			const apps = await this.appsRepository.find({
				where: { userId: me.id },
				order: { id: 'DESC' },
				take: ps.limit,
				skip: ps.offset,
			});

			return await promiseMap(apps, app => this.appEntityService.pack(app, me, {
				detail: true,
				includeSecret: true,
			}), {
				limiter: 4,
			});
		});
	}
}
