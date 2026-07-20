# 2. 如何提 Issue

参考 [herdr](https://github.com/ogulcancelik/herdr)（Bug 要短、可复现、少空谈）与 [oh-my-pi](https://github.com/can1357/oh-my-pi)（Bug / Feature 分表单；PR 短）。

## 2.0 形式

**Issue Forms**，不是空白 Markdown：

```text
New Issue → 选 Bug / Feature / Task → 填表 → #号
```

| 文件 | 作用 |
|------|------|
| `bug.yml` | 可复现缺陷 / 回归 |
| `feature.yml` | 新能力、用户向改进 |
| `task.yml` | 内部：重构 / CI / docs / chore / 主动 perf |
| `config.yml` | 关空白 Issue + 文档/安全链接（不是任务类型） |

**不要**按每个 label 一张模板。Label 只做筛选（`bug` / `enhancement` / `perf` / `docs`…）。

## 2.1 选哪个

| 卡片 | 何时 |
|------|------|
| **Bug** | 错了、崩了、**变慢的回归** |
| **Feature** | 现在没有的能力 / 产品向改进 |
| **Task / Refactor** | 重构、CI、文档、清理、**主动**性能优化 |

| 场景 | 模板 | Label 示例 |
|------|------|------------|
| 分页清未读 | Bug | `bug` |
| 想要开关已读回执 | Feature | `enhancement` |
| 拆 CI path scope | Task | `docs` / 无 |
| 主动批处理 fanout | Task + 标题 `perf:` | `perf` |
| 发版后变慢 | Bug + 标题 `fix(perf):` | `bug`, `perf` |

## 2.2 Bug 字段（herdr 风格）

| 字段 | 必填 | 写什么 |
|------|------|--------|
| 确认可复现 | 是 | 勾选 |
| Current behavior | 是 | 现在怎样（事实） |
| Expected behavior | 是 | 应该怎样 |
| Reproduction | 是 | 最短步骤 |
| Impact | 否 | 影响你/实例 |
| Error output | 否 | 日志 |
| Environment | 否 | 预填骨架，尽量填 |

**禁止：** 长篇根因、实现计划、AI 诊断墙（维护者要求再补）。

## 2.3 Feature 字段（omp 风格）

| 字段 | 必填 | 写什么 |
|------|------|--------|
| Description | 是 | 想要什么 |
| Use case | 是 | 为什么、解决谁的问题 |
| Done when | 是 | 验收 |
| Proposed solution | 否 | 想法，不是完整设计 |
| Out of scope | 否 | 边界 |

## 2.4 Task 字段

| 字段 | 必填 | 写什么 |
|------|------|--------|
| Goal | 是 | 做完变成啥样 |
| Done when | 是 | 验收 |
| Out of scope | 否 | 不做什么 |

## 2.5 提完

挂 Milestone → Assignee（可领则空）→ **一个 PR `Fixes #N`**。太大就拆。

## 2.6 vs bd

GitHub Issue = 人类协作；bd = 本地 agent 树。不要混号。
