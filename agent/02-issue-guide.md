# 2. 如何提 Issue

## 2.0 形式

**Issue Forms（YAML）**，不是空白 Markdown：

```text
New Issue → 选 Bug 或 Task / Refactor → 填表 → 得到 #号
```

| 文件 | 作用 |
|------|------|
| `bug.yml` | Bug 表单 |
| `task.yml` | 任务/重构/杂项表单 |
| `config.yml` | 关空白 Issue、联系方式等（不是第三种任务类型） |

## 2.1 选哪个

| 卡片 | 何时 |
|------|------|
| **Bug** | 错误、崩溃、回归 |
| **Task / Refactor** | 重构、CI、清理、文档、明确改造 |

类型靠**标题前缀**区分：`fix:` / `refactor:` / `chore:` / `docs:` / `test:`（不必再在表单里选 Kind）。

## 2.2 Bug 字段

| 字段 | 必填 | 写什么 |
|------|------|--------|
| Summary | 是 | 坏在哪 |
| Expected | 是 | 应该怎样 |
| Actual | 是 | 实际怎样 |
| Steps to reproduce | 否 | 1.2.3. |
| Environment | 否 | 实例/浏览器/版本 |

## 2.3 Task 字段

| 字段 | 必填 | 写什么 |
|------|------|--------|
| Goal | 是 | 做完变成啥样 |
| Done when | 是 | 验收清单 |
| Out of scope | 否 | 不做什么 |

## 2.4 提完

挂 Milestone → Assignee（可领则空着）→ 将来 **一个 PR `Fixes #N`**。太大就拆。

## 2.5 不要

纯提问 → Discussions/聊天；安全漏洞 → `SECURITY.md`；多问题塞一条。

## 2.6 vs bd

GitHub Issue = 人类协作；bd = 本地 agent 树。不要混号。
