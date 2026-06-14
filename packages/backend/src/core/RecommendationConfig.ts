/*
 * SPDX-FileCopyrightText: Universe Federation contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

// ホーム推薦の打分調整を管理者が動的に行うための設定。meta.recommendationConfig(jsonb)に保存。
// 管理者は「ルール」を自由に増減できる(各ルール = 語/タグの集合 + 降权/加点 + 重み)。
// ここに無い構造的ルール(極端に短い投稿・sk-キー羅列・連続同一文字 等)はコードに内蔵で調整対象外。

export type RecommendationRuleKind = 'demote' | 'boost';
export type RecommendationRuleMatch = 'keyword' | 'tag';

export type RecommendationRule = {
	/** 安定 id(欠落時は merge で補完) */
	id: string;
	/** 管理者が付ける名前(例: 広告引流词) */
	name: string;
	enabled: boolean;
	/** demote=降权 / boost=加分 */
	kind: RecommendationRuleKind;
	/** keyword=正文に含む / tag=話題タグ完全一致 */
	match: RecommendationRuleMatch;
	/** 語・タグの集合 */
	terms: string[];
	/** 減点幅(demote)/ 加点幅(boost), 0..300 */
	weight: number;
	/** demote 専用: 良質な文脈(boost ルール命中)があれば降权を免除 */
	exemptWithQuality: boolean;
};

export type RecommendationSentimentConfig = {
	/** 情感分析を推薦スコアに反映するか(分析自体の実行は別途) */
	enabled: boolean;
	/** Transformers.js のモデル ID(HF Hub) */
	modelId: string;
	/** score < -neutralBand のとき加算する値(負=降权。「負面を主に压す」) */
	negativePenalty: number;
	/** score > neutralBand のとき加算する値(正=軽い加点) */
	positiveBoost: number;
	/** [-neutralBand, neutralBand] は中立扱いで無調整 */
	neutralBand: number;
};

export type RecommendationConfig = {
	/** 語ベースのルール全体の有効・無効 */
	enabled: boolean;
	/** 管理者が編集できるルール集合 */
	rules: RecommendationRule[];
	/** チャンネル投稿への一律加点(0..300) */
	channelBoost: number;
	/** 減点合計がこの値以上 かつ 強いエンゲージメント無し → 推薦から除外 */
	excludeThreshold: number;
	/** 情感分析の推薦反映設定 */
	sentiment: RecommendationSentimentConfig;
};

export const DEFAULT_SENTIMENT_MODEL_ID = 'Xenova/distilbert-base-multilingual-cased-sentiments-student';

// 既定ルール(一期の固定カテゴリ/重みをそのまま再現)
export const DEFAULT_RECOMMENDATION_CONFIG: RecommendationConfig = {
	enabled: true,
	rules: [
		{ id: 'low-value-tags', name: '低质标签', enabled: true, kind: 'demote', match: 'tag', weight: 18, exemptWithQuality: false, terms: ['签到', '打卡', '水贴', 'key', 'Key', '广告', '推广', '返利', 'aff', '引流', '招商', 'bug', 'Bug', 'BUG', '反馈', '报错'] },
		{ id: 'promo-keywords', name: '广告/引流词', enabled: true, kind: 'demote', match: 'keyword', weight: 42, exemptWithQuality: true, terms: ['返利', '佣金', '返佣', '分销', '代理', '招商', '加盟', '拉新', '地推', '带货', '变现', '副业', '兼职', '日入', '月入', '躺赚', '薅羊毛', '割韭菜', 'affiliate', '联盟营销', '推广链接', '邀请链接', '优惠码', '折扣码', '加微信', '加群', '加vx', '加wx', '电报', 'telegram', '中转', '机场', '合集大全', '订阅地址'] },
		{ id: 'bug-keywords', name: 'bug/反馈/报错词', enabled: true, kind: 'demote', match: 'keyword', weight: 30, exemptWithQuality: false, terms: ['不能用', '用不了', '加载不出', '打不开', '崩溃', '闪退', '卡死', '宕机', '报错', '没反应', '建议加', '建议做', '能不能加', '能不能做', '希望能'] },
		{ id: 'aff-link', name: 'aff/注册链接', enabled: true, kind: 'demote', match: 'keyword', weight: 70, exemptWithQuality: false, terms: ['aff=', '/register', '/signup', '/invite'] },
		{ id: 'quality-tags', name: '优质标签', enabled: true, kind: 'boost', match: 'tag', weight: 18, exemptWithQuality: false, terms: ['教程', 'ai', 'AI', '资源', '公告', '讨论', '指南', '分享', '经验'] },
		{ id: 'quality-keywords', name: '优质内容词', enabled: true, kind: 'boost', match: 'keyword', weight: 18, exemptWithQuality: false, terms: ['教程', '指南', '配置', '部署', '使用方法', '怎么用', '如何', '说明', '公告', '更新', '讨论', '分享', '经验', '科普', '盘点', 'claude', 'codex', 'gpt'] },
	],
	channelBoost: 8,
	excludeThreshold: 60,
	sentiment: {
		enabled: false,
		modelId: DEFAULT_SENTIMENT_MODEL_ID,
		negativePenalty: -40,
		positiveBoost: 10,
		neutralBand: 0.15,
	},
};

function asStringArray(value: unknown, fallback: string[]): string[] {
	if (!Array.isArray(value)) return [...fallback];
	const cleaned = value
		.filter((x): x is string => typeof x === 'string')
		.map(x => x.trim())
		.filter(x => x.length > 0);
	return Array.from(new Set(cleaned));
}

function asNumber(value: unknown, fallback: number, min: number, max: number): number {
	if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
	return Math.min(max, Math.max(min, Math.round(value)));
}

function asBool(value: unknown, fallback: boolean): boolean {
	return typeof value === 'boolean' ? value : fallback;
}

function sanitizeRule(raw: unknown, index: number, seenIds: Set<string>): RecommendationRule | null {
	if (raw == null || typeof raw !== 'object') return null;
	const r = raw as Partial<RecommendationRule>;
	const terms = asStringArray(r.terms, []);
	if (terms.length === 0) return null;
	const kind: RecommendationRuleKind = r.kind === 'boost' ? 'boost' : 'demote';
	const match: RecommendationRuleMatch = r.match === 'tag' ? 'tag' : 'keyword';
	let id = typeof r.id === 'string' && r.id.trim().length > 0 ? r.id.trim() : `rule-${index}`;
	while (seenIds.has(id)) id = `${id}-${index}`;
	seenIds.add(id);
	const name = typeof r.name === 'string' && r.name.trim().length > 0 ? r.name.trim() : id;
	return {
		id,
		name,
		enabled: asBool(r.enabled, true),
		kind,
		match,
		terms,
		weight: asNumber(r.weight, 18, 0, 300),
		exemptWithQuality: asBool(r.exemptWithQuality, false),
	};
}

// 一期(旧形態 lowValueTags/promoKeywords/... + weights)をルール配列へ変換
function rulesFromLegacy(c: Record<string, unknown>): RecommendationRule[] {
	const w = (c.weights ?? {}) as Record<string, unknown>;
	const d = DEFAULT_RECOMMENDATION_CONFIG;
	const num = (v: unknown, fb: number) => asNumber(v, fb, 0, 300);
	const out: RecommendationRule[] = [];
	const push = (base: RecommendationRule, terms: unknown, weight: number) => {
		const t = asStringArray(terms, []);
		if (t.length > 0) out.push({ ...base, terms: t, weight });
	};
	push(d.rules[0], c.lowValueTags, num(w.lowValueTagPenalty, 18));
	push(d.rules[1], c.promoKeywords, num(w.promoPenalty, 42));
	push(d.rules[2], c.bugKeywords, num(w.bugPenalty, 30));
	out.push({ ...d.rules[3], weight: num(w.affLinkPenalty, 70) });
	push(d.rules[4], c.qualityTags, num(w.qualityBoost, 18));
	push(d.rules[5], c.qualityKeywords, num(w.qualityBoost, 18));
	return out;
}

function cloneDefaultRules(): RecommendationRule[] {
	return DEFAULT_RECOMMENDATION_CONFIG.rules.map(r => ({ ...r, terms: [...r.terms] }));
}

function mergeSentiment(raw: unknown): RecommendationSentimentConfig {
	const d = DEFAULT_RECOMMENDATION_CONFIG.sentiment;
	if (raw == null || typeof raw !== 'object') return { ...d };
	const s = raw as Partial<RecommendationSentimentConfig>;
	return {
		enabled: asBool(s.enabled, d.enabled),
		modelId: typeof s.modelId === 'string' && s.modelId.trim().length > 0 ? s.modelId.trim() : d.modelId,
		negativePenalty: asNumber(s.negativePenalty, d.negativePenalty, -300, 0),
		positiveBoost: asNumber(s.positiveBoost, d.positiveBoost, 0, 300),
		// neutralBand は 0..1 の小数なので整数化しない
		neutralBand: typeof s.neutralBand === 'number' && Number.isFinite(s.neutralBand) ? Math.min(0.9, Math.max(0, s.neutralBand)) : d.neutralBand,
	};
}

/**
 * 保存された(部分的・旧形態の可能性がある)設定を既定値で補完して完全な設定にする。
 * - rules があればそれを採用、無く旧フィールドがあれば変換、どちらも無ければ既定ルール。
 */
export function mergeRecommendationConfig(raw: unknown): RecommendationConfig {
	const d = DEFAULT_RECOMMENDATION_CONFIG;
	if (raw == null || typeof raw !== 'object') {
		return { ...d, rules: cloneDefaultRules(), sentiment: { ...d.sentiment } };
	}
	const c = raw as Record<string, unknown>;

	let rules: RecommendationRule[];
	if (Array.isArray(c.rules)) {
		const seen = new Set<string>();
		rules = c.rules.map((r, i) => sanitizeRule(r, i, seen)).filter((r): r is RecommendationRule => r != null);
		if (rules.length === 0) rules = cloneDefaultRules();
	} else if ('lowValueTags' in c || 'promoKeywords' in c || 'qualityTags' in c) {
		rules = rulesFromLegacy(c);
	} else {
		rules = cloneDefaultRules();
	}

	return {
		enabled: asBool(c.enabled, d.enabled),
		rules,
		channelBoost: asNumber(c.channelBoost, d.channelBoost, 0, 300),
		excludeThreshold: asNumber(c.excludeThreshold, d.excludeThreshold, 10, 300),
		sentiment: mergeSentiment(c.sentiment),
	};
}

export type DerivedSqlTerms = {
	/** 有効な demote/tag ルールのタグ集合(SQL 候補事前スコアの低品質タグ) */
	lowValueTags: string[];
	/** 有効な boost/tag ルールのタグ集合 */
	qualityTags: string[];
	/** 有効な boost/keyword ルールの語集合 */
	qualityKeywords: string[];
	/** 有効な demote/keyword ルールの語集合(discovery の除外パターン用) */
	demoteKeywords: string[];
};

/** ルール集合から SQL 事前フィルタ用の語/タグ集合を導出する。 */
export function deriveSqlTerms(config: RecommendationConfig): DerivedSqlTerms {
	const lowValueTags = new Set<string>();
	const qualityTags = new Set<string>();
	const qualityKeywords = new Set<string>();
	const demoteKeywords = new Set<string>();
	if (config.enabled) {
		for (const rule of config.rules) {
			if (!rule.enabled) continue;
			if (rule.kind === 'demote' && rule.match === 'tag') rule.terms.forEach(t => lowValueTags.add(t));
			else if (rule.kind === 'demote' && rule.match === 'keyword') rule.terms.forEach(t => demoteKeywords.add(t));
			else if (rule.kind === 'boost' && rule.match === 'tag') rule.terms.forEach(t => qualityTags.add(t));
			else if (rule.kind === 'boost' && rule.match === 'keyword') rule.terms.forEach(t => qualityKeywords.add(t));
		}
	}
	return {
		lowValueTags: [...lowValueTags],
		qualityTags: [...qualityTags],
		qualityKeywords: [...qualityKeywords],
		demoteKeywords: [...demoteKeywords],
	};
}

/** text が keywords のいずれかを含むか(小文字単純包含)。 */
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
