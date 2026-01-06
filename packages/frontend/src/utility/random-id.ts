/*
 * SPDX-FileCopyrightText: hazelnoot and other Sharkey contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

const MAX_ID = Math.pow(2, 50);

/**
 * Returns a non-cryptographically-secure 50-bit random ID encoded as a base-32 string.
 * The output of this function is always 10 characters exactly, as 50 bits fits perfectly into 10 characters at 5 bits-per-character.
 */
export function randomId(): string {
	const randomNum = Math.round(Math.random() * MAX_ID);
	return randomNum.toString(26).padStart(10, '0');
}
