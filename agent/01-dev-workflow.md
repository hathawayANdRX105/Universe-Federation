# 1. 如何参与项目开发

参考 [Misskey CONTRIBUTING](https://github.com/misskey-dev/misskey/blob/develop/CONTRIBUTING.md) 与常见 GitHub 协作习惯，结合本仓库实践。

## 1.1 标准流程

```text
Issue（讨论/认领）
  → fork 或本仓分支（有写权限用本仓分支即可）
  → 从最新 main 拉分支
  → 本地开发（只做这一件 Issue）
  → 自测 / 清理工作区
  → 开 PR（Fixes #N）
  → PR CI / Actions
  → 失败则修，再推同一分支
  → Review
  → 修改后再次 CI / Review
  → 合并 → Issue 关闭
```

| 阶段 | 做什么 | 不要做什么 |
|------|--------|------------|
| Issue | 说清问题/目标，挂 Milestone，可认领 | 没 Issue 就大改代码 |
| 分支 | `fix/12-short-name` 一类 | 直推 `main` |
| 开发 | 只改本 Issue 范围 | 顺手重构半个 monorepo |
| PR | 一 PR 一 Issue，`Fixes #N` | 一个 PR 关多个无关 Issue |
| CI | 看红灯，修到绿或说明阻塞 | 无视 Actions 硬求合 |
| Review | 按评论改；范围外新开 Issue | 在 PR 里塞新需求 |

### 没有写权限时

1. Fork 本仓库。  
2. 在 fork 上开分支、推送。  
3. 向本仓库目标分支（默认 `main`，以仓库设置为准）开 PR。  
4. 流程其余相同。

### 有写权限时

不必 fork；本仓开分支 + PR 即可。**仍然禁止直推 `main`。**

## 1.2 先 Issue，再拆小

**实现前先有 Issue**（Misskey 也要求先讨论设计/目标，否则 PR 易被拒）。

| 好 | 坏 |
|----|-----|
| 一个可独立合并的改动 = 一个 Issue | 「重构后端 + 修 5 个 bug」一条 Issue |
| 大需求拆成多条 Issue，多条 PR | 一个 PR 绑 `#1 #2 #3` 混装 |
| PR 只写 `Fixes #12` | PR 无 Issue、或关一堆无关号 |

**拆分标准：** 一个 PR 能否单独 review、单独回滚、单独通过 CI？不能就再拆。

**认领：** Issue `Assignee` 写自己 = 已领；未 Assignee = 可领。一人一条。

## 1.3 开发时保持仓库干净

| 可以 | 不可以 |
|------|--------|
| 改 Issue 相关源码/测试/必要文档 | 随手新建无关目录、dump 文件 |
| 更新 Issue 要求的配置 **示例** | 提交真实 `.config/*`、密钥、token、用户数据 |
| 本地装依赖、跑测试 | 把 `node_modules/`、构建产物、`.beads/`、`.codegraph/` 提交进库 |
| 临时调试 | 把调试脚本/日志永久留在仓库根目录 |

提交前自检：

```text
git status          # 只有本 Issue 相关文件
git diff            # 无无关格式化/大清理
```

多余文件：`gio trash` 或移出仓库；不要 `git add .` 一把梭。

## 1.4 分支与 main

- **`main`**：稳定基线（当前协作以 upstream 对齐的 tip 为准；历史 CI 试验在旁支如 `ci/actions-wip`）。  
- 功能/修复：**从最新 `main` 开分支**，定期 rebase/merge `main` 减少冲突。  
- 合入路径：**只通过 PR**。

## 1.5 CI 与 Review

1. 开 PR 后等 **GitHub Actions**（及仓库配置的检查）。  
2. 红了：在同一分支修 → push → 再跑。  
3. Reviewer 看：是否对上 Issue、范围、明显 bug/安全。  
4. 通过后由维护者合并；Issue 因 `Fixes #N` 自动关。

**不要**在 CI 仍红、且无说明时反复 @ 人求合。

## 1.6 一句话给成员

> 找/开 Issue → Assignee 自己 → 开分支开发 → PR 写 `Fixes #编号` → 等 CI 与 Review → 合入。  
> 一个 PR 只干一件事；仓库不留垃圾文件。
