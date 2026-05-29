<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div class="_gaps">
	<MkInput v-model="name_" :disabled="!isOwner">
		<template #label>{{ i18n.ts.name }}</template>
	</MkInput>

	<MkTextarea v-model="description_" :disabled="!isOwner">
		<template #label>{{ i18n.ts.description }}</template>
	</MkTextarea>

	<MkSelect v-if="isOwner" v-model="joinMode_">
		<template #label>{{ i18n.ts._chat.roomJoinMode }}</template>
		<option value="inviteOnly">{{ i18n.ts._chat.inviteOnlyRoom }}</option>
		<option value="open">{{ i18n.ts._chat.openRoom }}</option>
		<option value="closed">{{ i18n.ts._chat.closedRoom }}</option>
	</MkSelect>
	<div v-else :class="$style.readonlyField">
		<div :class="$style.readonlyLabel">{{ i18n.ts._chat.roomJoinMode }}</div>
		<div :class="$style.readonlyValue">{{ joinModeText }}</div>
	</div>

	<MkInfo>
		{{ i18n.ts.effectiveRoomMemberLimit }}: {{ room.memberLimit }}
		<span v-if="$i.isAdmin"> {{ i18n.ts.roomMemberLimitOverride }}{{ room.memberLimitOverride == null ? `: ${i18n.ts.useDefaultLimit}` : `: ${room.memberLimitOverride}` }}</span>
	</MkInfo>

	<MkInfo v-if="$i.isAdmin">{{ i18n.ts._chat.roomMemberLimitManagedByAdmin }}</MkInfo>

	<MkButton v-if="isOwner" primary @click="save">{{ i18n.ts.save }}</MkButton>

	<hr>

	<MkButton v-if="isOwner || ($i.isAdmin || $i.isModerator)" danger @click="del">{{ i18n.ts._chat.deleteRoom }}</MkButton>

	<MkSwitch v-if="!isOwner" v-model="isMuted">
		<template #label>{{ i18n.ts._chat.muteThisRoom }}</template>
	</MkSwitch>
</div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import * as Misskey from 'misskey-js';
import MkButton from '@/components/MkButton.vue';
import { i18n } from '@/i18n.js';
import * as os from '@/os.js';
import { ensureSignin } from '@/i.js';
import MkInput from '@/components/MkInput.vue';
import MkTextarea from '@/components/MkTextarea.vue';
import MkSwitch from '@/components/MkSwitch.vue';
import MkSelect from '@/components/MkSelect.vue';
import MkInfo from '@/components/MkInfo.vue';
import { useRouter } from '@/router.js';

const router = useRouter();
const $i = ensureSignin();

const props = defineProps<{
	room: Misskey.entities.ChatRoom;
}>();

const emit = defineEmits<{
	(ev: 'updated', room: Misskey.entities.ChatRoom): void;
}>();

const isOwner = computed(() => {
	return props.room.ownerId === $i.id;
});

const name_ = ref(props.room.name);
const description_ = ref(props.room.description);
const joinMode_ = ref(props.room.joinMode);
const joinModeText = computed(() => {
	switch (joinMode_.value) {
		case 'open':
			return i18n.ts._chat.openRoom;
		case 'closed':
			return i18n.ts._chat.closedRoom;
		case 'inviteOnly':
		default:
			return i18n.ts._chat.inviteOnlyRoom;
	}
});

watch(() => props.room, () => {
	name_.value = props.room.name;
	description_.value = props.room.description;
	joinMode_.value = props.room.joinMode;
});

async function save() {
	const updated = await os.apiWithDialog('chat/rooms/update', {
		roomId: props.room.id,
		name: name_.value,
		description: description_.value,
		joinMode: joinMode_.value,
	});

	name_.value = updated.name;
	description_.value = updated.description;
	joinMode_.value = updated.joinMode;
	emit('updated', updated);
}

async function del() {
	const { canceled } = await os.confirm({
		type: 'warning',
		text: i18n.tsx.deleteAreYouSure({ x: name_.value }),
	});
	if (canceled) return;

	await os.apiWithDialog('chat/rooms/delete', {
		roomId: props.room.id,
	});
	router.push('/chat');
}

const isMuted = ref(props.room.isMuted ?? false);

watch(isMuted, async () => {
	await os.apiWithDialog('chat/rooms/mute', {
		roomId: props.room.id,
		mute: isMuted.value,
	});
	emit('updated', {
		...props.room,
		isMuted: isMuted.value,
	});
});
</script>

<style lang="scss" module>
.membership {
	display: flex;
}

.membershipBody {
	flex: 1;
	min-width: 0;
	margin-right: 8px;

	&:hover {
		text-decoration: none;
	}
}

.readonlyField {
	display: block;
}

.readonlyLabel {
	font-size: 0.85em;
	padding: 0 0 8px 0;
	user-select: none;
}

.readonlyValue {
	min-height: 36px;
	padding: 8px 12px;
	color: var(--MI_THEME-fg);
	background: color(from var(--MI_THEME-panel) srgb r g b / 0.7);
	border: solid 1px color(from var(--MI_THEME-fg) srgb r g b / 0.12);
	border-radius: var(--MI-radius-sm);
	box-sizing: border-box;
}
</style>
