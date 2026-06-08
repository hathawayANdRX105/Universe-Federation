/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { AccessTokensRepository } from '@/models/_.js';
import { IdService } from '@/core/IdService.js';
import { DI } from '@/di-symbols.js';

export const meta = {
	tags: ['api'],

	requireCredential: true,
	kind: 'read:account',
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		limit: { type: 'integer', minimum: 1, maximum: 100, default: 30 },
		offset: { type: 'integer', minimum: 0, default: 0 },
	},
	required: [],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.accessTokensRepository)
		private readonly accessTokensRepository: AccessTokensRepository,

		private readonly idService: IdService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const tokens = await this.accessTokensRepository.find({
				where: { userId: me.id, isDeveloperToken: true },
				order: { id: 'DESC' },
				take: ps.limit,
				skip: ps.offset,
			});

			return tokens.map(token => ({
				id: token.id,
				name: token.name,
				description: token.description,
				iconUrl: token.iconUrl,
				createdAt: this.idService.parse(token.id).date.toISOString(),
				lastUsedAt: token.lastUsedAt?.toISOString() ?? null,
				permission: token.permission,
				rank: token.rank,
				status: token.status,
				rateLimitPerMinute: token.rateLimitPerMinute,
			}));
		});
	}
}
