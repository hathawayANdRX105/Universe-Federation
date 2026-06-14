<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div class="_gaps">
	<MkInfo>{{ i18n.ts._chat.managementDescription }}</MkInfo>

	<div :class="$style.section">
		<div :class="$style.title">{{ i18n.ts._chat.announcement }}</div>
		<MkTextarea v-model="announcement" :max="2048">
			<template #label>{{ i18n.ts._chat.announcementContent }}</template>
			<template #caption>{{ i18n.ts._chat.announcementDescription }}</template>
		</MkTextarea>
		<MkSwitch v-model="announcementPinned">
			<template #label>{{ i18n.ts._chat.pinAnnouncement }}</template>
			<template #caption>{{ i18n.ts._chat.pinAnnouncementDescription }}</template>
		</MkSwitch>
		<MkButton primary :disabled="!announcementChanged" @click="saveAnnouncement">{{ i18n.ts.save }}</MkButton>
	</div>

	<div :class="$style.section">
		<div :class="$style.title">{{ i18n.ts._chat.silenceAll }}</div>
		<MkSwitch v-model="isSilenced" @update:modelValue="saveSilenced">
			<template #label>{{ i18n.ts._chat.silenceAll }}</template>
			<template #caption>{{ i18n.ts._chat.silenceAllDescription }}</template>
		</MkSwitch>
	</div>

	<div :class="$style.section">
		<div :class="$style.title">{{ i18n.ts._chat.mutedMembers }}</div>
		<MkLoading v-if="mutedFetching"/>
		<div v-else-if="mutedMembers.length === 0" :class="$style.caption">{{ i18n.ts._chat.noMutedMembers }}</div>
		<div v-else :class="$style.banList">
			<div v-for="m in mutedMembers" :key="m.id" :class="$style.banRow">
				<MkA :class="$style.banRowLink" :to="`${userPage(m.user!)}`">
					<MkUserCardMini :user="m.user!" :withChart="false"/>
				</MkA>
				<span :class="$style.mutedUntilLabel">{{ mutedUntilText(m) }}</span>
				<MkButton rounded :class="$style.banRowButton" @click="unmuteMember(m)">{{ i18n.ts._chat.unmuteMember }}</MkButton>
			</div>
		</div>
	</div>

	<div :class="$style.section">
		<div :class="$style.title">{{ i18n.ts._chat.banList }}</div>
		<MkLoading v-if="bansFetching"/>
		<div v-else-if="bans.length === 0" :class="$style.caption">{{ i18n.ts._chat.noBannedUsers }}</div>
		<div v-else :class="$style.banList">
			<div v-for="ban in bans" :key="ban.id" :class="$style.banRow">
				<MkA :class="$style.banRowLink" :to="`${userPage(ban.user)}`">
					<MkUserCardMini :user="ban.user" :withChart="false"/>
				</MkA>
				<MkButton rounded :class="$style.banRowButton" @click="unban(ban)">{{ i18n.ts._chat.unbanUser }}</MkButton>
			</div>
		</div>
		<MkButton v-if="bansCanFetchMore" rounded :wait="bansMoreFetching" style="margin: 0 auto;" @click="fetchMoreBans">{{ i18n.ts.loadMore }}</MkButton>
	</div>

	<div :class="$style.section">
		<div :class="$style.title">{{ i18n.ts._chat.messageStats }}</div>
		<div v-if="stats == null" :class="$style.loading"><MkLoading :mini="true"/></div>
		<template v-else>
			<div :class="$style.statsGrid">
				<div>
					<span>{{ i18n.ts.total }}</span>
					<b>{{ stats.total }}</b>
				</div>
				<div>
					<span>{{ i18n.ts._chat.oldestMessage }}</span>
					<b>{{ stats.oldestAt == null ? '-' : dateString(stats.oldestAt) }}</b>
				</div>
				<div>
					<span>{{ i18n.ts._chat.newestMessage }}</span>
					<b>{{ stats.newestAt == null ? '-' : dateString(stats.newestAt) }}</b>
				</div>
			</div>
			<div :class="$style.chart" role="img" :aria-label="i18n.ts._chat.messageStats">
				<div v-for="item in stats.daily" :key="item.date" :class="$style.barWrap" :title="`${item.date}: ${item.count}`">
					<div :class="$style.barTrack">
						<div :class="$style.bar" :style="{ height: `${barHeight(item.count)}%` }"></div>
					</div>
					<span>{{ item.date.slice(5) }}</span>
				</div>
			</div>
		</template>
	</div>

	<div :class="$style.section">
		<div :class="$style.title">{{ i18n.ts._chat.autoDeleteMessages }}</div>
		<MkSwitch v-model="retentionEnabled">
			<template #label>{{ i18n.ts._chat.enableAutoDeleteMessages }}</template>
			<template #caption>{{ i18n.ts._chat.autoDeleteMessagesDescription }}</template>
		</MkSwitch>
		<MkInput v-model="retentionDays" type="number" :min="MIN_RETENTION_DAYS" :max="MAX_RETENTION_DAYS" :disabled="!retentionEnabled">
			<template #label>{{ i18n.ts._chat.autoDeleteDays }}</template>
			<template #caption>{{ i18n.ts._chat.autoDeleteDaysCaption }}</template>
		</MkInput>
		<MkButton primary :disabled="!canSaveRetention" @click="saveRetention">{{ i18n.ts.save }}</MkButton>
	</div>

	<div :class="[$style.section, $style.dangerSection]">
		<div :class="$style.title">{{ i18n.ts._chat.deleteAllMessages }}</div>
		<div :class="$style.caption">{{ i18n.ts._chat.deleteAllMessagesDescription }}</div>
		<MkButton danger @click="deleteAllMessages"><i class="ti ti-trash"></i> {{ i18n.ts._chat.deleteAllMessages }}</MkButton>
	</div>
</div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';
import * as Misskey from 'misskey-js';
import MkButton from '@/components/MkButton.vue';
import MkInfo from '@/components/MkInfo.vue';
import MkInput from '@/components/MkInput.vue';
import MkTextarea from '@/components/MkTextarea.vue';
import MkSwitch from '@/components/MkSwitch.vue';
import MkLoading from '@/components/global/MkLoading.vue';
import MkUserCardMini from '@/components/MkUserCardMini.vue';
import { userPage } from '@/filters/user.js';
import { i18n } from '@/i18n.js';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';

const MIN_RETENTION_DAYS = 1;
const MAX_RETENTION_DAYS = 3650;

const props = defineProps<{
	room: Misskey.entities.ChatRoom;
}>();

const emit = defineEmits<{
	(ev: 'updated', room: Misskey.entities.ChatRoom): void;
	(ev: 'cleared'): void;
}>();

const retentionEnabled = ref(props.room.messageRetentionDays != null);
const retentionDays = ref<number | string>(props.room.messageRetentionDays ?? 30);
const stats = ref<Misskey.Endpoints['chat/rooms/manage/stats']['res'] | null>(null);
const isSilenced = ref(props.room.isSilenced);
const announcement = ref(props.room.announcement);
const announcementPinned = ref(props.room.announcementPinned);
const announcementChanged = computed(() => announcement.value !== props.room.announcement || announcementPinned.value !== props.room.announcementPinned);
const bans = ref<Misskey.entities.ChatRoomsBansListResponse>([]);
const bansFetching = ref(true);
const bansMoreFetching = ref(false);
const bansCanFetchMore = ref(false);
const BANS_LIMIT = 30;
const mutedMembers = ref<Misskey.entities.ChatRoomMembership[]>([]);
const mutedFetching = ref(true);

const normalizedRetentionDays = computed(() => {
	if (!retentionEnabled.value) return null;
	const days = Number(retentionDays.value);
	if (!Number.isInteger(days)) return undefined;
	if (days < MIN_RETENTION_DAYS || days > MAX_RETENTION_DAYS) return undefined;
	return days;
});
const canSaveRetention = computed(() => normalizedRetentionDays.value !== undefined);
const maxDailyCount = computed(() => Math.max(1, ...(stats.value?.daily.map(item => item.count) ?? [0])));

watch(() => props.room, () => {
	retentionEnabled.value = props.room.messageRetentionDays != null;
	retentionDays.value = props.room.messageRetentionDays ?? 30;
	isSilenced.value = props.room.isSilenced;
	announcement.value = props.room.announcement;
	announcementPinned.value = props.room.announcementPinned;
	loadStats();
});

onMounted(() => {
	loadStats();
	loadBans();
	loadMutedMembers();
});

function isMutedNow(membership: Misskey.entities.ChatRoomMembership) {
	return membership.mutedUntil != null && Date.parse(membership.mutedUntil) > Date.now();
}

function mutedUntilText(membership: Misskey.entities.ChatRoomMembership) {
	if (membership.mutedUntil == null) return '';
	if (new Date(membership.mutedUntil).getFullYear() >= 9999) return i18n.ts._chat.mutedForever;
	return i18n.tsx._chat.mutedUntil({ time: dateString(membership.mutedUntil) });
}

async function loadMutedMembers() {
	mutedFetching.value = true;
	try {
		// 禁言中のメンバーは多くないため、メンバー一覧を取得してフィルタする
		const res = await misskeyApi('chat/rooms/members', {
			roomId: props.room.id,
			limit: 100,
		});
		mutedMembers.value = res.filter(m => isMutedNow(m) && m.user != null);
	} catch {
		mutedMembers.value = [];
	} finally {
		mutedFetching.value = false;
	}
}

async function unmuteMember(membership: Misskey.entities.ChatRoomMembership) {
	await os.apiWithDialog('chat/rooms/unmute-member', {
		roomId: props.room.id,
		userId: membership.userId,
	});
	mutedMembers.value = mutedMembers.value.filter(m => m.id !== membership.id);
}

async function saveSilenced(value: boolean) {
	const updated = await os.apiWithDialog('chat/rooms/update', {
		roomId: props.room.id,
		isSilenced: value,
	});
	emit('updated', updated);
}

async function saveAnnouncement() {
	const updated = await os.apiWithDialog('chat/rooms/update', {
		roomId: props.room.id,
		announcement: announcement.value,
		announcementPinned: announcementPinned.value,
	});
	emit('updated', updated);
}

async function loadBans() {
	bansFetching.value = true;
	try {
		const res = await misskeyApi('chat/rooms/bans/list', {
			roomId: props.room.id,
			limit: BANS_LIMIT,
		});
		bans.value = res.filter(b => b.user != null);
		bansCanFetchMore.value = res.length >= BANS_LIMIT;
	} catch {
		bans.value = [];
	} finally {
		bansFetching.value = false;
	}
}

async function fetchMoreBans() {
	const untilId = bans.value.at(-1)?.id;
	if (untilId == null || bansMoreFetching.value) return;

	bansMoreFetching.value = true;
	try {
		const res = await misskeyApi('chat/rooms/bans/list', {
			roomId: props.room.id,
			limit: BANS_LIMIT,
			untilId,
		});
		bans.value = [...bans.value, ...res];
		bansCanFetchMore.value = res.length >= BANS_LIMIT;
	} finally {
		bansMoreFetching.value = false;
	}
}

async function unban(ban: Misskey.entities.ChatRoomsBansListResponse[number]) {
	await os.apiWithDialog('chat/rooms/bans/delete', {
		roomId: props.room.id,
		userId: ban.userId,
	});
	bans.value = bans.value.filter(b => b.id !== ban.id);
}

function dateString(value: string) {
	return new Date(value).toLocaleDateString();
}

function barHeight(count: number) {
	return Math.max(count === 0 ? 0 : 8, Math.round((count / maxDailyCount.value) * 100));
}

async function loadStats() {
	try {
		stats.value = await misskeyApi('chat/rooms/manage/stats', {
			roomId: props.room.id,
			days: 14,
		});
	} catch {
		// 取得失敗時はローディング表示のままにせず空扱いにする
		stats.value = { total: 0, oldestAt: null, newestAt: null, daily: [] } as Misskey.Endpoints['chat/rooms/manage/stats']['res'];
	}
}

async function saveRetention() {
	if (normalizedRetentionDays.value === undefined) return;

	const updated = await os.apiWithDialog('chat/rooms/manage/update', {
		roomId: props.room.id,
		messageRetentionDays: normalizedRetentionDays.value,
	});
	emit('updated', updated);
}

async function deleteAllMessages() {
	const auth = await os.authenticateDialog();
	if (auth.canceled) return;

	const { canceled } = await os.confirm({
		type: 'warning',
		text: i18n.ts._chat.deleteAllMessagesConfirm,
	});
	if (canceled) return;

	await os.apiWithDialog('chat/rooms/manage/delete-all-messages', {
		roomId: props.room.id,
		password: auth.result.password,
	});
	await loadStats();
	emit('cleared');
}
</script>

<style lang="scss" module>
.section {
	display: grid;
	gap: 16px;
	padding: 16px;
	border: solid 1px color(from var(--MI_THEME-fg) srgb r g b / 0.12);
	border-radius: var(--MI-radius);
	background: color(from var(--MI_THEME-panel) srgb r g b / 0.55);
}

.dangerSection {
	border-color: color(from var(--MI_THEME-error) srgb r g b / 0.35);
}

.title {
	font-weight: 700;
}

.loading {
	display: grid;
	place-items: center;
	min-height: 140px;
}

.statsGrid {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 10px;

	> div {
		min-width: 0;
		padding: 10px;
		border-radius: var(--MI-radius-sm);
		background: color(from var(--MI_THEME-bg) srgb r g b / 0.45);
	}

	span {
		display: block;
		color: color(from var(--MI_THEME-fg) srgb r g b / 0.7);
		font-size: 0.85em;
	}

	b {
		display: block;
		margin-top: 4px;
		overflow: hidden;
		color: var(--MI_THEME-fg);
		text-overflow: ellipsis;
		white-space: nowrap;
	}
}

.chart {
	display: grid;
	grid-template-columns: repeat(14, minmax(12px, 1fr));
	align-items: end;
	gap: 6px;
	height: 180px;
	padding-top: 8px;
}

.barWrap {
	display: grid;
	grid-template-rows: 1fr auto;
	align-items: end;
	min-width: 0;
	height: 100%;
	gap: 6px;

	> span {
		overflow: hidden;
		color: color(from var(--MI_THEME-fg) srgb r g b / 0.7);
		font-size: 0.72em;
		text-align: center;
		text-overflow: clip;
		white-space: nowrap;
	}
}

.barTrack {
	position: relative;
	height: 100%;
	min-height: 0;
	border-radius: var(--MI-radius-sm);
	background: color(from var(--MI_THEME-fg) srgb r g b / 0.08);
	overflow: hidden;
}

.bar {
	position: absolute;
	right: 0;
	bottom: 0;
	left: 0;
	border-radius: var(--MI-radius-sm) var(--MI-radius-sm) 0 0;
	background: linear-gradient(180deg, var(--MI_THEME-accent), color(from var(--MI_THEME-accent) srgb r g b / 0.62));
}

.caption {
	color: color(from var(--MI_THEME-fg) srgb r g b / 0.75);
	font-size: 0.9em;
}

.banList {
	display: grid;
	gap: 10px;
	min-width: 0;
}

.banRow {
	display: flex;
	align-items: center;
	gap: 8px;
	min-width: 0;
}

.banRowLink {
	flex: 1;
	min-width: 0;

	&:hover {
		text-decoration: none;
	}
}

.banRowButton {
	flex: 0 0 auto;
}

.mutedUntilLabel {
	flex: 0 0 auto;
	color: var(--MI_THEME-warn);
	font-size: 0.82em;
	white-space: nowrap;
}

@media (max-width: 600px) {
	.statsGrid {
		grid-template-columns: 1fr;
	}

	.chart {
		gap: 4px;
	}

	.barWrap > span {
		font-size: 0.65em;
	}
}
</style>
