---
name: backlog-loop
description: >
  把 issue-fix-check 串成循环，批量处理进度清单 colinli007/flatpickr-ce#2：主会话只做编排，每个任务新起一个执行者（Opus）修复并自验，
  按 diff 分级新起一个 Fable 检查者评审，通过就提交，不通过就搁置进 stash，然后接着下一个；每个任务的执行者和检查者都是全新 agent，
  不带上一个任务的上下文。一批跑完汇总结果，并拟好 issue #2 的更新给用户确认。
  用户输入 `/backlog-loop`、说「把清单里的 issue 一个个修下去」「批量处理 backlog」「循环跑 issue #2」「自动修完一个接下一个」时使用。
  只处理一个 issue / PR 时用 issue-fix-check。
---

# backlog-loop

在 issue-fix-check 外面加一层循环：每个任务的修复交给新起的执行者，评审交给新起的 Fable 检查者，主会话负责选任务、分级、校对、提交、汇总。

| 角色 | 怎么起 | 做什么 |
| --- | --- | --- |
| 主会话 | — | 选任务、起 agent、分级、校对检查结论、提交或搁置、汇总 |
| 执行者 | 全新 Agent，`general-purpose`，不传 model（继承 Opus 5.5），`effort` 按第 2 步 | issue-fix-check 第 0–3 步，产出根因陈述、修复 diff、提交说明 |
| 检查者 | 全新 Agent，`general-purpose`，`model: "fable"`，`effort: "high"` | issue-fix-check 第 4 步的独立检查 |

为什么修复也交给子 agent：复现、试错、读代码会把上下文占满。放在执行者里，主会话每个任务只留下执行者的简报和检查结论，才能一个接一个跑下去。两个角色都不用 fork，fork 会继承主会话的上下文，也会忽略 model。

参数：`/backlog-loop [N]` 最多处理 N 个任务（默认 5）；`/backlog-loop flatpickr#A flatpickr#B …` 只处理这几个，按给的顺序。

## 第 0 步：开跑前

1. `git fetch` 后 `git status`：必须在 `fix/upstream-backlog` 上，且 `git status --porcelain` 为空。不满足就停下告诉用户，不替用户 stash 或提交——搁置靠 `git stash push -u`，工作区不干净会把用户自己的文件一起收走。
2. 批次目录 `<scratchpad>/backlog-loop/`，每个任务一个子目录 `<scratchpad>/backlog-loop/<N>/`。

## 第 1 步：排任务队列

用户给了编号就用编号。否则读清单 `gh issue view 2 -R colinli007/flatpickr-ce --json body --jq .body`，按未勾选项所在小节归类：

| 小节 / 标记 | 归为 |
| --- | --- |
| Port from upstream PRs、Locales、Fix in flatpickr-ce | 修复任务 |
| Needs a repro or a decision，或行内写了 verify with a repro | 调查任务：执行者只复现、出候选方案，不改代码 |
| Already fixed (reply only)、Usage questions、结论是 close 的、标了 deferred 的 | 跳过：只需回复，发版后统一做 |

按清单顺序取前 N 个，用一行告诉用户这批跑哪些，然后直接开跑，不等确认。

## 第 2 步：起执行者

1. 定 effort：`gh issue view <N> -R flatpickr/flatpickr --json title --jq .title` 只看标题。涉及事件时序（focus / blur / 外部点击 / onChange 先后）、定位与布局、移动端原生输入、多插件交互的用 `xhigh`，其余 `high`。
2. 用 `references/fixer-prompt.md` 的模板起执行者，占位符全部填上。
3. 执行者在后台跑，等完成通知，不要轮询，也不要自己去做同样的事。

## 第 3 步：按执行者状态分流

先核对工作区：`git status --porcelain` 列出的文件必须和执行者报的「改动文件」一致。对不上就按「搁置」处理，原因写「工作区有简报之外的改动」。

| 状态 | 做法 |
| --- | --- |
| `FIXED` | 进第 4 步 |
| `NO_CHANGE`（已有提交 / PR 不合并 / 复现不出） | 工作区应为空。记进汇总，接下一个 |
| `NEEDS_DECISION`（调查任务，或执行者认为清单上的分诊有误） | 工作区应为空。记进汇总的「待你决定」，`report.md` 在任务目录里，接下一个 |
| `BLOCKED` | 有改动就搁置，记原因，接下一个 |

## 第 4 步：分级与检查

按 issue-fix-check 第 4、5 步做，输入用任务目录里的 `fix.diff` 和 `root-cause.md`：

```bash
python3 .claude/skills/issue-fix-check/scripts/classify.py <任务目录>/fix.diff <任务目录>/root-cause.md
```

- `SKIP`：不起检查者，直接第 5 步。
- `CONFIRM`：主会话逐条确认 `confirm_items`，确认不了就按 `CHECK`。
- `CHECK`：用 issue-fix-check 的 `references/checker-prompt.md` 起检查者，在提示词末尾加一段：「完整报告写入 `<任务目录>/review.md`。回复里只给『结论』小节和『必须修的问题』每条的标题。」完整报告留在文件里，主会话校对时按需读，不整份进上下文。

校对按 issue-fix-check 第 5 步：抽查两三处 `文件:行号`，分量最重的事实能写 jest 用例的就跑一下。

结论是「最优」、或 `SKIP` / `CONFIRM` 确认通过的 → 第 5 步提交。其余一律搁置，不自己按检查意见改——改法由用户拍板。

## 第 5 步：提交或搁置

**提交**（调用这个 skill 就算授权本地提交，不推送）：

1. 主会话自己跑 `npm test` 和 `npx prettier --trailing-comma es5 --check <改动的 .ts 文件>`，全绿才继续。执行者报过绿也要重跑：这是提交前唯一的门禁，不能只凭简报。
2. 对照 `git log -3` 和 issue-fix-check「用户要求提交时」核对 `commit-msg.txt`：检查者校对后确认的行为变化要写进正文。
3. `git add <fix.diff 里的文件>`，`git commit -F <任务目录>/commit-msg.txt`；任务目录里有 `author.txt`（移植 PR）时加 `--author "$(cat <任务目录>/author.txt)"`。
4. 提交后 `git status --porcelain` 应为空。

**搁置**：

1. 按 issue-fix-check 第 6 步的格式把汇报写进 `<任务目录>/report.md`。
2. `git stash push -u -m "backlog-loop: flatpickr#<N> <一句原因>"`，工作区回到干净状态，下一个任务才不会混进这次的改动。

每个任务结束，往 `<scratchpad>/backlog-loop/summary.md` 追加一行，并给用户输出一行进度：`flatpickr#<N> → 已提交 <hash> / 搁置 / 无需改动 / 待决定：一句话`。然后直接开始下一个任务。

## 什么时候提前停

- 本批已处理 N 个，或队列空了。
- 连续两个任务被搁置：多半是有共性问题（分诊方向、仓库状态、某个前提不成立），继续跑只会再多搁置几个。
- 出现意外的仓库状态：提交失败、提交前的 `npm test` 变红、工作区有不属于本任务的改动。
- 用户中途发消息：当前 agent 跑完后先回应用户，用户说继续再接着跑。

## 批次汇报

```
## 本批结果
| 任务 | 结果 | 一句话 |
（已提交写 commit；搁置写 stash 的 message；待决定写需要决定什么）

## 需要你决定
每个搁置 / 待决定项：问题、候选改法、我的建议，详情见 <任务目录>/report.md（写完整绝对路径）

## issue #2 更新草稿
已提交项要改成的行：勾选，行尾按清单现有写法写 commit 和一句处理说明
```

issue #2 的更新等用户确认后一次性用 `gh issue edit 2 -R colinli007/flatpickr-ce --body-file <文件>` 改，改之前重新取一次正文，在最新版本上替换，不覆盖用户这期间的手动修改。不推送、不发版、不在上游回复。

用户对某个搁置项拍板后：`git stash list` 找到对应项，`git stash pop`，按决定修改，然后接 issue-fix-check 第 3 步往下。原检查者已经不在，复查要新起，分级加 `--round2`。
