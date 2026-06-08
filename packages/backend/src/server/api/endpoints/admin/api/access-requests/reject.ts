/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { ApiError } from '@/server/api/error.js';
import type { ApiAccessGrantsRepository } from '@/models/_.js';
import { TimeService } from '@/global/TimeService.js';
import { DI } from '@/di-symbols.js';

export const meta = {
	tags: ['admin', 'api'],

	requireCredential: true,
	requireAdmin: true,
	kind: 'write:admin:api',

	errors: {
		noSuchRequest: {
			message: 'No such API access request.',
			code: 'NO_SUCH_API_ACCESS_REQUEST',
			id: 'fb76438b-87d7-4c6c-a963-4d98b83ac3f0',
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		id: { type: 'string', format: 'misskey:id' },
		reviewNote: { type: 'string', nullable: true, maxLength: 2000 },
	},
	required: ['id'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.apiAccessGrantsRepository)
		private readonly apiAccessGrantsRepository: ApiAccessGrantsRepository,

		private readonly timeService: TimeService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const grant = await this.apiAccessGrantsRepository.findOneBy({ id: ps.id });
			if (grant == null) throw new ApiError(meta.errors.noSuchRequest);

			const now = this.timeService.date;
			await this.apiAccessGrantsRepository.update({ id: grant.id }, {
				status: 'rejected',
				updatedAt: now,
				reviewerId: me.id,
				reviewedAt: now,
				reviewNote: ps.reviewNote,
			});
		});
	}
}
