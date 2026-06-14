<!--
SPDX-FileCopyrightText: Universe Federation contributors
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader :actions="headerActions" :tabs="headerTabs">
	<div class="_spacer" style="--MI_SPACER-w: 900px; --MI_SPACER-min: 16px; --MI_SPACER-max: 32px;">
		<div class="_gaps_m">
			<MkInfo>{{ i18n.ts._recommendationAdmin.about }}</MkInfo>

			<!-- 全局 -->
			<MkFolder :defaultOpen="true">
				<template #icon><i class="ti ti-adjustments"></i></template>
				<template #label>{{ i18n.ts._recommendationAdmin.globalSection }}</template>
				<div class="_gaps_m">
					<MkSwitch v-model="form.enabled">
						<template #label>{{ i18n.ts._recommendationAdmin.enabled }}</template>
						<template #caption>{{ i18n.ts._recommendationAdmin.enabledCaption }}</template>
					</MkSwitch>
					<MkInput v-model="form.excludeThreshold" type="number" :min="10" :max="300">
						<template #label>{{ i18n.ts._recommendationAdmin.excludeThreshold }}</template>
						<template #caption>{{ i18n.ts._recommendationAdmin.excludeThresholdCaption }}</template>
					</MkInput>
					<MkInput v-model="form.channelBoost" type="number" :min="0" :max="300">
						<template #label>{{ i18n.ts._recommendationAdmin.channelBoost }}</template>
						<template #caption>{{ i18n.ts._recommendationAdmin.channelBoostCaption }}</template>
					</MkInput>
				</div>
			</MkFolder>

			<!-- 规则集 -->
			<MkFolder :defaultOpen="true">
				<template #icon><i class="ti ti-list-check"></i></template>
				<template #label>{{ i18n.ts._recommendationAdmin.rulesSection }}</template>
				<template #suffix>{{ form.rules.length }}</template>
				<div class="_gaps_m">
					<MkInfo>{{ i18n.ts._recommendationAdmin.rulesCaption }}</MkInfo>

					<div v-for="(rule, idx) in form.rules" :key="rule.key" :class="$style.rule">
						<div :class="$style.ruleHead">
							<MkInput v-model="rule.name" :class="$style.ruleName" :placeholder="i18n.ts._recommendationAdmin.ruleName">
								<template #label>{{ i18n.ts._recommendationAdmin.ruleName }}</template>
							</MkInput>
							<MkButton danger rounded :class="$style.ruleDel" @click="removeRule(idx)"><i class="ti ti-trash"></i></MkButton>
						</div>
						<div :class="$style.ruleGrid">
							<MkSelect v-model="rule.kind">
								<template #label>{{ i18n.ts._recommendationAdmin.ruleKind }}</template>
								<option value="demote">{{ i18n.ts._recommendationAdmin.kindDemote }}</option>
								<option value="boost">{{ i18n.ts._recommendationAdmin.kindBoost }}</option>
							</MkSelect>
							<MkSelect v-model="rule.match">
								<template #label>{{ i18n.ts._recommendationAdmin.ruleMatch }}</template>
								<option value="keyword">{{ i18n.ts._recommendationAdmin.matchKeyword }}</option>
								<option value="tag">{{ i18n.ts._recommendationAdmin.matchTag }}</option>
							</MkSelect>
							<MkInput v-model="rule.weight" type="number" :min="0" :max="300">
								<template #label>{{ rule.kind === 'boost' ? i18n.ts._recommendationAdmin.weightBoost : i18n.ts._recommendationAdmin.weightDemote }}</template>
							</MkInput>
						</div>
						<MkTextarea v-model="rule.termsText">
							<template #label>{{ rule.match === 'tag' ? i18n.ts._recommendationAdmin.ruleTermsTag : i18n.ts._recommendationAdmin.ruleTermsKeyword }}</template>
							<template #caption>{{ i18n.ts._recommendationAdmin.listCaption }}</template>
						</MkTextarea>
						<div :class="$style.ruleFoot">
							<MkSwitch v-model="rule.enabled">{{ i18n.ts._recommendationAdmin.ruleEnabled }}</MkSwitch>
							<MkSwitch v-if="rule.kind === 'demote'" v-model="rule.exemptWithQuality">{{ i18n.ts._recommendationAdmin.ruleExempt }}</MkSwitch>
						</div>
					</div>

					<MkButton rounded @click="addRule"><i class="ti ti-plus"></i> {{ i18n.ts._recommendationAdmin.addRule }}</MkButton>
				</div>
			</MkFolder>

			<!-- 情感分析(Phase 3 启用打分,这里可先配置) -->
			<MkFolder :defaultOpen="false">
				<template #icon><i class="ti ti-mood-smile"></i></template>
				<template #label>{{ i18n.ts._recommendationAdmin.sentimentSection }}</template>
				<div class="_gaps_m">
					<MkInfo warn>{{ i18n.ts._recommendationAdmin.sentimentAbout }}</MkInfo>
					<MkSwitch v-model="form.sentiment.enabled">
						<template #label>{{ i18n.ts._recommendationAdmin.sentimentEnabled }}</template>
					</MkSwitch>
					<MkInput v-model="form.sentiment.modelId">
						<template #label>{{ i18n.ts._recommendationAdmin.sentimentModel }}</template>
						<template #caption>{{ i18n.ts._recommendationAdmin.sentimentModelCaption }}</template>
					</MkInput>
					<MkInput v-model="form.sentiment.negativePenalty" type="number" :min="-300" :max="0">
						<template #label>{{ i18n.ts._recommendationAdmin.sentimentNegative }}</template>
						<template #caption>{{ i18n.ts._recommendationAdmin.sentimentNegativeCaption }}</template>
					</MkInput>
					<MkInput v-model="form.sentiment.positiveBoost" type="number" :min="0" :max="300">
						<template #label>{{ i18n.ts._recommendationAdmin.sentimentPositive }}</template>
					</MkInput>
					<MkInput v-model="form.sentiment.neutralBand" type="number" :step="0.05" :min="0" :max="0.9">
						<template #label>{{ i18n.ts._recommendationAdmin.sentimentNeutral }}</template>
						<template #caption>{{ i18n.ts._recommendationAdmin.sentimentNeutralCaption }}</template>
					</MkInput>
					<MkButton rounded :wait="backfilling" @click="backfillSentiment"><i class="ti ti-history"></i> {{ i18n.ts._recommendationAdmin.backfill }}</MkButton>
					<MkInfo>{{ i18n.ts._recommendationAdmin.backfillCaption }}</MkInfo>
				</div>
			</MkFolder>

			<!-- 导入导出 + 保存 -->
			<div class="_buttons">
				<MkButton primary rounded :wait="saving" @click="save"><i class="ti ti-check"></i> {{ i18n.ts.save }}</MkButton>
				<MkButton rounded @click="resetToDefault"><i class="ti ti-refresh"></i> {{ i18n.ts._recommendationAdmin.restoreDefaults }}</MkButton>
				<MkButton rounded @click="exportConfig"><i class="ti ti-download"></i> {{ i18n.ts._recommendationAdmin.export }}</MkButton>
				<MkButton rounded @click="triggerImport"><i class="ti ti-upload"></i> {{ i18n.ts._recommendationAdmin.import }}</MkButton>
				<input ref="importInputEl" type="file" accept="application/json,.json" style="display: none;" @change="onImportFile"/>
			</div>
		</div>
	</div>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { computed, reactive, ref, useTemplateRef } from 'vue';
import type * as Misskey from 'misskey-js';
import MkButton from '@/components/MkButton.vue';
import MkFolder from '@/components/MkFolder.vue';
import MkInfo from '@/components/MkInfo.vue';
import MkInput from '@/components/MkInput.vue';
import MkSelect from '@/components/MkSelect.vue';
import MkSwitch from '@/components/MkSwitch.vue';
import MkTextarea from '@/components/MkTextarea.vue';
import { i18n } from '@/i18n.js';
import { definePage } from '@/page.js';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';

type Config = Misskey.entities.AdminRecommendationGetConfigResponse['current'];
type ConfigRule = Config['rules'][number];

type EditRule = {
	key: string; // Vue :key 用の安定キー
	id: string;
	name: string;
	enabled: boolean;
	kind: 'demote' | 'boost';
	match: 'keyword' | 'tag';
	termsText: string;
	weight: number;
	exemptWithQuality: boolean;
};

function toList(text: string): string[] {
	return Array.from(new Set(text.split(/[\n,，、]/).map(s => s.trim()).filter(s => s.length > 0)));
}

let keySeq = 0;

function ruleToEdit(r: ConfigRule): EditRule {
	return {
		key: `k${keySeq++}`,
		id: r.id,
		name: r.name,
		enabled: r.enabled,
		kind: r.kind as 'demote' | 'boost',
		match: r.match as 'keyword' | 'tag',
		termsText: r.terms.join('\n'),
		weight: r.weight,
		exemptWithQuality: r.exemptWithQuality,
	};
}

const form = reactive({
	enabled: true,
	excludeThreshold: 60,
	channelBoost: 8,
	rules: [] as EditRule[],
	sentiment: {
		enabled: false,
		modelId: '',
		negativePenalty: -40,
		positiveBoost: 10,
		neutralBand: 0.15,
	},
});
const saving = ref(false);
const backfilling = ref(false);
const importInputEl = useTemplateRef<HTMLInputElement>('importInputEl');

function applyConfig(cfg: Config) {
	form.enabled = cfg.enabled;
	form.excludeThreshold = cfg.excludeThreshold;
	form.channelBoost = cfg.channelBoost;
	form.rules = cfg.rules.map(ruleToEdit);
	form.sentiment.enabled = cfg.sentiment.enabled;
	form.sentiment.modelId = cfg.sentiment.modelId;
	form.sentiment.negativePenalty = cfg.sentiment.negativePenalty;
	form.sentiment.positiveBoost = cfg.sentiment.positiveBoost;
	form.sentiment.neutralBand = cfg.sentiment.neutralBand;
}

function buildPayload() {
	return {
		enabled: form.enabled,
		excludeThreshold: Math.round(Number(form.excludeThreshold)),
		channelBoost: Math.round(Number(form.channelBoost)),
		rules: form.rules
			.map(r => ({
				id: r.id,
				name: r.name.trim() || r.id,
				enabled: r.enabled,
				kind: r.kind,
				match: r.match,
				terms: toList(r.termsText),
				weight: Math.round(Number(r.weight)),
				exemptWithQuality: r.kind === 'demote' ? r.exemptWithQuality : false,
			}))
			.filter(r => r.terms.length > 0),
		sentiment: {
			enabled: form.sentiment.enabled,
			modelId: form.sentiment.modelId.trim(),
			negativePenalty: Math.round(Number(form.sentiment.negativePenalty)),
			positiveBoost: Math.round(Number(form.sentiment.positiveBoost)),
			neutralBand: Number(form.sentiment.neutralBand),
		},
	};
}

const loaded = await misskeyApi('admin/recommendation/get-config');
const defaultConfig = loaded.default;
applyConfig(loaded.current);

function addRule() {
	form.rules.push({
		key: `k${keySeq++}`,
		id: `new-${keySeq}`,
		name: '',
		enabled: true,
		kind: 'demote',
		match: 'keyword',
		termsText: '',
		weight: 30,
		exemptWithQuality: false,
	});
}

function removeRule(idx: number) {
	form.rules.splice(idx, 1);
}

async function save() {
	saving.value = true;
	try {
		const updated = await os.apiWithDialog('admin/recommendation/update-config', buildPayload());
		applyConfig(updated);
	} finally {
		saving.value = false;
	}
}

function resetToDefault() {
	applyConfig(defaultConfig);
}

async function backfillSentiment() {
	backfilling.value = true;
	try {
		await os.apiWithDialog('admin/recommendation/backfill-sentiment', { days: 3, limit: 1000 });
	} finally {
		backfilling.value = false;
	}
}

function exportConfig() {
	const blob = new Blob([JSON.stringify(buildPayload(), null, 2)], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const a = window.document.createElement('a');
	a.href = url;
	a.download = 'recommendation-config.json';
	a.click();
	URL.revokeObjectURL(url);
}

function triggerImport() {
	importInputEl.value?.click();
}

async function onImportFile(ev: Event) {
	const input = ev.target as HTMLInputElement;
	const file = input.files?.[0];
	input.value = '';
	if (!file) return;
	let parsed: unknown;
	try {
		parsed = JSON.parse(await file.text());
	} catch {
		os.alert({ type: 'error', text: i18n.ts._recommendationAdmin.importInvalid });
		return;
	}
	if (parsed == null || typeof parsed !== 'object') {
		os.alert({ type: 'error', text: i18n.ts._recommendationAdmin.importInvalid });
		return;
	}
	const { canceled } = await os.confirm({ type: 'warning', text: i18n.ts._recommendationAdmin.importConfirm });
	if (canceled) return;
	// バックエンドが検証・補完するので、そのまま送って結果をフォームへ反映(=インポート即適用)
	const updated = await os.apiWithDialog('admin/recommendation/update-config', parsed as Record<string, unknown>);
	applyConfig(updated);
}

const headerActions = computed(() => []);
const headerTabs = computed(() => []);

definePage({
	title: i18n.ts._recommendationAdmin.title,
	icon: 'ti ti-sparkles',
});
</script>

<style lang="scss" module>
.rule {
	display: flex;
	flex-direction: column;
	gap: 12px;
	padding: 14px;
	border: 1px solid var(--MI_THEME-divider);
	border-radius: var(--MI-radius);
	background: var(--MI_THEME-panel);
}

.ruleHead {
	display: flex;
	align-items: flex-end;
	gap: 10px;
}

.ruleName {
	flex: 1 1 auto;
}

.ruleDel {
	flex: 0 0 auto;
}

.ruleGrid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
	gap: 10px;
}

.ruleFoot {
	display: flex;
	flex-wrap: wrap;
	gap: 18px;
}
</style>
