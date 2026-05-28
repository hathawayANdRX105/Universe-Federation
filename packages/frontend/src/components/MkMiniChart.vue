<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<svg :viewBox="`0 0 ${ viewBoxX } ${ viewBoxY }`" style="overflow:visible">
	<defs>
		<linearGradient :id="gradientId" x1="0" x2="0" y1="1" y2="0">
			<stop offset="0%" :stop-color="themeColors.miniChartLineColor" stop-opacity="0"></stop>
			<stop offset="100%" :stop-color="themeColors.miniChartLineColor" stop-opacity="0.42"></stop>
		</linearGradient>
	</defs>
	<line
		v-for="line in gridLines"
		:key="line"
		x1="0"
		:y1="line"
		:x2="viewBoxX"
		:y2="line"
		:stroke="themeColors.miniChartGridColor"
		stroke-width="0.6"
	/>
	<polygon
		:points="polygonPoints"
		:style="`stroke: none; fill: url(#${ gradientId });`"
	/>
	<polyline
		:points="polylinePoints"
		fill="none"
		:stroke="themeColors.miniChartLineColor"
		stroke-width="2"
	/>
	<circle
		:cx="headX ?? undefined"
		:cy="headY ?? undefined"
		r="3"
		:fill="themeColors.miniChartLineColor"
	/>
</svg>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, watch, ref } from 'vue';
import { v4 as uuid } from 'uuid';
import { useInterval } from '@@/js/use-interval.js';
import { globalEvents } from '@/events.js';
import { getChartThemeColors } from '@/utility/chart-theme.js';

const props = defineProps<{
	src: number[];
}>();

const viewBoxX = 50;
const viewBoxY = 50;
const gradientId = uuid();
const polylinePoints = ref('');
const polygonPoints = ref('');
const headX = ref<number | null>(null);
const headY = ref<number | null>(null);
const clock = ref<number | null>(null);
const themeVersion = ref(0);
const gridLines = [viewBoxY * 0.25, viewBoxY * 0.5, viewBoxY * 0.75];
const themeColors = computed(() => {
	themeVersion.value;
	return getChartThemeColors();
});

function refreshTheme(): void {
	themeVersion.value++;
}

function draw(): void {
	const stats = props.src.slice().reverse();
	const peak = Math.max.apply(null, stats) || 1;

	const _polylinePoints = stats.map((n, i) => [
		i * (viewBoxX / (stats.length - 1)),
		(1 - (n / peak)) * viewBoxY,
	]);

	polylinePoints.value = _polylinePoints.map(xy => `${xy[0]},${xy[1]}`).join(' ');
	polygonPoints.value = _polylinePoints.length > 0 ? `0,${ viewBoxY } ${ polylinePoints.value } ${ viewBoxX },${ viewBoxY }` : '';

	headX.value = _polylinePoints.at(-1)?.[0] ?? null;
	headY.value = _polylinePoints.at(-1)?.[1] ?? null;
}

watch(() => props.src, draw, { immediate: true });
globalEvents.on('themeChanged', refreshTheme);
onBeforeUnmount(() => {
	globalEvents.off('themeChanged', refreshTheme);
});

// Vueが何故かWatchを発動させない場合があるので
useInterval(draw, 1000, {
	immediate: false,
	afterMounted: true,
});
</script>
