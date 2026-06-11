/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { defaultApiPublicPermissions, permissions } from '@/const.js';
import type { ApiAccessGrantsRepository } from '@/models/_.js';
import type { MiMeta } from '@/models/Meta.js';

export const apiAccessErrors = {
	apiClosed: {
		message: 'API access is disabled for third-party tokens.',
		code: 'API_ACCESS_CLOSED',
		kind: 'permission',
		id: 'e63df81d-d6a3-4f09-b47e-e4a19c6be837',
	},
	apiApprovalRequired: {
		message: 'API access requires administrator approval.',
		code: 'API_ACCESS_APPROVAL_REQUIRED',
		kind: 'permission',
		id: '7e5caa46-9129-4c2b-b5d4-068f473b6e58',
	},
	apiScopeDisabled: {
		message: 'This API permission scope is disabled by the instance administrator.',
		code: 'API_SCOPE_DISABLED',
		kind: 'permission',
		id: '0df5be3f-dd69-41f9-bb3e-29d966917d2a',
	},
	apiTokenUnavailable: {
		message: 'This API token is unavailable.',
		code: 'API_TOKEN_UNAVAILABLE',
		kind: 'permission',
		id: 'a66ce26e-2d5b-4e99-aad3-f3836fa28318',
	},
	apiAppUnavailable: {
		message: 'This API app is unavailable.',
		code: 'API_APP_UNAVAILABLE',
		kind: 'permission',
		id: 'a005c7e1-932c-4eb3-9215-ae1ee75c57e9',
	},
	apiInvalidRedirectUri: {
		message: 'OAuth redirect URI must use HTTPS, except loopback HTTP URLs for local development.',
		code: 'API_INVALID_REDIRECT_URI',
		kind: 'client',
		id: '223bd095-01ea-4211-bf3a-981f6b5cfc49',
	},
} as const;

const permissionSet = new Set<string>(permissions);

export function normalizeApiPermissions(input: readonly string[] | null | undefined): string[] {
	const values = input ?? defaultApiPublicPermissions;
	const normalized = Array.from(new Set(values.filter(permission => permissionSet.has(permission) && !permission.includes(':admin:'))));
	if (normalized.includes('read:account') && !normalized.includes('read:profile')) {
		return ['read:profile', ...normalized];
	}
	return normalized;
}

export function getApiPublicPermissions(meta: MiMeta): string[] {
	return normalizeApiPermissions(meta.apiPublicPermissions);
}

export function isWriteApiScope(scope: string | null | undefined): boolean {
	return scope?.startsWith('write:') ?? false;
}

export function isAdminApiScope(scope: string | null | undefined): boolean {
	return scope?.includes(':admin:') ?? false;
}

export async function isDeveloperApiAccessApproved(
	meta: MiMeta,
	apiAccessGrantsRepository: ApiAccessGrantsRepository,
	developerUserId: string | null | undefined,
): Promise<boolean> {
	if (meta.apiAccessMode !== 'approval') return true;
	if (developerUserId != null && meta.rootUserId === developerUserId) return true;
	if (developerUserId == null) return false;

	const grant = await apiAccessGrantsRepository.findOneBy({ userId: developerUserId });
	return grant?.status === 'approved';
}

export function isSafeOAuthRedirectUri(uri: string | null | undefined): uri is string {
	if (uri == null || uri.trim() === '') return false;

	try {
		const url = new URL(uri.trim());
		return url.protocol === 'https:' || isLoopbackHttpUrl(url);
	} catch {
		return false;
	}
}

export function isLoopbackHttpUrl(url: URL): boolean {
	return url.protocol === 'http:'
		&& (url.hostname === 'localhost'
			|| url.hostname === '[::1]'
			|| url.hostname === '::1'
			|| /^127(?:\.\d{1,3}){3}$/.test(url.hostname));
}

export function normalizeOAuthRedirectUris(uris: readonly string[]): string[] {
	return Array.from(new Set(uris.map(uri => uri.trim()).filter(isSafeOAuthRedirectUri)));
}

export function hasUnsafeOAuthRedirectUri(uris: readonly string[]): boolean {
	return uris.some(uri => !isSafeOAuthRedirectUri(uri));
}
