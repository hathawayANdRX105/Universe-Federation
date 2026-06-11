<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div
	ref="rootEl"
	class="MkLoading-root"
	:class="[$style.root, { [$style.inline]: inline, [$style.colored]: colored, [$style.mini]: mini, [$style.em]: em, [$style.compact]: isCompact, [$style.ringVariant]: isRing, [$style.progress]: isBar }]"
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
	<div v-else-if="isRing" :class="$style.ringBox" :style="ringStyle">
		<div :class="$style.ring">
			<span :class="$style.ringPercent">{{ progressPercent }}%</span>
		</div>
		<span :class="$style.ringLabel">{{ displayLabel }}</span>
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

type LoadingVariant = 'spinner' | 'ring' | 'bar';

const rootEl = ref<HTMLElement | null>(null);
const containerWidth = ref<number | null>(null);
const estimatedProgress = ref(8);
let progressTimer: number | null = null;
let resizeObserver: ResizeObserver | null = null;

function updateContainerWidth() {
	const el = rootEl.value;
	if (!el) return;

	const target = el.parentElement ?? el;
	const width = target.getBoundingClientRect().width || el.getBoundingClientRect().width;
	containerWidth.value = Number.isFinite(width) && width > 0 ? width : null;
}

const variant = computed<LoadingVariant>(() => {
	if (props.mode === 'bar') return 'bar';
	if (props.mode === 'spinner' || props.mode === 'compact') return 'spinner';
	if (props.inline || props.mini || props.em) return 'spinner';

	const width = containerWidth.value;
	if (width == null) return 'ring';
	if (width < 180) return 'spinner';
	if (width < 320) return 'ring';
	return 'bar';
});

const isCompact = computed(() => variant.value === 'spinner');
const isRing = computed(() => variant.value === 'ring');
const isBar = computed(() => variant.value === 'bar');
const displayLabel = computed(() => props.label ?? i18n.ts.loading);
const progressPercent = computed(() => {
	const value = props.progress ?? estimatedProgress.value;
	return Math.max(0, Math.min(100, Math.round(value)));
});
const ringStyle = computed(() => ({
	'--progress': `${progressPercent.value}%`,
}));

onMounted(() => {
	updateContainerWidth();
	const resizeTarget = rootEl.value?.parentElement ?? rootEl.value;
	if (resizeTarget && window.ResizeObserver) {
		resizeObserver = new ResizeObserver(updateContainerWidth);
		resizeObserver.observe(resizeTarget);
	}

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
	if (resizeObserver != null) {
		resizeObserver.disconnect();
		resizeObserver = null;
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
	box-sizing: border-box;
	max-width: 100%;
	text-align: center;
	cursor: wait;

	--size: 38px;

	&.colored {
		color: var(--MI_THEME-accent);
	}

	&.progress {
		width: min(220px, 100%);
		margin: 0 auto;
		padding: 24px 16px;
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

	&.ringVariant {
		width: fit-content;
		max-width: 100%;
		margin: 0 auto;
		padding: 18px 14px;
		color: var(--MI_THEME-fg);
	}
}

:global(.MkLoading-root) {
	&.progress {
		width: min(220px, 100%);
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
	min-width: 0;
}

.progressHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 10px;
	margin-bottom: 8px;
	font-size: 0.82em;
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
	height: 4px;
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

.ringBox {
	display: grid;
	justify-items: center;
	gap: 8px;
	max-width: min(140px, 100%);
}

.ring {
	position: relative;
	display: grid;
	place-items: center;
	width: 54px;
	height: 54px;
	flex: 0 0 auto;
	border-radius: 50%;
	background: conic-gradient(var(--MI_THEME-accent) var(--progress), color-mix(in srgb, var(--MI_THEME-accent) 18%, transparent) 0);
	box-shadow: 0 0 0 1px color-mix(in srgb, var(--MI_THEME-accent) 18%, transparent);

	&::before {
		content: "";
		position: absolute;
		inset: 5px;
		border-radius: inherit;
		background: color-mix(in srgb, var(--MI_THEME-panel) 84%, var(--MI_THEME-bg));
	}
}

.ringPercent {
	position: relative;
	z-index: 1;
	font-size: 11px;
	font-weight: 700;
	font-variant-numeric: tabular-nums;
	line-height: 1;
	color: var(--MI_THEME-accent);
}

.ringLabel {
	display: block;
	max-width: 100%;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-size: 0.78em;
	line-height: 1.2;
	opacity: 0.75;
}
</style>
