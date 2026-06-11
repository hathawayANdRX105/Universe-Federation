<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div
	:class="[$style.root, { [$style.inline]: inline, [$style.colored]: colored, [$style.mini]: mini, [$style.em]: em, [$style.compact]: isCompact, [$style.progress]: !isCompact }]"
	role="progressbar"
	:aria-label="displayLabel"
	:aria-valuemin="0"
	:aria-valuemax="100"
	:aria-valuenow="progressPercent"
>
	<div v-if="isCompact" :class="$style.container">
		<svg :class="[$style.spinner, $style.bg]" viewBox="0 0 168 168" xmlns="http://www.w3.org/2000/svg">
			<g transform="matrix(1.125,0,0,1.125,12,12)">
				<circle cx="64" cy="64" r="64" style="fill:none;stroke:currentColor;stroke-width:21.33px;"/>
			</g>
		</svg>
		<svg :class="[$style.spinner, $style.fg, { [$style.static]: static }]" viewBox="0 0 168 168" xmlns="http://www.w3.org/2000/svg">
			<g transform="matrix(1.125,0,0,1.125,12,12)">
				<path d="M128,64C128,28.654 99.346,0 64,0C99.346,0 128,28.654 128,64Z" style="fill:none;stroke:currentColor;stroke-width:21.33px;"/>
			</g>
		</svg>
	</div>
	<div v-else :class="$style.progressBox">
		<div :class="$style.progressHeader">
			<span :class="$style.label">{{ displayLabel }}</span>
			<strong :class="$style.percent">{{ progressPercent }}%</strong>
		</div>
		<div :class="$style.track">
			<div :class="$style.bar" :style="{ width: `${progressPercent}%` }"></div>
		</div>
	</div>
</div>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { i18n } from '@/i18n.js';

const props = withDefaults(defineProps<{
	static?: boolean;
	inline?: boolean;
	colored?: boolean;
	mini?: boolean;
	em?: boolean;
	progress?: number | null;
	mode?: 'auto' | 'bar' | 'spinner' | 'compact';
	label?: string | null;
}>(), {
	static: false,
	inline: false,
	colored: true,
	mini: false,
	em: false,
	progress: null,
	mode: 'auto',
	label: null,
});

const estimatedProgress = ref(8);
let progressTimer: number | null = null;

const isCompact = computed(() => {
	if (props.mode === 'bar') return false;
	if (props.mode === 'spinner' || props.mode === 'compact') return true;
	return props.inline || props.mini || props.em;
});

const displayLabel = computed(() => props.label ?? i18n.ts.loading);
const progressPercent = computed(() => {
	const value = props.progress ?? estimatedProgress.value;
	return Math.max(0, Math.min(100, Math.round(value)));
});

onMounted(() => {
	if (props.static) return;
	progressTimer = window.setInterval(() => {
		if (props.progress != null) return;
		const next = estimatedProgress.value + Math.max(0.4, (86 - estimatedProgress.value) * 0.045);
		estimatedProgress.value = Math.min(86, next);
	}, 180);
});

onBeforeUnmount(() => {
	if (progressTimer != null) {
		window.clearInterval(progressTimer);
		progressTimer = null;
	}
});
</script>

<style lang="scss" module>
@keyframes spinner {
	0% {
		transform: rotate(0deg);
	}
	100% {
		transform: rotate(360deg);
	}
}

.root {
	padding: 32px;
	text-align: center;
	cursor: wait;

	--size: 38px;

	&.colored {
		color: var(--MI_THEME-accent);
	}

	&.progress {
		width: min(280px, 100%);
		margin: 0 auto;
		color: var(--MI_THEME-fg);
	}

	&.inline {
		display: inline;
		padding: 0;
		--size: 32px;
	}

	&.mini {
		padding: 16px;
		--size: 32px;
	}

	&.em {
		display: inline-block;
		vertical-align: middle;
		padding: 0;
		--size: 1em;
	}

	&.compact {
		color: currentColor;

		&.colored {
			color: var(--MI_THEME-accent);
		}
	}
}

:global(.MkLoading-root) {
	&.progress {
		width: min(280px, 100%);
	}
}

.container {
	position: relative;
	width: var(--size);
	height: var(--size);
	margin: 0 auto;
}

.spinner {
	position: absolute;
	top: 0;
	left: 0;
	width: var(--size);
	height: var(--size);
	fill-rule: evenodd;
	clip-rule: evenodd;
	stroke-linecap: round;
	stroke-linejoin: round;
	stroke-miterlimit: 1.5;
}

.bg {
	opacity: 0.275;
}

.fg {
	animation: spinner 0.5s linear infinite;

	&.static {
		animation-play-state: paused;
	}
}

.progressBox {
	width: 100%;
}

.progressHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	margin-bottom: 10px;
	font-size: 0.9em;
	line-height: 1.2;
	color: var(--MI_THEME-fg);
}

.label {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	opacity: 0.8;
}

.percent {
	flex-shrink: 0;
	font-variant-numeric: tabular-nums;
	color: var(--MI_THEME-accent);
}

.track {
	position: relative;
	width: 100%;
	height: 6px;
	overflow: hidden;
	border-radius: 999px;
	background: var(--MI_THEME-accentedBg);
}

.bar {
	height: 100%;
	border-radius: inherit;
	background: linear-gradient(90deg, var(--MI_THEME-accent), var(--MI_THEME-accentLighten));
	transition: width 180ms ease;
}
</style>
