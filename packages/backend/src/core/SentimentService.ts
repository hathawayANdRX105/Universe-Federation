/*
 * SPDX-FileCopyrightText: Universe Federation contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { bindThis } from '@/decorators.js';
import { LoggerService } from '@/core/LoggerService.js';
import type Logger from '@/logger.js';

export type SentimentResult = {
	/** -1(強い負面) 〜 +1(強い正面) */
	score: number;
	label: 'positive' | 'neutral' | 'negative';
	/** 最大確率ラベルの確率(0〜1) */
	magnitude: number;
};

type ClassifyOutput = { label: string; score: number };

// 1投稿あたりの入力上限(モデルのトークン上限・速度のため)
const MAX_INPUT_CHARS = 512;

/**
 * Transformers.js(onnxruntime-node)でローカルに感情分析するサービス。
 * モデルは初回 analyze() 時に遅延ロードして以後プロセス内で使い回す(キューワーカーのみがロードする)。
 * Web プロセスは note_sentiment を読むだけでモデルをロードしない。
 */
@Injectable()
export class SentimentService {
	private pipelinePromise: Promise<(text: string, opts?: Record<string, unknown>) => Promise<unknown>> | null = null;
	private loadedModelId: string | null = null;
	private logger: Logger;

	constructor(
		private loggerService: LoggerService,
	) {
		this.logger = this.loggerService.getLogger('sentiment');
	}

	@bindThis
	private async getPipeline(modelId: string): Promise<(text: string, opts?: Record<string, unknown>) => Promise<unknown>> {
		if (this.pipelinePromise != null && this.loadedModelId === modelId) return this.pipelinePromise;
		this.loadedModelId = modelId;
		this.logger.info(`loading sentiment model: ${modelId}`);
		// 動的 import: 重いモジュール+ネイティブ依存を、実際に使うプロセスでのみロードする
		this.pipelinePromise = (async () => {
			const transformers = await import('@huggingface/transformers');
			// HF Hub からのリモートDL+ローカルキャッシュを許可
			transformers.env.allowRemoteModels = true;
			const pipe = await transformers.pipeline('sentiment-analysis', modelId);
			this.logger.info(`sentiment model ready: ${modelId}`);
			return pipe as unknown as (text: string, opts?: Record<string, unknown>) => Promise<unknown>;
		})();
		// ロード失敗時は次回再試行できるようキャッシュをクリア
		this.pipelinePromise.catch(() => {
			if (this.loadedModelId === modelId) {
				this.pipelinePromise = null;
				this.loadedModelId = null;
			}
		});
		return this.pipelinePromise;
	}

	/**
	 * テキストの感情を分析する。失敗時(モデル未取得・エラー)は null を返す。
	 */
	@bindThis
	public async analyze(text: string, modelId: string): Promise<SentimentResult | null> {
		const clean = (text ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_INPUT_CHARS);
		if (clean.length === 0) return null;
		try {
			const pipe = await this.getPipeline(modelId);
			const raw = await pipe(clean, { top_k: 5 });
			return this.mapResult(raw);
		} catch (err) {
			this.logger.warn(`sentiment analyze failed: ${err instanceof Error ? err.message : String(err)}`);
			return null;
		}
	}

	/** モデル出力(単一 or 配列)を {score,label,magnitude} に正規化する。 */
	private mapResult(raw: unknown): SentimentResult {
		const arr: ClassifyOutput[] = Array.isArray(raw)
			? raw as ClassifyOutput[]
			: (raw != null ? [raw as ClassifyOutput] : []);
		const prob = new Map<string, number>();
		for (const o of arr) {
			if (o == null || typeof o.label !== 'string') continue;
			prob.set(o.label.toLowerCase(), Number(o.score) || 0);
		}
		// ラベル名はモデルにより positive/negative/neutral や 1〜5 stars など。代表的なものを吸収。
		const pos = prob.get('positive') ?? prob.get('pos') ?? prob.get('label_2') ?? prob.get('5 stars') ?? prob.get('4 stars') ?? 0;
		const neg = prob.get('negative') ?? prob.get('neg') ?? prob.get('label_0') ?? prob.get('1 star') ?? prob.get('2 stars') ?? 0;
		const neu = prob.get('neutral') ?? prob.get('label_1') ?? prob.get('3 stars') ?? Math.max(0, 1 - pos - neg);
		const score = Math.max(-1, Math.min(1, pos - neg));
		let label: SentimentResult['label'] = 'neutral';
		let magnitude = neu;
		if (pos >= neg && pos >= neu) { label = 'positive'; magnitude = pos; } else if (neg >= pos && neg >= neu) { label = 'negative'; magnitude = neg; }
		return { score, label, magnitude };
	}
}
