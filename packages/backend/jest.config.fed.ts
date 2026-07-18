/*
 * For a detailed explanation regarding each configuration property and type check, visit:
 * https://jestjs.io/docs/en/configuration.html
 */

import base from './jest.config.common.ts';

export default {
	...base,
	roots: [
		'<rootDir>/test-federation',
	],
	testMatch: [
		'<rootDir>/test-federation/test/**/*.test.ts',
	],
};
