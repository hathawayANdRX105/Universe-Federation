/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { randomUUID } from 'node:crypto';

export const urlPreviewProxyModes = ['direct', 'summaly', 'outbound'] as const;
export type UrlPreviewProxyMode = typeof urlPreviewProxyModes[number];

export const urlPreviewOutboundProxyTypes = ['socks5', 'http', 'https'] as const;
export type UrlPreviewOutboundProxyType = typeof urlPreviewOutboundProxyTypes[number];

export type UrlPreviewOutboundProxy = {
	id: string;
	name: string;
	type: UrlPreviewOutboundProxyType;
	host: string;
	port: number;
	username: string | null;
	password: string | null;
	isEnabled: boolean;
	priority: number;
};

export type PublicUrlPreviewOutboundProxy = Omit<UrlPreviewOutboundProxy, 'password'> & {
	passwordSet: boolean;
};

export class UrlPreviewProxyUnavailableError extends Error {
	public readonly code = 'URL_PREVIEW_PROXY_UNAVAILABLE';
	public readonly statusCode = 503;
	public readonly causes: unknown[];

	constructor(causes: unknown[] = []) {
		super('URL preview outbound proxy is unavailable');
		this.name = 'UrlPreviewProxyUnavailableError';
		this.causes = causes;
	}
}

type ProxyDraft = Partial<UrlPreviewOutboundProxy> & {
	passwordSet?: boolean;
	clearPassword?: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return value != null && typeof value === 'object' && !Array.isArray(value);
}

function asOptionalString(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	return trimmed === '' ? null : trimmed;
}

function normalizeType(value: unknown): UrlPreviewOutboundProxyType {
	if (value === 'http' || value === 'https' || value === 'socks5') return value;
	if (value === 'socks' || value === 'socks5h') return 'socks5';
	return 'socks5';
}

function normalizePort(value: unknown): number {
	const port = typeof value === 'number' ? value : Number(value);
	if (!Number.isInteger(port) || port <= 0 || port > 65535) {
		throw new Error('Invalid URL preview proxy port');
	}
	return port;
}

function normalizeHost(value: unknown): string {
	const host = asOptionalString(value);
	if (host == null || host.includes('/') || host.includes('@')) {
		throw new Error('Invalid URL preview proxy host');
	}
	return host;
}

function normalizeId(value: unknown): string {
	const id = asOptionalString(value);
	if (id != null && /^[A-Za-z0-9_-]{1,64}$/.test(id)) return id;
	return randomUUID();
}

function proxyFromUrl(value: string): ProxyDraft | null {
	if (!URL.canParse(value)) return null;

	const url = new URL(value);
	const type = url.protocol === 'http:'
		? 'http'
		: url.protocol === 'https:'
			? 'https'
			: url.protocol === 'socks5:' || url.protocol === 'socks5h:' || url.protocol === 'socks:'
				? 'socks5'
				: null;

	if (type == null) return null;

	return {
		type,
		host: url.hostname,
		port: Number(url.port),
		username: url.username ? decodeURIComponent(url.username) : null,
		password: url.password ? decodeURIComponent(url.password) : null,
	};
}

export function parseUrlPreviewProxyLine(value: string): Omit<ProxyDraft, 'id' | 'name' | 'isEnabled' | 'priority'> {
	const trimmed = value.trim();
	const parsedUrl = proxyFromUrl(trimmed);
	if (parsedUrl) return parsedUrl;

	const [host, port, username, ...passwordParts] = trimmed.split(':');
	return {
		type: 'socks5',
		host,
		port: Number(port),
		username: username ?? null,
		password: passwordParts.length > 0 ? passwordParts.join(':') : null,
	};
}

function draftFromInput(input: unknown): ProxyDraft {
	if (typeof input === 'string') return parseUrlPreviewProxyLine(input);
	if (!isRecord(input)) throw new Error('Invalid URL preview proxy entry');

	const raw = asOptionalString(input.raw);
	if (raw != null) {
		return {
			...parseUrlPreviewProxyLine(raw),
			id: input.id as string | undefined,
			name: input.name as string | undefined,
			isEnabled: input.isEnabled as boolean | undefined,
			priority: input.priority as number | undefined,
		};
	}

	return input as ProxyDraft;
}

export function normalizeUrlPreviewOutboundProxies(input: unknown, previous: UrlPreviewOutboundProxy[] = []): UrlPreviewOutboundProxy[] {
	if (!Array.isArray(input)) return [];

	const previousById = new Map(previous.map(proxy => [proxy.id, proxy]));

	return input.map((item, index) => {
		const draft = draftFromInput(item);
		const id = normalizeId(draft.id);
		const existing = previousById.get(id);
		const type = normalizeType(draft.type);
		const host = normalizeHost(draft.host);
		const port = normalizePort(draft.port);
		const username = asOptionalString(draft.username);
		const password = draft.clearPassword === true
			? null
			: asOptionalString(draft.password) ?? existing?.password ?? null;
		const priority = Number.isFinite(Number(draft.priority)) ? Number(draft.priority) : index;
		const name = asOptionalString(draft.name) ?? `${type} ${host}:${port}`;

		return {
			id,
			name,
			type,
			host,
			port,
			username,
			password,
			isEnabled: draft.isEnabled !== false,
			priority,
		};
	}).sort((a, b) => a.priority - b.priority);
}

export function publicUrlPreviewOutboundProxies(proxies: UrlPreviewOutboundProxy[]): PublicUrlPreviewOutboundProxy[] {
	return proxies.map(({ password, ...proxy }) => ({
		...proxy,
		passwordSet: password != null && password !== '',
	}));
}

export function enabledUrlPreviewOutboundProxies(proxies: UrlPreviewOutboundProxy[]): UrlPreviewOutboundProxy[] {
	return proxies
		.filter(proxy => proxy.isEnabled)
		.sort((a, b) => a.priority - b.priority);
}

export async function tryUrlPreviewOutboundProxies<T>(
	proxies: UrlPreviewOutboundProxy[],
	operation: (proxy: UrlPreviewOutboundProxy) => Promise<T>,
	onFailure?: (proxy: UrlPreviewOutboundProxy, error: unknown) => void,
): Promise<T> {
	const enabled = enabledUrlPreviewOutboundProxies(proxies);
	const causes: unknown[] = [];

	for (const proxy of enabled) {
		try {
			return await operation(proxy);
		} catch (error) {
			causes.push(error);
			onFailure?.(proxy, error);
		}
	}

	throw new UrlPreviewProxyUnavailableError(causes);
}

export function buildUrlPreviewProxyUrl(proxy: UrlPreviewOutboundProxy): string {
	const protocol = proxy.type === 'socks5' ? 'socks5h:' : `${proxy.type}:`;
	const url = new URL(`${protocol}//${proxy.host}:${proxy.port}`);
	if (proxy.username != null) url.username = proxy.username;
	if (proxy.password != null) url.password = proxy.password;
	return url.toString();
}

export function describeUrlPreviewProxy(proxy: Pick<UrlPreviewOutboundProxy, 'id' | 'type' | 'host' | 'port'>): string {
	return `${proxy.id} ${proxy.type}://${proxy.host}:${proxy.port}`;
}

export function renderUrlPreviewProxyError(error: unknown, proxy: Pick<UrlPreviewOutboundProxy, 'password'>): string {
	let message = error instanceof Error ? error.message : String(error);
	const secrets = [
		proxy.password,
		proxy.password == null ? null : encodeURIComponent(proxy.password),
	].filter((value): value is string => value != null && value !== '');

	for (const secret of secrets) {
		message = message.split(secret).join('<redacted>');
	}

	return message;
}
