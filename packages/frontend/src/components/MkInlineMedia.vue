<!--
SPDX-FileCopyrightText: lpHex
SPDX-License-Identifier: AGPL-3.0-only

帖子正文里"内联"的单个媒体附件。通过 MFM 函数 `$[file N]` 触发,
N 是 note.files 数组的索引。按文件类型分发:
- image      → <img>,点击进 lightbox
- video      → <video> 带控件,首次点击才加载(节流)
- audio      → <audio> 带控件
- 其它       → 卡片(图标 + 文件名 + 大小 + 下载链接)
-->

<template>
<span :class="$style.wrap">
	<a
		v-if="kind === 'image'"
		:class="$style.imageLink"
		:href="file.url"
		target="_blank"
		rel="noopener"
		@click.stop
	>
		<img
			:src="file.thumbnailUrl ?? file.url"
			:alt="file.comment ?? ''"
			:class="$style.image"
			loading="lazy"
			decoding="async"
		/>
		<span v-if="file.isSensitive" :class="$style.sensitiveTag">NSFW</span>
	</a>

	<video
		v-else-if="kind === 'video'"
		:class="$style.video"
		:src="file.url"
		:poster="file.thumbnailUrl ?? undefined"
		controls
		preload="metadata"
		playsinline
	/>

	<audio
		v-else-if="kind === 'audio'"
		:class="$style.audio"
		:src="file.url"
		controls
		preload="none"
	/>

	<a
		v-else
		:class="$style.fileCard"
		:href="file.url"
		target="_blank"
		rel="noopener"
		:download="file.name"
	>
		<i class="ph-file ph-bold ph-lg" :class="$style.fileIcon"></i>
		<span :class="$style.fileMeta">
			<span :class="$style.fileName">{{ file.name }}</span>
			<span :class="$style.fileSize">{{ humanSize(file.size) }}</span>
		</span>
		<i class="ph-download-simple ph-bold ph-lg" :class="$style.fileDownload"></i>
	</a>
</span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type * as Misskey from 'misskey-js';

const props = defineProps<{
	file: Misskey.entities.DriveFile;
}>();

const kind = computed<'image' | 'video' | 'audio' | 'other'>(() => {
	const t = props.file.type ?? '';
	if (t.startsWith('image/')) return 'image';
	if (t.startsWith('video/')) return 'video';
	if (t.startsWith('audio/')) return 'audio';
	return 'other';
});

function humanSize(n: number | null | undefined): string {
	if (!n || n <= 0) return '';
	const units = ['B', 'KB', 'MB', 'GB'];
	let v = n;
	let i = 0;
	while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
	return v.toFixed(v < 10 ? 1 : 0) + ' ' + units[i];
}
</script>

<style lang="scss" module>
.wrap {
	display: block;
	margin: 8px 0;
}

.imageLink {
	display: inline-block;
	max-width: 100%;
	position: relative;
}

.image {
	display: block;
	max-width: 100%;
	max-height: 540px;
	border-radius: 10px;
	object-fit: contain;
	background: var(--MI_THEME-panelHighlight);
}

.sensitiveTag {
	position: absolute;
	top: 8px;
	left: 8px;
	padding: 2px 8px;
	background: rgba(0, 0, 0, 0.6);
	color: #fff;
	font-size: 0.75em;
	font-weight: 700;
	border-radius: 6px;
}

.video, .audio {
	display: block;
	max-width: 100%;
	max-height: 540px;
	border-radius: 10px;
	background: #000;
}

.audio {
	max-height: 56px;
	background: var(--MI_THEME-panel);
}

.fileCard {
	display: inline-flex;
	align-items: center;
	gap: 10px;
	padding: 10px 14px;
	border-radius: 10px;
	background: var(--MI_THEME-panel);
	border: solid 1px var(--MI_THEME-divider);
	color: var(--MI_THEME-fg);
	text-decoration: none;
	max-width: 100%;
	min-width: 220px;
	transition: background 0.12s;

	&:hover {
		background: var(--MI_THEME-panelHighlight);
	}
}

.fileIcon {
	font-size: 1.4em;
	flex-shrink: 0;
	color: var(--MI_THEME-fgTransparentWeak);
}

.fileMeta {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.fileName {
	font-size: 0.92em;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.fileSize {
	font-size: 0.78em;
	color: var(--MI_THEME-fgTransparentWeak);
}

.fileDownload {
	color: var(--MI_THEME-fgTransparentWeak);
	flex-shrink: 0;
}

@media (max-width: 700px) {
	.image, .video {
		max-height: 360px;
	}
	.fileCard {
		min-width: 0;
		width: 100%;
	}
}
</style>
