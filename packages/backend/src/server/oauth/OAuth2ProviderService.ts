/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { bindThis } from '@/decorators.js';
import type { Config } from '@/config.js';
import { DI } from '@/di-symbols.js';
import { MastodonClientService } from '@/server/api/mastodon/MastodonClientService.js';
import { getErrorData } from '@/server/api/mastodon/MastodonLogger.js';
import { ServerUtilityService } from '@/server/ServerUtilityService.js';
import { TimeService } from '@/global/TimeService.js';
import type { MiMeta } from '@/models/Meta.js';
import { AuthenticateService } from '@/server/api/AuthenticateService.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';
import type { FastifyInstance } from 'fastify';

const kinds = [
	'read:account',
	'write:account',
	'read:blocks',
	'write:blocks',
	'read:drive',
	'write:drive',
	'read:favorites',
	'write:favorites',
	'read:following',
	'write:following',
	'read:messaging',
	'write:messaging',
	'read:mutes',
	'write:mutes',
	'write:notes',
	'read:notifications',
	'write:notifications',
	'read:reactions',
	'write:reactions',
	'write:votes',
	'read:pages',
	'write:pages',
	'write:page-likes',
	'read:page-likes',
	'read:user-groups',
	'write:user-groups',
	'read:channels',
	'write:channels',
	'read:gallery',
	'write:gallery',
	'read:gallery-likes',
	'write:gallery-likes',
];

@Injectable()
export class OAuth2ProviderService {
	constructor(
		@Inject(DI.config)
		private config: Config,

		@Inject(DI.meta)
		private readonly instanceMeta: MiMeta,

		private readonly mastodonClientService: MastodonClientService,
		private readonly authenticateService: AuthenticateService,
		private readonly userEntityService: UserEntityService,
		private readonly serverUtilityService: ServerUtilityService,
		private readonly timeService: TimeService,
	) { }

	// https://datatracker.ietf.org/doc/html/rfc8414.html
	// https://indieauth.spec.indieweb.org/#indieauth-server-metadata
	public generateRFC8414() {
		return {
			issuer: this.config.url,
			authorization_endpoint: new URL('/oauth/authorize', this.config.url),
			token_endpoint: new URL('/oauth/token', this.config.url),
			userinfo_endpoint: new URL('/oauth/userinfo', this.config.url),
			jwks_uri: new URL('/oauth/jwks', this.config.url),
			scopes_supported: kinds,
			response_types_supported: ['code'],
			grant_types_supported: ['authorization_code'],
			subject_types_supported: ['public'],
			id_token_signing_alg_values_supported: ['EdDSA'],
			service_documentation: 'https://misskey-hub.net',
			code_challenge_methods_supported: ['S256'],
			authorization_response_iss_parameter_supported: true,
		};
	}

	@bindThis
	public async createServer(fastify: FastifyInstance): Promise<void> {
		// https://datatracker.ietf.org/doc/html/rfc8414.html
		// https://indieauth.spec.indieweb.org/#indieauth-server-metadata
		/* fastify.get('/.well-known/oauth-authorization-server', async (_request, reply) => {
			reply.send({
				issuer: this.config.url,
				authorization_endpoint: new URL('/oauth/authorize', this.config.url),
				token_endpoint: new URL('/oauth/token', this.config.url),
				scopes_supported: kinds,
				response_types_supported: ['code'],
				grant_types_supported: ['authorization_code'],
				service_documentation: 'https://misskey-hub.net',
				code_challenge_methods_supported: ['S256'],
				authorization_response_iss_parameter_supported: true,
			});
		}); */

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

				redirectUri.searchParams.set('mastodon', 'true');

				const state = getOptionalString(request.query.state);
				if (state) redirectUri.searchParams.set('state', state);

				const redirectUriQuery = getOptionalString(request.query.redirect_uri);
				if (redirectUriQuery) redirectUri.searchParams.set('redirect_uri', redirectUriQuery);

				return reply.redirect(redirectUri.toString());
			});
		}

		fastify.post<{ Body?: Record<string, string | string[] | undefined>, Querystring: Record<string, string | string[] | undefined> }>('/token', async (request, reply) => {
			if (!this.instanceMeta.enableOAuthLogin || this.instanceMeta.apiAccessMode === 'closed') {
				return reply.code(403).send({ error: 'API_ACCESS_CLOSED', error_description: 'OAuth login is disabled on this instance.' });
			}

			const body = request.body ?? request.query;

			if (body.grant_type === 'client_credentials') {
				const ret = {
					access_token: uuid(),
					token_type: 'Bearer',
					scope: 'read',
					created_at: Math.floor(this.timeService.now / 1000),
				};
				return reply.send(ret);
			}

			try {
				const clientSecret = getOptionalString(body.client_secret);
				if (!clientSecret) return reply.code(400).send({ error: 'BAD_REQUEST', error_description: 'Missing required query "client_secret"' });

				const clientId = getOptionalString(body.client_id);
				const code = getOptionalString(body.code) ?? '';
				const scope = getOptionalString(body.scope);

				if (body.client_id != null && clientId == null) return reply.code(400).send({ error: 'BAD_REQUEST', error_description: 'Invalid query "client_id"' });
				if (body.code != null && code === '') return reply.code(400).send({ error: 'BAD_REQUEST', error_description: 'Invalid query "code"' });

				// TODO fetch the access token directly, then remove all oauth code from megalodon
				const client = this.mastodonClientService.getClient(request);
				const atData = await client.fetchAccessToken(clientId, clientSecret, code);

				const ret = {
					access_token: atData.accessToken,
					token_type: 'Bearer',
					scope: atData.scope || scope || 'read write follow push',
					created_at: atData.createdAt || Math.floor(this.timeService.now / 1000),
				};
				return reply.send(ret);
			} catch (e: unknown) {
				const data = getErrorData(e);
				return reply.code(401).send(data);
			}
		});

		fastify.get('/jwks', async () => {
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

			const [user] = await this.authenticateService.authenticate(bearer).catch(() => [null, null] as const);
			if (user == null) {
				return reply.code(401).send({ error: 'invalid_token' });
			}

			const packed = await this.userEntityService.pack(user, user);
			return {
				sub: user.id,
				preferred_username: user.username,
				name: packed.name ?? user.username,
				picture: packed.avatarUrl ?? null,
				profile: new URL(`/@${user.username}`, this.config.url).toString(),
			};
		});
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
