/*
 * SPDX-FileCopyrightText: Universe Federation contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { RecommendationService } from '@/core/RecommendationService.js';
import { DEFAULT_RECOMMENDATION_CONFIG } from '@/core/RecommendationConfig.js';

const bool = { type: 'boolean', optional: false, nullable: false } as const;
const num = { type: 'number', optional: false, nullable: false } as const;
const str = { type: 'string', optional: false, nullable: false } as const;
const strArray = { type: 'array', optional: false, nullable: false, items: str } as const;

const RULE_SCHEMA = {
	type: 'object',
	optional: false, nullable: false,
	properties: {
		id: str,
		name: str,
		enabled: bool,
		kind: { type: 'string', optional: false, nullable: false, enum: ['demote', 'boost'] },
		match: { type: 'string', optional: false, nullable: false, enum: ['keyword', 'tag'] },
		terms: strArray,
		weight: num,
		exemptWithQuality: bool,
	},
} as const;

const SENTIMENT_SCHEMA = {
	type: 'object',
	optional: false, nullable: false,
	properties: {
		enabled: bool,
		modelId: str,
		negativePenalty: num,
		positiveBoost: num,
		neutralBand: num,
	},
} as const;

export const CONFIG_SCHEMA = {
	type: 'object',
	optional: false, nullable: false,
	properties: {
		enabled: bool,
		rules: { type: 'array', optional: false, nullable: false, items: RULE_SCHEMA },
		channelBoost: num,
		excludeThreshold: num,
		sentiment: SENTIMENT_SCHEMA,
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
