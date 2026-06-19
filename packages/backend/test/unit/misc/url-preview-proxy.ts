/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test } from '@jest/globals';
import {
	parseUrlPreviewProxyLine,
	normalizeUrlPreviewOutboundProxies,
	publicUrlPreviewOutboundProxies,
	buildUrlPreviewProxyUrl,
	tryUrlPreviewOutboundProxies,
	UrlPreviewProxyUnavailableError,
	renderUrlPreviewProxyError,
} from '@/misc/url-preview-proxy.js';

describe('url preview proxy helpers', () => {
	test('parses host:port:user:pass as socks5 remote DNS proxy', () => {
		const proxy = parseUrlPreviewProxyLine('203.0.113.41:7325:proxy-user:proxy-pass');

		expect(proxy).toEqual({
			type: 'socks5',
			host: '203.0.113.41',
			port: 7325,
			username: 'proxy-user',
			password: 'proxy-pass',
		});
	});

	test('normalizes proxy list without returning passwords publicly', () => {
		const proxies = normalizeUrlPreviewOutboundProxies([{
			name: 'primary',
			type: 'socks5',
			host: '203.0.113.41',
			port: 7325,
			username: 'proxy-user',
			password: 'proxy-pass',
			isEnabled: true,
			priority: 10,
		}]);

		expect(proxies).toHaveLength(1);
		expect(proxies[0].password).toBe('proxy-pass');
		expect(publicUrlPreviewOutboundProxies(proxies)).toEqual([{
			id: proxies[0].id,
			name: 'primary',
			type: 'socks5',
			host: '203.0.113.41',
			port: 7325,
			username: 'proxy-user',
			passwordSet: true,
			isEnabled: true,
			priority: 10,
		}]);
	});

	test('preserves existing password when admin submits blank password for same proxy id', () => {
		const existing = normalizeUrlPreviewOutboundProxies([{
			id: 'proxy-a',
			type: 'socks5',
			host: '203.0.113.41',
			port: 7325,
			username: 'old-user',
			password: 'old-secret',
		}]);

		const proxies = normalizeUrlPreviewOutboundProxies([{
			id: 'proxy-a',
			type: 'socks5',
			host: '203.0.113.41',
			port: 7325,
			username: 'new-user',
			password: '',
		}], existing);

		expect(proxies[0].username).toBe('new-user');
		expect(proxies[0].password).toBe('old-secret');
	});

	test('builds socks5h proxy URLs so DNS resolution stays remote', () => {
		const [proxy] = normalizeUrlPreviewOutboundProxies([{
			type: 'socks5',
			host: '203.0.113.41',
			port: 7325,
			username: 'proxy-user',
			password: 'proxy-pass',
		}]);

		expect(buildUrlPreviewProxyUrl(proxy)).toBe('socks5h://proxy-user:proxy-pass@203.0.113.41:7325');
	});

	test('fails over enabled proxies without direct fallback', async () => {
		const proxies = normalizeUrlPreviewOutboundProxies([
			{ id: 'first', host: 'proxy-a.example', port: 1080, priority: 0 },
			{ id: 'disabled', host: 'proxy-disabled.example', port: 1080, isEnabled: false, priority: 1 },
			{ id: 'second', host: 'proxy-b.example', port: 1080, priority: 2 },
		]);
		const tried: string[] = [];

		const result = await tryUrlPreviewOutboundProxies(proxies, async (proxy) => {
			tried.push(proxy.id);
			if (proxy.id === 'first') throw new Error('proxy down');
			return 'ok';
		});

		expect(result).toBe('ok');
		expect(tried).toEqual(['first', 'second']);
	});

	test('throws proxy unavailable when every enabled proxy fails', async () => {
		const proxies = normalizeUrlPreviewOutboundProxies([
			{ id: 'first', host: 'proxy-a.example', port: 1080 },
			{ id: 'second', host: 'proxy-b.example', port: 1080 },
		]);
		const tried: string[] = [];

		await expect(tryUrlPreviewOutboundProxies(proxies, async (proxy) => {
			tried.push(proxy.id);
			throw new Error('proxy down');
		})).rejects.toBeInstanceOf(UrlPreviewProxyUnavailableError);
		expect(tried).toEqual(['first', 'second']);
	});

	test('redacts proxy passwords from error messages', () => {
		const [proxy] = normalizeUrlPreviewOutboundProxies([{
			type: 'socks5',
			host: '203.0.113.41',
			port: 7325,
			username: 'proxy-user',
			password: 'proxy-pass',
		}]);

		const rendered = renderUrlPreviewProxyError(new Error('connect socks5h://proxy-user:proxy-pass@203.0.113.41:7325 failed'), proxy);

		expect(rendered).not.toContain('proxy-pass');
		expect(rendered).toContain('<redacted>');
	});
});
