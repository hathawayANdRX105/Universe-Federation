/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { initTestDb, port, sendEnvResetRequest } from './utils.js';

async function stopTestServer() {
	const res = await fetch(`http://localhost:${port + 1000}/env-stop`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: '{}',
	});
	if (res.status !== 200) {
		throw new Error(`env-stop failed status=${res.status}`);
	}
}

beforeAll(async () => {
	// Critical order: Nest must be fully stopped before dropSchema.
	// Dropping under a live Nest DataSource causes notes/create INTERNAL_ERROR.
	await stopTestServer();
	const db = await initTestDb(false);
	await db.destroy();
	// Relaunch Nest with MK_TEST_KEEP_SCHEMA=1 (synchronize only; tables already exist).
	await sendEnvResetRequest();
}, 1000 * 60 * 2);
