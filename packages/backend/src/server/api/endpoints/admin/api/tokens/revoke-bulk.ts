/*
 * SPDX-FileCopyrightText: Universe Federation contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { In } from 'typeorm';
import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { AccessTokensRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import { ApiError } from '@/server/api/error.js';
import { sqlLikeEscape } from '@/misc/sql-like-escape.js';

export const meta = {
	tags: ['admin', 'api'],

	requireCredential: true,
	requireAdmin: true,
	kind: 'write:admin:api',

	res: {
		type: 'object',
		optional: false, nullable: false,
		properties: {
			revoked: { type: 'integer', optional: false, nullable: false },
		},
	},

	errors: {
		noTarget: {
			message: 'Provide tokenIds, or a name/userId/status filter.',
			code: 'NO_TARGET',
			id: 'd2c1b0a9-8f7e-4d6c-b5a4-3e2f1d0c9b8a',
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		// 显式选中的令牌
		tokenIds: { type: 'array', uniqueItems: true, items: { type: 'string', format: 'misskey:id' } },
		// 或按筛选批量撤销（用于一键清掉同名"API中转"令牌）
		name: { type: 'string' },
		userId: { type: 'string', format: 'misskey:id' },
		onlyDeveloperTokens: { type: 'boolean', default: true },
	},
	required: [],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.accessTokensRepository)
		private readonly accessTokensRepository: AccessTokensRepository,
	) {
		super(meta, paramDef, async (ps) => {
			const hasIds = ps.tokenIds != null && ps.tokenIds.length > 0;
			const hasFilter = (ps.name != null && ps.name.length > 0) || ps.userId != null;
			if (!hasIds && !hasFilter) throw new ApiError(meta.errors.noTarget);

			// UPDATE クエリビルダーはテーブル別名を使えないため、列名は別名なしで参照する。
			const qb = this.accessTokensRepository.createQueryBuilder()
				.update()
				.set({ status: 'revoked' })
				.where('"status" != :revoked', { revoked: 'revoked' });

			if (hasIds) {
				qb.andWhere({ id: In(ps.tokenIds!) });
			} else {
				if (ps.onlyDeveloperTokens !== false) {
					qb.andWhere('("isDeveloperToken" = true OR "appId" IS NULL)');
				}
				if (ps.name != null && ps.name.length > 0) {
					qb.andWhere('"name" ILIKE :name', { name: '%' + sqlLikeEscape(ps.name) + '%' });
				}
				if (ps.userId != null) {
					qb.andWhere('"userId" = :userId', { userId: ps.userId });
				}
			}

			const result = await qb.execute();
			return { revoked: result.affected ?? 0 };
		});
	}
}
