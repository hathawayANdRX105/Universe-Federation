/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { lang } from '@@/js/config.js';

export async function initializeSw() {
	if (!('serviceWorker' in navigator)) return;

	const registrations = await navigator.serviceWorker.getRegistrations();
	await Promise.all(registrations.map(registration => registration.unregister()));
}
