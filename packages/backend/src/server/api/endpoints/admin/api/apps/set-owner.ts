/*
 * SPDX-FileCopyrightText: Universe Federation contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { AppsRepository, UsersRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import { ApiError } from '@/server/api/error.js';

export const meta = {
	tags: ['admin', 'api'],

	requireCredential: true,
	requireAdmin: true,
	kind: 'write:admin:api',

	errors: {
		noSuchApp: {
			message: 'No such app.',
			code: 'NO_SUCH_APP',
			id: 'c4a3b2d1-9e8f-4a7b-8c6d-5e4f3a2b1c0d',
		},
		noSuchUser: {
			message: 'No such (local) user.',
			code: 'NO_SUCH_USER',
			id: 'a1b2c3d4-5e6f-4708-9a1b-2c3d4e5f6a7b',
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		appId: { type: 'string', format: 'misskey:id' },
		userId: { type: 'string', format: 'misskey:id' },
	},
	required: ['appId', 'userId'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.appsRepository)
		private readonly appsRepository: AppsRepository,

		@Inject(DI.usersRepository)
		private readonly usersRepository: UsersRepository,
	) {
		super(meta, paramDef, async (ps) => {
			const app = await this.appsRepository.findOneBy({ id: ps.appId });
			if (app == null) throw new ApiError(meta.errors.noSuchApp);

			const user = await this.usersRepository.findOneBy({ id: ps.userId });
			if (user == null || user.host != null) throw new ApiError(meta.errors.noSuchUser);

			await this.appsRepository.update({ id: ps.appId }, { userId: ps.userId });
		});
	}
}
