---
name: issue-fix-check
description: >
  本仓库（flatpickr-ce）处理 GitHub issue / PR 的固定流程：主会话（Opus 5.5）读 issue 或 PR → 定位根因、修复或移植 PR → 写测试自验
  → 按修复 diff 分级，需要时起一个不带前情的 Fable 检查者，检查「修的是不是根因、是不是最优解、PR 该原样合并还是重写」
  → 校对检查结论后报给用户，不通过的改法由用户拍板再动。文案 / 翻译 / 文档 / 纯测试这类改动不起检查者。
  用户贴出 GitHub issue 或 PR 链接（flatpickr/flatpickr 上游或 colinli007/flatpickr-ce）、写出 flatpickr#NNNN、
  说「处理一下这个 issue」「看看这个 PR 能不能合」「把 #3083 修了」「修完检查一下是不是最优解」时使用，即使没提 skill 名也应使用。
  只要评审不要修改（用 /code-review）、或只做不改行为的代码整理（用 code-refine）时不用。
---

# issue-fix-check

把一个 GitHub issue 修掉（或把一个 PR 移植进来），再按改动的风险决定要不要起一个**不带前情**的 Fable 做独立检查，确认修法打在根因上、是当前最优解。

分工：

| 角色 | 模型 | 做什么 |
| --- | --- | --- |
| 主会话 | Opus 5.5（默认 high） | 读 issue / PR、复现、定位、修复或移植、写测试、分级、校对检查结论、向用户汇报 |
| 检查者 | Fable（按第 4 步分级决定起不起） | 只读检查修法 |

为什么这样分：

- 修的难点是定位和复现，要靠 issue 讨论、上游 PR、仓库历史、项目记忆这些只有主会话才有的上下文，所以主会话自己修。
- 检查的价值主要来自**上下文独立**：检查者只拿到 issue、diff 和一份根因陈述，看不到修的人怎么一路想过来，才不会被带着走。Fable 对「该不该这样改、往哪个方向改、PR 该原样合还是重写」判断最稳，所以检查者固定用 Fable。
- Fable 一次要 5–10 分钟，改个翻译、修个错别字不值得。分级脚本决定什么时候省掉这一步。

**什么时候建议主会话升到 xHigh**：问题涉及事件时序（focus / blur / 外部点击 / onChange 先后）、定位与布局、移动端原生输入、多插件交互，或者这个问题已经修过一轮没修好。主会话无法自己改 effort——遇到这些情况先告诉用户，建议他用 `/model` 在 Opus 5.5 上按 ←/→ 调到 xHigh 后再继续。常规问题不必升。

## 第 0 步：读 issue / PR，先查是不是已经处理过

```bash
gh issue view <N> -R flatpickr/flatpickr --comments          # 上游 issue；ce 自己的用 -R colinli007/flatpickr-ce
gh pr view <N> -R flatpickr/flatpickr --comments --json title,body,author,commits,files,comments
gh pr diff <N> -R flatpickr/flatpickr > <scratchpad>/pr-<N>.diff
```

开工前先查三处，已经处理过就直接告诉用户，不重做：

- `git log --oneline --grep "flatpickr#<N>"`：仓库里已经有对应提交。
- 进度清单 colinli007/flatpickr-ce#3（2024 年开的，`gh issue view 3 -R colinli007/flatpickr-ce`）和已关闭的 #2（2025 年起的，已在 4.8.0 完成，`gh issue view 2 -R colinli007/flatpickr-ce`），两个都查：这一项可能已有分诊结论（原样合并 / 重写 / 关闭为重复），按那条结论做；用户当场的要求优先。
- 同一个问题的其他 issue / PR：`gh search prs --repo flatpickr/flatpickr "<关键词>"`，issue 里提到的 PR 编号也要看。多个 PR 修同一个问题时一起比较，不要只看第一个。

把 issue 翻译成「什么配置（options / 插件）、什么操作、看到了什么、期望是什么」。issue 没给复现、或者描述和当前代码对不上，先在 jsdom 测试里试着复现；复现不出来就停下告诉用户，不要猜着修。

**输入是 PR 时**，修复的出发点是 PR 本身，要在三种处理里选一种，写进第 2 步的根因陈述：

- **原样合并**：PR 打在根因上、写法和仓库一致。移植时保留原作者，压成一个提交。
- **重写**：问题是真的，但 PR 修的是症状、写法不合仓库或带了无关改动（例如顺手改了 CI workflow）。按根因重写，提交说明里写清和 PR 的差别，PR 里的测试能用就带上。
- **不合并**：问题不成立、已被别的提交修掉、或是另一个 PR 的不完整重复。写明理由，不改代码，跳到第 6 步汇报。

取 PR 的作者信息留给提交用：`gh api repos/flatpickr/flatpickr/pulls/<N>/commits --jq '.[].commit.author'`。

## 第 1 步：开修前留底

- 先 `git fetch` 再 `git status`：用户可能自己推过、提交过，确认当前分支（上游 backlog 在 `fix/upstream-backlog` 上做）和工作区状态。
- 修复要碰的文件如果**已经有未提交改动**，动手前把它当前内容复制到 `<scratchpad>/pre-fix/<仓库相对路径>`，之后用 `diff -u <留底> <现在>` 取出「只属于这次修复」的 diff。直接 `git diff` 会把别的改动混进来，分级和检查都会被带偏。
- 不碰与本次修复无关的未提交 / 未跟踪文件，汇报时提醒用户。

## 第 2 步：定位并修复（主会话）

按用户全局 CLAUDE.md 的「第一性原理」与「多轮修复不叠补丁」执行，这里不重复。额外要求：动手修之前，把下面这份**根因陈述**写进 `<scratchpad>/root-cause.md`，它是交给检查者的待验证说法，也是第 4 步分级的输入：

```
现象：什么配置、什么操作下看到什么（期望什么）
根因：为什么会这样（落到具体代码 文件:行号）
所选信号 / 改动点：改哪里，为什么是这里而不是别处
PR 处理（输入是 PR 时）：原样合并 / 重写 / 不合并，理由；重写时和 PR 的差别
考虑过并放弃的方案：每个一句话，放弃的理由（输入是 PR 时，PR 原本的写法算一个候选）
行为变化：对现有用户可见的变化（触发的回调、选中的日期、输入框的值、公开选项），要写进发版说明；没有就写「无」
假设：修法成立依赖、但没法在 jsdom 里验证的前提（真实布局、移动端原生输入、特定浏览器）；没有就写「无」
```

写不出「考虑过并放弃的方案」时，说明还没比较过，先比较再动手。

定位代码按仓库惯例：先 CodeGraph（`codegraph_explore`，英文符号名做 query，中文 query 会零命中），查文案、选项名、CSS 类名再用 grep 指定文件。核心逻辑在 `src/index.ts`（单个大工厂函数），选项默认值和类型在 `src/types/`，插件在 `src/plugins/`，插件会直接用 `fp._input`、`fp._positionElement` 这类内部成员——改核心时要查插件的用法。

## 第 3 步：自验

1. **先写一个会失败的测试**：核心放 `__tests__/src/index.spec.ts`，插件放 `__tests__/src/plugins/` 下对应文件，沿用文件里已有的建实例、模拟事件的写法。修复前跑一次确认它红，修复后确认它绿——红过的测试才证明复现了 issue。issue 提到的触发方式要覆盖，修法改变了行为的**相邻情形**也要覆盖（另一种 mode、`inline`、`allowInput`、`static`、带 `minDate` / `maxDate`、另一个插件），检查者最常在这些地方抓到问题。
2. `npm test`（`tsc --noEmit` + 全量 jest），全绿才继续；`npx prettier --trailing-comma es5 --check <改动的 .ts 文件>`。改到 `src/l10n/index.ts`、构建配置或新增 locale 时再跑 `npm run build`。
3. 涉及定位、布局、移动端这类 jsdom 测不了的，用 `npm start`（rollup 起在 http://127.0.0.1:8000 ，页面是 `index.html`）配合 chrome-devtools MCP 实跑。条件实在造不出来可以不跑，但报告里要写明「未在浏览器验证」和原因，这类前提要写进根因陈述的「假设」。
4. 生成修复 diff 存到 `<scratchpad>/fix.diff`：没有留底的文件用 `git diff -- <文件>`，新文件用 `git diff --no-index /dev/null <文件>`，有留底的用 `diff -u`。测试文件也放进去。

自验不过不进第 4 步。

## 第 4 步：分级，再按级别检查

```bash
python3 .claude/skills/issue-fix-check/scripts/classify.py <scratchpad>/fix.diff <scratchpad>/root-cause.md [--round2]
```

`--round2`：同一问题已经修过一轮没修好时加上。脚本只看「改动碰到了什么」，不看 issue 听上去难不难——标题像小问题的 issue，修法可能落在 `src/index.ts` 的共享路径上。脚本给的是**下限**：主会话可以升级，降级必须由用户明确说。用户说「这个也要 check」时照办。

| 脚本输出 | 做法 |
| --- | --- |
| `SKIP`（只动文档 / 注释 / 样式 / 测试 / 翻译文案，或代码里只改了字符串字面量） | 不起检查者，直接第 6 步，汇报里写明「分级 SKIP，未做独立检查」 |
| `CONFIRM`（没有新增逻辑，但删掉了带条件的行，或 locale 里有 `ordinal` 这类小函数） | 主会话对 `confirm_items` 逐条确认（删掉的条件和它守护的内容一起删了；locale 函数和同语族其他 locale 的写法一致），写进汇报。任何一条确认不了就按 `CHECK` 处理 |
| `CHECK` | 起 Fable 检查者，见下 |

以下情况不管脚本怎么判都按 `CHECK`：输入是 PR 且第 2 步选了「原样合并」而 PR 改了逻辑——「原样合并」本身就是一个要被检查的判断。

**起检查者**：Agent 工具，`subagent_type: "general-purpose"`、`model: "fable"`、`effort: "high"`、全新 agent。不要用 fork——fork 会继承本会话的推理过程，并且会忽略 model 参数。提示词用 `references/checker-prompt.md` 的模板，占位符全部填上。只给检查者**结论**：issue / PR 原文、`fix.diff`、`root-cause.md`、上游 PR 的 diff（有的话）；修复时的试错、推理不要放进去。

检查者在后台运行，发起后先返回「已启动」的回执，那不是结果。等完成通知到了再进第 5 步；用户中途问就如实说还在跑。等待期间不要自己去重做同样的检查。

## 第 5 步：校对检查结论

检查者的话不直接转给用户，先过一遍：

- **抽查引用**：挑三五处 `文件:行号` 去原文件核对，对不上说明它读串了，用 SendMessage 让它重查那部分（SendMessage 是延迟加载的工具，先 `ToolSearch("select:SendMessage")`）。
- **核实分量最重的事实**：「这个改动会让 rangePlugin 多触发一次 onChange」「仓库别处都用 X 写法」「`inline` 模式下会回归」——能写成 jest 用例的就写一个跑一下，属实再保留。临时用例放 scratchpad 或跑完删掉，不要留在 `__tests__/` 里。
- **评估它提的替代方案**：真的更接近根因，还是只是另一种写法？要动的范围多大？会不会改变公开 API（选项、钩子、实例方法、`typings.d.ts`）或现有用户能看到的行为？
- 你不同意的条目留着，但写明理由——用户要看到双方的看法，而不是被你过滤后的结论。

## 第 6 步：向用户汇报

```
## Issue / PR
一句话：哪个 issue / PR（链接），什么现象；输入是 PR 时写处理方式（原样合并 / 重写 / 不合并）

## 根因与修法
根因、改了哪些文件（文件:行号）、为什么改这里；行为变化（要写进发版说明的）

## 自验
新增了哪些测试、修复前是否确认过失败；npm test / prettier 结果；浏览器是否验证、怎么验的，没验证就直说

## 检查
分级：SKIP / CONFIRM / CHECK（命中了哪些条件），检查者：无 / Fable
结论：最优 / 可行但有更好的方案 / 未触及根因 / 引入新问题
- 它提的每条意见 → 我的看法（同意 / 不同意 + 理由）

## 需要你决定
（检查不通过或有更优方案时）候选改法的对比：改动范围、风险、我的建议
```

**检查结论不是「最优」时，到这里停下等用户确认**，不要自己按检查意见去改。用户确认后（「1」「确认」「执行」都算）：

1. 按确认的方案改，重跑第 3 步自验，更新 `fix.diff`。
2. 用 SendMessage 把新 diff 发给**同一个**检查者，请它确认之前提的问题是否已解决、有没有带出新问题（它记得自己的顾虑，比新起一个更适合做这一步）。
3. 再按第 6 步的格式汇报一次。

## 用户要求提交时

按仓库已有提交的写法（`git log -8` 看一眼）：

- 英文提交信息。标题用祈使句说清行为，末尾带 `(flatpickr#<N>)`；正文讲之前怎么错、为什么错、现在怎么做、有哪些行为变化，最后写 `Fixes flatpickr/flatpickr#<N>`，重写了某个 PR 时加 `Supersedes flatpickr/flatpickr#<N>`。
- 移植 PR：每个 PR 压成一个提交，`--author` 用第 0 步取到的原贡献者，我们自己的调整写在正文里。
- 提交后把进度清单 colinli007/flatpickr-ce#3 对应那一行要更新成什么（勾选、行尾写 commit 和一句处理说明）拟好给用户看，用户同意再改 issue。

## 不做的事

- 不在上游 issue / PR 下回复。上游回复要等发版之后统一发，回复里写 ce 的版本号和提交链接。
- 不发版、不打 tag、不推送，除非用户要求。
- 检查者在本 issue 范围之外发现的问题，列进汇报的「顺带发现」，本次不修——范围悄悄扩大后，diff 就不再是检查过的那个。
