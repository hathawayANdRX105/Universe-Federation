/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { initTestDb, port, sendEnvResetRequest } from './utils.js';

// Critical: startJobQueue()/secondary Nest contexts run in this process.
// Without this flag, createPostgresDataSource dropSchema:true wipes the live
// server DB and notes/create returns INTERNAL_ERROR mid-suite.
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
	// Nest must be fully stopped before dropSchema.
	await stopTestServer();
	const db = await initTestDb(false);
	await db.destroy();
	// Relaunch Nest with MK_TEST_KEEP_SCHEMA (server process also keeps it after first boot).
	await sendEnvResetRequest();
}, 1000 * 60 * 2);
