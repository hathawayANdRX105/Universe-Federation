/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { initTestDb, port, sendEnvResetRequest, stopAllJobQueues } from './utils.js';

// Jest process only: secondary Nest must not drop/sync the shared DB.
process.env.MK_TEST_KEEP_SCHEMA = '1';

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
	// Close queue Nest left by previous suite (holds DB connections).
	await stopAllJobQueues();
	// Nest server must be stopped before dropSchema.
	await stopTestServer();
	const db = await initTestDb(false);
	await db.destroy();
	// Server process clears KEEP and full-drops on boot.
	await sendEnvResetRequest();
}, 1000 * 60 * 2);
