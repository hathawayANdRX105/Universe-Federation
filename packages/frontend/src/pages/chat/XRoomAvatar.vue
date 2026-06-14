<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<img v-if="room.avatarUrl" :class="$style.avatar" :src="room.avatarUrl" :alt="room.name" decoding="async"/>
<MkAvatar v-else-if="room.owner" :user="room.owner" :link="false" :class="$style.avatar"/>
<div v-else :class="[$style.avatar, $style.fallback]"><i class="ti ti-users"></i></div>
</template>

<script lang="ts" setup>
import * as Misskey from 'misskey-js';

const props = defineProps<{
	room: Misskey.entities.ChatRoom;
}>();
</script>

<style lang="scss" module>
.avatar {
	display: block;
	aspect-ratio: 1;
	object-fit: cover;
	border-radius: 100%;
}

.fallback {
	display: grid;
	place-items: center;
	width: 100%;
	height: 100%;
	background: var(--MI_THEME-buttonBg);
	color: var(--MI_THEME-fgTransparentWeak);
}
</style>
