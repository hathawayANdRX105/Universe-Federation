# 2. 如何提 Issue

模板参考 [oh-my-pi](https://github.com/can1357/oh-my-pi) 与 [herdr](https://github.com/ogulcancelik/herdr)。  
范例：Bug [omp#5995](https://github.com/can1357/oh-my-pi/issues/5995)、[omp#6011](https://github.com/can1357/oh-my-pi/issues/6011)；Feature [omp#4815](https://github.com/can1357/oh-my-pi/issues/4815)。

## 2.0 模板与 label

| 卡片 | 默认 label | 何时 |
|------|------------|------|
| **Bug** | `bug` | 缺陷 / 回归（含性能回归） |
| **Feature** | `enhancement` | 新能力、用户向改进 |
| **Task / Refactor** | `chore` | 重构、CI、文档、清理、主动 perf |

创建后可再加 `perf` / `docs` 等。不对每个 label 单独做模板。

## 2.1 REQUIRED vs RECOMMENDED EXTRAS（核心规范）

模板里用可见分区（`## REQUIRED` / `## RECOMMENDED EXTRAS`）+ 表格说明「何时推荐填」。

| | REQUIRED | RECOMMENDED EXTRAS |
|--|----------|-------------------|
| 是否必须 | **必须写满再提交** | **可选**；适用就写，不适用就留空 |
| 表单里 | 分区标题 + `required: true` | 分区标题 + 每字段 description 写 Prefer when / Skip when |
| 发布到 Issue 后 | 正文里是干净标题（`### Description`） | 同样是干净标题（`### Error output`） |
| 不要 | — | 标题写成 `### Error output (optional)`；不要整页 N/A |

**Demo Issue** 可以故意填上 extras，当作「示范长什么样」。  
**真实提 Issue** 的人：extras **可用可不用**；该用时按表格推荐加上。

### 何时推荐 extras（汇总）

| 字段 | 推荐使用时机 |
|------|----------------|
| Error output | 有堆栈、工具失败、控制台/服务端日志 |
| Impact | Description 没写清谁受害、多频、有无 workaround |
| Evidence | perf 数字、N/N 次复现、waterfall/截图 |
| Related issues | 易混 issue、需 related-but-distinct |
| Suspected code paths | 已读代码，能点名文件/符号 |
| Suggested regression coverage | 能写出最小测试/断言 |
| Non-goals | 功能/任务容易膨胀 |
| Proposed approach | 有高层方向，不是长设计 |
| Alternatives considered | 试过绕过或否决过方案 |
| How to observe success | 尤其 `perf:` 任务 |
| Background | 「为什么现在做」不明显 |
| Area / Additional | 路由或补充材料需要时 |

## 2.2 各模板 REQUIRED 字段

**Bug：** Confirmation · Description · Steps · Expected · Actual · Environment  

**Feature：** Description · Problem/use case · Done when  

**Task：** Goal · Done when  

## 2.3 提完

Milestone → Assignee → 一个 PR `Fixes #N`。

## 2.4 vs bd

GitHub Issue = 人类协作；bd = 本地 agent 树。
