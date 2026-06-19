/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import got, { type Agents } from 'got';
import { HttpProxyAgent, HttpsProxyAgent } from 'hpagent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { DI } from '@/di-symbols.js';
import type { Config } from '@/config.js';
import {
	buildUrlPreviewProxyUrl,
	type UrlPreviewOutboundProxy,
} from '@/misc/url-preview-proxy.js';
import { bindThis } from '@/decorators.js';

export type UrlPreviewProxyTestResult = {
	ok: boolean;
	elapsedMs: number;
	outboundIp: string | null;
	proxyId: string;
	error: string | null;
};

@Injectable()
export class UrlPreviewProxyService {
	constructor(
		@Inject(DI.config)
		private config: Config,
	) {
	}

	@bindThis
	public createAgents(proxy: UrlPreviewOutboundProxy): Agents {
		const proxyUrl = buildUrlPreviewProxyUrl(proxy);

		if (proxy.type === 'socks5') {
			const agent = new SocksProxyAgent(proxyUrl);
			return {
				http: agent,
				https: agent,
			} as unknown as Agents;
		}

		return {
			http: new HttpProxyAgent({ proxy: proxyUrl }),
			https: new HttpsProxyAgent({ proxy: proxyUrl }),
		};
	}

	@bindThis
	public async testProxy(proxy: UrlPreviewOutboundProxy, testUrl?: string | null): Promise<UrlPreviewProxyTestResult> {
		const url = this.normalizeTestUrl(testUrl);
		const startedAt = Date.now();

		try {
			const body = await got(url, {
				headers: {
					'User-Agent': this.config.userAgent,
				},
				agent: this.createAgents(proxy),
				timeout: {
					request: 15000,
				},
				retry: {
					limit: 0,
				},
				http2: false,
				enableUnixSockets: false,
			}).text();

			return {
				ok: true,
				elapsedMs: Date.now() - startedAt,
				outboundIp: this.extractOutboundIp(body),
				proxyId: proxy.id,
				error: null,
			};
		} catch (error) {
			return {
				ok: false,
				elapsedMs: Date.now() - startedAt,
				outboundIp: null,
				proxyId: proxy.id,
				error: this.redactProxySecrets(String(error instanceof Error ? error.message : error), proxy),
			};
		}
	}

	private normalizeTestUrl(testUrl?: string | null): string {
		const url = (testUrl ?? '').trim() || 'https://api.ipify.org?format=json';
		if (!URL.canParse(url)) throw new Error('Invalid URL preview proxy test URL');

		const parsed = new URL(url);
		if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
			throw new Error('Invalid URL preview proxy test URL scheme');
		}

		return parsed.toString();
	}

	private extractOutboundIp(body: string): string | null {
		try {
			const parsed = JSON.parse(body) as Record<string, unknown>;
			for (const key of ['ip', 'origin', 'query']) {
				if (typeof parsed[key] === 'string' && parsed[key].trim() !== '') {
					return parsed[key].trim();
				}
			}
		} catch {
		}

		const match = body.match(/\b(?:(?:\d{1,3}\.){3}\d{1,3}|[0-9a-fA-F:]{3,})\b/);
		return match?.[0] ?? null;
	}

	private redactProxySecrets(message: string, proxy: UrlPreviewOutboundProxy): string {
		let redacted = message;
		const secrets = [
			proxy.password,
			proxy.password == null ? null : encodeURIComponent(proxy.password),
		].filter((value): value is string => value != null && value !== '');

		for (const secret of secrets) {
			redacted = redacted.split(secret).join('<redacted>');
		}

		return redacted;
	}
}
