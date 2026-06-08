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

						<section :class="$style.permissionPanel" aria-labelledby="api-public-permissions-title">
							<div :class="$style.permissionHeader">
								<div>
									<div id="api-public-permissions-title" :class="$style.permissionTitle">允许普通开发者使用的权限范围</div>
									<div :class="$style.permissionCaption">权限范围已选择 {{ selectedPublicPermissionCount }} 项。普通开发者只能申请这里开放的 scope，admin 权限不会出现在公共选项里。</div>
								</div>
								<MkButton rounded small @click="restoreDefaultPublicPermissions">恢复推荐默认权限</MkButton>
							</div>

							<div :class="$style.permissionGroups">
								<section v-for="group in publicPermissionGroups" :key="group.key" :class="$style.permissionGroup">
									<div :class="$style.permissionGroupHeader">
										<div :class="$style.permissionGroupTitle">
											<i :class="group.icon"></i>
											<strong>{{ group.title }}</strong>
										</div>
										<div class="_buttons">
											<MkButton rounded small @click="selectPermissionGroup(group)">全选</MkButton>
											<MkButton rounded small @click="clearPermissionGroup(group)">清空</MkButton>
										</div>
									</div>
									<div :class="$style.permissionOptions">
										<button
											v-for="permission in group.permissions"
											:key="permission.scope"
											type="button"
											class="_button"
											:class="[$style.permissionOption, { [$style.permissionOptionActive]: isPermissionSelected(permission.scope) }]"
											:aria-pressed="isPermissionSelected(permission.scope)"
											@click="togglePermission(permission.scope)"
										>
											<span :class="$style.permissionCheck"><i :class="isPermissionSelected(permission.scope) ? 'ti ti-check' : 'ti ti-plus'"></i></span>
											<span :class="$style.permissionBody">
												<strong>{{ permission.label }}</strong>
												<code>{{ permission.scope }}</code>
												<small>{{ permission.description }}</small>
											</span>
										</button>
									</div>
								</section>

								<section v-if="unknownPublicPermissions.length > 0" :class="$style.permissionGroup">
									<div :class="$style.permissionGroupHeader">
										<div :class="$style.permissionGroupTitle">
											<i class="ti ti-dots"></i>
											<strong>其他权限</strong>
										</div>
									</div>
									<div :class="$style.permissionOptions">
										<button
											v-for="scope in unknownPublicPermissions"
											:key="scope"
											type="button"
											class="_button"
											:class="[$style.permissionOption, $style.permissionOptionActive]"
											aria-pressed="true"
											@click="togglePermission(scope)"
										>
											<span :class="$style.permissionCheck"><i class="ti ti-check"></i></span>
											<span :class="$style.permissionBody">
												<strong>保留未知权限</strong>
												<code>{{ scope }}</code>
												<small>后端返回的兼容 scope，保存时会继续保留；点击可从公共权限中移除。</small>
											</span>
										</button>
									</div>
								</section>
							</div>
						</section>

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

type PermissionOption = {
	scope: string;
	label: string;
	description: string;
};

type PermissionGroup = {
	key: string;
	title: string;
	icon: string;
	permissions: PermissionOption[];
};

const publicPermissionGroups = [
	{
		key: 'account',
		title: '登录资料',
		icon: 'ti ti-user-circle',
		permissions: [
			{ scope: 'read:account', label: '读取账号资料', description: '用于快捷登录时读取用户 ID、昵称、头像等基础资料。' },
		],
	},
	{
		key: 'notes',
		title: '发帖/删帖',
		icon: 'ti ti-message-circle',
		permissions: [
			{ scope: 'write:notes', label: '发布与删除帖子', description: '允许创建帖子，并删除当前用户有权限删除的帖子。' },
		],
	},
	{
		key: 'drive',
		title: '附件上传',
		icon: 'ti ti-cloud-upload',
		permissions: [
			{ scope: 'read:drive', label: '读取云盘文件', description: '读取当前用户云盘文件和附件元数据。' },
			{ scope: 'write:drive', label: '上传与管理文件', description: '上传附件、编辑文件信息或删除用户自己的文件。' },
		],
	},
	{
		key: 'channels',
		title: '频道资源',
		icon: 'ti ti-speakerphone',
		permissions: [
			{ scope: 'read:channels', label: '读取频道', description: '读取频道资料、频道帖子和资源列表。' },
			{ scope: 'write:channels', label: '管理频道内容', description: '发布频道内容或按用户权限维护频道资源。' },
		],
	},
	{
		key: 'following',
		title: '社交关系',
		icon: 'ti ti-users',
		permissions: [
			{ scope: 'read:following', label: '读取关注关系', description: '读取当前用户的关注、粉丝和社交关系。' },
			{ scope: 'write:following', label: '修改关注关系', description: '代表当前用户关注或取消关注其他账号。' },
		],
	},
	{
		key: 'moderation',
		title: '屏蔽/静音',
		icon: 'ti ti-shield',
		permissions: [
			{ scope: 'read:blocks', label: '读取屏蔽列表', description: '读取当前用户屏蔽的账号列表。' },
			{ scope: 'write:blocks', label: '修改屏蔽列表', description: '代表当前用户屏蔽或解除屏蔽账号。' },
			{ scope: 'read:mutes', label: '读取静音列表', description: '读取当前用户静音的账号或关键词。' },
			{ scope: 'write:mutes', label: '修改静音列表', description: '代表当前用户添加或解除静音规则。' },
		],
	},
	{
		key: 'notifications',
		title: '通知',
		icon: 'ti ti-bell',
		permissions: [
			{ scope: 'read:notifications', label: '读取通知', description: '读取当前用户收到的通知和未读状态。' },
			{ scope: 'write:notifications', label: '管理通知', description: '标记通知已读或清理通知状态。' },
		],
	},
	{
		key: 'chat',
		title: '聊天',
		icon: 'ti ti-messages',
		permissions: [
			{ scope: 'read:chat', label: '读取聊天', description: '读取当前用户可访问的聊天房间和消息。' },
			{ scope: 'write:chat', label: '发送聊天消息', description: '代表当前用户发送聊天消息或维护聊天状态。' },
		],
	},
] satisfies PermissionGroup[];

const defaultPublicPermissions = publicPermissionGroups.flatMap(group => group.permissions.map(permission => permission.scope));
const knownPublicPermissionScopes = new Set(defaultPublicPermissions);

const settings = ref<ApiSettings | null>(null);
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

const selectedPublicPermissionCount = computed(() => settings.value?.publicPermissions.length ?? 0);
const unknownPublicPermissions = computed(() => (settings.value?.publicPermissions ?? []).filter(scope => !knownPublicPermissionScopes.has(scope) && !isAdminScope(scope)));

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
	settings.value = {
		...settingsResult,
		publicPermissions: normalizePublicPermissionSelection(settingsResult.publicPermissions),
	};
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
			publicPermissions: normalizePublicPermissionSelection(settings.value.publicPermissions),
		});
		settings.value.publicPermissions = normalizePublicPermissionSelection(settings.value.publicPermissions);
		os.toast('API 设置已保存');
		await reload();
	} finally {
		savingSettings.value = false;
	}
}

function normalizePublicPermissionSelection(scopes: string[]): string[] {
	return Array.from(new Set(scopes.map(scope => scope.trim()).filter(scope => scope.length > 0 && !isAdminScope(scope))));
}

function isAdminScope(scope: string): boolean {
	return scope.startsWith('admin:') || scope.startsWith('read:admin:') || scope.startsWith('write:admin:');
}

function setPublicPermissions(scopes: string[]) {
	if (!settings.value) return;
	settings.value.publicPermissions = normalizePublicPermissionSelection(scopes);
}

function isPermissionSelected(scope: string): boolean {
	return settings.value?.publicPermissions.includes(scope) ?? false;
}

function togglePermission(scope: string) {
	if (!settings.value || isAdminScope(scope)) return;
	if (isPermissionSelected(scope)) {
		setPublicPermissions(settings.value.publicPermissions.filter(permission => permission !== scope));
	} else {
		setPublicPermissions([...settings.value.publicPermissions, scope]);
	}
}

function selectPermissionGroup(group: PermissionGroup) {
	if (!settings.value) return;
	setPublicPermissions([
		...settings.value.publicPermissions,
		...group.permissions.map(permission => permission.scope),
	]);
}

function clearPermissionGroup(group: PermissionGroup) {
	if (!settings.value) return;
	const groupScopes = new Set(group.permissions.map(permission => permission.scope));
	setPublicPermissions(settings.value.publicPermissions.filter(scope => !groupScopes.has(scope)));
}

function restoreDefaultPublicPermissions() {
	setPublicPermissions(defaultPublicPermissions);
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

.permissionPanel {
	border: 1px solid var(--MI_THEME-divider);
	border-radius: 8px;
	background: var(--MI_THEME-panel);
	padding: 14px;
}

.permissionHeader {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 12px;
	margin-bottom: 14px;
}

.permissionTitle {
	font-weight: 700;
}

.permissionCaption {
	margin-top: 4px;
	color: var(--MI_THEME-fgTransparentWeak);
	font-size: 0.9em;
	line-height: 1.5;
}

.permissionGroups {
	display: grid;
	gap: 12px;
}

.permissionGroup {
	border-top: 1px solid var(--MI_THEME-divider);
	padding-top: 12px;
}

.permissionGroupHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	margin-bottom: 10px;
}

.permissionGroupTitle {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	min-width: 0;
}

.permissionGroupTitle i {
	color: var(--MI_THEME-accent);
}

.permissionOptions {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
	gap: 10px;
}

.permissionOption {
	display: grid;
	grid-template-columns: 28px minmax(0, 1fr);
	gap: 10px;
	min-height: 94px;
	padding: 10px;
	border: 1px solid var(--MI_THEME-divider);
	border-radius: 8px;
	background: var(--MI_THEME-bg);
	color: var(--MI_THEME-fg);
	text-align: left;
	transition: border-color 0.15s ease, background-color 0.15s ease;
}

.permissionOption:hover,
.permissionOption:focus-visible {
	border-color: var(--MI_THEME-accent);
}

.permissionOptionActive {
	border-color: var(--MI_THEME-accent);
	background: color-mix(in srgb, var(--MI_THEME-accent) 9%, var(--MI_THEME-panel));
}

.permissionCheck {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 24px;
	height: 24px;
	margin-top: 2px;
	border-radius: 999px;
	background: var(--MI_THEME-buttonBg);
	color: var(--MI_THEME-fgTransparentWeak);
}

.permissionOptionActive .permissionCheck {
	background: var(--MI_THEME-accent);
	color: var(--MI_THEME-fgOnAccent);
}

.permissionBody {
	display: grid;
	gap: 4px;
	min-width: 0;
}

.permissionBody strong,
.permissionBody code,
.permissionBody small {
	overflow-wrap: anywhere;
}

.permissionBody code {
	width: fit-content;
	max-width: 100%;
	border-radius: 4px;
	background: var(--MI_THEME-bg);
	padding: 2px 6px;
	color: var(--MI_THEME-accent);
	font-size: 0.82em;
}

.permissionBody small {
	color: var(--MI_THEME-fgTransparentWeak);
	line-height: 1.45;
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

	.permissionHeader,
	.permissionGroupHeader {
		align-items: stretch;
		flex-direction: column;
	}

	.permissionOptions {
		grid-template-columns: 1fr;
	}
}
</style>
