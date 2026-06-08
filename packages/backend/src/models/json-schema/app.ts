/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export const packedAppSchema = {
	type: 'object',
	properties: {
		id: {
			type: 'string',
			optional: false, nullable: false,
		},
		name: {
			type: 'string',
			optional: false, nullable: false,
		},
		callbackUrl: {
			type: 'string',
			optional: false, nullable: true,
		},
		callbackUrls: {
			type: 'array',
			optional: false, nullable: false,
			items: {
				type: 'string',
				optional: false, nullable: false,
			},
		},
		permission: {
			type: 'array',
			optional: false, nullable: false,
			items: {
				type: 'string',
				optional: false, nullable: false,
			},
		},
		secret: {
			type: 'string',
			optional: true, nullable: false,
		},
		status: {
			type: 'string',
			optional: false, nullable: false,
			enum: ['pending', 'approved', 'suspended', 'rejected'],
		},
		websiteUrl: {
			type: 'string',
			optional: false, nullable: true,
		},
		iconUrl: {
			type: 'string',
			optional: false, nullable: true,
		},
		rateLimitPerMinute: {
			type: 'number',
			optional: false, nullable: true,
		},
		reviewNote: {
			type: 'string',
			optional: false, nullable: true,
		},
		approvedAt: {
			type: 'string',
			optional: false, nullable: true,
		},
		suspendedAt: {
			type: 'string',
			optional: false, nullable: true,
		},
		isAuthorized: {
			type: 'boolean',
			optional: true, nullable: false,
		},
	},
} as const;
