<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader :actions="[]" :tabs="[]" :swipable="false" :hideTitle="true">
	<div :class="$style.exploreShell">
		<main :class="$style.exploreMain">
			<header :class="$style.exploreHeader">
				<form :class="$style.searchRow" @submit.prevent="submitSearch">
					<MkInput ref="searchInputEl" v-model="searchQuery" :class="$style.searchInput" type="search" :placeholder="i18n.ts.search">
						<template #prefix><i class="ti ti-search"></i></template>
					</MkInput>
					<button class="_button" :class="$style.settingsButton" type="button" :aria-label="i18n.ts.settings">
						<i class="ti ti-settings"></i>
					</button>
				</form>
				<nav :class="$style.exploreTabs" role="tablist" :aria-label="i18n.ts.explore">
					<button
						v-for="item in exploreTabs"
						:key="item.key"
						class="_button"
						:class="[$style.exploreTab, { [$style.exploreTabActive]: tab === item.key }]"
						role="tab"
						:aria-selected="tab === item.key"
						@click="selectTab(item.key)"
					>
						{{ item.title }}
					</button>
				</nav>
			</header>

			<section v-if="submittedQuery" :class="$style.searchPanel">
				<div :class="$style.searchPanelHeader">
					<div>
						<div :class="$style.searchPanelTitle">{{ i18n.ts.searchResult }}</div>
						<div :class="$style.searchPanelCaption">{{ submittedQuery }}</div>
					</div>
					<div :class="$style.searchPanelActions">
						<button class="_button" :class="$style.panelAction" @click="runSearch(submittedQuery)">
							<i class="ti ti-refresh"></i>
							<span>{{ i18n.ts.retry }}</span>
						</button>
						<button class="_button" :class="$style.panelAction" @click="clearSearch">
							<i class="ti ti-x"></i>
							<span>{{ i18n.ts.clear }}</span>
						</button>
					</div>
				</div>
				<MkLoading v-if="searchLoading"/>
				<div v-else-if="searchEmpty" :class="$style.searchEmpty">
					<i class="ti ti-search-off"></i>
					<div :class="$style.searchEmptyTitle">{{ i18n.tsx.noSearchResultsFor({ query: submittedQuery }) }}</div>
					<div :class="$style.searchEmptyText">{{ i18n.ts.searchEmptySuggestion }}</div>
					<div :class="$style.searchEmptyActions">
						<button class="_buttonPrimary" :class="$style.searchEmptyButton" @click="focusSearchInput">{{ i18n.ts.changeSearchQuery }}</button>
						<button class="_button" :class="$style.searchEmptyButton" @click="clearSearch">{{ i18n.ts.returnToRecommended }}</button>
					</div>
				</div>
				<div v-else :class="$style.searchResults">
					<section v-if="userResults.length > 0" :class="$style.resultSection">
						<div :class="$style.resultSectionTitle">{{ i18n.ts.users }}</div>
						<div v-for="user in userResults" :key="user.id" :class="$style.searchUser">
							<MkAvatar :user="user" :class="$style.searchUserAvatar"/>
							<MkA :to="userPage(user)" :class="$style.searchUserBody">
								<MkUserName :user="user" :nowrap="true"/>
								<MkAcct :user="user"/>
							</MkA>
							<MkFollowButton :user="user" :class="$style.followButton" mini/>
						</div>
					</section>
					<section v-if="tagResults.length > 0" :class="$style.resultSection">
						<div :class="$style.resultSectionTitle">{{ i18n.ts.popularTags }}</div>
						<div :class="$style.tags">
							<button v-for="tag in tagResults" :key="tag" class="_button" :class="$style.tagChip" @click="openTrend('tag', tag)">#{{ tag }}</button>
						</div>
					</section>
					<section v-if="noteResults.length > 0" :class="$style.resultSection">
						<div :class="$style.resultSectionTitle">{{ i18n.ts.notes }}</div>
						<div class="_gaps">
							<DynamicNote v-for="note in noteResults" :key="note.id" :note="note" :withHardMute="true"/>
						</div>
					</section>
				</div>
			</section>

			<template v-else>
				<section :class="$style.hero" :style="{ backgroundImage: `url(${heroImageUrl})` }">
					<div :class="$style.heroShade"></div>
					<button class="_button" :class="$style.heroMenu"><i class="ti ti-dots"></i></button>
					<div :class="$style.heroContent">
						<div :class="$style.heroLabel">{{ i18n.ts.whatsHappeningNow }}</div>
						<div :class="$style.heroTitle">{{ heroTitle }}</div>
						<div :class="$style.heroMeta">{{ heroMeta }}</div>
					</div>
				</section>

				<section v-if="trendRows.length > 0" :class="$style.newsList">
					<h2>{{ activeSectionTitle }}</h2>
					<button
						v-for="trend in trendRows"
						:key="`${trend.type}:${trend.term}`"
						class="_button"
						:class="$style.newsRow"
						@click="openTrend(trend.type, trend.term)"
					>
						<span :class="$style.newsTitle">{{ trend.type === 'tag' ? `#${trend.term}` : trend.term }}</span>
						<span :class="$style.newsMeta">{{ trend.label }}</span>
					</button>
				</section>

				<section v-if="categoryEmpty" :class="$style.categoryEmpty">
					<i class="ti ti-compass-off"></i>
					<div :class="$style.categoryEmptyTitle">{{ i18n.tsx.exploreCategoryEmpty({ category: activeSectionTitle }) }}</div>
					<div :class="$style.categoryEmptyText">{{ i18n.ts.exploreCategoryEmptyDescription }}</div>
					<div :class="$style.categoryEmptyActions">
						<button class="_buttonPrimary" :class="$style.categoryEmptyButton" @click="selectTab('forYou')">{{ i18n.ts.returnToRecommended }}</button>
						<button class="_button" :class="$style.categoryEmptyButton" @click="focusSearchInput">{{ i18n.ts.changeSearchQuery }}</button>
					</div>
				</section>

				<section v-if="activeNotes.length > 0" :class="$style.discoverySection">
					<h2>{{ i18n.ts.hotDiscussions }}</h2>
					<div class="_gaps">
						<DynamicNote v-for="note in activeNotes" :key="note.id" :note="note" :withHardMute="true"/>
					</div>
				</section>

				<section v-if="discoverySections.channels.length > 0" :class="$style.discoverySection">
					<h2>{{ i18n.ts.recommendedChannels }}</h2>
					<div :class="$style.channelGrid">
						<MkA v-for="channel in discoverySections.channels" :key="channel.id" :to="`/channels/${channel.id}`" :class="$style.channelCard">
							<span :class="$style.channelBanner" :style="{ background: channel.color }">
								<i class="ti ti-device-tv"></i>
							</span>
							<span :class="$style.channelName">{{ channel.name }}</span>
							<span :class="$style.channelMeta">{{ i18n.tsx.channelStats({ notes: channel.notesCount, users: channel.usersCount }) }}</span>
						</MkA>
					</div>
				</section>
			</template>
		</main>

		<aside :class="$style.rightRail">
			<section v-if="trendRows.length > 0" :class="$style.sideCard">
				<div :class="$style.sideCardTitle">{{ i18n.ts.whatsHappeningNow }}</div>
				<button
					v-for="trend in trendRows.slice(0, 5)"
					:key="`side:${trend.type}:${trend.term}`"
					class="_button"
					:class="$style.trendRow"
					@click="openTrend(trend.type, trend.term)"
				>
					<span :class="$style.trendTitle">{{ trend.type === 'tag' ? `#${trend.term}` : trend.term }}</span>
					<span :class="$style.trendMeta">{{ trend.label }}</span>
				</button>
			</section>

			<section v-if="discoverySections.channels.length > 0" :class="$style.sideCard">
				<div :class="$style.sideCardTitle">{{ i18n.ts.recommendedChannels }}</div>
				<MkA v-for="channel in discoverySections.channels.slice(0, 3)" :key="channel.id" :to="`/channels/${channel.id}`" :class="$style.sideChannel">
					<span :class="$style.sideChannelIcon" :style="{ background: channel.color }"><i class="ti ti-device-tv"></i></span>
					<span :class="$style.sideChannelBody">
						<span :class="$style.sideChannelName">{{ channel.name }}</span>
						<span :class="$style.sideChannelMeta">{{ i18n.tsx.channelStats({ notes: channel.notesCount, users: channel.usersCount }) }}</span>
					</span>
				</MkA>
			</section>

			<section v-if="recommendedUsers.length > 0" :class="$style.sideCard">
				<div :class="$style.sideCardTitle">{{ i18n.ts.whoToFollow }}</div>
				<div v-for="user in recommendedUsers" :key="user.id" :class="$style.userRow">
					<MkAvatar :user="user" :class="$style.userAvatar"/>
					<MkA :to="userPage(user)" :class="$style.userBody">
						<MkUserName :user="user" :nowrap="true"/>
						<MkAcct :user="user"/>
					</MkA>
					<MkFollowButton :user="user" :class="$style.followButton" mini/>
				</div>
			</section>
		</aside>
	</div>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { computed, onMounted, provide, ref, shallowRef, useTemplateRef, watch } from 'vue';
import type * as Misskey from 'misskey-js';
import DynamicNote from '@/components/DynamicNote.vue';
import MkFollowButton from '@/components/MkFollowButton.vue';
import MkInput from '@/components/MkInput.vue';
import { definePage } from '@/page.js';
import { i18n } from '@/i18n.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { userPage } from '@/filters/user.js';
import { useRouter } from '@/router';

provide('shouldOmitHeaderTitle', true);

const props = withDefaults(defineProps<{
	query?: string;
	initialTab?: string;
}>(), {
	query: '',
	initialTab: 'forYou',
});

type ExploreTab = 'forYou' | 'trending' | 'messages' | 'sports' | 'entertainment';
type DiscoverySections = Misskey.Endpoints['notes/discovery-sections']['res'];

const router = useRouter();
const searchInputEl = useTemplateRef('searchInputEl');

const tab = ref<ExploreTab>(normalizeTab(props.initialTab));
const searchQuery = ref(props.query ?? '');
const submittedQuery = ref('');
const searchLoading = ref(false);
const noteResults = shallowRef<Misskey.entities.Note[]>([]);
const userResults = ref<Misskey.entities.UserDetailed[]>([]);
const tagResults = ref<string[]>([]);
const featureNotes = shallowRef<Misskey.entities.Note[]>([]);
const categoryNotes = shallowRef<Misskey.entities.Note[]>([]);
const exploreLoading = ref(false);
const recommendedUsers = ref<Misskey.entities.UserDetailed[]>([]);
const discoverySections = ref<DiscoverySections>({
	trends: {
		popularSearches: [],
		recentTerms: [],
		hashtags: [],
	},
	coverNotes: [],
	hotNotes: [],
	tutorialNotes: [],
	channels: [],
	users: [],
});
const searchTrends = ref<{
	popularSearches: string[];
	recentTerms: string[];
	hashtags: string[];
}>({
	popularSearches: [],
	recentTerms: [],
	hashtags: [],
});
let exploreRequestId = 0;
let searchRequestId = 0;

const exploreTabs = computed(() => [{
	key: 'forYou' as const,
	title: i18n.ts.homeTimelineForYou,
}, {
	key: 'trending' as const,
	title: i18n.ts.exploreTrending,
}, {
	key: 'messages' as const,
	title: i18n.ts.exploreMessages,
}, {
	key: 'sports' as const,
	title: i18n.ts.exploreSports,
}, {
	key: 'entertainment' as const,
	title: i18n.ts.exploreEntertainment,
}]);

const searchEmpty = computed(() => !searchLoading.value && submittedQuery.value.length > 0 && noteResults.value.length === 0 && userResults.value.length === 0 && tagResults.value.length === 0);
const trendRows = computed(() => {
	const rows: { type: 'search' | 'tag'; term: string; label: string }[] = [];
	for (const term of searchTrends.value.popularSearches.slice(0, 4)) {
		rows.push({ type: 'search', term, label: i18n.ts.popularSearches });
	}
	for (const term of searchTrends.value.recentTerms.slice(0, Math.max(0, 8 - rows.length))) {
		rows.push({ type: 'search', term, label: i18n.ts.recentContentTerms });
	}
	for (const term of searchTrends.value.hashtags.slice(0, Math.max(0, 10 - rows.length))) {
		rows.push({ type: 'tag', term, label: i18n.ts.popularTags });
	}
	return rows;
});
const heroNote = computed(() => featureNotes.value.find(note => note.text || note.files?.length));
const heroTitle = computed(() => heroNote.value?.text?.split('\n').find(line => line.trim().length > 0)?.slice(0, 40) ?? trendRows.value[0]?.term ?? i18n.ts.whatsHappeningNow);
const heroMeta = computed(() => trendRows.value[0]?.label ?? i18n.ts.recentContentTerms);
const heroImageUrl = computed(() => {
	const image = heroNote.value?.files?.find(file => file.type?.startsWith('image/'));
	return (image as Misskey.entities.DriveFile | undefined)?.thumbnailUrl ?? '/client-assets/fedi.jpg';
});
const activeSectionTitle = computed(() => tab.value === 'trending' ? i18n.ts.exploreTrending : tab.value === 'messages' ? i18n.ts.exploreMessages : tab.value === 'sports' ? i18n.ts.exploreSports : tab.value === 'entertainment' ? i18n.ts.exploreEntertainment : i18n.ts.todayNews);
const activeNotes = computed(() => {
	if (categoryNotes.value.length > 0) return categoryNotes.value;
	if (tab.value === 'trending') return discoverySections.value.hotNotes;
	if (tab.value === 'forYou') return discoverySections.value.tutorialNotes.length > 0 ? discoverySections.value.tutorialNotes : discoverySections.value.hotNotes;
	return discoverySections.value.tutorialNotes.length > 0 ? discoverySections.value.tutorialNotes : discoverySections.value.hotNotes;
});
const categoryEmpty = computed(() => !exploreLoading.value && submittedQuery.value.length === 0 && tab.value !== 'forYou' && categoryNotes.value.length === 0);

watch(() => props.initialTab, (value) => {
	const nextTab = normalizeTab(value);
	if (tab.value !== nextTab) tab.value = nextTab;
}, { immediate: true });

watch(() => props.query, (query) => {
	searchQuery.value = query ?? '';
	if (searchQuery.value.trim().length > 0) {
		runSearch(searchQuery.value);
	} else {
		clearSearch(false);
	}
}, { immediate: true });

watch(tab, () => {
	loadExploreData();
}, { immediate: true });

onMounted(() => {
	if (props.query?.trim()) return;
	loadExploreData();
});

function normalizeTab(value?: string): ExploreTab {
	if (value === 'trending' || value === 'messages' || value === 'sports' || value === 'entertainment') return value;
	return 'forYou';
}

function submitSearch(): void {
	const query = searchQuery.value.trim();
	if (query.length === 0) return;
	router.push(buildExplorePath(tab.value, query));
	runSearch(query);
}

async function runSearch(rawQuery: string): Promise<void> {
	const query = rawQuery.trim();
	if (query.length === 0) {
		clearSearch(false);
		return;
	}
	submittedQuery.value = query;
	searchQuery.value = query;
	searchLoading.value = true;
	const requestId = ++searchRequestId;
	noteResults.value = [];
	userResults.value = [];
	tagResults.value = [];

	const userQuery = query.startsWith('@') ? query.slice(1) : query;
	const tagQuery = query.startsWith('#') ? query.slice(1) : query;
	try {
		const [notes, users, tags] = await Promise.all([
			misskeyApi<Misskey.entities.Note[]>('notes/search', {
				query,
				limit: 12,
				order: 'desc',
			}).catch(() => []),
			misskeyApi<Misskey.entities.UserDetailed[]>('users/search', {
				query: userQuery,
				origin: 'combined',
				limit: 6,
				detail: true,
			}).catch(() => []),
			misskeyApi<string[]>('hashtags/search', {
				query: tagQuery,
				limit: 12,
			}).catch(() => []),
		]);

		if (requestId !== searchRequestId) return;
		noteResults.value = notes;
		userResults.value = users;
		tagResults.value = mergeSearchTags(tags, notes, tagQuery);
	} finally {
		if (requestId === searchRequestId) searchLoading.value = false;
	}
}

function mergeSearchTags(tags: string[], notes: Misskey.entities.Note[], query: string): string[] {
	const normalizedQuery = query.trim().replace(/^#/, '').toLowerCase();
	const merged = new Set(tags);
	for (const note of notes) {
		for (const tag of note.tags ?? []) {
			if (normalizedQuery.length === 0 || tag.toLowerCase().includes(normalizedQuery)) {
				merged.add(tag);
			}
		}
	}
	return [...merged].slice(0, 12);
}

function clearSearch(updateRoute = true): void {
	searchRequestId++;
	searchLoading.value = false;
	submittedQuery.value = '';
	searchQuery.value = '';
	noteResults.value = [];
	userResults.value = [];
	tagResults.value = [];
	if (updateRoute) router.push(buildExplorePath(tab.value));
}

function focusSearchInput(): void {
	searchInputEl.value?.focus();
}

function openTrend(type: 'search' | 'tag', term: string): void {
	if (type === 'tag') {
		router.push(`/tags/${encodeURIComponent(term)}`);
	} else {
		searchQuery.value = term;
		router.push(buildExplorePath(tab.value, term));
		runSearch(term);
	}
}

function selectTab(nextTab: ExploreTab): void {
	tab.value = nextTab;
	router.push(buildExplorePath(nextTab, submittedQuery.value || undefined));
}

function buildExplorePath(nextTab: ExploreTab, query?: string): string {
	const params = new URLSearchParams();
	if (nextTab !== 'forYou') params.set('tab', nextTab);
	if (query && query.trim().length > 0) params.set('query', query.trim());
	const queryString = params.toString();
	return queryString.length > 0 ? `/explore?${queryString}` : '/explore';
}

async function loadExploreData(): Promise<void> {
	const currentTab = tab.value;
	const requestId = ++exploreRequestId;
	exploreLoading.value = true;
	try {
		const [sections, notes] = await Promise.all([
			misskeyApi<DiscoverySections>('notes/discovery-sections', { limit: 6 }).catch(() => null),
			misskeyApi<Misskey.entities.Note[]>('notes/recommended-timeline', {
				scope: 'mixed',
				surface: 'explore',
				category: currentTab,
				limit: 8,
				withRenotes: false,
			}).catch(() => []),
		]);
		if (requestId !== exploreRequestId || tab.value !== currentTab) return;
		categoryNotes.value = notes;
		if (sections) {
			discoverySections.value = sections;
			searchTrends.value = filterTrendsForTab(sections.trends, currentTab);
			recommendedUsers.value = sections.users;
			featureNotes.value = sections.coverNotes.length > 0 ? sections.coverNotes : notes;
		} else {
			searchTrends.value = collectTrendsFromNotes(notes, currentTab);
			featureNotes.value = notes;
		}
	} finally {
		if (requestId === exploreRequestId && tab.value === currentTab) exploreLoading.value = false;
	}
}

function filterTrendsForTab(trends: DiscoverySections['trends'], currentTab: ExploreTab): DiscoverySections['trends'] {
	if (currentTab === 'forYou' || currentTab === 'trending') return trends;
	const matches = (term: string) => matchesCategory(term, currentTab);
	return {
		popularSearches: trends.popularSearches.filter(matches),
		recentTerms: trends.recentTerms.filter(matches),
		hashtags: trends.hashtags.filter(matches),
	};
}

function collectTrendsFromNotes(notes: Misskey.entities.Note[], currentTab: ExploreTab): DiscoverySections['trends'] {
	const terms = new Set<string>();
	const hashtags = new Set<string>();
	for (const note of notes) {
		for (const tag of note.tags ?? []) {
			if (currentTab === 'forYou' || currentTab === 'trending' || matchesCategory(tag, currentTab)) hashtags.add(tag);
		}
		const text = note.text?.replace(/\s+/g, ' ').trim();
		if (text && (currentTab === 'forYou' || currentTab === 'trending' || matchesCategory(text, currentTab))) terms.add(text.slice(0, 28));
	}
	return {
		popularSearches: [],
		recentTerms: [...terms].slice(0, 8),
		hashtags: [...hashtags].slice(0, 8),
	};
}

function matchesCategory(value: string, currentTab: ExploreTab): boolean {
	const normalized = value.toLowerCase();
	if (currentTab === 'sports') return /运动|体育|赛事|比赛|球队|足球|篮球|网球|跑步|健身|训练|sports?|football|basketball|tennis|fitness|workout|match|game|team/.test(normalized);
	if (currentTab === 'entertainment') return /娱乐|电影|音乐|游戏|动漫|动画|漫画|综艺|追剧|明星|剧集|影院|演唱会|movie|film|music|game|anime|comic|show|entertainment|concert/.test(normalized);
	if (currentTab === 'messages') return /公告|讨论|问题|bug|更新|社区|通知|反馈|announcement|discussion|issue|update|community|notice|feedback/.test(normalized);
	return true;
}

definePage(() => ({
	title: i18n.ts.explore,
	icon: 'ti ti-search',
	needWideArea: true,
}));
</script>

<style lang="scss" module>
.exploreShell {
	width: min(100%, 980px);
	margin: 0 auto;
	display: grid;
	grid-template-columns: minmax(0, 600px) 350px;
	align-items: start;
	min-height: 100%;
}

.exploreMain {
	min-width: 0;
	border-left: solid 1px var(--MI_THEME-divider);
	border-right: solid 1px var(--MI_THEME-divider);
	background: var(--MI_THEME-bg);
}

.exploreHeader {
	position: sticky;
	top: 0;
	z-index: 10;
	background: color-mix(in srgb, var(--MI_THEME-bg) 90%, transparent);
	backdrop-filter: blur(16px);
	border-bottom: solid 1px var(--MI_THEME-divider);
}

.searchRow {
	display: grid;
	grid-template-columns: minmax(0, 1fr) 40px;
	gap: 12px;
	align-items: center;
	padding: 10px 16px;
}

.searchInput {
	min-width: 0;
}

.settingsButton {
	width: 40px;
	height: 40px;
	border-radius: 999px;
	color: var(--MI_THEME-fg);
}

.settingsButton:hover {
	background: var(--MI_THEME-panelHighlight);
}

.exploreTabs {
	display: grid;
	grid-template-columns: repeat(5, minmax(max-content, 1fr));
	min-height: 52px;
	overflow-x: auto;
}

.exploreTab {
	position: relative;
	padding: 0 16px;
	font-weight: 700;
	color: var(--MI_THEME-fgTransparentWeak);
	white-space: nowrap;
}

.exploreTab:hover {
	background: var(--MI_THEME-panelHighlight);
}

.exploreTabActive {
	color: var(--MI_THEME-fg);
}

.exploreTabActive::after {
	content: "";
	position: absolute;
	left: 50%;
	bottom: 0;
	width: 56px;
	height: 4px;
	border-radius: 999px;
	background: var(--MI_THEME-accent);
	transform: translateX(-50%);
}

.hero {
	position: relative;
	min-height: 335px;
	background-size: cover;
	background-position: center;
	color: #fff;
	overflow: hidden;
}

.heroShade {
	position: absolute;
	inset: 0;
	background: linear-gradient(180deg, rgba(0, 0, 0, .05), rgba(0, 0, 0, .72));
}

.heroMenu {
	position: absolute;
	top: 12px;
	right: 12px;
	width: 36px;
	height: 36px;
	border-radius: 999px;
	color: #fff;
	background: rgba(0, 0, 0, .32);
}

.heroContent {
	position: absolute;
	left: 16px;
	right: 16px;
	bottom: 16px;
	text-shadow: 0 1px 8px rgba(0, 0, 0, .55);
}

.heroLabel {
	font-weight: 700;
	opacity: .9;
}

.heroTitle {
	margin-top: 4px;
	font-size: 1.45em;
	font-weight: 900;
	line-height: 1.2;
}

.heroMeta {
	margin-top: 6px;
	opacity: .85;
}

.newsList {
	padding: 16px;
	border-bottom: solid 1px var(--MI_THEME-divider);
}

.newsList h2 {
	margin: 0 0 12px;
	font-size: 1.25em;
}

.newsRow {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	width: 100%;
	gap: 4px;
	padding: 12px 0;
	text-align: left;
}

.newsRow + .newsRow {
	border-top: solid 1px var(--MI_THEME-divider);
}

.newsTitle {
	font-weight: 850;
	color: var(--MI_THEME-fg);
}

.newsMeta {
	color: var(--MI_THEME-fgTransparentWeak);
	font-size: .9em;
}

.discoverySection {
	padding: 16px;
	border-bottom: solid 1px var(--MI_THEME-divider);
}

.discoverySection h2 {
	margin: 0 0 12px;
	font-size: 1.25em;
}

.channelGrid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 10px;
}

.channelCard {
	display: grid;
	grid-template-columns: 42px minmax(0, 1fr);
	gap: 8px 10px;
	align-items: center;
	min-width: 0;
	padding: 12px;
	border: solid 1px var(--MI_THEME-divider);
	border-radius: 14px;
	color: inherit;
	background: var(--MI_THEME-panel);
}

.channelBanner {
	grid-row: 1 / span 2;
	display: grid;
	place-items: center;
	width: 40px;
	height: 40px;
	border-radius: 12px;
	color: #fff;
}

.channelName {
	min-width: 0;
	font-weight: 800;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.channelMeta {
	min-width: 0;
	color: var(--MI_THEME-fgTransparentWeak);
	font-size: .86em;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.searchPanel {
	padding: 16px;
}

.searchPanelHeader {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 12px;
	margin-bottom: 16px;
}

.searchPanelTitle {
	font-size: 1.2em;
	font-weight: 800;
}

.searchPanelCaption {
	margin-top: 3px;
	color: var(--MI_THEME-fgTransparentWeak);
}

.searchPanelActions,
.searchEmptyActions,
.categoryEmptyActions,
.tags {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}

.panelAction,
.searchEmptyButton,
.categoryEmptyButton,
.tagChip {
	border-radius: 999px;
	padding: 8px 12px;
	background: var(--MI_THEME-panel);
}

.searchEmpty,
.categoryEmpty {
	display: grid;
	justify-items: center;
	gap: 12px;
	padding: 48px 16px;
	text-align: center;
	color: var(--MI_THEME-fg);
}

.searchEmpty > i,
.categoryEmpty > i {
	font-size: 2.2em;
	color: var(--MI_THEME-fgTransparentWeak);
}

.searchEmptyTitle,
.categoryEmptyTitle {
	font-size: 1.25em;
	font-weight: 800;
}

.searchEmptyText,
.categoryEmptyText {
	color: var(--MI_THEME-fgTransparentWeak);
}

.searchResults,
.resultSection {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.resultSection + .resultSection {
	margin-top: 18px;
	padding-top: 18px;
	border-top: solid 1px var(--MI_THEME-divider);
}

.resultSectionTitle {
	font-weight: 800;
}

.searchUser,
.userRow {
	display: grid;
	grid-template-columns: 42px minmax(0, 1fr) auto;
	align-items: center;
	gap: 10px;
}

.searchUserAvatar,
.userAvatar {
	width: 40px;
	height: 40px;
}

.searchUserBody,
.userBody {
	min-width: 0;
	color: inherit;
}

.rightRail {
	position: sticky;
	top: 0;
	display: flex;
	flex-direction: column;
	gap: 16px;
	max-height: 100cqh;
	overflow: auto;
	padding: 10px 0 24px 30px;
}

.sideCard {
	border: solid 1px var(--MI_THEME-divider);
	border-radius: 16px;
	padding: 16px;
	background: var(--MI_THEME-panel);
}

.sideCardTitle {
	margin-bottom: 12px;
	font-size: 1.15em;
	font-weight: 800;
	color: var(--MI_THEME-fg);
}

.trendRow {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	width: 100%;
	gap: 3px;
	padding: 10px 0;
	text-align: left;
}

.trendRow + .trendRow,
.userRow + .userRow,
.sideChannel + .sideChannel {
	border-top: solid 1px var(--MI_THEME-divider);
}

.trendTitle {
	font-weight: 800;
	color: var(--MI_THEME-fg);
}

.trendMeta {
	font-size: .85em;
	color: var(--MI_THEME-fgTransparentWeak);
}

.userRow {
	padding: 10px 0;
}

.sideChannel {
	display: grid;
	grid-template-columns: 38px minmax(0, 1fr);
	gap: 10px;
	align-items: center;
	padding: 10px 0;
	color: inherit;
}

.sideChannelIcon {
	display: grid;
	place-items: center;
	width: 36px;
	height: 36px;
	border-radius: 10px;
	color: #fff;
}

.sideChannelBody {
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 3px;
}

.sideChannelName {
	font-weight: 800;
	color: var(--MI_THEME-fg);
}

.sideChannelMeta {
	font-size: .85em;
	color: var(--MI_THEME-fgTransparentWeak);
}

.followButton {
	border-radius: 999px;
	font-weight: 700;
}

@media (max-width: 1000px) {
	.exploreShell {
		display: block;
		width: min(100%, 600px);
	}

	.exploreMain {
		border-left: 0;
		border-right: 0;
	}

	.rightRail {
		display: none;
	}
}

@media (max-width: 500px) {
	.searchRow {
		padding: 8px 12px;
	}

	.exploreTab {
		padding: 0 14px;
	}

	.hero {
		min-height: 260px;
	}
}
</style>
