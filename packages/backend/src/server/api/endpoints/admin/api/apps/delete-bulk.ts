/*
 * SPDX-FileCopyrightText: Universe Federation contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { In } from 'typeorm';
import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { AccessTokensRepository, AppsRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import { ApiError } from '@/server/api/error.js';

export const meta = {
	tags: ['admin', 'api'],

	requireCredential: true,
	requireAdmin: true,
	kind: 'write:admin:api',

	res: {
		type: 'object',
		optional: false, nullable: false,
		properties: {
			deleted: { type: 'integer', optional: false, nullable: false },
		},
	},

	errors: {
		noTarget: {
			message: 'Provide appIds, or set ownerless=true.',
			code: 'NO_TARGET',
			id: 'f0e1d2c3-b4a5-4968-8778-695a4b3c2d1e',
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		appIds: { type: 'array', uniqueItems: true, items: { type: 'string', format: 'misskey:id' } },
		// true 时删除所有 owner 为空的孤儿应用
		ownerless: { type: 'boolean', default: false },
	},
	required: [],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.appsRepository)
		private readonly appsRepository: AppsRepository,

		@Inject(DI.accessTokensRepository)
		private readonly accessTokensRepository: AccessTokensRepository,
	) {
		super(meta, paramDef, async (ps) => {
			const hasIds = ps.appIds != null && ps.appIds.length > 0;
			if (!hasIds && !ps.ownerless) throw new ApiError(meta.errors.noTarget);

			let appIds: string[];
			if (hasIds) {
				appIds = ps.appIds!;
			} else {
				// ownerless：仅清理「无主且无有效令牌」的废弃应用，绝不影响仍在使用的用户。
				const rows = await this.appsRepository.query(`
					SELECT a."id" FROM "app" a
					WHERE a."userId" IS NULL
					AND NOT EXISTS (SELECT 1 FROM "access_token" t WHERE t."appId" = a."id" AND t."status" != 'revoked')
				`) as { id: string }[];
				appIds = rows.map(r => r.id);
			}

			if (appIds.length === 0) return { deleted: 0 };

			await this.accessTokensRepository.update({ appId: In(appIds) }, { status: 'revoked' });
			await this.appsRepository.delete({ id: In(appIds) });

			return { deleted: appIds.length };
		});
	}
}
