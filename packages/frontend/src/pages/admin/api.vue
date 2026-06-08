<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader :actions="headerActions" :tabs="headerTabs">
	<div class="_spacer" style="--MI_SPACER-w: 1100px; --MI_SPACER-min: 16px; --MI_SPACER-max: 32px;">
		<FormSuspense :p="init">
			<div class="_gaps_m">
				<MkInfo>API 管理只控制第三方应用、开发者 Token 和 OAuth/OIDC 接入，不影响站内前端正常登录和浏览。</MkInfo>

				<MkFolder :defaultOpen="true">
					<template #icon><i class="ti ti-adjustments"></i></template>
					<template #label>API 开放设置</template>
					<template #caption>{{ modeCaption }}</template>

					<div v-if="settings" class="_gaps_m">
						<MkSelect v-model="settings.mode">
							<template #label>API 模式</template>
							<option value="approval">申请使用</option>
							<option value="open">开放使用</option>
							<option value="closed">关闭使用</option>
						</MkSelect>

						<div :class="$style.switchGrid">
							<MkSwitch v-model="settings.oauthEnabled">
								<template #label>启用 OAuth 登录</template>
								<template #caption>允许第三方网站用本站账号快捷登录。</template>
							</MkSwitch>
							<MkSwitch v-model="settings.oidcEnabled">
								<template #label>启用 OIDC UserInfo</template>
								<template #caption>开放 /.well-known/openid-configuration 和 /oauth/userinfo。</template>
							</MkSwitch>
							<MkSwitch v-model="settings.requireAppApproval">
								<template #label>新应用需要审核</template>
								<template #caption>开放使用模式下也可要求管理员审批应用。</template>
							</MkSwitch>
						</div>

						<div :class="$style.grid">
							<MkInput v-model="settings.defaultTokenRateLimit" type="number" :min="0">
								<template #label>默认 Token 限流 / 分钟</template>
							</MkInput>
							<MkInput v-model="settings.writeTokenRateLimit" type="number" :min="0">
								<template #label>写入接口限流 / 分钟</template>
							</MkInput>
						</div>

						<MkTextarea v-model="publicPermissionsText" code>
							<template #label>允许普通开发者使用的权限范围</template>
							<template #caption>每行或逗号分隔一个 scope。admin 权限不建议放进这里。</template>
						</MkTextarea>

						<div class="_buttons">
							<MkButton primary rounded :wait="savingSettings" @click="saveSettings"><i class="ti ti-device-floppy"></i> 保存设置</MkButton>
							<MkButton rounded @click="reload"><i class="ti ti-refresh"></i> 刷新</MkButton>
						</div>
					</div>
				</MkFolder>

				<div v-if="summary" :class="$style.summaryGrid">
					<div :class="$style.metric"><span>待审申请</span><strong>{{ summary.accessRequests.pending }}</strong></div>
					<div :class="$style.metric"><span>待审应用</span><strong>{{ summary.apps.pending }}</strong></div>
					<div :class="$style.metric"><span>活跃 Token</span><strong>{{ summary.tokens.active }}</strong></div>
					<div :class="$style.metric"><span>已暂停应用</span><strong>{{ summary.apps.suspended }}</strong></div>
				</div>

				<MkFolder :defaultOpen="accessRequests.length > 0">
					<template #icon><i class="ti ti-user-check"></i></template>
					<template #label>开发者申请</template>
					<template #caption>{{ accessRequests.length }} 条</template>

					<div v-if="accessRequests.length === 0" :class="$style.empty">暂无开发者申请。</div>
					<div v-else class="_gaps_s">
						<div v-for="request in accessRequests" :key="request.id" :class="$style.item">
							<div>
								<strong>{{ request.user?.name || request.user?.username || request.user?.id }}</strong>
								<div :class="$style.meta">{{ request.status }} · {{ request.updatedAt }}</div>
								<div :class="$style.meta">{{ request.reason || '无申请说明' }}</div>
							</div>
							<div class="_buttons">
								<MkButton rounded primary @click="reviewAccess(request.id, 'approve')">通过</MkButton>
								<MkButton rounded @click="reviewAccess(request.id, 'reject')">拒绝</MkButton>
								<MkButton rounded danger @click="reviewAccess(request.id, 'suspend')">暂停</MkButton>
							</div>
						</div>
					</div>
				</MkFolder>

				<MkFolder :defaultOpen="apps.length > 0">
					<template #icon><i class="ti ti-apps"></i></template>
					<template #label>OAuth 应用</template>
					<template #caption>{{ apps.length }} 个</template>

					<div v-if="apps.length === 0" :class="$style.empty">暂无应用。</div>
					<div v-else class="_gaps_s">
						<div v-for="app in apps" :key="app.id" :class="$style.item">
							<div>
								<strong>{{ app.name }}</strong>
								<div :class="$style.meta">{{ app.status }} · {{ app.user?.name || app.user?.username || '无所有者' }}</div>
								<div :class="$style.meta">{{ (app.permission ?? []).join(', ') }}</div>
								<div :class="$style.meta">{{ (app.callbackUrls ?? [app.callbackUrl]).filter(Boolean).join(', ') }}</div>
							</div>
							<div class="_buttons">
								<MkButton rounded primary @click="reviewApp(app.id, 'approve')">通过</MkButton>
								<MkButton rounded @click="reviewApp(app.id, 'reject')">拒绝</MkButton>
								<MkButton rounded danger @click="reviewApp(app.id, app.status === 'suspended' ? 'unsuspend' : 'suspend')">{{ app.status === 'suspended' ? '恢复' : '暂停' }}</MkButton>
								<MkButton rounded danger @click="deleteApp(app.id)">删除</MkButton>
							</div>
						</div>
					</div>
				</MkFolder>

				<MkFolder :defaultOpen="tokens.length > 0">
					<template #icon><i class="ti ti-key"></i></template>
					<template #label>个人 Token</template>
					<template #caption>{{ tokens.length }} 个</template>

					<div v-if="tokens.length === 0" :class="$style.empty">暂无开发者 Token。</div>
					<div v-else class="_gaps_s">
						<div v-for="token in tokens" :key="token.id" :class="$style.item">
							<div>
								<strong>{{ token.name || token.id }}</strong>
								<div :class="$style.meta">{{ token.status }} · {{ token.user?.name || token.user?.username || '未知用户' }}</div>
								<div :class="$style.meta">{{ (token.permission ?? []).join(', ') }}</div>
							</div>
							<div class="_buttons">
								<MkButton rounded danger @click="suspendToken(token.id)">暂停</MkButton>
								<MkButton rounded danger @click="revokeToken(token.id)">撤销</MkButton>
							</div>
						</div>
					</div>
				</MkFolder>
			</div>
		</FormSuspense>
	</div>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';
import MkButton from '@/components/MkButton.vue';
import MkFolder from '@/components/MkFolder.vue';
import MkInfo from '@/components/MkInfo.vue';
import MkInput from '@/components/MkInput.vue';
import MkSelect from '@/components/MkSelect.vue';
import MkSwitch from '@/components/MkSwitch.vue';
import MkTextarea from '@/components/MkTextarea.vue';
import FormSuspense from '@/components/form/suspense.vue';
import { definePage } from '@/page.js';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';

type ApiSettings = {
	mode: 'approval' | 'open' | 'closed';
	oauthEnabled: boolean;
	oidcEnabled: boolean;
	requireAppApproval: boolean;
	publicPermissions: string[];
	defaultTokenRateLimit: number;
	writeTokenRateLimit: number;
};

type PackedUser = {
	id: string;
	username: string;
	name?: string | null;
};

type ApiAccessRequest = {
	id: string;
	status: string;
	reason: string | null;
	reviewNote: string | null;
	updatedAt: string;
	user: PackedUser | null;
};

type ApiApp = {
	id: string;
	name: string;
	status: string;
	callbackUrl: string | null;
	callbackUrls?: string[];
	permission: string[];
	user: PackedUser | null;
};

type ApiToken = {
	id: string;
	name: string | null;
	status: string;
	permission: string[];
	user: PackedUser | null;
};

type ApiSummary = {
	accessRequests: { pending: number; approved: number; };
	apps: { pending: number; approved: number; suspended: number; };
	tokens: { active: number; suspended: number; revoked: number; };
};

const settings = ref<ApiSettings | null>(null);
const publicPermissionsText = ref('');
const summary = ref<ApiSummary | null>(null);
const accessRequests = ref<ApiAccessRequest[]>([]);
const apps = ref<ApiApp[]>([]);
const tokens = ref<ApiToken[]>([]);
const savingSettings = ref(false);

const modeCaption = computed(() => ({
	approval: '申请使用',
	open: '开放使用',
	closed: '关闭使用',
}[settings.value?.mode ?? 'open']));

async function init() {
	await reload();
}

async function reload() {
	const [settingsResult, summaryResult, requestsResult, appsResult, pendingAppsResult, tokensResult] = await Promise.all([
		misskeyApi<ApiSettings>('admin/api/settings/show', {}),
		misskeyApi<ApiSummary>('admin/api/usage/summary', {}),
		misskeyApi<ApiAccessRequest[]>('admin/api/access-requests/list', { limit: 50 }),
		misskeyApi<ApiApp[]>('admin/api/apps/list', { limit: 50 }),
		misskeyApi<ApiApp[]>('admin/api/apps/list', { status: 'pending', limit: 50 }),
		misskeyApi<ApiToken[]>('admin/api/tokens/list', { limit: 50 }),
	]);
	settings.value = settingsResult;
	publicPermissionsText.value = settingsResult.publicPermissions.join('\n');
	summary.value = summaryResult;
	accessRequests.value = requestsResult;
	apps.value = Array.from(new Map([...pendingAppsResult, ...appsResult].map(app => [app.id, app])).values());
	tokens.value = tokensResult;
}

async function saveSettings() {
	if (!settings.value) return;
	savingSettings.value = true;
	try {
		settings.value = await misskeyApi<ApiSettings>('admin/api/settings/update', {
			...settings.value,
			publicPermissions: publicPermissionsText.value.split(/[\n,]/).map(scope => scope.trim()).filter(Boolean),
		});
		publicPermissionsText.value = settings.value.publicPermissions.join('\n');
		os.toast('API 设置已保存');
		await reload();
	} finally {
		savingSettings.value = false;
	}
}

async function reviewAccess(id: string, action: 'approve' | 'reject' | 'suspend') {
	await misskeyApi(`admin/api/access-requests/${action}`, { id });
	await reload();
}

async function reviewApp(appId: string, action: 'approve' | 'reject' | 'suspend' | 'unsuspend') {
	await misskeyApi(`admin/api/apps/${action}`, { appId });
	await reload();
}

async function deleteApp(appId: string) {
	const { canceled } = await os.confirm({
		type: 'warning',
		title: '删除应用？',
		text: '应用删除后关联 Token 会被撤销。',
	});
	if (canceled) return;
	await misskeyApi('admin/api/apps/delete', { appId });
	await reload();
}

async function suspendToken(tokenId: string) {
	await misskeyApi('admin/api/tokens/suspend', { tokenId });
	await reload();
}

async function revokeToken(tokenId: string) {
	const { canceled } = await os.confirm({
		type: 'warning',
		title: '撤销 Token？',
		text: '撤销后第三方程序会立即失效。',
	});
	if (canceled) return;
	await misskeyApi('admin/api/tokens/revoke', { tokenId });
	await reload();
}

const headerActions = computed(() => []);
const headerTabs = computed(() => []);

definePage(() => ({
	title: 'API 管理',
	icon: 'ti ti-api',
}));
</script>

<style lang="scss" module>
.grid,
.summaryGrid,
.switchGrid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
	gap: 12px;
}

.metric,
.item {
	border: 1px solid var(--MI_THEME-divider);
	border-radius: 8px;
	background: var(--MI_THEME-panel);
}

.metric {
	padding: 14px;

	> span {
		display: block;
		color: var(--MI_THEME-fgTransparentWeak);
		font-size: 0.85em;
	}

	> strong {
		display: block;
		margin-top: 4px;
		font-size: 1.4em;
	}
}

.item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	padding: 12px;
}

.meta {
	margin-top: 3px;
	color: var(--MI_THEME-fgTransparentWeak);
	font-size: 0.85em;
	overflow-wrap: anywhere;
}

.empty {
	padding: 14px;
	color: var(--MI_THEME-fgTransparentWeak);
	text-align: center;
}

@container (max-width: 560px) {
	.item {
		align-items: stretch;
		flex-direction: column;
	}
}
</style>
