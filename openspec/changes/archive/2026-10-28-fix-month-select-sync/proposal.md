## Why

monthSelect 插件的月份格子只在初始化和点年份箭头时重建。下面这些操作都会改变 flatpickr 的状态，但月份格子还停在旧的样子：`setDate()`、手动输入后提交、`clear()`、`set()`、ctrl+方向键 / `changeMonth()` 跨年、直接给 `config.minDate` 赋值。对应的上游问题：

- flatpickr/flatpickr#3067：`setDate()` 之后选中态不对。
- flatpickr/flatpickr#3109：开启 `allowInput` 并设了 `maxDate` 时，输入往年的值，月份按当前年份置灰。

上游的修复 PR flatpickr/flatpickr#3068 改成在 `onOpen` 时重建，但 `inline` 模式不会 open，这个修法在 inline 下无效。上游已经停止维护，所以在 flatpickr-ce 里按根因修。

根因是插件没有一个可靠的信号来知道「日历视图需要按当前状态重画」。flatpickr 核心每次重建日期格子时都会调用同一个函数，但没有对外暴露任何通知，插件只能靠零散的事件去猜。

## What Changes

- **核心新增钩子 `onDaysBuilt`**：核心每次重建完日期格子后触发。会触发它的入口有：重绘、翻月、跨年、`setDate`、`clear`、`set`、给 min/maxDate 赋值、选中日期后跳月。用户配置和插件都能注册这个钩子。属于新增，不是破坏性改动。
- **monthSelect 改为挂在 `onDaysBuilt` 上重画月份格子**，删掉原来三条各自为政的同步路径：`selectYear()`、挂在 `onValueUpdate` 上的 `setCurrentlySelected`、翻年箭头和 `closeHook` 里单独调用的 `buildMonths()`。
- **月份禁用规则统一**：月份是否禁用，和日期格子用同一套规则判断（`minDate`/`maxDate`/`disable`/`enable`）。以前翻年之后只看 `minDate`/`maxDate`，结果和初始渲染不一致。
- **选中样式考虑年份**：只有当前显示的年份等于选中日期所在的年份时，才给对应月份加选中样式。
- **选中后保留焦点**：用鼠标点或者用键盘回车选中一个月份之后，焦点还留在这个月份上，格子重画也不会把焦点弄丢。
- `inline` 模式和弹出模式的行为一致。

没有破坏性改动：插件的配置、输出格式、已有事件都不变。

## Capabilities

### New Capabilities

- `calendar-hooks`：核心的 `onDaysBuilt` 钩子，规定它什么时候触发、怎么注册。
- `month-select-plugin`：monthSelect 的月份格子在任何状态变化后都能正确显示，包括选中态、禁用态、今天标记、年份导航，以及选中后的焦点。

### Modified Capabilities

（无。项目目前还没有任何 spec。）

## Impact

- 核心：`src/index.ts` 的 `buildDays()` 末尾触发新钩子；`src/types/options.ts` 的 `HookKey`、`HOOKS`、`Options`、`ParsedOptions`、默认值里加上 `onDaysBuilt`。
- 插件：`src/plugins/monthSelect/index.ts`。
- 测试：`__tests__/src/index.spec.ts`（新钩子）、`__tests__/src/plugins/monthSelect/index.spec.ts`（回归用例）。
- 公共 API：新增一个钩子名，类型定义里会自动包含它。README 目前没有介绍钩子的章节，所以只在发版说明里写明。
- 上游对应：修复 flatpickr/flatpickr#3067、flatpickr/flatpickr#3109，取代 PR flatpickr/flatpickr#3068。
