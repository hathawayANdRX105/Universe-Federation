/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { ApiError } from '@/server/api/error.js';
import type { AppsRepository } from '@/models/_.js';
import { AppEntityService } from '@/core/entities/AppEntityService.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';
import { DI } from '@/di-symbols.js';

export const meta = {
	tags: ['admin', 'api'],

	requireCredential: true,
	requireAdmin: true,
	kind: 'read:admin:api',

	errors: {
		noSuchApp: {
			message: 'No such API app.',
			code: 'NO_SUCH_API_APP',
			id: '974f9bb4-8f3d-427f-a83d-afebf3bf7a4c',
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
		private readonly userEntityService: UserEntityService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const app = await this.appsRepository.findOne({
				where: { id: ps.appId },
				relations: { user: true },
			});
			if (app == null) throw new ApiError(meta.errors.noSuchApp);

			return {
				...await this.appEntityService.pack(app, me, {
					detail: true,
					includeSecret: true,
				}),
				user: app.user ? await this.userEntityService.pack(app.user, me) : null,
			};
		});
	}
}
