<!--
SPDX-FileCopyrightText: Universe Federation contributors
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader :actions="headerActions" :tabs="headerTabs">
	<div class="_spacer" style="--MI_SPACER-w: 900px; --MI_SPACER-min: 16px; --MI_SPACER-max: 32px;">
		<div class="_gaps_m">
			<MkInfo>{{ i18n.ts._recommendationAdmin.about }}</MkInfo>

			<MkSwitch v-model="enabled">
				<template #label>{{ i18n.ts._recommendationAdmin.enabled }}</template>
				<template #caption>{{ i18n.ts._recommendationAdmin.enabledCaption }}</template>
			</MkSwitch>

			<MkFolder :defaultOpen="true">
				<template #icon><i class="ti ti-arrow-down"></i></template>
				<template #label>{{ i18n.ts._recommendationAdmin.demote }}</template>

				<div class="_gaps_m">
					<MkTextarea v-model="lowValueTags">
						<template #label>{{ i18n.ts._recommendationAdmin.lowValueTags }}</template>
						<template #caption>{{ i18n.ts._recommendationAdmin.tagsCaption }} / {{ i18n.ts._recommendationAdmin.listCaption }}</template>
					</MkTextarea>
					<MkInput v-model="weights.lowValueTagPenalty" type="number" :min="0" :max="300">
						<template #label>{{ i18n.ts._recommendationAdmin.lowValueTagPenalty }}</template>
					</MkInput>

					<MkTextarea v-model="promoKeywords">
						<template #label>{{ i18n.ts._recommendationAdmin.promoKeywords }}</template>
						<template #caption>{{ i18n.ts._recommendationAdmin.promoCaption }} / {{ i18n.ts._recommendationAdmin.listCaption }}</template>
					</MkTextarea>
					<MkInput v-model="weights.promoPenalty" type="number" :min="0" :max="300">
						<template #label>{{ i18n.ts._recommendationAdmin.promoPenalty }}</template>
					</MkInput>

					<MkTextarea v-model="bugKeywords">
						<template #label>{{ i18n.ts._recommendationAdmin.bugKeywords }}</template>
						<template #caption>{{ i18n.ts._recommendationAdmin.bugCaption }} / {{ i18n.ts._recommendationAdmin.listCaption }}</template>
					</MkTextarea>
					<MkInput v-model="weights.bugPenalty" type="number" :min="0" :max="300">
						<template #label>{{ i18n.ts._recommendationAdmin.bugPenalty }}</template>
					</MkInput>

					<MkInput v-model="weights.affLinkPenalty" type="number" :min="0" :max="300">
						<template #label>{{ i18n.ts._recommendationAdmin.affLinkPenalty }}</template>
						<template #caption>{{ i18n.ts._recommendationAdmin.affLinkCaption }}</template>
					</MkInput>
				</div>
			</MkFolder>

			<MkFolder :defaultOpen="true">
				<template #icon><i class="ti ti-arrow-up"></i></template>
				<template #label>{{ i18n.ts._recommendationAdmin.promote }}</template>

				<div class="_gaps_m">
					<MkTextarea v-model="qualityTags">
						<template #label>{{ i18n.ts._recommendationAdmin.qualityTags }}</template>
						<template #caption>{{ i18n.ts._recommendationAdmin.tagsCaption }} / {{ i18n.ts._recommendationAdmin.listCaption }}</template>
					</MkTextarea>
					<MkTextarea v-model="qualityKeywords">
						<template #label>{{ i18n.ts._recommendationAdmin.qualityKeywords }}</template>
						<template #caption>{{ i18n.ts._recommendationAdmin.qualityCaption }} / {{ i18n.ts._recommendationAdmin.listCaption }}</template>
					</MkTextarea>
					<MkInput v-model="weights.qualityBoost" type="number" :min="0" :max="300">
						<template #label>{{ i18n.ts._recommendationAdmin.qualityBoost }}</template>
					</MkInput>
				</div>
			</MkFolder>

			<MkFolder :defaultOpen="true">
				<template #icon><i class="ti ti-adjustments"></i></template>
				<template #label>{{ i18n.ts._recommendationAdmin.threshold }}</template>

				<div class="_gaps_m">
					<MkInput v-model="excludeThreshold" type="number" :min="10" :max="300">
						<template #label>{{ i18n.ts._recommendationAdmin.excludeThreshold }}</template>
						<template #caption>{{ i18n.ts._recommendationAdmin.excludeThresholdCaption }}</template>
					</MkInput>
				</div>
			</MkFolder>

			<div class="_buttons">
				<MkButton primary rounded :wait="saving" @click="save"><i class="ti ti-check"></i> {{ i18n.ts.save }}</MkButton>
				<MkButton rounded @click="resetToDefault"><i class="ti ti-refresh"></i> {{ i18n.ts._recommendationAdmin.restoreDefaults }}</MkButton>
			</div>
		</div>
	</div>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { computed, reactive, ref } from 'vue';
import type * as Misskey from 'misskey-js';
import MkButton from '@/components/MkButton.vue';
import MkFolder from '@/components/MkFolder.vue';
import MkInfo from '@/components/MkInfo.vue';
import MkInput from '@/components/MkInput.vue';
import MkSwitch from '@/components/MkSwitch.vue';
import MkTextarea from '@/components/MkTextarea.vue';
import { i18n } from '@/i18n.js';
import { definePage } from '@/page.js';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';

type Config = Misskey.entities.AdminRecommendationGetConfigResponse['current'];

function toList(text: string): string[] {
	return Array.from(new Set(text.split(/[\n,，、]/).map(s => s.trim()).filter(s => s.length > 0)));
}

function toText(list: string[]): string {
	return list.join('\n');
}

const enabled = ref(true);
const lowValueTags = ref('');
const promoKeywords = ref('');
const bugKeywords = ref('');
const qualityKeywords = ref('');
const qualityTags = ref('');
const weights = reactive({
	lowValueTagPenalty: 18,
	promoPenalty: 42,
	bugPenalty: 30,
	affLinkPenalty: 70,
	qualityBoost: 18,
});
const excludeThreshold = ref<number>(60);
const saving = ref(false);

function apply(cfg: Config) {
	enabled.value = cfg.enabled;
	lowValueTags.value = toText(cfg.lowValueTags);
	promoKeywords.value = toText(cfg.promoKeywords);
	bugKeywords.value = toText(cfg.bugKeywords);
	qualityKeywords.value = toText(cfg.qualityKeywords);
	qualityTags.value = toText(cfg.qualityTags);
	weights.lowValueTagPenalty = cfg.weights.lowValueTagPenalty;
	weights.promoPenalty = cfg.weights.promoPenalty;
	weights.bugPenalty = cfg.weights.bugPenalty;
	weights.affLinkPenalty = cfg.weights.affLinkPenalty;
	weights.qualityBoost = cfg.weights.qualityBoost;
	excludeThreshold.value = cfg.excludeThreshold;
}

const loaded = await misskeyApi('admin/recommendation/get-config');
const defaultConfig = loaded.default;
apply(loaded.current);

async function save() {
	saving.value = true;
	try {
		const updated = await os.apiWithDialog('admin/recommendation/update-config', {
			enabled: enabled.value,
			lowValueTags: toList(lowValueTags.value),
			promoKeywords: toList(promoKeywords.value),
			bugKeywords: toList(bugKeywords.value),
			qualityKeywords: toList(qualityKeywords.value),
			qualityTags: toList(qualityTags.value),
			weights: {
				lowValueTagPenalty: Math.round(Number(weights.lowValueTagPenalty)),
				promoPenalty: Math.round(Number(weights.promoPenalty)),
				bugPenalty: Math.round(Number(weights.bugPenalty)),
				affLinkPenalty: Math.round(Number(weights.affLinkPenalty)),
				qualityBoost: Math.round(Number(weights.qualityBoost)),
			},
			excludeThreshold: Math.round(Number(excludeThreshold.value)),
		});
		apply(updated);
	} finally {
		saving.value = false;
	}
}

function resetToDefault() {
	apply(defaultConfig);
}

const headerActions = computed(() => []);
const headerTabs = computed(() => []);

definePage({
	title: i18n.ts._recommendationAdmin.title,
	icon: 'ti ti-sparkles',
});
</script>
