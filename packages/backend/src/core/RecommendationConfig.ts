/*
 * SPDX-FileCopyrightText: Universe Federation contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

// ホーム推薦の「どの語をどれだけ降权/加点するか」を管理者が動的に調整できるようにするための設定。
// meta.recommendationConfig(jsonb)に保存され、未設定の項目は下の既定値で補完される。
// ここに無い構造的ルール(極端に短い投稿・sk-キー羅列・連続同一文字 等)はコードに内蔵されており調整対象外。

export type RecommendationWeights = {
	/** 低品質タグ(lowValueTags)命中時の減点 */
	lowValueTagPenalty: number;
	/** 広告/引流キーワード(promoKeywords)命中時の減点 */
	promoPenalty: number;
	/** bug/不具合/要望キーワード(bugKeywords)命中時の減点 */
	bugPenalty: number;
	/** aff リンク(?aff=)命中時の減点 */
	affLinkPenalty: number;
	/** 質の高いキーワード/タグ命中時の加点 */
	qualityBoost: number;
};

export type RecommendationConfig = {
	/** 語ベースの降权/加点ルール全体の有効・無効 */
	enabled: boolean;
	/** 命中で減点する低品質タグ */
	lowValueTags: string[];
	/** 命中で減点する広告/引流キーワード */
	promoKeywords: string[];
	/** 命中で減点する bug/不具合/要望キーワード */
	bugKeywords: string[];
	/** 命中で加点する良質コンテンツキーワード */
	qualityKeywords: string[];
	/** 命中で加点する良質タグ */
	qualityTags: string[];
	/** 各種の重み */
	weights: RecommendationWeights;
	/** 減点合計がこの値以上 かつ 強いエンゲージメントが無い投稿は推薦から除外 */
	excludeThreshold: number;
};

export const DEFAULT_RECOMMENDATION_CONFIG: RecommendationConfig = {
	enabled: true,
	lowValueTags: ['签到', '打卡', '水贴', 'key', 'Key', '广告', '推广', '返利', 'aff', '引流', '招商', 'bug', 'Bug', 'BUG', '反馈', '报错'],
	promoKeywords: ['返利', '佣金', '返佣', '分销', '代理', '招商', '加盟', '拉新', '地推', '带货', '变现', '副业', '兼职', '日入', '月入', '躺赚', '薅羊毛', '割韭菜', 'affiliate', '联盟营销', '推广链接', '邀请链接', '优惠码', '折扣码', '加微信', '加群', '加vx', '加wx', '电报', 'telegram', '中转', '机场', '合集大全', '订阅地址'],
	bugKeywords: ['不能用', '用不了', '加载不出', '打不开', '崩溃', '闪退', '卡死', '宕机', '报错', '没反应', '建议加', '建议做', '能不能加', '能不能做', '希望能'],
	qualityKeywords: ['教程', '指南', '配置', '部署', '使用方法', '怎么用', '如何', '说明', '公告', '更新', '讨论', '分享', '经验', '科普', '盘点', 'claude', 'codex', 'gpt'],
	qualityTags: ['教程', 'ai', 'AI', '资源', '公告', '讨论', '指南', '分享', '经验'],
	weights: {
		lowValueTagPenalty: 18,
		promoPenalty: 42,
		bugPenalty: 30,
		affLinkPenalty: 70,
		qualityBoost: 18,
	},
	excludeThreshold: 60,
};

function asStringArray(value: unknown, fallback: string[]): string[] {
	if (!Array.isArray(value)) return [...fallback];
	const cleaned = value
		.filter((x): x is string => typeof x === 'string')
		.map(x => x.trim())
		.filter(x => x.length > 0);
	// 重複除去(順序維持)
	return Array.from(new Set(cleaned));
}

function asNumber(value: unknown, fallback: number, min: number, max: number): number {
	if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
	return Math.min(max, Math.max(min, Math.round(value)));
}

/**
 * 保存された(部分的な可能性のある)設定を既定値で補完して完全な設定にする。
 * 不正な型・範囲外の値は既定値/クランプで安全化する。
 */
export function mergeRecommendationConfig(raw: unknown): RecommendationConfig {
	const d = DEFAULT_RECOMMENDATION_CONFIG;
	if (raw == null || typeof raw !== 'object') {
		return { ...d, weights: { ...d.weights }, lowValueTags: [...d.lowValueTags], promoKeywords: [...d.promoKeywords], bugKeywords: [...d.bugKeywords], qualityKeywords: [...d.qualityKeywords], qualityTags: [...d.qualityTags] };
	}
	const c = raw as Partial<RecommendationConfig> & { weights?: Partial<RecommendationWeights> };
	const w = (c.weights ?? {}) as Partial<RecommendationWeights>;
	return {
		enabled: typeof c.enabled === 'boolean' ? c.enabled : d.enabled,
		lowValueTags: asStringArray(c.lowValueTags, d.lowValueTags),
		promoKeywords: asStringArray(c.promoKeywords, d.promoKeywords),
		bugKeywords: asStringArray(c.bugKeywords, d.bugKeywords),
		qualityKeywords: asStringArray(c.qualityKeywords, d.qualityKeywords),
		qualityTags: asStringArray(c.qualityTags, d.qualityTags),
		weights: {
			lowValueTagPenalty: asNumber(w.lowValueTagPenalty, d.weights.lowValueTagPenalty, 0, 300),
			promoPenalty: asNumber(w.promoPenalty, d.weights.promoPenalty, 0, 300),
			bugPenalty: asNumber(w.bugPenalty, d.weights.bugPenalty, 0, 300),
			affLinkPenalty: asNumber(w.affLinkPenalty, d.weights.affLinkPenalty, 0, 300),
			qualityBoost: asNumber(w.qualityBoost, d.weights.qualityBoost, 0, 300),
		},
		excludeThreshold: asNumber(c.excludeThreshold, d.excludeThreshold, 10, 300),
	};
}

/** text(小文字化済みでなくてよい)が keywords のいずれかを含むか。中文/英文どちらも単純包含で判定。 */
export function containsKeyword(text: string, keywords: string[]): boolean {
	if (keywords.length === 0 || text.length === 0) return false;
	const lower = text.toLowerCase();
	return keywords.some(k => k.length > 0 && lower.includes(k.toLowerCase()));
}

/** tags が targets のいずれかを含むか(完全一致・大文字小文字無視)。 */
export function hasAnyTag(tags: string[] | undefined | null, targets: string[]): boolean {
	if (!tags || tags.length === 0 || targets.length === 0) return false;
	const set = new Set(targets.map(t => t.toLowerCase()));
	return tags.some(t => set.has(t.toLowerCase()));
}
