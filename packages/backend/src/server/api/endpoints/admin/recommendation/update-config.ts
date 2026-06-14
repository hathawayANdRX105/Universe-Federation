/*
 * SPDX-FileCopyrightText: Universe Federation contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { RecommendationService } from '@/core/RecommendationService.js';

const stringArray = { type: 'array', items: { type: 'string' } } as const;
const penalty = { type: 'integer', minimum: 0, maximum: 300 } as const;

const resStringArray = { type: 'array', optional: false, nullable: false, items: { type: 'string', optional: false, nullable: false } } as const;
const resNumber = { type: 'number', optional: false, nullable: false } as const;

export const meta = {
	tags: ['admin'],

	requireCredential: true,
	requireModerator: true,
	kind: 'write:admin:recommendation',

	res: {
		type: 'object',
		optional: false, nullable: false,
		properties: {
			enabled: { type: 'boolean', optional: false, nullable: false },
			lowValueTags: resStringArray,
			promoKeywords: resStringArray,
			bugKeywords: resStringArray,
			qualityKeywords: resStringArray,
			qualityTags: resStringArray,
			weights: {
				type: 'object',
				optional: false, nullable: false,
				properties: {
					lowValueTagPenalty: resNumber,
					promoPenalty: resNumber,
					bugPenalty: resNumber,
					affLinkPenalty: resNumber,
					qualityBoost: resNumber,
				},
			},
			excludeThreshold: resNumber,
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		// 語ベースの降权/加点ルール全体の有効・無効
		enabled: { type: 'boolean' },
		// 命中で減点する低品質タグ
		lowValueTags: stringArray,
		// 命中で減点する広告/引流キーワード
		promoKeywords: stringArray,
		// 命中で減点する bug/不具合/要望キーワード
		bugKeywords: stringArray,
		// 命中で加点する良質コンテンツキーワード
		qualityKeywords: stringArray,
		// 命中で加点する良質タグ
		qualityTags: stringArray,
		// 各種の重み(減点幅・加点幅)
		weights: {
			type: 'object',
			properties: {
				lowValueTagPenalty: penalty,
				promoPenalty: penalty,
				bugPenalty: penalty,
				affLinkPenalty: penalty,
				qualityBoost: penalty,
			},
		},
		// 減点合計がこの値以上 かつ 強いエンゲージメント無し → 推薦から除外
		excludeThreshold: { type: 'integer', minimum: 10, maximum: 300 },
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
