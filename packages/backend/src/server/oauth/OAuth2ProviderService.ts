/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { bindThis } from '@/decorators.js';
import type { Config } from '@/config.js';
import { DI } from '@/di-symbols.js';
import { MastodonClientService } from '@/server/api/mastodon/MastodonClientService.js';
import { getErrorData } from '@/server/api/mastodon/MastodonLogger.js';
import { ServerUtilityService } from '@/server/ServerUtilityService.js';
import { TimeService } from '@/global/TimeService.js';
import type { MiMeta } from '@/models/Meta.js';
import { AuthenticateService } from '@/server/api/AuthenticateService.js';
import type { ApiAccessGrantsRepository } from '@/models/_.js';
import type { MiAccessToken } from '@/models/AccessToken.js';
import type { MiLocalUser } from '@/models/User.js';
import { getApiPublicPermissions, isApprovalRequiredForScopes, isDeveloperApiAccessApproved, isSafeOAuthRedirectUri } from '@/server/api/api-access-utils.js';
import type { FastifyInstance, FastifyReply } from 'fastify';

const oidcUserinfoScopes = ['read:profile', 'read:account'] as const;
const pkceCodePrefix = 'pkce.';
const pkceAuthorizationChallengeTtl = 1000 * 60 * 10;

@Injectable()
export class OAuth2ProviderService {
	private readonly pkceAuthorizationChallenges = new Map<string, { codeChallenge: string, expiresAt: number }>();

	constructor(
		@Inject(DI.config)
		private config: Config,

		@Inject(DI.meta)
		private readonly instanceMeta: MiMeta,

		@Inject(DI.apiAccessGrantsRepository)
		private readonly apiAccessGrantsRepository: ApiAccessGrantsRepository,

		private readonly mastodonClientService: MastodonClientService,
		private readonly authenticateService: AuthenticateService,
		private readonly serverUtilityService: ServerUtilityService,
		private readonly timeService: TimeService,
	) { }

	// https://datatracker.ietf.org/doc/html/rfc8414.html
	// https://indieauth.spec.indieweb.org/#indieauth-server-metadata
	public generateRFC8414() {
		const publicScopes = getApiPublicPermissions(this.instanceMeta);
		const scopesSupported = Array.from(new Set([
			...publicScopes,
			...(this.instanceMeta.enableOidc ? ['openid', 'profile'] : []),
		]));

		return {
			issuer: this.config.url,
			authorization_endpoint: new URL('/oauth/authorize', this.config.url),
			token_endpoint: new URL('/oauth/token', this.config.url),
			...(this.instanceMeta.enableOidc ? {
				userinfo_endpoint: new URL('/oauth/userinfo', this.config.url),
				jwks_uri: new URL('/oauth/jwks', this.config.url),
				claims_supported: ['sub', 'preferred_username', 'name', 'picture', 'profile'],
			} : {}),
			scopes_supported: scopesSupported,
			response_types_supported: ['code'],
			grant_types_supported: ['authorization_code'],
			subject_types_supported: ['public'],
			service_documentation: 'https://misskey-hub.net',
			code_challenge_methods_supported: ['S256'],
			authorization_response_iss_parameter_supported: true,
		};
	}

	@bindThis
	public async createServer(fastify: FastifyInstance): Promise<void> {
		this.serverUtilityService.addMultipartFormDataContentType(fastify);
		this.serverUtilityService.addFormUrlEncodedContentType(fastify);
		this.serverUtilityService.addCORS(fastify);
		this.serverUtilityService.addFlattenedQueryType(fastify);

		for (const url of ['/authorize', '/authorize/']) {
			fastify.get<{ Querystring: Record<string, string | string[] | undefined> }>(url, async (request, reply) => {
				if (!this.instanceMeta.enableOAuthLogin || this.instanceMeta.apiAccessMode === 'closed') {
					return reply.code(403).send({ error: 'API_ACCESS_CLOSED', error_description: 'OAuth login is disabled on this instance.' });
				}

				const clientId = getOptionalString(request.query.client_id);
				if (!clientId) return reply.code(400).send({ error: 'BAD_REQUEST', error_description: 'Missing required query "client_id"' });

				const redirectUri = decodeClientRedirectUri(clientId, this.config.url);
				if (!redirectUri) return reply.code(400).send({ error: 'BAD_REQUEST', error_description: 'Invalid query "client_id"' });

				const authSessionToken = getAuthSessionTokenFromRedirectUri(redirectUri);
				if (!authSessionToken) return reply.code(400).send({ error: 'BAD_REQUEST', error_description: 'Invalid query "client_id"' });

				redirectUri.searchParams.set('mastodon', 'true');

				const state = getOptionalString(request.query.state);
				if (state) redirectUri.searchParams.set('state', state);

				const redirectUriQuery = getOptionalString(request.query.redirect_uri);
				if (redirectUriQuery) {
					if (!isSafeOAuthRedirectUri(redirectUriQuery)) {
						return reply.code(400).send({ error: 'invalid_request', error_description: 'Invalid query "redirect_uri"' });
					}
					redirectUri.searchParams.set('redirect_uri', redirectUriQuery);
				}

				const codeChallenge = getOptionalString(request.query.code_challenge);
				const codeChallengeMethod = getOptionalString(request.query.code_challenge_method);
				if (!isValidS256PkceChallenge(codeChallenge, codeChallengeMethod)) {
					return reply.code(400).send({ error: 'invalid_request', error_description: 'OAuth/OIDC login requires a valid S256 PKCE code_challenge.' });
				}
				this.bindPkceAuthorizationChallenge(authSessionToken, codeChallenge);
				redirectUri.searchParams.set('code_challenge', codeChallenge);
				redirectUri.searchParams.set('code_challenge_method', 'S256');

				return reply.redirect(redirectUri.toString());
			});
		}

		fastify.post<{ Body?: Record<string, string | string[] | undefined>, Querystring: Record<string, string | string[] | undefined> }>('/token', async (request, reply) => {
			if (!this.instanceMeta.enableOAuthLogin || this.instanceMeta.apiAccessMode === 'closed') {
				return reply.code(403).send({ error: 'API_ACCESS_CLOSED', error_description: 'OAuth login is disabled on this instance.' });
			}

			const body = request.body ?? request.query;

			const grantType = getOptionalString(body.grant_type);
			if (body.grant_type != null && grantType == null) {
				return reply.code(400).send({ error: 'invalid_request', error_description: 'Invalid query "grant_type"' });
			}
			if (grantType != null && grantType !== 'authorization_code') {
				return reply.code(400).send({ error: 'unsupported_grant_type', error_description: 'Only authorization_code is supported.' });
			}

			try {
				const clientSecret = getOptionalString(body.client_secret);
				if (!clientSecret) return reply.code(400).send({ error: 'BAD_REQUEST', error_description: 'Missing required query "client_secret"' });

				const clientId = getOptionalString(body.client_id);
				const code = getOptionalString(body.code) ?? '';
				const codeVerifier = getOptionalString(body.code_verifier);
				const scope = getOptionalString(body.scope);

				if (body.client_id != null && clientId == null) return reply.code(400).send({ error: 'BAD_REQUEST', error_description: 'Invalid query "client_id"' });
				if (body.code != null && code === '') return reply.code(400).send({ error: 'BAD_REQUEST', error_description: 'Invalid query "code"' });
				if (code === '') return reply.code(400).send({ error: 'BAD_REQUEST', error_description: 'Missing required query "code"' });

				const authorizationCode = parseOAuthAuthorizationCode(code);
				if (authorizationCode == null) {
					return reply.code(400).send({ error: 'invalid_request', error_description: 'Invalid authorization code.' });
				}
				if (!authorizationCode.requiresPkce) {
					return reply.code(400).send({ error: 'invalid_request', error_description: 'A PKCE authorization code is required.' });
				}
				if (!isValidPkceVerifier(codeVerifier)) {
					return reply.code(400).send({ error: 'invalid_request', error_description: 'Missing or invalid PKCE code_verifier.' });
				}
				if (!this.hasMatchingPkceAuthorizationChallenge(authorizationCode.token, authorizationCode.codeChallenge)) {
					return reply.code(401).send({ error: 'invalid_grant', error_description: 'PKCE authorization code is not bound to this authorization request.' });
				}
				if (!verifyS256PkceCodeVerifier(authorizationCode.codeChallenge, codeVerifier)) {
					return reply.code(401).send({ error: 'invalid_grant', error_description: 'PKCE verification failed.' });
				}
				this.pkceAuthorizationChallenges.delete(authorizationCode.token);

				// TODO fetch the access token directly, then remove all oauth code from megalodon
				const client = this.mastodonClientService.getClient(request);
				const atData = await client.fetchAccessToken(clientId, clientSecret, authorizationCode.token);
				const [, issuedToken] = await this.authenticateService.authenticate(atData.accessToken).catch(() => [null, null] as const);

				const ret = {
					access_token: atData.accessToken,
					token_type: 'Bearer',
					scope: issuedToken?.permission.join(' ') || atData.scope || scope || '',
					created_at: atData.createdAt || Math.floor(this.timeService.now / 1000),
				};
				return reply.send(ret);
			} catch (e: unknown) {
				const data = getErrorData(e);
				return reply.code(401).send(data);
			}
		});

		fastify.get('/jwks', async (_request, reply) => {
			if (!this.instanceMeta.enableOAuthLogin || !this.instanceMeta.enableOidc || this.instanceMeta.apiAccessMode === 'closed') {
				reply.code(404);
				return;
			}

			return { keys: [] };
		});

		fastify.get('/userinfo', async (request, reply) => {
			if (!this.instanceMeta.enableOAuthLogin || !this.instanceMeta.enableOidc || this.instanceMeta.apiAccessMode === 'closed') {
				return reply.code(403).send({ error: 'API_ACCESS_CLOSED', error_description: 'OIDC userinfo is disabled on this instance.' });
			}

			const bearer = request.headers.authorization?.startsWith('Bearer ')
				? request.headers.authorization.slice(7)
				: null;
			if (!bearer) {
				return reply.code(401).send({ error: 'invalid_token' });
			}

			const [user, token] = await this.authenticateService.authenticate(bearer).catch(() => [null, null] as const);
			if (user == null || token == null) {
				return sendBearerError(reply, 401, 'invalid_token', 'A valid OAuth access token is required.');
			}

			const userError = this.serverUtilityService.assertClientUser(user);
			if (userError) {
				return sendBearerError(reply, userError.httpStatusCode === 403 ? 403 : 401, 'invalid_token', userError.message ?? 'The token owner is unavailable.');
			}

			const accessError = await this.validateUserinfoAccessToken(token);
			if (accessError) {
				return sendBearerError(reply, accessError.status, accessError.error, accessError.description, accessError.scope);
			}

			return packOidcUserinfo(user, this.config.url);
		});
	}

	private async validateUserinfoAccessToken(token: MiAccessToken): Promise<{ status: 401 | 403, error: string, description: string, scope?: string } | null> {
		if (token.status && token.status !== 'active') {
			return { status: 401, error: 'invalid_token', description: 'The access token is unavailable.' };
		}

		if (token.app && token.app.status !== 'approved') {
			return { status: 401, error: 'invalid_token', description: 'The OAuth application is unavailable.' };
		}

		const publicPermissions = getApiPublicPermissions(this.instanceMeta);
		const allowedUserinfoScope = oidcUserinfoScopes.find(scope => token.permission.includes(scope) && publicPermissions.includes(scope));
		if (allowedUserinfoScope == null) {
			return {
				status: 403,
				error: 'insufficient_scope',
				description: 'OIDC userinfo requires an enabled read:profile or read:account scope.',
				scope: oidcUserinfoScopes.join(' '),
			};
		}

		// 免申请：令牌持有的 scope 全在免申请白名单内时跳过开发者审批。
		if (isApprovalRequiredForScopes(this.instanceMeta.apiAccessMode, this.instanceMeta.apiNoApprovalPermissions, token.permission)) {
			const developerUserId = token.app ? token.app.userId : token.userId;
			const approved = await isDeveloperApiAccessApproved(this.instanceMeta, this.apiAccessGrantsRepository, developerUserId);
			if (!approved) {
				return { status: 403, error: 'insufficient_scope', description: 'API access requires administrator approval.' };
			}
		}

		return null;
	}

	private bindPkceAuthorizationChallenge(authSessionToken: string, codeChallenge: string): void {
		for (const [token, bound] of this.pkceAuthorizationChallenges) {
			if (bound.expiresAt < this.timeService.now) this.pkceAuthorizationChallenges.delete(token);
		}

		const existing = this.pkceAuthorizationChallenges.get(authSessionToken);
		if (existing != null) return;

		this.pkceAuthorizationChallenges.set(authSessionToken, {
			codeChallenge,
			expiresAt: this.timeService.now + pkceAuthorizationChallengeTtl,
		});
	}

	private hasMatchingPkceAuthorizationChallenge(authSessionToken: string, codeChallenge: string): boolean {
		const bound = this.pkceAuthorizationChallenges.get(authSessionToken);
		if (bound == null) return false;
		if (bound.expiresAt < this.timeService.now) {
			this.pkceAuthorizationChallenges.delete(authSessionToken);
			return false;
		}
		return bound.codeChallenge === codeChallenge;
	}
}

function getOptionalString(value: string | string[] | undefined): string | null {
	return typeof value === 'string' ? value : null;
}

export function decodeClientRedirectUri(clientId: string, selfUrl: string): URL | null {
	try {
		const redirectUri = new URL(Buffer.from(clientId, 'base64').toString('utf8'));
		const self = new URL(selfUrl);
		if (redirectUri.origin !== self.origin) return null;
		return redirectUri;
	} catch {
		return null;
	}
}

export function getAuthSessionTokenFromRedirectUri(redirectUri: URL): string | null {
	const match = /^\/auth\/([^/?#]+)\/?$/.exec(redirectUri.pathname);
	return match ? decodeURIComponent(match[1]) : null;
}

export function packOidcUserinfo(user: Pick<MiLocalUser, 'id' | 'username' | 'name' | 'avatarUrl'>, selfUrl: string) {
	return {
		sub: user.id,
		preferred_username: user.username,
		name: user.name ?? user.username,
		picture: user.avatarUrl ?? null,
		profile: new URL(`/@${encodeURIComponent(user.username)}`, selfUrl).toString(),
	};
}

export function encodePkceAuthorizationCode(token: string, codeChallenge: string, codeChallengeMethod: 'S256' = 'S256'): string {
	return `${pkceCodePrefix}${Buffer.from(JSON.stringify({
		token,
		codeChallenge,
		codeChallengeMethod,
	}), 'utf8').toString('base64url')}`;
}

export function parseOAuthAuthorizationCode(code: string): { token: string, requiresPkce: false } | { token: string, requiresPkce: true, codeChallenge: string } | null {
	if (!code.startsWith(pkceCodePrefix)) {
		return { token: code, requiresPkce: false };
	}

	try {
		const parsed = JSON.parse(Buffer.from(code.slice(pkceCodePrefix.length), 'base64url').toString('utf8')) as {
			token?: unknown,
			codeChallenge?: unknown,
			codeChallengeMethod?: unknown,
		};
		if (typeof parsed.token !== 'string' || !isValidS256PkceChallenge(parsed.codeChallenge, parsed.codeChallengeMethod)) return null;
		return { token: parsed.token, requiresPkce: true, codeChallenge: parsed.codeChallenge };
	} catch {
		return null;
	}
}

export function isValidS256PkceChallenge(codeChallenge: unknown, codeChallengeMethod: unknown): codeChallenge is string {
	return typeof codeChallenge === 'string'
		&& typeof codeChallengeMethod === 'string'
		&& codeChallengeMethod === 'S256'
		&& codeChallenge.length >= 43
		&& codeChallenge.length <= 128
		&& /^[A-Za-z0-9._~-]+$/.test(codeChallenge);
}

export function isValidPkceVerifier(codeVerifier: unknown): codeVerifier is string {
	return typeof codeVerifier === 'string'
		&& codeVerifier.length >= 43
		&& codeVerifier.length <= 128
		&& /^[A-Za-z0-9._~-]+$/.test(codeVerifier);
}

export function verifyS256PkceCodeVerifier(codeChallenge: string, codeVerifier: string): boolean {
	const expected = createHash('sha256').update(codeVerifier).digest('base64url');
	return expected === codeChallenge;
}

function sendBearerError(reply: FastifyReply, status: 401 | 403, error: string, description: string, scope?: string) {
	const params = [
		'realm="Misskey"',
		`error="${error}"`,
		`error_description="${description.replace(/"/g, '\\"')}"`,
		...(scope ? [`scope="${scope}"`] : []),
	];
	reply.header('WWW-Authenticate', `Bearer ${params.join(', ')}`);
	return reply.code(status).send({ error, error_description: description });
}
