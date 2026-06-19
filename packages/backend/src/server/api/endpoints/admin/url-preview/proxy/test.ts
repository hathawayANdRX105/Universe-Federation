/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { DI } from '@/di-symbols.js';
import type { MiMeta } from '@/models/Meta.js';
import { UrlPreviewProxyService } from '@/core/UrlPreviewProxyService.js';
import {
	normalizeUrlPreviewOutboundProxies,
	type UrlPreviewOutboundProxy,
} from '@/misc/url-preview-proxy.js';

export const meta = {
	tags: ['admin'],

	requireCredential: true,
	requireAdmin: true,
	kind: 'read:admin:meta',

	res: {
		type: 'object',
		optional: false, nullable: false,
		properties: {
			ok: { type: 'boolean', optional: false, nullable: false },
			elapsedMs: { type: 'number', optional: false, nullable: false },
			outboundIp: { type: 'string', optional: false, nullable: true },
			proxyId: { type: 'string', optional: false, nullable: false },
			error: { type: 'string', optional: false, nullable: true },
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		proxyId: { type: 'string', nullable: true },
		proxy: {
			type: 'object',
			nullable: true,
			additionalProperties: true,
		},
		testUrl: { type: 'string', nullable: true },
	},
	required: [],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.meta)
		private readonly serverSettings: MiMeta,

		private readonly urlPreviewProxyService: UrlPreviewProxyService,
	) {
		super(meta, paramDef, async (ps) => {
			const proxy = this.resolveProxy(ps.proxyId ?? null, ps.proxy ?? null);
			return await this.urlPreviewProxyService.testProxy(proxy, ps.testUrl);
		});
	}

	private resolveProxy(proxyId: string | null, proxyDraft: Record<string, unknown> | null): UrlPreviewOutboundProxy {
		const saved = this.serverSettings.urlPreviewOutboundProxies ?? [];

		if (proxyDraft != null) {
			return normalizeUrlPreviewOutboundProxies([proxyDraft], saved)[0];
		}

		if (proxyId != null) {
			const proxy = saved.find(item => item.id === proxyId);
			if (proxy != null) return proxy;
		}

		throw new Error('URL preview proxy not found');
	}
}
