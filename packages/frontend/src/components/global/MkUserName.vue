<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<span :class="{ [$style.readable]: forceReadable }">
	<Mfm :text="user.name ?? user.username" :author="user" :plain="true" :nowrap="nowrap" :emojiUrls="user.emojis"/>
</span>
</template>

<script lang="ts" setup>
import { } from 'vue';
import * as Misskey from 'misskey-js';

const props = withDefaults(defineProps<{
	user: Misskey.entities.User;
	nowrap?: boolean;
	forceReadable?: boolean;
}>(), {
	nowrap: true,
	forceReadable: false,
});
</script>

<style lang="scss" module>
.readable {
	color: var(--MI_THEME-fg) !important;
	-webkit-text-fill-color: var(--MI_THEME-fg) !important;

	:deep(*) {
		color: inherit !important;
		-webkit-text-fill-color: currentColor !important;
	}
}
</style>
