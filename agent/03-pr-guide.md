# 3. 如何提 Pull Request

模板：`.github/pull_request_template.md`（**短 base**；特殊情况再贴注释里的 optional 块）。  
总流程：[01-dev-workflow.md](./01-dev-workflow.md)。

## 3.1 开 PR 前

- 已有 Issue 并认领  
- 分支从 `main`：`fix/12-slug` 等  
- 只含这一件 Issue  
- 工作区干净（无密钥 / `node_modules` / `.beads`）

## 3.2 Base 字段（每次都填）

| 区块 | 写什么 |
|------|--------|
| **What** | 合入后变什么（可条目） |
| **Why** | 动机 / 根因 |
| **Issue** | **`Fixes #N`**（一个主 Issue） |
| **How to test** | 别人能跟做的步骤 + 命令 |
| **Checklist** | 一 Issue、无密钥垃圾、已测或说明 |

标题建议：`fix(…):` / `feat(…):` / `refactor(…):` / `chore:` / `docs:`

## 3.3 Optional（需要时从模板注释里复制）

| 块 | 何时贴 |
|----|--------|
| Screenshots | 有 UI 改动 |
| Risk / migration | 破坏性、迁移、难 revert |
| Changelog | 用户可见行为变化 |
| Notes for reviewers | 边角、后续 Issue |

不要空着 optional 糊弄；用不到就别贴。

## 3.4 CI / Review

红了：同分支修 → 再推。  
Reviewer 看：是否对上 Issue、范围、测试是否可信。  
合入后 `Fixes #N` 应关 Issue。

## 3.5 最小示例

```markdown
## What

Keep unread marker when loading older chat history.

## Why

Pagination replaced the in-memory read cursor (#12).

## Issue

Fixes #12

## How to test

1. Open room with unreads
2. Scroll up to load history
3. Marker/badge still correct

```text
pnpm --filter backend test
```

## Checklist

- [x] Exactly one Issue (`Fixes #N`)
- [x] No secrets, real config, or junk files
- [x] Tested (steps above) or explained why not
```
