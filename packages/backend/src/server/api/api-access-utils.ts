/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { defaultApiPublicPermissions, permissions } from '@/const.js';
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
} as const;

const permissionSet = new Set<string>(permissions);

export function normalizeApiPermissions(input: readonly string[] | null | undefined): string[] {
	const values = input ?? defaultApiPublicPermissions;
	return Array.from(new Set(values.filter(permission => permissionSet.has(permission) && !permission.includes(':admin:'))));
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
