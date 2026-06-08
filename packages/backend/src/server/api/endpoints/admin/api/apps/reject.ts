/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { ApiError } from '@/server/api/error.js';
import type { AppsRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';

export const meta = {
	tags: ['admin', 'api'],

	requireCredential: true,
	requireAdmin: true,
	kind: 'write:admin:api',

	errors: {
		noSuchApp: {
			message: 'No such API app.',
			code: 'NO_SUCH_API_APP',
			id: 'c5f373fd-6b50-42a0-8813-fe8d28c2bb51',
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		appId: { type: 'string', format: 'misskey:id' },
		reviewNote: { type: 'string', nullable: true, maxLength: 2000 },
	},
	required: ['appId'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.appsRepository)
		private readonly appsRepository: AppsRepository,
	) {
		super(meta, paramDef, async (ps) => {
			const app = await this.appsRepository.findOneBy({ id: ps.appId });
			if (app == null) throw new ApiError(meta.errors.noSuchApp);

			await this.appsRepository.update({ id: app.id }, {
				status: 'rejected',
				reviewNote: ps.reviewNote,
			});
		});
	}
}
