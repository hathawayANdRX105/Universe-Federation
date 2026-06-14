/*
 * SPDX-FileCopyrightText: Universe Federation contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { RecommendationService } from '@/core/RecommendationService.js';
import { DEFAULT_RECOMMENDATION_CONFIG } from '@/core/RecommendationConfig.js';

const stringArray = { type: 'array', optional: false, nullable: false, items: { type: 'string', optional: false, nullable: false } } as const;
const number = { type: 'number', optional: false, nullable: false } as const;

const CONFIG_SCHEMA = {
	type: 'object',
	optional: false, nullable: false,
	properties: {
		enabled: { type: 'boolean', optional: false, nullable: false },
		lowValueTags: stringArray,
		promoKeywords: stringArray,
		bugKeywords: stringArray,
		qualityKeywords: stringArray,
		qualityTags: stringArray,
		weights: {
			type: 'object',
			optional: false, nullable: false,
			properties: {
				lowValueTagPenalty: number,
				promoPenalty: number,
				bugPenalty: number,
				affLinkPenalty: number,
				qualityBoost: number,
			},
		},
		excludeThreshold: number,
	},
} as const;

export const meta = {
	tags: ['admin'],

	requireCredential: true,
	requireModerator: true,
	kind: 'read:admin:recommendation',

	res: {
		type: 'object',
		optional: false, nullable: false,
		properties: {
			// 現在有効な設定(未設定項目は既定値で補完済み)
			current: CONFIG_SCHEMA,
			// 既定値(「既定に戻す」用)
			default: CONFIG_SCHEMA,
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {},
	required: [],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		private recommendationService: RecommendationService,
	) {
		super(meta, paramDef, async () => {
			const current = await this.recommendationService.getRecommendationConfig();
			return {
				current,
				default: DEFAULT_RECOMMENDATION_CONFIG,
			};
		});
	}
}
