<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<svg :viewBox="`0 0 ${viewBoxX} ${viewBoxY}`" :class="$style.root" role="img">
	<line
		v-for="line in gridLines"
		:key="line"
		:x1="plot.x"
		:y1="line"
		:x2="plot.x + plot.width"
		:y2="line"
		:class="$style.grid"
	/>

	<g :class="$style.bars">
		<template v-for="bar in bars" :key="bar.index">
			<rect
				v-for="segment in bar.segments"
				:key="segment.key"
				:x="bar.x"
				:y="segment.y"
				:width="bar.width"
				:height="segment.height"
				:rx="bar.radius"
				:fill="segment.color"
			/>
		</template>
	</g>

	<path
		v-if="trendPath"
		:d="trendPath"
		:class="$style.trend"
	/>
</svg>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

const props = defineProps<{
	activity: {
		total: number;
		notes: number;
		replies: number;
		renotes: number;
	}[]
}>();

const viewBoxX = 168;
const viewBoxY = 68;
const plot = {
	x: 6,
	y: 8,
	width: 156,
	height: 48,
};

const colors = {
	notes: '#41ddde',
	replies: '#ff7a70',
	renotes: '#a1de41',
};

const visibleActivity = computed(() => props.activity.slice().reverse().slice(-70));
const peak = computed(() => Math.max(1, ...visibleActivity.value.map(d => d.total)));
const gridLines = computed(() => [0.25, 0.5, 0.75].map(rate => plot.y + (plot.height * rate)));

const bars = computed(() => {
	const activity = visibleActivity.value;
	const step = plot.width / Math.max(activity.length, 1);
	const width = Math.max(1, Math.min(2.4, step * 0.72));

	return activity.map((d, index) => {
		let cursor = plot.y + plot.height;
		const x = plot.x + (index * step) + ((step - width) / 2);
		const parts = [
			{ key: 'notes', value: d.notes, color: colors.notes },
			{ key: 'replies', value: d.replies, color: colors.replies },
			{ key: 'renotes', value: d.renotes, color: colors.renotes },
		];

		const segments = parts
			.map(part => {
				const height = Math.max(0, (part.value / peak.value) * plot.height);
				cursor -= height;
				return {
					key: `${index}-${part.key}`,
					y: cursor,
					height,
					color: part.color,
				};
			})
			.filter(segment => segment.height > 0.45);

		return {
			index,
			x,
			width,
			radius: Math.min(width / 2, 1.2),
			segments,
		};
	});
});

const trendPath = computed(() => {
	const activity = visibleActivity.value;
	if (activity.length === 0) return '';

	const step = plot.width / Math.max(activity.length, 1);
	const smoothingWindow = 5;

	return activity.map((_, index) => {
		const from = Math.max(0, index - smoothingWindow + 1);
		const chunk = activity.slice(from, index + 1);
		const average = chunk.reduce((sum, value) => sum + value.total, 0) / chunk.length;
		const x = plot.x + (index * step) + (step / 2);
		const y = plot.y + plot.height - ((average / peak.value) * plot.height);
		return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
	}).join(' ');
});
</script>

<style lang="scss" module>
.root {
	display: block;
	width: 100%;
	padding: 14px 12px 12px;
	box-sizing: border-box;
	overflow: visible;
}

.grid {
	stroke: currentColor;
	stroke-width: 0.4;
	opacity: 0.12;
}

.bars {
	opacity: 0.92;
}

.trend {
	fill: none;
	stroke: currentColor;
	stroke-width: 1.4;
	stroke-linecap: round;
	stroke-linejoin: round;
	opacity: 0.48;
}
</style>
