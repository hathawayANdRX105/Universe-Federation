/*
 * SPDX-FileCopyrightText: lpHex
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * 图文混排小工具。
 *  - extractInlinedIndexes(text): 从 MFM 文本里扫 $[file N] 占位符,返回所有被引用的索引集合
 *  - splitFilesByInline(files, text): 把 files 拆成 inlined / leftover 两组,
 *    leftover 用于在帖子底部渲染附件网格,inlined 已经在文本中嵌入,避免重复显示
 */

import type * as Misskey from 'misskey-js';

// 匹配 $[file 0] / $[file 12] 等,index 必须是十进制非负整数
// MFM 函数语法允许参数前后空白
const INLINE_FILE_RE = /\$\[file\s+(\d+)\]/g;

export function extractInlinedIndexes(text: string | null | undefined): Set<number> {
	const set = new Set<number>();
	if (!text) return set;
	INLINE_FILE_RE.lastIndex = 0;
	let m: RegExpExecArray | null;
	while ((m = INLINE_FILE_RE.exec(text)) !== null) {
		const i = parseInt(m[1], 10);
		if (!Number.isNaN(i) && i >= 0) set.add(i);
	}
	return set;
}

export function splitFilesByInline(
	files: Misskey.entities.DriveFile[] | null | undefined,
	text: string | null | undefined,
): { inlined: Misskey.entities.DriveFile[]; leftover: Misskey.entities.DriveFile[] } {
	const allFiles = files ?? [];
	const inlinedIdx = extractInlinedIndexes(text);
	if (inlinedIdx.size === 0) {
		return { inlined: [], leftover: allFiles };
	}
	const inlined: Misskey.entities.DriveFile[] = [];
	const leftover: Misskey.entities.DriveFile[] = [];
	for (let i = 0; i < allFiles.length; i++) {
		if (inlinedIdx.has(i)) inlined.push(allFiles[i]);
		else leftover.push(allFiles[i]);
	}
	return { inlined, leftover };
}
