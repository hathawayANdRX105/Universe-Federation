/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as Misskey from 'misskey-js';
import { inject, isRef, onActivated, onBeforeUnmount, provide, ref, toValue, watch } from 'vue';
import { DI } from './di.js';
import type { MaybeRefOrGetter, Ref } from 'vue';

export type PageMetadata = {
	title: string;
	subtitle?: string;
	icon?: string | null;
	avatar?: Misskey.entities.User | null;
	userName?: Misskey.entities.User | null;
	needWideArea?: boolean;
	// needWideArea と併用すると、全幅レイアウトでもウィジェットカラムを表示する
	keepWidgets?: boolean;
	// needWideArea と併用。標準の 82vw 外枠の中でページ自身がワイドレイアウトを制御し、
	// universal.vue 側の widgets カラムは表示しない場合に使用する。
	// timeline.vue のように独自の 2 カラムを持つページ向け。
	bustLayoutCap?: boolean;
};

type PageMetadataGetter = () => PageMetadata;
type PageMetadataReceiver = (getter: PageMetadataGetter) => void;

const RECEIVER_KEY = Symbol('ReceiverKey');
const setReceiver = (v: PageMetadataReceiver): void => {
	provide<PageMetadataReceiver>(RECEIVER_KEY, v);
};
const getReceiver = (): PageMetadataReceiver | undefined => {
	return inject<PageMetadataReceiver>(RECEIVER_KEY);
};

const METADATA_KEY = Symbol('MetadataKey');
const setMetadata = (v: Ref<PageMetadata | null>): void => {
	provide<Ref<PageMetadata | null>>(METADATA_KEY, v);
};

export const definePage = (maybeRefOrGetterMetadata: MaybeRefOrGetter<PageMetadata>): void => {
	const metadataRef = ref(toValue(maybeRefOrGetterMetadata));
	const metadataGetter = () => metadataRef.value;
	const receiver = getReceiver();

	// setup handler
	receiver?.(metadataGetter);

	// update handler
	onBeforeUnmount(watch(
		() => toValue(maybeRefOrGetterMetadata),
		(metadata) => {
			metadataRef.value = metadata;
			receiver?.(metadataGetter);
		},
		{ deep: true },
	));
	onActivated(() => {
		receiver?.(metadataGetter);
	});

	provide(DI.pageMetadata, metadataRef);
};

export const provideMetadataReceiver = (receiver: PageMetadataReceiver): void => {
	setReceiver(receiver);
};

export const provideReactiveMetadata = (metadataRef: Ref<PageMetadata | null>): void => {
	setMetadata(metadataRef);
};
