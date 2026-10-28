## Context

`src/plugins/monthSelect/index.ts` 现在靠三条互不相干的路径来同步月份格子：

| 路径 | 触发时机 | 做了什么 | 问题 |
|---|---|---|---|
| `buildMonths()` | `onReady`、点翻年箭头、`closeHook` | 用 `fp.createDay` 重建 12 个格子 | 没有挂在状态变化上 |
| `selectYear()` | 点翻年箭头 | 改每个格子 `dateObj` 的年份，**只按 min/maxDate** 判断禁用，然后标选中 | 禁用规则和 `createDay` 不一致；里面的年份夹取是死代码，因为 `changeYear()` 本来就拒绝超出范围的年份（`src/index.ts:1513`） |
| `setCurrentlySelected()` | `onValueUpdate`、`onReady`、`setMonth` | 只按月份切换 `.selected` | 不看年份 |

`onValueUpdate` 不能当作「状态变了」的信号：`updateValue(triggerChange)` 只有在 `triggerChange !== false` 时才会触发它（`src/index.ts:2858`），而 `setDate()` 默认就是 `false`；`clear()` 根本不调用 `updateValue`。

核心重建日期格子都经过 `buildDays()`（`src/index.ts:921`），所有会改变视图的入口最后都汇到这里：

```
setDate ---------> self.redraw() --+
jumpToDate ------> self.redraw() --+
clear -----------> self.redraw() --+
changeYear ------> self.redraw() --+--> redraw() --> buildDays()
set(...) --------> self.redraw() --+        ^
config.minDate = > minMaxDateSetter --------+    (内部直接调 redraw，不经过 self.redraw)
changeMonth / ctrl+方向键 ----------------------> buildDays()   (不经过 redraw)
selectDate 跳月 -------------------------------> buildDays()
```

最初的方案是包装实例方法 `fp.redraw`，评审发现图中最后三条会漏掉：`changeMonth` 在插件模式下可以通过 ctrl+方向键到达，而且会跨年。

## Goals / Non-Goals

**Goals:**
- 月份格子只靠一个信号同步。这个信号要覆盖上图的全部入口，核心以后新增入口时也不需要改插件。
- 禁用状态和 range 样式全部交给核心的 `createDay`。插件只补充 `createDay` 按天判断做不到的两件事：按月判断的 today，以及考虑年份的 selected。

**Non-Goals:**
- 不改变月份禁用的判断标准。现在用每月 1 号来判断，所以 `minDate` 是 3 月 20 日时整个 3 月都被禁用。这一点本次保持不变，spec 也不对它做规定。
- 不扩大 `multiple`/`range` 模式下 `.selected` 的范围。仍然只标 `selectedDates[0]` 所在的月份，只是加上年份判断。
- 不处理移动端原生 input（上游 #3119），也不清理已经失效的 `_stubbedCurrentMonth` 代码，这两件另开条目。

## Decisions

### 1. 信号：在核心的 `buildDays()` 末尾触发新钩子 `onDaysBuilt`

`buildDays()` 是核心「把视图按当前状态重建」的唯一出口，在它的末尾加上 `triggerEvent("onDaysBuilt")`，放在 range 模式的 `onMouseOver()` 之后。monthSelect 的本质是用月份格子替换日期格子，所以让它在日期格子重建的同一时刻重建自己的格子。

否决的方案：
- **包装 `fp.redraw`**：会漏掉 `changeMonth`、`minMaxDateSetter`、`selectDate` 这几条直接调内部函数的路径（见 Context 里的图）。
- **`onValueUpdate` / `onOpen` / 把多个事件拼起来**：`setDate(x, false)` 加上 inline 模式这种情况收不到任何事件。靠拼凑事件去猜状态有没有变，本身就说明选错了信号。
- **把钩子放在 `redraw()` 里**：能覆盖 `minMaxDateSetter`，但 `changeMonth` 和 `selectDate` 不经过 `redraw()`，还得在那两处再各触发一次。放在 `buildDays()` 里只需要一处。

命名用 `onDaysBuilt`，直接说明触发时机是「日期格子建完了」，不叫 `onRedraw`，因为有的入口并不经过 `redraw`。

钩子要在 `src/types/options.ts` 的 `HookKey`、`HOOKS`、`Options`、`ParsedOptions` 和默认值五个地方登记。登记进 `HOOKS` 以后，插件返回的配置（`src/index.ts:2116`）和 `set()`（`src/index.ts:2446`）就会自动识别这个钩子，不需要另写注册逻辑。

触发时机说明：初始化时的第一次 `buildDays()`（`src/index.ts:617`）发生在插件的 `onReady` 之前，这时 monthSelect 还没有建自己的容器，`render()` 会因为 `monthsContainer` 为空直接返回。`noCalendar` 和移动端没有 `daysContainer`，`buildDays()` 一开头就返回，不会触发钩子。

### 2. monthSelect 的 `render()`：用 `createDay` 重建，再补 today 和 selected

`render()` 挂在 `onDaysBuilt` 上，依次做三件事：

1. 用现在的 `buildMonths()` 重建 12 个格子。禁用状态和 range 样式来自 `createDay`。`buildMonths()` 里按月判断 today 的那段（`index.ts:81-85`）**要保留**：`createDay` 的 today 是按天比较的（`src/index.ts:707`），月份格子的 `dateObj` 是每月 1 号，只有每月 1 号当天才能匹配上。
2. 标选中：`selectedDates[0]` 的年份等于 `fp.currentYear` 时，给同一月份的格子加 `.selected`。`createDay` 也会打 `.selected`，但它要求年月日完全相同（`src/index.ts:717`），像 `setDate(new Date(2026, 4, 15))` 或者 `defaultDate` 不是 1 号的情况就匹配不到，所以插件要按月份再补一次。
3. 翻年箭头的禁用状态。现在写在 `buildMonths()` 末尾，保持不动。

年份数字由核心的 `updateNavigationCurrentMonth` 负责写，插件不再写。

不在原来的 DOM 节点上切换 class，是因为那样插件里就得再实现一遍 `isEnabled` 的规则。`selectYear()` 只看 min/maxDate、忽略 `disable`，就是这样出的错。12 个节点的重建成本可以忽略。

### 3. 删除的代码

- `selectYear()`，以及翻年箭头回调里对 `selectYear()` 和 `buildMonths()` 的调用。回调只保留 `fp.changeYear(...)`，它会触发 redraw，进而触发 `buildDays` 和 `onDaysBuilt`。
- `onValueUpdate: setCurrentlySelected`、`onReady` 里单独调用的 `setCurrentlySelected`、`setMonth` 末尾的 `setCurrentlySelected()`，都由 `render()` 代替。
- `closeHook` 里的 `if (!fp.selectedDates.length) buildMonths()`：range 模式下放弃选择时，`fp.clear(false)` 本身会触发重建。现有的两个「clears the highlighting」用例用来验证删掉后行为不变。

### 4. 焦点在 `setMonth` 里恢复

格子重建后，原来带焦点的节点被移出 DOM，焦点会掉到 `body` 上。核心的 keydown 只绑在 `_input` 和 `calendarContainer` 上（`src/index.ts:447-450`），焦点在 `body` 时方向键就失效了。用鼠标点击时，mousedown 会把焦点给到 `tabIndex=-1` 的格子上，所以点击和回车都会碰到这个问题。

处理方式：在 `setMonth`（点击和回车共用的入口）里，调用 `fp.setDate` 之前，先记下当前焦点所在格子的 `$i`（焦点不在格子里时记 -1）；调用之后，如果记下的值不是 -1，就把焦点设到同一 `$i` 的新格子上。这和核心选中日期后自己重设焦点的做法一致，`render()` 只管渲染。

## Risks / Trade-offs

- [新增公共 API] `onDaysBuilt` 一旦发布，就要按公共钩子来维护。→ 语义收敛到「日期格子重建完成」，spec `calendar-hooks` 写明了触发的入口和不触发的情况。
- [重复渲染] `setDate` 会让 `buildDays` 执行两次：一次是 `self.redraw()`，另一次是 `jumpToDate` 里的重绘，而且第一次时 `currentYear` 还是旧值。所以 `render()` 也会跑两次，最后一次是正确的结果。每次只有 12 个节点，核心自己的日期格子也是一样重复重建。
- [onDayCreate 次数] 以前月份格子只在初始化和翻年时触发 `onDayCreate`，现在每次重建都会触发。核心的日期格子本来每次 redraw 就会触发大约 42 次，插件的 12 次只是叠加在上面。发版说明里会写一句。
- [点击过程中节点被替换] 被点击的格子在 `selectMonth` 执行过程中会被换掉。`setMonth` 之后的代码只读 `fp.config` 和 `fp.selectedDates`，不会再碰这个节点，所以不受影响。

## Migration Plan

不需要迁移。新钩子是纯新增，插件的配置、输出和事件都不变，按补丁或小版本发布。发版说明写明：修复上游 #3067、#3109；新增 `onDaysBuilt` 钩子；月份格子的 `onDayCreate` 触发时机有变化。
