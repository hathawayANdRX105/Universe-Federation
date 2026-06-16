<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<SearchMarker path="/settings/connect" label="开发者中心" :keywords="['developer', 'oauth', 'oidc', 'api', 'token', 'webhook']" icon="ti ti-api">
	<div class="_gaps_m">
		<MkFeatureBanner icon="/client-assets/link_3d.png" color="#1d9bf0">
			<SearchKeyword>开发者中心：创建快捷登录应用、个人 API Token，查看发帖、删帖和 OAuth 登录接入示例。</SearchKeyword>
		</MkFeatureBanner>

			<SearchMarker :keywords="['status', 'access']">
				<FormSection>
					<template #label><i class="ti ti-plug"></i> <SearchLabel>API 使用状态</SearchLabel></template>
					<div class="_gaps_s">
						<div :class="$style.statusGrid">
							<div :class="$style.statusCard">
								<span>当前模式</span>
								<strong>{{ modeLabel }}</strong>
							</div>
							<div :class="$style.statusCard">
								<span>我的资格</span>
								<strong>{{ grantLabel }}</strong>
							</div>
							<div :class="$style.statusCard">
								<span>OAuth/OIDC</span>
								<strong>{{ accessStatus?.oauthEnabled ? '已启用' : '未启用' }} / {{ accessStatus?.oidcEnabled ? '已启用' : '未启用' }}</strong>
							</div>
						</div>

						<MkInfo v-if="accessStatus?.mode === 'closed'" warn>管理员当前关闭了第三方 API。站内正常登录和浏览不受影响。</MkInfo>
						<MkInfo v-else-if="needsApproval" warn>此实例需要管理员审核 API 使用申请。通过后才能创建应用和 Token。</MkInfo>

						<div v-if="needsApproval" class="_gaps_s">
							<MkTextarea v-model="accessReason">
								<template #label>申请用途</template>
								<template #caption>说明你的网站、机器人或资源发布场景，方便管理员审核。</template>
							</MkTextarea>
							<div v-if="(accessStatus?.publicPermissions?.length ?? 0) > 0" :class="$style.reqPermBlock">
								<div :class="$style.reqPermLabel">
									选择你需要的权限范围（鼠标悬停看 scope）。
									<span :class="[$style.reqPermFlag, $style.reqPermFlagFree]">免申请</span> = 通过后立即可用；
									<span :class="[$style.reqPermFlag, $style.reqPermFlagReview]">需审核</span> = 需要管理员单独批准。
									<template v-if="accessStatus?.mode === 'open'">（当前为开放模式，所有权限都免审核）</template>
								</div>
								<div :class="$style.reqPermChips">
									<button
										v-for="scope in accessStatus!.publicPermissions"
										:key="scope"
										class="_button"
										:title="scope"
										:class="[$style.reqPermChip, { [$style.reqPermChipActive]: accessPermissions.includes(scope) }]"
										@click="toggleAccessPermission(scope)"
									>
										<i :class="accessPermissions.includes(scope) ? 'ti ti-check' : 'ti ti-plus'"></i>
										<span :class="$style.reqPermName">{{ scopeLabel(scope) }}</span>
										<span :class="[$style.reqPermFlag, scopeNeedsApproval(scope) ? $style.reqPermFlagReview : $style.reqPermFlagFree]">{{ scopeNeedsApproval(scope) ? '需审核' : '免申请' }}</span>
									</button>
								</div>
							</div>
							<MkButton primary rounded :disabled="!accessReason.trim()" :wait="requestingAccess" @click="requestAccess">
								<i class="ti ti-send"></i> 提交 API 使用申请
							</MkButton>
						</div>
					</div>
				</FormSection>
			</SearchMarker>

			<SearchMarker :keywords="['oauth', 'oidc', 'app', 'login']">
				<FormSection>
					<template #label><i class="ti ti-apps"></i> <SearchLabel>创建 OAuth/OIDC 登录应用</SearchLabel></template>
					<div class="_gaps_m">
						<MkInfo>每个应用必须填写自己的 OAuth/OIDC 回调地址。生产环境必须使用 HTTPS，本地开发可使用 localhost 或 127.0.0.1。</MkInfo>

						<div :class="$style.templateGrid">
							<button
								v-for="template in appTemplates"
								:key="template.key"
								class="_button"
								:class="[$style.templateCard, { [$style.templateActive]: selectedTemplateKey === template.key }]"
								@click="selectedTemplateKey = template.key"
							>
								<i :class="template.icon"></i>
								<strong>{{ template.title }}</strong>
								<span>{{ template.caption }}</span>
								<small>{{ template.permissions.join(', ') }}</small>
							</button>
						</div>

						<div :class="$style.formGrid">
							<MkInput v-model="newAppName">
								<template #prefix><i class="ti ti-tag"></i></template>
								<template #label>应用名称</template>
							</MkInput>
							<MkInput v-model="newAppCallbackUrl" :placeholder="defaultAppCallbackPlaceholder">
								<template #prefix><i class="ti ti-link"></i></template>
								<template #label>OAuth/OIDC 回调地址</template>
								<template #caption>第三方网站发起 OAuth 登录时使用的 <code>redirect_uri</code>，必须与这里完全一致。这个地址由应用所有者填写，管理员不会代填。</template>
							</MkInput>
						</div>

						<MkTextarea v-model="newAppDescription">
							<template #label>应用说明</template>
						</MkTextarea>
						<MkButton primary rounded :disabled="!canCreateApp" :wait="creatingApp" @click="createApp">
							<i class="ti ti-plus"></i> 创建应用
						</MkButton>

						<MkFolder :defaultOpen="apps.length > 0">
							<template #icon><i class="ti ti-apps"></i></template>
							<template #label>我的应用</template>
							<template #caption>{{ apps.length }} 个</template>
							<div v-if="apps.length === 0" :class="$style.empty">还没有创建应用。</div>
							<div v-else class="_gaps_s">
								<div v-for="app in apps" :key="app.id" :class="$style.item">
									<div>
										<strong>{{ app.name }}</strong>
										<div :class="$style.meta">{{ app.status }} · {{ (app.permission ?? []).join(', ') }}</div>
										<div :class="$style.meta">{{ (app.callbackUrls ?? [app.callbackUrl]).filter(Boolean).join(', ') }}</div>
									</div>
									<div class="_buttons">
										<MkButton rounded @click="copyText(app.id)">复制 Client ID</MkButton>
										<MkButton v-if="app.secret" rounded @click="copyText(app.secret)">复制 Secret</MkButton>
									</div>
								</div>
							</div>
						</MkFolder>
					</div>
				</FormSection>
			</SearchMarker>

			<SearchMarker :keywords="['token', 'personal', 'api']">
				<FormSection>
					<template #label><i class="ti ti-key"></i> <SearchLabel>个人 API Token</SearchLabel></template>
					<div class="_gaps_m">
						<div :class="$style.templateGrid">
							<button
								v-for="template in tokenTemplates"
								:key="template.key"
								class="_button"
								:class="$style.templateCard"
								@click="createToken(template)"
							>
								<i :class="template.icon"></i>
								<strong>{{ template.title }}</strong>
								<span>{{ template.caption }}</span>
								<small>{{ template.permissions.join(', ') }}</small>
							</button>
						</div>

						<MkFolder :defaultOpen="tokens.length > 0">
							<template #icon><i class="ti ti-key"></i></template>
							<template #label>我的开发者 Token</template>
							<template #caption>{{ tokens.length }} 个</template>
							<div v-if="tokens.length === 0" :class="$style.empty">还没有创建开发者 Token。</div>
							<div v-else class="_gaps_s">
								<div v-for="token in tokens" :key="token.id" :class="$style.item">
									<div>
										<strong>{{ token.name || token.id }}</strong>
										<div :class="$style.meta">{{ token.status }} · {{ (token.permission ?? []).join(', ') }}</div>
										<div :class="$style.meta">最后使用：{{ token.lastUsedAt ?? '未使用' }}</div>
									</div>
									<MkButton danger rounded @click="revokeToken(token.id)">撤销</MkButton>
								</div>
							</div>
						</MkFolder>
					</div>
				</FormSection>
			</SearchMarker>

			<SearchMarker :keywords="['docs', 'examples', 'notes', 'delete']">
				<FormSection>
					<template #label><i class="ti ti-book"></i> <SearchLabel>接入文档与示例</SearchLabel></template>
					<div class="_gaps_m">
						<div :class="$style.docsGrid">
							<div :class="$style.docCard">
								<strong>快捷登录 OAuth/OIDC</strong>
								<code>GET /oauth/authorize?client_id=...&response_type=code&scope=read:profile&code_challenge=...</code>
								<span>推荐使用最小 <code>read:profile</code> 权限，用户资料只从 <code>/oauth/userinfo</code> 获取。</span>
							</div>
							<div :class="$style.docCard">
								<strong>发帖 API</strong>
								<code>POST /api/notes/create</code>
								<span>Token 需要 <code>write:notes</code> 权限。</span>
							</div>
							<div :class="$style.docCard">
								<strong>删帖 API</strong>
								<code>POST /api/notes/delete</code>
								<span>只能删除自己有权限删除的帖子。</span>
							</div>
							<div :class="$style.docCard">
								<strong>上传附件</strong>
								<code>POST /api/drive/files/create</code>
								<span>Token 需要 <code>write:drive</code> 权限。</span>
							</div>
						</div>
						<FormLink to="/api-console" :behavior="isDesktop ? 'window' : null">打开 API Console</FormLink>
						<FormLink to="/api-doc" :behavior="isDesktop ? 'window' : null">查看 OpenAPI 文档</FormLink>
					</div>
				</FormSection>
			</SearchMarker>

		<SearchMarker :keywords="['webhook']">
			<FormSection>
				<template #label><i class="ti ti-webhook"></i> <SearchLabel>{{ i18n.ts._settings.webhook }}</SearchLabel></template>

				<div class="_gaps_m">
					<FormLink :to="`/settings/webhook/new`">
						{{ i18n.ts._webhookSettings.createWebhook }}
					</FormLink>

					<MkFolder :defaultOpen="false">
						<template #label>{{ i18n.ts.manage }}</template>

						<MkPagination :pagination="pagination">
							<template #default="{items}">
								<div class="_gaps">
									<FormLink v-for="webhook in items" :key="webhook.id" :to="`/settings/webhook/edit/${webhook.id}`">
										<template #icon>
											<i v-if="webhook.active === false" class="ti ti-player-pause"></i>
											<i v-else-if="webhook.latestStatus === null" class="ti ti-circle"></i>
											<i v-else-if="[200, 201, 204].includes(webhook.latestStatus)" class="ti ti-check" :style="{ color: 'var(--MI_THEME-success)' }"></i>
											<i v-else class="ti ti-alert-triangle" :style="{ color: 'var(--MI_THEME-error)' }"></i>
										</template>
										{{ webhook.name || webhook.url }}
										<template #suffix>
											<MkTime v-if="webhook.latestSentAt" :time="webhook.latestSentAt"></MkTime>
										</template>
									</FormLink>
								</div>
							</template>
						</MkPagination>
					</MkFolder>
				</div>
			</FormSection>
		</SearchMarker>
	</div>
</SearchMarker>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import MkPagination from '@/components/MkPagination.vue';
import FormSection from '@/components/form/section.vue';
import FormLink from '@/components/form/link.vue';
import MkFeatureBanner from '@/components/MkFeatureBanner.vue';
import MkButton from '@/components/MkButton.vue';
import MkFolder from '@/components/MkFolder.vue';
import MkInfo from '@/components/MkInfo.vue';
import MkInput from '@/components/MkInput.vue';
import MkTextarea from '@/components/MkTextarea.vue';
import { definePage } from '@/page.js';
import { i18n } from '@/i18n.js';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';

type ApiAccessStatus = {
	mode: 'approval' | 'open' | 'closed';
	oauthEnabled: boolean;
	oidcEnabled: boolean;
	requireAppApproval: boolean;
	publicPermissions: string[];
	noApprovalPermissions: string[];
	defaultTokenRateLimit: number;
	writeTokenRateLimit: number;
	grant: null | {
		status: 'none' | 'pending' | 'approved' | 'rejected' | 'suspended';
		reason: string | null;
		reviewNote: string | null;
	};
	effectiveStatus: string;
};

type ApiApp = {
	id: string;
	name: string;
	secret?: string;
	status: string;
	callbackUrl: string | null;
	callbackUrls?: string[];
	permission: string[];
};

type ApiToken = {
	id: string;
	name: string | null;
	status: string;
	permission: string[];
	lastUsedAt: string | null;
};

type Template = {
	key: string;
	title: string;
	caption: string;
	icon: string;
	permissions: string[];
};

const isDesktop = ref(window.innerWidth >= 1100);
const accessStatus = ref<ApiAccessStatus | null>(null);
const apps = ref<ApiApp[]>([]);
const tokens = ref<ApiToken[]>([]);
const requestingAccess = ref(false);
const creatingApp = ref(false);
const creatingToken = ref(false);
const accessReason = ref('');
const accessPermissions = ref<string[]>([]);
const newAppName = ref('');

function toggleAccessPermission(scope: string) {
	accessPermissions.value = accessPermissions.value.includes(scope)
		? accessPermissions.value.filter(s => s !== scope)
		: [...accessPermissions.value, scope];
}

// 该 scope 的人类可读用途（复用 Misskey 的 _permissions 文案，没有则回退原始 scope）。
function scopeLabel(scope: string): string {
	return (i18n.ts._permissions as Record<string, string>)[scope] ?? scope;
}

// 该 scope 是否需要管理员审核：open 模式全部免审；approval 模式下，不在免申请白名单的即需审核。
function scopeNeedsApproval(scope: string): boolean {
	if (accessStatus.value?.mode !== 'approval') return false;
	return !(accessStatus.value.noApprovalPermissions ?? []).includes(scope);
}
const newAppCallbackUrl = ref('');
const newAppDescription = ref('');
const selectedTemplateKey = ref('login');

const appTemplates: Template[] = [{
	key: 'login',
	title: '快捷登录',
	caption: '第三方网站用本站账号登录',
	icon: 'ti ti-login',
	permissions: ['read:profile'],
}, {
	key: 'resources',
	title: '发布资源/发帖',
	caption: '发布社区资源、教程或同步内容',
	icon: 'ti ti-pencil-plus',
	permissions: ['write:notes'],
}, {
	key: 'upload',
	title: '发帖 + 上传附件',
	caption: '发布带图片或文件的资源',
	icon: 'ti ti-photo-plus',
	permissions: ['write:notes', 'write:drive'],
}, {
	key: 'bot',
	title: '机器人/自动同步',
	caption: '自动发布和读取通知状态',
	icon: 'ti ti-robot',
	permissions: ['read:account', 'write:notes', 'read:notifications'],
}];

const tokenTemplates = appTemplates.filter(template => template.key !== 'login');

const selectedTemplate = computed(() => appTemplates.find(template => template.key === selectedTemplateKey.value) ?? appTemplates[0]);
const needsApproval = computed(() => accessStatus.value?.mode === 'approval' && accessStatus.value.effectiveStatus !== 'approved');
const canCreateApp = computed(() => Boolean(newAppName.value.trim() && newAppCallbackUrl.value.trim() && accessStatus.value?.mode !== 'closed' && !needsApproval.value));
const defaultAppCallbackPlaceholder = computed(() => `${window.location.origin}/oauth/callback`);
const modeLabel = computed(() => ({
	open: '开放使用',
	approval: '申请使用',
	closed: '关闭使用',
}[accessStatus.value?.mode ?? 'open']));
const grantLabel = computed(() => ({
	approved: '已通过',
	pending: '待审核',
	rejected: '已拒绝',
	suspended: '已暂停',
	none: '未申请',
}[accessStatus.value?.effectiveStatus ?? 'none'] ?? '未申请'));

const pagination = {
	endpoint: 'i/webhooks/list' as const,
	limit: 100,
	noPaging: true,
};

async function reload() {
	[accessStatus.value, apps.value, tokens.value] = await Promise.all([
		misskeyApi<ApiAccessStatus>('api/access/status', {}),
		misskeyApi<ApiApp[]>('api/apps/list', {}),
		misskeyApi<ApiToken[]>('api/tokens/list', {}),
	]);
}

async function requestAccess() {
	requestingAccess.value = true;
	try {
		await misskeyApi('api/access/request', { reason: accessReason.value.trim(), permissions: accessPermissions.value });
		await reload();
		os.toast('已提交 API 使用申请');
	} finally {
		requestingAccess.value = false;
	}
}

async function createApp() {
	creatingApp.value = true;
	try {
		const app = await misskeyApi<ApiApp>('api/apps/create', {
			name: newAppName.value.trim(),
			description: newAppDescription.value.trim(),
			permission: selectedTemplate.value.permissions,
			callbackUrls: [newAppCallbackUrl.value.trim()],
		});
		await reload();
		await os.alert({
			type: 'success',
			title: '应用已创建',
			text: `Client ID: ${app.id}\nSecret: ${app.secret ?? ''}`,
			textCopyable: true,
		});
	} finally {
		creatingApp.value = false;
	}
}

async function createToken(template: Template) {
	if (creatingToken.value || accessStatus.value?.mode === 'closed' || needsApproval.value) return;
	creatingToken.value = true;
	try {
		const result = await misskeyApi<{ id: string; token: string }>('api/tokens/create', {
			name: template.title,
			description: template.caption,
			permission: template.permissions,
			rank: 'user',
		});
		await reload();
		await os.alert({
			type: 'success',
			title: 'Token 已创建',
			text: result.token,
			textCopyable: true,
		});
	} finally {
		creatingToken.value = false;
	}
}

async function revokeToken(tokenId: string) {
	const { canceled } = await os.confirm({
		type: 'warning',
		title: '撤销 Token？',
		text: '撤销后使用这个 Token 的第三方程序会立即失效。',
	});
	if (canceled) return;
	await misskeyApi('api/tokens/revoke', { tokenId });
	await reload();
}

async function copyText(text: string) {
	await navigator.clipboard.writeText(text);
	os.toast('已复制');
}

onMounted(reload);

const headerActions = computed(() => []);
const headerTabs = computed(() => []);

definePage(() => ({
	title: '开发者中心',
	icon: 'ti ti-api',
}));
</script>

<style lang="scss" module>
.statusGrid,
.templateGrid,
.docsGrid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
	gap: 12px;
}

.statusCard,
.templateCard,
.docCard,
.item {
	border: 1px solid var(--MI_THEME-divider);
	border-radius: 8px;
	background: var(--MI_THEME-panel);
}

.statusCard {
	padding: 14px;

	> span {
		display: block;
		color: var(--MI_THEME-fgTransparentWeak);
		font-size: 0.85em;
	}

	> strong {
		display: block;
		margin-top: 4px;
	}
}

.templateCard {
	display: grid;
	gap: 8px;
	padding: 14px;
	text-align: left;

	> i {
		font-size: 1.4em;
		color: var(--MI_THEME-accent);
	}

	> span,
	> small {
		color: var(--MI_THEME-fgTransparentWeak);
	}
}

.templateActive {
	border-color: var(--MI_THEME-accent);
	box-shadow: 0 0 0 1px var(--MI_THEME-accent);
}

.formGrid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
	gap: 12px;
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

.reqPermBlock {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.reqPermLabel {
	font-size: 0.85em;
	color: var(--MI_THEME-fgTransparentWeak);
}

.reqPermChips {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
}

.reqPermChip {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 5px 11px;
	border-radius: 999px;
	font-size: 0.82em;
	border: solid 1px var(--MI_THEME-divider);
	color: var(--MI_THEME-fg);

	&:hover {
		background: var(--MI_THEME-buttonHoverBg);
	}

	&.reqPermChipActive {
		background: var(--MI_THEME-accentedBg);
		border-color: transparent;
		font-weight: 700;
	}
}

.reqPermName {
	max-width: 12em;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.reqPermFlag {
	flex-shrink: 0;
	padding: 0 6px;
	border-radius: 999px;
	font-size: 0.82em;
	font-weight: 700;
	line-height: 1.6;
}

.reqPermFlagFree {
	background: color(from var(--MI_THEME-success) srgb r g b / 0.18);
	color: var(--MI_THEME-success);
}

.reqPermFlagReview {
	background: color(from var(--MI_THEME-warn) srgb r g b / 0.18);
	color: var(--MI_THEME-warn);
}

.docCard {
	display: grid;
	gap: 8px;
	padding: 14px;

	code {
		overflow-wrap: anywhere;
	}

	span {
		color: var(--MI_THEME-fgTransparentWeak);
	}
}

.empty {
	padding: 14px;
	color: var(--MI_THEME-fgTransparentWeak);
	text-align: center;
}
</style>
