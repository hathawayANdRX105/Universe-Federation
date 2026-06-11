<!--
SPDX-FileCopyrightText: hhhl contributors
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div v-if="badges.length > 0" :class="$style.root" aria-label="content labels">
	<span v-for="badge in badges" :key="badge.kind" :class="[$style.badge, badgeKindClasses[badge.kind]]">
		<i :class="badge.icon"></i>
		<span>{{ badge.label }}</span>
	</span>
</div>
</template>

<script lang="ts" setup>
import * as Misskey from 'misskey-js';
import { computed, useCssModule } from 'vue';
import { getNoteContentBadges, type NoteContentBadgeKind } from '@/utility/note-content-badge.js';

const props = defineProps<{
	note: Misskey.entities.Note;
}>();

const styles = useCssModule();
const badgeKindClasses: Record<NoteContentBadgeKind, string> = {
	featured: styles.featured,
	hot: styles.hot,
	discussion: styles.discussion,
	resource: styles.resource,
	channel: styles.channel,
};

const badges = computed(() => getNoteContentBadges(props.note));
</script>

<style lang="scss" module>
.root {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
	margin: 2px 0 8px;
}

.badge {
	display: inline-flex;
	align-items: center;
	max-width: 100%;
	height: 22px;
	padding: 0 8px;
	gap: 4px;
	border-radius: var(--MI-radius-xs);
	border: 1px solid color-mix(in srgb, var(--MI_THEME-divider), transparent 10%);
	background: color-mix(in srgb, var(--MI_THEME-panel), var(--MI_THEME-accent) 8%);
	color: var(--MI_THEME-fg);
	font-size: 0.78em;
	font-weight: 700;
	line-height: 1;
	white-space: nowrap;
}

.badge > i {
	flex: 0 0 auto;
	font-size: 1em;
}

.featured {
	background: color-mix(in srgb, #f59e0b 18%, var(--MI_THEME-panel));
	border-color: color-mix(in srgb, #f59e0b 42%, var(--MI_THEME-divider));
	color: color-mix(in srgb, #f59e0b 78%, var(--MI_THEME-fg));
}

.hot {
	background: color-mix(in srgb, #ef4444 16%, var(--MI_THEME-panel));
	border-color: color-mix(in srgb, #ef4444 36%, var(--MI_THEME-divider));
	color: color-mix(in srgb, #ef4444 76%, var(--MI_THEME-fg));
}

.discussion {
	background: color-mix(in srgb, #0ea5e9 15%, var(--MI_THEME-panel));
	border-color: color-mix(in srgb, #0ea5e9 34%, var(--MI_THEME-divider));
	color: color-mix(in srgb, #0ea5e9 72%, var(--MI_THEME-fg));
}

.resource {
	background: color-mix(in srgb, #16a34a 15%, var(--MI_THEME-panel));
	border-color: color-mix(in srgb, #16a34a 34%, var(--MI_THEME-divider));
	color: color-mix(in srgb, #16a34a 74%, var(--MI_THEME-fg));
}

.channel {
	background: color-mix(in srgb, var(--MI_THEME-accent) 13%, var(--MI_THEME-panel));
	border-color: color-mix(in srgb, var(--MI_THEME-accent) 32%, var(--MI_THEME-divider));
	color: color-mix(in srgb, var(--MI_THEME-accent) 74%, var(--MI_THEME-fg));
}
</style>
