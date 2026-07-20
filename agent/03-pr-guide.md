# 3. 如何提 Pull Request

模板：`.github/pull_request_template.md`（短 base，接近 [oh-my-pi](https://github.com/can1357/oh-my-pi)；特殊块在注释里 optional）。  
总流程：[01-dev-workflow.md](./01-dev-workflow.md)。

与 herdr 不同：我们用 **`Fixes #N` 在 PR 合入时关 Issue**（herdr 用 `refs #` 且发版后关——我们不抄那条）。

## 3.1 开 PR 前

- 已有 Issue 并认领  
- 分支从 `main`：`fix/12-slug` 等  
- 只含这一件 Issue  
- 工作区干净；能解释自己的改动（herdr：「不懂自己的代码就别提 PR」）

## 3.2 Base（每次）

| 区块 | 写什么 |
|------|--------|
| **What** | 合入后变什么 |
| **Why** | 动机 / 根因 |
| **Issue** | **`Fixes #N`** |
| **How to test** | 步骤 + 命令 |
| **Checklist** | 一 Issue、无密钥垃圾、已测或说明 |

## 3.3 Optional（模板注释里按需粘贴）

Screenshots（UI）· Risk/migration · Changelog · Notes for reviewers

## 3.4 CI / Review

红了同分支修。Reviewer 看是否对上 Issue、范围、测试是否可信。
