/*
 * SPDX-FileCopyrightText: hhhl contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import type { MiMeta } from '@/models/Meta.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { MetaService } from '@/core/MetaService.js';
import { SearchTrendService } from '@/core/SearchTrendService.js';
import { DI } from '@/di-symbols.js';

export const meta = {
	tags: ['admin'],

	requireCredential: true,
	requireAdmin: true,
	kind: 'write:admin:meta',

	res: {
		type: 'object',
		optional: false, nullable: false,
		properties: {
			hiddenSearchTrendTerms: {
				type: 'array',
				optional: false, nullable: false,
				items: {
					type: 'string',
					optional: false, nullable: false,
				},
			},
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		term: { type: 'string', minLength: 1 },
	},
	required: ['term'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.meta)
		private readonly instanceMeta: MiMeta,

		private metaService: MetaService,
		private searchTrendService: SearchTrendService,
	) {
		super(meta, paramDef, async (ps) => {
			const hiddenSearchTrendTerms = await this.searchTrendService.hideTerm(ps.term);

			await this.metaService.update({ hiddenSearchTrendTerms });
			await this.searchTrendService.removeTermFromCurrentRankings(ps.term);

			return {
				hiddenSearchTrendTerms,
			};
		});
	}
}
