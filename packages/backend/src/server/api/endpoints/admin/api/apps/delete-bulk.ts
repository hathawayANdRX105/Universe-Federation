/*
 * SPDX-FileCopyrightText: Universe Federation contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { In, IsNull } from 'typeorm';
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

			const where = hasIds ? { id: In(ps.appIds!) } : { userId: IsNull() };

			// 先撤销这些应用签发的令牌，再删除应用
			const apps = await this.appsRepository.find({ where, select: ['id'] });
			if (apps.length === 0) return { deleted: 0 };
			const appIds = apps.map(a => a.id);

			await this.accessTokensRepository.update({ appId: In(appIds) }, { status: 'revoked' });
			await this.appsRepository.delete({ id: In(appIds) });

			return { deleted: appIds.length };
		});
	}
}
