/*
 * SPDX-FileCopyrightText: hazelnoot and other Sharkey contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { defaultApiPublicPermissions } from '@/const.js';
import { hasUnsafeOAuthRedirectUri, normalizeApiPermissions, normalizeOAuthRedirectUris } from '@/server/api/api-access-utils.js';
import {
	decodeClientRedirectUri,
	encodePkceAuthorizationCode,
	getAuthSessionTokenFromRedirectUri,
	isValidPkceVerifier,
	isValidS256PkceChallenge,
	OAuth2ProviderService,
	packOidcUserinfo,
	parseOAuthAuthorizationCode,
	verifyS256PkceCodeVerifier,
} from '@/server/oauth/OAuth2ProviderService.js';

describe(decodeClientRedirectUri, () => {
	const selfUrl = 'https://example.test';

	it('accepts a base64-encoded same-origin auth URL', () => {
		const url = 'https://example.test/auth/session-token';
		const clientId = Buffer.from(url).toString('base64');

		expect(decodeClientRedirectUri(clientId, selfUrl)?.toString()).toBe(url);
	});

	it('rejects a cross-origin URL', () => {
		const clientId = Buffer.from('https://evil.example/auth/session-token').toString('base64');

		expect(decodeClientRedirectUri(clientId, selfUrl)).toBeNull();
	});

	it('rejects malformed client IDs', () => {
		expect(decodeClientRedirectUri('not a url', selfUrl)).toBeNull();
	});

	it('extracts auth session tokens only from auth callback URLs', () => {
		expect(getAuthSessionTokenFromRedirectUri(new URL('https://example.test/auth/session-token'))).toBe('session-token');
		expect(getAuthSessionTokenFromRedirectUri(new URL('https://example.test/auth/session-token/'))).toBe('session-token');
		expect(getAuthSessionTokenFromRedirectUri(new URL('https://example.test/notes/session-token'))).toBeNull();
	});
});

describe(packOidcUserinfo, () => {
	it('returns only minimal public OIDC profile claims', () => {
		const userinfo = packOidcUserinfo({
			id: 'user-1',
			username: 'alice',
			name: 'Alice',
			avatarUrl: 'https://example.test/avatar.png',
		}, 'https://example.test');

		expect(userinfo).toStrictEqual({
			sub: 'user-1',
			preferred_username: 'alice',
			name: 'Alice',
			picture: 'https://example.test/avatar.png',
			profile: 'https://example.test/@alice',
		});
		expect(Object.keys(userinfo).sort()).toStrictEqual(['name', 'picture', 'preferred_username', 'profile', 'sub']);
		expect('email' in userinfo).toBe(false);
		expect('permissions' in userinfo).toBe(false);
		expect('isAdmin' in userinfo).toBe(false);
	});

	it('falls back to username and null picture', () => {
		const userinfo = packOidcUserinfo({
			id: 'user-2',
			username: 'bob',
			name: null,
			avatarUrl: null,
		}, 'https://example.test');

		expect(userinfo.name).toBe('bob');
		expect(userinfo.picture).toBeNull();
	});
});

describe('OIDC userinfo access checks', () => {
	function createService(metaOverrides: Record<string, unknown> = {}, grantStatus: string | null = 'approved') {
		const meta = {
			apiAccessMode: 'open',
			rootUserId: 'root',
			apiPublicPermissions: ['read:profile'],
			enableOAuthLogin: true,
			enableOidc: true,
			...metaOverrides,
		};
		const grantsRepository = {
			findOneBy: async () => grantStatus == null ? null : { status: grantStatus },
		};

		return {
			service: new OAuth2ProviderService(
				{ url: 'https://example.test' } as any,
				meta as any,
				grantsRepository as any,
				{} as any,
				{} as any,
				{ assertClientUser: () => null } as any,
				{ now: 0 } as any,
			),
			meta,
			grantsRepository,
		};
	}

	async function validate(service: OAuth2ProviderService, token: Record<string, unknown>) {
		return await (service as any).validateUserinfoAccessToken(token);
	}

	it('allows only enabled minimal profile-compatible scopes', async () => {
		const { service } = createService();

		await expect(validate(service, {
			status: 'active',
			userId: 'user-1',
			app: null,
			permission: ['read:profile'],
		})).resolves.toBeNull();

		await expect(validate(service, {
			status: 'active',
			userId: 'user-1',
			app: null,
			permission: ['write:notes'],
		})).resolves.toMatchObject({
			status: 403,
			error: 'insufficient_scope',
		});
	});

	it('does not accept read:account for userinfo unless the administrator enabled it publicly', async () => {
		const { service } = createService({ apiPublicPermissions: ['read:profile'] });

		await expect(validate(service, {
			status: 'active',
			userId: 'user-1',
			app: null,
			permission: ['read:account'],
		})).resolves.toMatchObject({
			status: 403,
			error: 'insufficient_scope',
		});
	});

	it('rejects unavailable tokens and suspended OAuth apps', async () => {
		const { service } = createService({ apiPublicPermissions: ['read:profile', 'read:account'] });

		await expect(validate(service, {
			status: 'revoked',
			userId: 'user-1',
			app: null,
			permission: ['read:profile'],
		})).resolves.toMatchObject({ status: 401, error: 'invalid_token' });

		await expect(validate(service, {
			status: 'active',
			userId: 'user-1',
			app: { status: 'suspended', userId: 'dev-1' },
			permission: ['read:profile'],
		})).resolves.toMatchObject({ status: 401, error: 'invalid_token' });
	});

	it('requires developer approval in approval mode', async () => {
		const { service } = createService({ apiAccessMode: 'approval', rootUserId: 'root' }, null);

		await expect(validate(service, {
			status: 'active',
			userId: 'user-1',
			app: { status: 'approved', userId: 'dev-1' },
			permission: ['read:profile'],
		})).resolves.toMatchObject({
			status: 403,
			error: 'insufficient_scope',
		});
	});
});

describe('API permission and redirect URI guards', () => {
	it('defaults public developer scopes to minimal profile access without read:account', () => {
		expect(defaultApiPublicPermissions).toContain('read:profile');
		expect(defaultApiPublicPermissions).not.toContain('read:account');
	});

	it('normalizes public permissions and excludes invalid/admin scopes', () => {
		expect(normalizeApiPermissions(['read:profile', 'read:profile', 'read:admin:api', 'bad:scope'])).toStrictEqual(['read:profile']);
	});

	it('adds read:profile compatibility when old settings still expose read:account', () => {
		expect(normalizeApiPermissions(['read:account', 'write:notes'])).toStrictEqual(['read:profile', 'read:account', 'write:notes']);
	});

	it('accepts only HTTPS and loopback HTTP OAuth redirect URIs', () => {
		expect(normalizeOAuthRedirectUris([' https://example.test/cb ', 'https://example.test/cb', 'http://localhost/cb', 'http://127.0.0.1/cb'])).toStrictEqual([
			'https://example.test/cb',
			'http://localhost/cb',
			'http://127.0.0.1/cb',
		]);
		expect(hasUnsafeOAuthRedirectUri(['javascript:alert(1)'])).toBe(true);
		expect(hasUnsafeOAuthRedirectUri(['file:///tmp/token'])).toBe(true);
		expect(hasUnsafeOAuthRedirectUri(['http://example.test/cb'])).toBe(true);
		expect(hasUnsafeOAuthRedirectUri(['https://example.test/cb'])).toBe(false);
	});
});

describe('PKCE authorization code helpers', () => {
	const verifier = 'Ew8VSBiH59JirLlg7ocFpLQ6NXuFC1W_rn8gmRzBKc8';
	const challenge = 'iT8CFYv5In71phRqghCxDCOn0icAMP51XC8wrMBLIRg';

	it('validates S256 challenge and verifier shape', () => {
		expect(isValidS256PkceChallenge(challenge, 'S256')).toBe(true);
		expect(isValidS256PkceChallenge(challenge, 'plain')).toBe(false);
		expect(isValidPkceVerifier(verifier)).toBe(true);
		expect(isValidPkceVerifier('short')).toBe(false);
	});

	it('binds wrapped authorization codes to the original PKCE challenge', () => {
		const code = encodePkceAuthorizationCode('session-token', challenge);

		expect(parseOAuthAuthorizationCode(code)).toStrictEqual({
			token: 'session-token',
			requiresPkce: true,
			codeChallenge: challenge,
		});
		expect(verifyS256PkceCodeVerifier(challenge, verifier)).toBe(true);
		expect(verifyS256PkceCodeVerifier(challenge, `${verifier}x`)).toBe(false);
	});

	it('requires a server-side PKCE binding for the authorization session', () => {
		const service = new OAuth2ProviderService(
			{ url: 'https://example.test' } as any,
			{
				apiAccessMode: 'open',
				rootUserId: 'root',
				apiPublicPermissions: ['read:profile'],
				enableOAuthLogin: true,
				enableOidc: true,
			} as any,
			{ findOneBy: async () => null } as any,
			{} as any,
			{} as any,
			{ assertClientUser: () => null } as any,
			{ now: 0 } as any,
		);

		expect((service as any).hasMatchingPkceAuthorizationChallenge('session-token', challenge)).toBe(false);
		(service as any).bindPkceAuthorizationChallenge('session-token', challenge);
		expect((service as any).hasMatchingPkceAuthorizationChallenge('session-token', challenge)).toBe(true);
		expect((service as any).hasMatchingPkceAuthorizationChallenge('session-token', `${challenge}x`)).toBe(false);
	});

	it('marks legacy session tokens as non-PKCE codes so token exchange can reject them', () => {
		expect(parseOAuthAuthorizationCode('legacy-session-token')).toStrictEqual({
			token: 'legacy-session-token',
			requiresPkce: false,
		});
	});
});
