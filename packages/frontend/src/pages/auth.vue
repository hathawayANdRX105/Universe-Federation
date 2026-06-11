<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader :actions="headerActions" :tabs="headerTabs">
	<div class="_spacer" style="--MI_SPACER-w: 500px;">
		<div v-if="state == 'fetch-session-error'">
			<p>{{ i18n.ts.somethingHappened }}</p>
		</div>
		<div v-else-if="$i && !session">
			<MkLoading/>
		</div>
		<div v-else-if="$i && session">
			<XForm
				v-if="state == 'waiting'"
				class="form"
				:session="session"
				@denied="state = 'denied'"
				@accepted="accepted"
			/>
			<div v-if="state == 'denied'">
				<h1>{{ i18n.ts._auth.denied }}</h1>
			</div>
			<div v-if="state == 'accepted' && session">
				<h1>{{ session.app.isAuthorized ? i18n.ts['already-authorized'] : i18n.ts._auth.allowed }}</h1>
				<p v-if="session.app.callbackUrl">
					{{ i18n.ts._auth.callback }}
					<MkEllipsis/>
				</p>
				<p v-if="!session.app.callbackUrl">{{ i18n.ts._auth.pleaseGoBack }}</p>
			</div>
		</div>
		<div v-else>
			<p :class="$style.loginMessage">{{ i18n.ts._auth.pleaseLogin }}</p>
			<MkSignin @login="onLogin"/>
		</div>
	</div>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { onMounted, ref, computed } from 'vue';
import * as Misskey from 'misskey-js';
import XForm from './auth.form.vue';
import MkSignin from '@/components/MkSignin.vue';
import { misskeyApi } from '@/utility/misskey-api.js';
import { $i } from '@/i.js';
import { definePage } from '@/page.js';
import { i18n } from '@/i18n.js';
import { login } from '@/accounts.js';

const props = defineProps<{
	token: string;
}>();

const getUrlParams = () => Object.fromEntries(new URLSearchParams(window.location.search).entries());

const state = ref<'waiting' | 'accepted' | 'fetch-session-error' | 'denied' | null>(null);
const session = ref<Misskey.entities.AuthSessionShowResponse | null>(null);

function encodePkceAuthorizationCode(token: string, codeChallenge: string, codeChallengeMethod = 'S256'): string {
	return `pkce.${base64UrlEncode(JSON.stringify({
		token,
		codeChallenge,
		codeChallengeMethod,
	}))}`;
}

function base64UrlEncode(value: string): string {
	const bytes = new TextEncoder().encode(value);
	let binary = '';
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return window.btoa(binary)
		.replaceAll('+', '-')
		.replaceAll('/', '_')
		.replaceAll('=', '');
}

function accepted() {
	state.value = 'accepted';
	const params = getUrlParams();
	const isMastodon = !!params.mastodon;
	if (session.value && session.value.app.callbackUrl && isMastodon) {
		if (!params.redirect_uri) {
			throw new Error('Missing redirect_uri');
		}
		const redirectUri = params.redirect_uri;
		if (!isSafeRedirectUri(redirectUri) || !getAllowedCallbackUrls(session.value.app).includes(redirectUri)) {
			throwInvalidCallbackError();
		}
		const callbackUrl = new URL(redirectUri);
		const codeChallenge = params.code_challenge;
		const codeChallengeMethod = params.code_challenge_method;
		if (codeChallenge && codeChallengeMethod !== 'S256') {
			throwInvalidCallbackError();
		}
		callbackUrl.searchParams.append('code', codeChallenge ? encodePkceAuthorizationCode(session.value.token, codeChallenge, codeChallengeMethod) : session.value.token);
		if (params.state) {
			callbackUrl.searchParams.append('state', params.state);
		}
		window.location.href = callbackUrl.toString();
	} else if (session.value && session.value.app.callbackUrl) {
		if (!isSafeRedirectUri(session.value.app.callbackUrl)) {
			throwInvalidCallbackError();
		}
		const url = new URL(session.value.app.callbackUrl);
		url.searchParams.append('token', session.value.token);
		window.location.href = url.toString();
	}
}

function getAllowedCallbackUrls(app: Misskey.entities.AuthSessionShowResponse['app']): string[] {
	const appWithCallbackUrls = app as typeof app & { callbackUrls?: string[] };
	return Array.from(new Set([
		...(appWithCallbackUrls.callbackUrls ?? []),
		...(app.callbackUrl ? app.callbackUrl.split('\n') : []),
	].map(url => url.trim()).filter(isSafeRedirectUri)));
}

function isSafeRedirectUri(url: string | null | undefined): url is string {
	if (!url) return false;
	try {
		const parsed = new URL(url);
		return parsed.protocol === 'https:' || isLoopbackHttpUrl(parsed);
	} catch {
		return false;
	}
}

function isLoopbackHttpUrl(url: URL): boolean {
	return url.protocol === 'http:' && (
		url.hostname === 'localhost' ||
		url.hostname === '[::1]' ||
		url.hostname === '::1' ||
		/^127(?:\.\d{1,3}){3}$/.test(url.hostname)
	);
}

function throwInvalidCallbackError(): never {
	state.value = 'fetch-session-error';
	throw new Error('Callback URI is not allowed for this app');
}

function onLogin(res) {
	login(res.i);
}

onMounted(async () => {
	if (!$i) return;

	try {
		const sess = await misskeyApi('auth/session/show', {
			token: props.token,
		});
		session.value = sess;

		// 既に連携していた場合
		if (sess.app.isAuthorized) {
			await misskeyApi('auth/accept', {
				token: sess.token,
			});
			accepted();
		} else {
			state.value = 'waiting';
		}
	} catch (err) {
		state.value = 'fetch-session-error';
	}
});

const headerActions = computed(() => []);

const headerTabs = computed(() => []);

definePage(() => ({
	title: i18n.ts._auth.shareAccessTitle,
	icon: 'ti ti-apps',
}));
</script>

<style lang="scss" module>
.loginMessage {
	text-align: center;
	margin: 8px 0 24px;
}
</style>
