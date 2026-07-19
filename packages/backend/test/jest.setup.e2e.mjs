/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { initTestDb, sendEnvResetRequest } from './utils.js';

// Jest-process only: secondary Nest apps (startJobQueue) must not dropSchema.
// The e2e *server* process does not inherit this; env-reset still full-drops.
process.env.MK_TEST_KEEP_SCHEMA = '1';

beforeAll(async () => {
	await initTestDb(false);
	await sendEnvResetRequest();
}, 1000 * 60 * 2);
