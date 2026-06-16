<!--
SPDX-FileCopyrightText: Universe Federation contributors
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div class="_gaps_s">
	<div :class="$style.toolbar">
		<div :class="$style.legend">
			<template v-if="showApprovalFlags">
				<span :class="[$style.flag, $style.flagFree]">免申请</span> 无需审核 ·
				<span :class="[$style.flag, $style.flagReview]">需审核</span> 需管理员批准
			</template>
			<span :class="$style.count">已选 {{ modelValue.length }} / {{ availableScopes.length }}</span>
		</div>
		<div :class="$style.toolbarButtons">
			<button class="_button" :class="$style.toolBtn" @click="selectAll"><i class="ti ti-checks"></i> 全选</button>
			<button class="_button" :class="$style.toolBtn" @click="clearAll"><i class="ti ti-eraser"></i> 清空</button>
		</div>
	</div>

	<div v-for="group in groups" :key="group.key" :class="$style.group">
		<button class="_button" :class="$style.groupHeader" @click="onGroupHeaderClick(group)">
			<i v-if="collapsible" class="ti ti-chevron-down" :class="[$style.chev, { [$style.chevOpen]: isOpen(group) }]"></i>
			<i :class="group.icon"></i>
			<span :class="$style.groupTitle">{{ group.title }}</span>
			<span v-if="selectedInGroup(group) > 0" :class="$style.groupSelected">{{ selectedInGroup(group) }}</span>
			<span :class="$style.groupCount">{{ selectedInGroup(group) }} / {{ group.scopes.length }}</span>
		</button>
		<div v-show="!collapsible || isOpen(group)" :class="$style.chips">
			<button
				v-for="scope in group.scopes"
				:key="scope"
				class="_button"
				:title="scope"
				:class="[$style.chip, { [$style.chipActive]: modelValue.includes(scope) }]"
				@click="toggle(scope)"
			>
				<i :class="modelValue.includes(scope) ? 'ti ti-check' : 'ti ti-plus'"></i>
				<span :class="$style.chipName">{{ scopeLabel(scope) }}</span>
				<code :class="$style.chipScope">{{ scope }}</code>
				<span v-if="showApprovalFlags" :class="[$style.flag, needsApproval(scope) ? $style.flagReview : $style.flagFree]">{{ needsApproval(scope) ? '需审核' : '免申请' }}</span>
			</button>
		</div>
	</div>
</div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue';
import { buildScopeGroups, scopeLabel, type ApiScopeGroup } from '@/utility/api-permissions.js';

const props = withDefaults(defineProps<{
	modelValue: string[];
	availableScopes: string[];
	noApprovalScopes?: string[];
	mode?: 'approval' | 'open' | 'closed' | string;
	// 折叠模式：分组默认收起(只显示标题+已选数)，点击展开；用于配置面板等空间有限处。
	collapsible?: boolean;
}>(), {
	noApprovalScopes: () => [],
	mode: 'open',
	collapsible: false,
});

const openGroups = ref<Set<string>>(new Set());

function isOpen(group: ApiScopeGroup): boolean {
	return openGroups.value.has(group.key);
}

function toggleOpen(group: ApiScopeGroup) {
	const next = new Set(openGroups.value);
	if (next.has(group.key)) next.delete(group.key);
	else next.add(group.key);
	openGroups.value = next;
}

function onGroupHeaderClick(group: ApiScopeGroup) {
	if (props.collapsible) toggleOpen(group);
	else toggleGroup(group);
}

const emit = defineEmits<{
	(ev: 'update:modelValue', value: string[]): void;
}>();

const groups = computed(() => buildScopeGroups(props.availableScopes));

// open 模式全部免审；approval 模式下不在免申请白名单的需审核。仅 approval 模式才显示标记。
const showApprovalFlags = computed(() => props.mode === 'approval');

function needsApproval(scope: string): boolean {
	if (props.mode !== 'approval') return false;
	return !props.noApprovalScopes.includes(scope);
}

function selectedInGroup(group: ApiScopeGroup): number {
	return group.scopes.filter(s => props.modelValue.includes(s)).length;
}

function toggle(scope: string) {
	emit('update:modelValue', props.modelValue.includes(scope)
		? props.modelValue.filter(s => s !== scope)
		: [...props.modelValue, scope]);
}

function toggleGroup(group: ApiScopeGroup) {
	const allSelected = group.scopes.every(s => props.modelValue.includes(s));
	if (allSelected) {
		const remove = new Set(group.scopes);
		emit('update:modelValue', props.modelValue.filter(s => !remove.has(s)));
	} else {
		const next = new Set(props.modelValue);
		for (const s of group.scopes) next.add(s);
		emit('update:modelValue', props.availableScopes.filter(s => next.has(s)));
	}
}

function selectAll() {
	emit('update:modelValue', [...props.availableScopes]);
}

function clearAll() {
	emit('update:modelValue', []);
}
</script>

<style lang="scss" module>
.toolbar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px 12px;
	flex-wrap: wrap;
}

.legend {
	font-size: 0.82em;
	color: var(--MI_THEME-fgTransparentWeak);
}

.count {
	margin-left: 8px;
	font-weight: 700;
	color: var(--MI_THEME-fg);
}

.toolbarButtons {
	display: flex;
	gap: 6px;
}

.toolBtn {
	padding: 3px 12px;
	border-radius: 999px;
	font-size: 0.82em;
	border: solid 1px var(--MI_THEME-divider);

	&:hover {
		background: var(--MI_THEME-buttonHoverBg);
	}
}

.group {
	margin-top: 4px;
}

.groupHeader {
	display: flex;
	align-items: center;
	gap: 6px;
	width: 100%;
	padding: 4px 6px;
	border-radius: 8px;
	font-size: 0.85em;
	font-weight: 700;
	color: var(--MI_THEME-fgTransparentWeak);

	&:hover {
		background: color(from var(--MI_THEME-fg) srgb r g b / 0.05);
		color: var(--MI_THEME-fg);
	}
}

.groupTitle {
	flex: 1;
	text-align: left;
}

.chev {
	transition: transform 0.18s ease;
	transform: rotate(-90deg);
	opacity: 0.7;
}

.chevOpen {
	transform: rotate(0deg);
}

.groupSelected {
	padding: 0 7px;
	border-radius: 999px;
	font-size: 0.85em;
	background: var(--MI_THEME-accentedBg);
	color: var(--MI_THEME-accent);
}

.groupCount {
	font-size: 0.92em;
	opacity: 0.8;
}

.chips {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
	padding: 4px 0 8px;
}

.chip {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 5px 11px;
	border-radius: 999px;
	font-size: 0.82em;
	border: solid 1px var(--MI_THEME-divider);
	color: var(--MI_THEME-fg);

	&:hover {
		background: var(--MI_THEME-buttonHoverBg);
	}

	&.chipActive {
		background: var(--MI_THEME-accentedBg);
		border-color: transparent;
		font-weight: 700;
	}
}

.chipName {
	max-width: 11em;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.chipScope {
	font-size: 0.86em;
	opacity: 0.7;
}

.flag {
	flex-shrink: 0;
	padding: 0 6px;
	border-radius: 999px;
	font-size: 0.82em;
	font-weight: 700;
	line-height: 1.6;
}

.flagFree {
	background: color(from var(--MI_THEME-success) srgb r g b / 0.18);
	color: var(--MI_THEME-success);
}

.flagReview {
	background: color(from var(--MI_THEME-warn) srgb r g b / 0.18);
	color: var(--MI_THEME-warn);
}
</style>
