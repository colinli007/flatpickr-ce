## Why

在日历里用方向键移动焦点时，现在的实现是用「格子下标」加上「用 `getMonth()` 推算出来的月份序号」去找下一个格子。这种推算会导致三个问题：

- 上游 flatpickr/flatpickr#3099：`showMonths > 1` 并且显示的月份跨年时（比如同时显示 12 月和下一年的 1 月），算出来的月份序号是负数，去访问一个不存在的格子容器，直接抛出 `TypeError`。
- 上游 flatpickr/flatpickr#3064：当前视图里没有任何可选日期时，焦点会掉回 input。之后左右方向键都不再导航，键盘用户被困在这个月份里出不去。
- 在网格最后一行按下键，不会跳到下周同一天；多月视图跨越月份容器时，还会拿两个不同月份里的格子下标直接比较。

上游 PR flatpickr/flatpickr#3140 只修正了月份序号的计算，所以只解决了第一个问题。

## What Changes

- **方向键导航改成按日期计算**。目标日期是当前聚焦日期左右加减 1 天、上下加减 7 天。目标不可选时，沿移动方向继续往下找，取最近的可选日期。目标不在当前视图里时，先切换视图再聚焦。这样会带来三个结果：
  - 跨年的多月视图不再报错（#3099）。
  - 上下键会落到下周同一天。
  - 可选日期之间隔了好几个月时，方向键可以直接跳过去（#3064）。
- **当前视图里没有可选日期时，焦点留在日期格子的容器上**，不再掉回 input。之后无论按左右键还是上下键，都会从视图边缘开始往外找可选日期。
- **ctrl+方向键翻月、ctrl+上下键翻年之后，如果新视图里没有可选日期，焦点同样留在格子容器上**，并且可以继续翻页。
- **往外找可选日期有边界**：设了 `minDate`/`maxDate` 就找到边界为止，否则最多找 10 年。找不到时焦点保持不动。
- **日期网格不存在时（`noCalendar`），或者被插件替换掉时（如 monthSelect），核心的方向键导航不做任何事**。这顺带修好了两个已有问题：`noCalendar` 下按下键会抛 `TypeError`，monthSelect 下按左右键会把焦点抢回 input。
- **公开方法 `changeMonth(offset)` 支持任意月数的偏移**。现在它只能正确处理跨一次年，比如 `changeMonth(15)` 的结果就是错的。键盘导航切换视图时也用这个方法，所以它和 ctrl 翻月的事件顺序一致。
- **行为变化（非破坏性）**：按上下键跨越月份时，焦点会落到下周同一天；多月视图越过显示范围时，视图只平移到刚好能显示目标月份。这些都要写进发版说明。

## Capabilities

### New Capabilities

- `keyboard-navigation`：日历日期格子的方向键导航，包括怎么移动、怎么跳过不可选日期、跨月跨年、怎么切换视图、没有可选日期时焦点去哪里，以及什么时候不导航。

### Modified Capabilities

（无。现有 spec `calendar-hooks` 和 `month-select-plugin` 的要求不受影响。）

## Impact

- 代码：`src/index.ts` 中的 `focusOnDay`、`getNextAvailableDay`（删除）、`changeMonth`，以及 `onKeyDown` 里处理方向键的分支。
- 测试：`__tests__/src/index.spec.ts`，其中包含从 flatpickr/flatpickr#3140 移植过来的 6 个跨年用例；`__tests__/src/plugins/monthSelect/index.spec.ts` 补一个防回归用例。
- 公共 API：`changeMonth` 的签名不变，只是现在能正确处理任意偏移量。
- 上游对应：修复 flatpickr/flatpickr#3099 和 flatpickr/flatpickr#3064，取代 PR flatpickr/flatpickr#3140。
