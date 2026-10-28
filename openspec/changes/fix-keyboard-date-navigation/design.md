## Context

方向键导航现在由三个函数完成（`src/index.ts:770-852`）：

```
onKeyDown 左/右  --> focusOnDay(undefined, +-1)
onKeyDown 上/下  --> focusOnDay(undefined, +-7)
ctrl+左/右       --> changeMonth(+-1) --> focusOnDay(getFirstAvailableDay(1), 0)
ctrl+上/下       --> changeYear(-+1)  --> focusOnDay(getFirstAvailableDay(1), 0)

focusOnDay(current, offset)
  起点 = current / 当前聚焦的格子 / 可见的已选日期 / 可见的今天 / getFirstAvailableDay
  起点为空           --> _input.focus()                      <-- #3064：焦点掉回 input
  没有格子获得焦点   --> 聚焦起点（进入网格，不移动）
  否则               --> getNextAvailableDay(起点, offset)

getNextAvailableDay(current, delta)
  月份序号 = current.dateObj.getMonth() - currentMonth       <-- #3099：跨年时为负数
  在各个 dayContainer 里按下标逐格扫描，条件是 |current.$i - i| >= |delta|
                                                           <-- 跨容器时比较的是两个月份里的下标
  一个都没找到 --> changeMonth(+-1)，再聚焦新视图的第一个可选格子
                                                           <-- 上下键跨月后不再是同一星期几
```

导航的本意是「从当前日期移动 n 天」，现有实现却用格子下标和月份序号去近似日期。上面标出的三个问题都来自这种近似。

已经核实的事实（含 Fable 评审的实测结果）：
- 日期格子的 `dateObj` 就是它代表的日期。只有可选日期的格子会设置 `tabIndex = -1`（`src/index.ts:716`），所以可选日期的格子一定不带 `flatpickr-disabled`。
- `isInView(elem)`（`src/index.ts:1616`）只检查元素「没有 hidden 或 disabled 样式，并且在 daysContainer 里」，不要求它是日期格子，所以 daysContainer 自己也会被判为在视图中。在现有代码里，让 daysContainer 获得焦点后按右键，会抛出 `TypeError: reading 'getMonth'`。
- 单月视图固定显示 42 个格子，前后相邻月份的日期可见、可以聚焦。多月视图中相邻月份的日期带 `hidden`。
- `onKeyDown` 里左右键和上下键的进入条件不一样。左右键（`src/index.ts:1717-1721`）要求按键目标不是 input，并且 `allowInput === false` 或焦点元素 `isInView`。上下键（`src/index.ts:1739-1744`）要求按键目标有 `$i`，或者按键目标就是 input/altInput。所以焦点落在 daysContainer 上时，上下键和 ctrl+上下键都不会进入导航逻辑。
- 使用 monthSelect 时，插件会把 daysContainer 从 rContainer 里摘掉（`src/plugins/monthSelect/index.ts:38`），但 `fp.daysContainer` 引用还在。核心的方向键分支会先于插件的 `onKeyDown` 钩子（`src/index.ts:1816`）执行；在现有代码里，这一步会把焦点抢到 input 上。
- `noCalendar` 时 daysContainer 为 undefined，焦点在 input 上按下键，`getFirstAvailableDay` 会抛 `TypeError`（`src/index.ts:775`）。
- `changeMonth` 的事件顺序是：`onYearChange`、`buildDays`、`onMonthChange`、`updateNavigationCurrentMonth`（`src/index.ts:1326-1339`），但年份只回绕一次。`jumpToDate(date, true)` 的顺序是 `onYearChange`、`onMonthChange`、`redraw`，这时 `onMonthChange` 拿到的还是旧网格；weekSelect 在 `onMonthChange` 里读 `fp.days`（`src/plugins/weekSelect/weekSelect.ts:75`），会读到旧数据。

## Goals / Non-Goals

**Goals:**
- 导航只依赖日期计算，不依赖格子下标，也不依赖月份序号。
- 「目标是否可见」只看 DOM：视图中有没有一个可见的、日期等于目标的格子。
- 只要日期网格存在，按方向键时焦点就不会离开日历。

**Non-Goals:**
- 不改焦点在 input 上时左右键的行为（现在不导航），也不改 `allowInput` 打开时按键在 input 和日历之间的分流。
- 不新增 Home/End/PageUp/PageDown，不处理 #3065 中更大范围的无障碍需求。
- 不修复「已选日期位于首月最后几天时，起点会被后面隐藏的同日格子覆盖」这个既有问题（`createDay` 在 `src/index.ts:719` 无条件给 `selectedDateElem` 赋值）。spec 的进入场景限定为单月视图。

## Decisions

### 1. 前置守卫：没有日期网格就不导航

`focusOnDay` 开头加一个判断：`self.daysContainer === undefined` 或者 `!self.rContainer.contains(self.daysContainer)` 时直接返回。前者对应 `noCalendar`，后者对应插件替换了日期网格。这里要表达的信号就是「核心的日期网格当前不在日历里」，它同时覆盖了这两个场景，不需要单独判断某个插件。

### 2. 用日期找目标：`findEnabledDate(from, step)`

从 `from` 开始（包含 `from` 本身），每次前进 `step` 天（+1 或 -1），返回第一个满足 `isEnabled` 的日期。日期加减用 `new Date(y, m, d + n)`，不用毫秒相加，避免夏令时导致小时偏移。

左右键从当前日期 ±1 天开始找。上下键从当前日期 ±7 天开始找，之后仍然逐天往前找，所以下周同一天被禁用时，会落到它后面最近的可选日期。

查找边界：
- 设了 `minDate`/`maxDate` 时，越过边界就停止。超出边界的日期 `isEnabled` 一定返回 false，继续找没有意义。
- 没设时，最多找 10 年（3653 天）。在只用 `enable` 开放少数分散日期的配置里，下一个可选日期通常在一年之内，10 年足够宽裕。实测 3653 次 `isEnabled` 只需要几毫秒。设上限是为了保证在 `disable: [() => true]` 这类配置下一定能结束。

考虑过但没有采用的方案：
- **只修月份序号**（上游 #3140，或者改成从 DOM 位置取序号）：只能修好 #3099。
- **保留按格子扫描，找不到时循环调用 changeMonth**：每翻一个月都要重建 DOM、触发一次事件，而且上下键仍然落不到同一星期几。

### 3. 用 DOM 判断是否可见：`getVisibleDay(date)`

在 `daysContainer` 里找一个不带 `hidden`、并且 `compareDates(dateObj, date) === 0` 的格子。找到就直接聚焦，不切换视图。单月视图里显示出来的相邻月份日期也算可见，和现在的行为一致。

### 4. 目标不可见时，让 `changeMonth` 支持任意偏移，并用它切换视图

- 向后移动时，偏移量取「目标月份 −（当前首月 + showMonths − 1）」，让目标月份成为最后一个显示的月份。
- 向前移动时，偏移量取「目标月份 − 当前首月」，让目标月份成为第一个显示的月份。
- 月份差按 `年 × 12 + 月` 计算。

`changeMonth` 里的年份回绕改成通用写法：年份加上 `Math.floor(currentMonth / 12)`，月份取 `((currentMonth % 12) + 12) % 12`。这样一次跨多年也是对的。公开方法 `fp.changeMonth(15)` 现在的结果是错的，也会一并修好。键盘导航和 ctrl 翻月共用这一条切换视图的路径，事件顺序自然一致：`onYearChange` 在前，然后重建网格，再触发 `onMonthChange`，此时 `fp.days` 已经是新网格。

`changeMonth` 在翻页箭头隐藏时会拒绝翻页（`_hidePrev/NextMonthArrow`），但这不会挡住键盘导航：目标日期一定可选，因此一定在 min/maxDate 之内。目标在视图之后，说明视图最后一个月早于 maxDate 所在月，下一页箭头不会被隐藏；目标在视图之前时同理。

切换视图后，用 `getVisibleDay` 找到目标格子，再调用 `focusOnDayElem`。`focusOnDayElem` 已经负责 range 模式下的悬停预览，直接复用。

考虑过但没有采用的方案：
- **`jumpToDate(date, true)`**：事件顺序不同，`onMonthChange` 拿到的是旧网格。
- **新写一个只给键盘用的 `showMonth()`**：会多出一条切换视图的路径，以后两条路径的行为可能对不上。

### 5. 没有可聚焦目标时，焦点放在 daysContainer 上，上下键分支也接受它

- 移动时找不到目标：焦点不动，留在当前格子上。
- 进入时没有起点（视图中没有可选日期，例如 #3064，或者 ctrl 翻到了全禁用的月份）：
  - offset 不为 0（普通方向键）：从视图边缘开始找。向后从最后一个显示月份的下个月 1 号开始，向前从第一个显示月份 1 号的前一天开始。用 `findEnabledDate` 找到后，切换视图并聚焦。
  - offset 为 0（ctrl 翻页之后），或者找不到：调用 `daysContainer.focus()`。daysContainer 在日历容器里，并且本身已有 `tabIndex = -1`。

不再调用 `_input.focus()`。焦点回到 input 后左右键就不导航了，这正是 #3064 的根因。

配套修改：
- `focusOnDay` 判断「当前有日期格子获得焦点」时，除了 `isInView`，还要求元素带 `flatpickr-day` 样式，避免把 daysContainer 当成日期格子。
- `onKeyDown` 上下键分支的进入条件加上 `eventTarget === self.daysContainer`。这样焦点在 daysContainer 上时，上下键和 ctrl+上下键都能继续工作。左右键分支本来就用宽松的 `isInView` 判断，`allowInput` 为 true 时也会放行，不需要改。

### 6. 删除 `getNextAvailableDay`，保留 `getFirstAvailableDay`

`getFirstAvailableDay` 按 DOM 里容器的顺序扫描，不涉及月份序号，在「进入」和 ctrl 翻页两个场景下仍然是正确的起点来源，所以保留。

## Risks / Trade-offs

- [行为变化] 上下键跨月时，落点从「新视图的第一个可选格子」变成「下周同一天，或者它后面最近的可选日期」；多月视图越界时，视图只平移到刚好显示目标月份。→ 这符合 WAI-ARIA 日期选择器的约定，会写进发版说明。
- [一次跳很远] 如果只启用了少数几个日期，一次按键可能跳过好几个月。→ 这正是 #3064 想要的：键盘用户能到达下一个可选日期。视图会一起切换过去，用户能看到发生了什么。
- [10 年上限] 下一个可选日期在 10 年以外，又没有设置 min/maxDate 时，方向键找不到它。→ 这种配置非常少见，用户仍然可以通过翻页或手动输入到达，spec 里也写明了这个上限。
- [事件次数] 一次跨多个月的跳转只触发一次 `onMonthChange`；以前要逐月 ctrl 翻页，每翻一个月触发一次。监听方只收到一次通知，这和视图实际变化一次的语义是一致的。
- [changeMonth 的行为扩展] 以前传入超过一年的偏移量会得到错误的年月，现在会得到正确结果。不存在依赖错误结果的合理用法。

## Migration Plan

不需要迁移，公共 API 的签名都不变。按补丁版本发布，发版说明写明：修复 #3099、#3064；上下键跨月时落点有变化；`changeMonth` 现在支持任意偏移；修复 `noCalendar` 下按方向键报错，以及 monthSelect 下按方向键焦点被抢到 input。
