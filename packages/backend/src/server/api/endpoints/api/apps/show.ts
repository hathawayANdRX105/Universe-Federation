/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { ApiError } from '@/server/api/error.js';
import type { AppsRepository } from '@/models/_.js';
import { AppEntityService } from '@/core/entities/AppEntityService.js';
import { DI } from '@/di-symbols.js';

export const meta = {
	tags: ['api', 'app'],

	requireCredential: true,
	kind: 'read:account',

	errors: {
		noSuchApp: {
			message: 'No such API app.',
			code: 'NO_SUCH_API_APP',
			id: '4056e328-0a0d-4dfc-9101-929e0e080129',
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		appId: { type: 'string', format: 'misskey:id' },
	},
	required: ['appId'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.appsRepository)
		private readonly appsRepository: AppsRepository,

		private readonly appEntityService: AppEntityService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const app = await this.appsRepository.findOneBy({ id: ps.appId, userId: me.id });
			if (app == null) {
				throw new ApiError(meta.errors.noSuchApp);
			}

			return await this.appEntityService.pack(app, me, {
				detail: true,
				includeSecret: true,
			});
		});
	}
}
