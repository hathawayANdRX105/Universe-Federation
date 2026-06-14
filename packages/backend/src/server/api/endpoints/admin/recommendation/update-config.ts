/*
 * SPDX-FileCopyrightText: Universe Federation contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { RecommendationService } from '@/core/RecommendationService.js';
import { CONFIG_SCHEMA } from './get-config.js';

export const meta = {
	tags: ['admin'],

	requireCredential: true,
	requireModerator: true,
	kind: 'write:admin:recommendation',

	// 更新後の(検証・補完済み)完全な設定を返す
	res: CONFIG_SCHEMA,
} as const;

// 入力スキーマ:全量(編集保存・インポート共用)。欠落フィールドは現在値で補完される。
export const paramDef = {
	type: 'object',
	properties: {
		enabled: { type: 'boolean' },
		rules: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					id: { type: 'string' },
					name: { type: 'string' },
					enabled: { type: 'boolean' },
					kind: { type: 'string', enum: ['demote', 'boost'] },
					match: { type: 'string', enum: ['keyword', 'tag'] },
					terms: { type: 'array', items: { type: 'string' } },
					weight: { type: 'integer', minimum: 0, maximum: 300 },
					exemptWithQuality: { type: 'boolean' },
				},
				required: ['name', 'kind', 'match', 'terms', 'weight'],
			},
		},
		channelBoost: { type: 'integer', minimum: 0, maximum: 300 },
		excludeThreshold: { type: 'integer', minimum: 10, maximum: 300 },
		sentiment: {
			type: 'object',
			properties: {
				enabled: { type: 'boolean' },
				modelId: { type: 'string' },
				negativePenalty: { type: 'integer', minimum: -300, maximum: 0 },
				positiveBoost: { type: 'integer', minimum: 0, maximum: 300 },
				neutralBand: { type: 'number', minimum: 0, maximum: 0.9 },
			},
		},
	},
	required: [],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		private recommendationService: RecommendationService,
	) {
		super(meta, paramDef, async (ps) => {
			return await this.recommendationService.updateRecommendationConfig(ps);
		});
	}
}
