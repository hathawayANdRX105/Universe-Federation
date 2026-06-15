/*
 * SPDX-FileCopyrightText: Universe Federation contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { AppsRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';

export const meta = {
	tags: ['admin', 'api'],

	requireCredential: true,
	requireAdmin: true,
	kind: 'write:admin:api',

	res: {
		type: 'object',
		optional: false, nullable: false,
		properties: {
			recovered: { type: 'integer', optional: false, nullable: false },
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
		@Inject(DI.appsRepository)
		private readonly appsRepository: AppsRepository,
	) {
		super(meta, paramDef, async () => {
			// owner が NULL のアプリのうち、トークン所有者がちょうど1人のものは、その人を元の作成者とみなして owner を復元する。
			// （bug で作成時に来源ユーザーが記録されなかった分を、現在の利用者に影響を与えず復旧する）
			const rows = await this.appsRepository.query(`
				UPDATE "app" SET "userId" = sub.uid
				FROM (
					SELECT "appId", min("userId") AS uid
					FROM "access_token"
					WHERE "appId" IS NOT NULL
					GROUP BY "appId"
					HAVING count(DISTINCT "userId") = 1
				) sub
				WHERE "app"."id" = sub."appId" AND "app"."userId" IS NULL
				RETURNING "app"."id"
			`) as { id: string }[];

			return { recovered: rows.length };
		});
	}
}
