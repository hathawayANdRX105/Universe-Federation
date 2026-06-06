/*
 * SPDX-FileCopyrightText: hazelnoot and other Sharkey contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as fs from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { localesVersion } from '../../../../../locales/index.js';
import {
	localeAssetExactCacheControl,
	localeAssetFallbackCacheControl,
	parseLocaleAssetFile,
	resolveLocaleAsset,
} from '@/server/web/ClientServerService.js';

describe('locale asset fallback', () => {
	let localesDir: string;
	const oldLocaleHash = 'oldHash_123';

	beforeEach(() => {
		localesDir = fs.mkdtempSync(join(tmpdir(), 'sharkey-locale-assets-'));
	});

	afterEach(() => {
		fs.rmSync(localesDir, { recursive: true, force: true });
	});

	it('parses only hashed locale json asset names', () => {
		expect(parseLocaleAssetFile('zh-CN.NxqAHrUa2JzNp2eq9_m-eA.json')).toBe('zh-CN');
		expect(parseLocaleAssetFile('../zh-CN.NxqAHrUa2JzNp2eq9_m-eA.json')).toBeNull();
		expect(parseLocaleAssetFile('zh-CN.json')).toBeNull();
		expect(parseLocaleAssetFile('zh-CN.NxqAHrUa2JzNp2eq9_m-eA.css')).toBeNull();
	});

	it('serves the exact locale asset when the requested hash still exists', () => {
		const requestedFile = 'zh-CN.NxqAHrUa2JzNp2eq9_m-eA.json';
		const requestedPath = join(localesDir, requestedFile);
		fs.writeFileSync(requestedPath, '{"exact":true}', 'utf-8');

		const resolved = resolveLocaleAsset(requestedFile, localesDir);

		expect(resolved).toStrictEqual({
			type: 'file',
			lang: 'zh-CN',
			filePath: requestedPath,
			cacheControl: localeAssetExactCacheControl,
		});
	});

	it('falls back from a stale locale hash to the current same-language asset', () => {
		const currentPath = join(localesDir, `zh-CN.${localesVersion}.json`);
		fs.writeFileSync(currentPath, '{"current":true}', 'utf-8');

		const resolved = resolveLocaleAsset(`zh-CN.${oldLocaleHash}.json`, localesDir);

		expect(resolved).toStrictEqual({
			type: 'file',
			lang: 'zh-CN',
			filePath: currentPath,
			cacheControl: localeAssetFallbackCacheControl,
		});
	});

	it('falls back to generated locale json when build assets are unavailable', () => {
		const resolved = resolveLocaleAsset(`zh-CN.${oldLocaleHash}.json`, localesDir);

		expect(resolved?.type).toBe('inline');
		expect(resolved?.lang).toBe('zh-CN');
		expect(resolved?.cacheControl).toBe(localeAssetFallbackCacheControl);
		const body = JSON.parse(resolved?.type === 'inline' ? resolved.body : '{}');
		expect(body).toMatchObject({
			_version_: localesVersion,
		});
		expect(body._lang_).toEqual(expect.any(String));
	});

	it('rejects unsupported or unsafe locale asset names', () => {
		expect(resolveLocaleAsset('../zh-CN.NxqAHrUa2JzNp2eq9_m-eA.json', localesDir)).toBeNull();
		expect(resolveLocaleAsset('zz-ZZ.NxqAHrUa2JzNp2eq9_m-eA.json', localesDir)).toBeNull();
	});
});
