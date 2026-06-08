/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { ApiError } from '@/server/api/error.js';
import type { AppsRepository } from '@/models/_.js';
import { TimeService } from '@/global/TimeService.js';
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
			id: '2074a86d-c2a8-4823-ac26-3276edb1a144',
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

		private readonly timeService: TimeService,
	) {
		super(meta, paramDef, async (ps) => {
			const app = await this.appsRepository.findOneBy({ id: ps.appId });
			if (app == null) throw new ApiError(meta.errors.noSuchApp);

			const now = this.timeService.date;
			await this.appsRepository.update({ id: app.id }, {
				status: 'approved',
				suspendedAt: null,
				approvedAt: now,
				reviewNote: ps.reviewNote,
			});
		});
	}
}
