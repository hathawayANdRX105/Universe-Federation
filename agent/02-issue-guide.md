# 2. 如何提 Issue

模板参考 [oh-my-pi](https://github.com/can1357/oh-my-pi) 优质 closed issue 与 [herdr](https://github.com/ogulcancelik/herdr) 的事实优先。

范例：Bug [#5995](https://github.com/can1357/oh-my-pi/issues/5995)、[#6011](https://github.com/can1357/oh-my-pi/issues/6011)；Feature [#4815](https://github.com/can1357/oh-my-pi/issues/4815)、[#4983](https://github.com/can1357/oh-my-pi/issues/4983)。

## 2.0 模板与 label

| 卡片 | 默认 label | 何时 |
|------|------------|------|
| **Bug** | `bug` | 缺陷 / 回归（含性能回归） |
| **Feature** | `enhancement` | 新能力、用户向改进 |
| **Task / Refactor** | `chore` | 重构、CI、文档、清理、主动 perf |

- 模板自动打默认 label；不对「每个 label 一张模板」。
- 需要更细分类时，**创建后再加** label（如 `perf`、`docs`），或改掉不合适的默认 `chore`。
- 标题前缀仍推荐：`fix:` / `feat:` / `perf:` / `refactor:` / `chore:` / `docs:`。

`config.yml`：禁止空白 Issue + 文档/安全链接（不是任务类型）。

## 2.1 必填 vs 额外字段（规范）

**必填：** 每种模板顶部一组，提交前必须写清。

**额外字段：** 表单里仍可能显示，但：

1. 字段 **说明（description）** 写清 **何时应填 / 何时可空**。  
2. 字段 **标题（label）不含 “(optional)”**。  
3. 发布到 Issue 正文的标题就是 `### Error output` 这种干净名字。  
4. **不适用就留空**，不要写一堆 “N/A (optional)”。

| 额外字段 | 推荐何时加上 |
|----------|----------------|
| Error output | 有堆栈、工具失败输出、控制台/服务端日志 |
| Impact | Description 里影响写得不够时 |
| Evidence | perf 数字、N/N 次复现、waterfall 截图 |
| Related issues | 易混 issue、需写 related but distinct |
| Suspected code paths | 已读代码，能点名文件/符号 |
| Suggested regression coverage | 能写出最小测试/断言 |
| Non-goals | 功能/任务容易膨胀时 |
| Proposed approach | 有高层方向，不是长设计 |
| Alternatives | 试过绕过或否决过方案 |
| How to observe success | 尤其 `perf:` 任务 |
| Background | 「为什么现在做」不明显时 |
| Area / Additional | 路由或补充材料需要时 |

## 2.2 好 Issue 共性

1. 具体可检索标题  
2. 发生了什么 + 为何要紧  
3. 可跟做的 repro / 或 Feature 的 use case  
4. Expected / Done when 可验收  
5. Environment（Bug）或范围边界（Feature/Task）

## 2.3 提完

Milestone → Assignee → 一个 PR `Fixes #N`。

## 2.4 vs bd

GitHub Issue = 人类协作；bd = 本地 agent 树。
