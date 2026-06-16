/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { ApiAccessGrantsRepository, MiApiAccessGrant } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import { getApiNoApprovalPermissions, getApiPublicPermissions } from '@/server/api/api-access-utils.js';
import type { MiMeta } from '@/models/Meta.js';

export const meta = {
	tags: ['api'],

	requireCredential: true,
	kind: 'read:account',
} as const;

export const paramDef = {
	type: 'object',
	properties: {},
	required: [],
} as const;

function packGrant(grant: MiApiAccessGrant | null) {
	return grant == null ? null : {
		id: grant.id,
		status: grant.status,
		reason: grant.reason,
		reviewNote: grant.reviewNote,
		createdAt: grant.createdAt.toISOString(),
		updatedAt: grant.updatedAt.toISOString(),
		reviewedAt: grant.reviewedAt?.toISOString() ?? null,
	};
}

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.meta)
		private readonly instanceMeta: MiMeta,

		@Inject(DI.apiAccessGrantsRepository)
		private readonly apiAccessGrantsRepository: ApiAccessGrantsRepository,
	) {
		super(meta, paramDef, async (_ps, me) => {
			const grant = await this.apiAccessGrantsRepository.findOneBy({ userId: me.id });

			return {
				mode: this.instanceMeta.apiAccessMode,
				oauthEnabled: this.instanceMeta.enableOAuthLogin,
				oidcEnabled: this.instanceMeta.enableOidc,
				requireAppApproval: this.instanceMeta.apiRequireAppApproval,
				publicPermissions: getApiPublicPermissions(this.instanceMeta),
				// 免申请白名单(approval 模式下这些 scope 无需审核;open 模式下全部免审核)。
				noApprovalPermissions: getApiNoApprovalPermissions(this.instanceMeta),
				defaultTokenRateLimit: this.instanceMeta.apiDefaultTokenRateLimit,
				writeTokenRateLimit: this.instanceMeta.apiWriteTokenRateLimit,
				grant: packGrant(grant),
				effectiveStatus: this.instanceMeta.apiAccessMode === 'open' ? 'approved' : (grant?.status ?? 'none'),
			};
		});
	}
}
