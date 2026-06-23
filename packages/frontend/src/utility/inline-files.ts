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

// U+FFFC OBJECT REPLACEMENT CHARACTER —— Discourse / 浏览器富文本编辑器
// 复制粘贴出来的内联图片占位符。顺序映射到 file[0..N-1] 即可正确还原图文混排。
const OBJ_REPL = '￼';

/** 把文本里第 i 个 `￼` 替换成 `$[file i]`(i 在 [0, fileCount) 范围内),超出的留原样。 */
export function expandInlineObjectReplacements(text: string | null | undefined, fileCount: number): string {
	if (text == null || text === '') return text ?? '';
	if (fileCount <= 0 || !text.includes(OBJ_REPL)) return text;
	let counter = 0;
	return text.replace(/￼/g, () => {
		if (counter >= fileCount) return OBJ_REPL;
		const idx = counter++;
		return `$[file ${idx}]`;
	});
}

export function extractInlinedIndexes(text: string | null | undefined, fileCount?: number): Set<number> {
	const set = new Set<number>();
	if (!text) return set;
	// 显式 $[file N]
	INLINE_FILE_RE.lastIndex = 0;
	let m: RegExpExecArray | null;
	while ((m = INLINE_FILE_RE.exec(text)) !== null) {
		const i = parseInt(m[1], 10);
		if (!Number.isNaN(i) && i >= 0) set.add(i);
	}
	// ￼ 占位符顺序映射,跟 expandInlineObjectReplacements 保持一致
	if (fileCount != null && fileCount > 0 && text.includes(OBJ_REPL)) {
		let counter = 0;
		for (let i = 0; i < text.length; i++) {
			if (text.charCodeAt(i) === 0xFFFC) {
				if (counter < fileCount) set.add(counter);
				counter++;
			}
		}
	}
	return set;
}

export function splitFilesByInline(
	files: Misskey.entities.DriveFile[] | null | undefined,
	text: string | null | undefined,
): { inlined: Misskey.entities.DriveFile[]; leftover: Misskey.entities.DriveFile[] } {
	const allFiles = files ?? [];
	const inlinedIdx = extractInlinedIndexes(text, allFiles.length);
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
