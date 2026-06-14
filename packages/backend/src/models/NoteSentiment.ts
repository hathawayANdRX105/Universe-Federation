/*
 * SPDX-FileCopyrightText: Universe Federation contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { PrimaryColumn, Entity, Index, JoinColumn, Column, ManyToOne } from 'typeorm';
import { id } from './util/id.js';
import { MiNote } from './Note.js';

/**
 * 投稿の感情分析結果。発投稿時に非同期(キュー)で算出して保存し、推薦の並びや管理画面の指標に使う。
 * 分析済みの投稿のみ行を持つ。
 */
@Entity('note_sentiment')
export class MiNoteSentiment {
	@PrimaryColumn(id())
	public noteId: MiNote['id'];

	@ManyToOne(type => MiNote, {
		onDelete: 'CASCADE',
	})
	@JoinColumn()
	public note: MiNote | null;

	// 感情スコア: -1(強い負面) 〜 +1(強い正面)
	@Index()
	@Column('real', {
		default: 0,
	})
	public score: number;

	// ラベル: 'positive' | 'neutral' | 'negative'
	@Column('varchar', {
		length: 16,
	})
	public label: string;

	// 確信度(0〜1)。最大確率ラベルの確率。
	@Column('real', {
		default: 0,
	})
	public magnitude: number;

	@Column('timestamp with time zone')
	public analyzedAt: Date;
}
