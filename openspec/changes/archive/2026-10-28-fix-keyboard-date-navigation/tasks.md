## 1. 回归测试（应当失败）

- [x] 1.1 在 `__tests__/src/index.spec.ts` 新增 `describe("keyboard navigation")`。放入从 flatpickr/flatpickr#3140 移植的 6 个跨年用例（`it.each`，`showMonths: 2`，range 模式，`defaultDate: "2025-12-01"`），再加上 spec「方向键按日期移动焦点」里的跨年边界场景和 08-30 按下键的场景。测试用 `createInstance` 默认挂载的 `elem`：先 `fp.open()`，让格子获得焦点，再用 `simulate("keydown", ...)` 按键。08-30 的用例要同时断言焦点所在日期和 `currentMonth`。运行 `npx jest --config config/jest.json __tests__/src/index.spec.ts -t "keyboard navigation"`，确认跨年用例因为断言失败而失败（焦点没动；jsdom 只会把监听器里的 TypeError 打到 console，测试本身不会因此报错），08-30 的用例因为焦点停在 08-30 而失败。
- [x] 1.2 为「跳过不可选的日期」「目标不在视图中时切换视图」「视图中没有可选日期时仍然可以导航」「进入日历时的起点不变」「没有日期网格时不导航」写用例，具体包括：
  - #3064 的三个场景，用 `jumpToDate` 把视图定位到 2026 年 1 月；
  - 全部日期禁用；
  - ctrl+右键翻到全禁用的月份（enable 为 01-15 和 03-20）；
  - 焦点在 daysContainer 上时按下键、按 ctrl+下键；
  - 跨多个月跳转时，`onMonthChange` 只触发一次，并且触发时 `fp.days` 已经是新网格；
  - `noCalendar` 时按下键不抛异常。

  需要断言焦点落在容器上时，一律写 `document.activeElement === fp.daysContainer`。另外在 `__tests__/src/plugins/monthSelect/index.spec.ts` 加一个用例：monthSelect 下，`enable` 只开放两年后的某一天，在月份格子上按右键，`currentYear` 不变，焦点移到下一个月份格子。运行这两个测试文件，记下哪些失败；已经通过的用例（比如 minDate 边界、进入时的起点）保留，用来防止回归。

## 2. 实现

- [x] 2.1 `changeMonth` 的年份回绕改为支持任意偏移（design 第 4 条）。在 `describe("API")` 里补一个用例：`changeMonth(15)` 和 `changeMonth(-15)` 得到正确的年月，`onYearChange` 和 `onMonthChange` 各触发一次。验证方式：这个用例和原有的 "onKeyDown: arrow nav" 都通过。
- [x] 2.2 新增 `findEnabledDate(from, step)`（design 第 2 条，日期加减用 `new Date(y, m, d + n)`，边界是 min/maxDate，没有时最多 3653 天）和 `getVisibleDay(date)`（design 第 3 条）。验证方式：`npx tsc --noEmit` 通过。
- [x] 2.3 重写 `focusOnDay`：
  - 开头加上 design 第 1 条的守卫；
  - 判断「有日期格子获得焦点」时要求元素带 `flatpickr-day`；
  - 移动时用 `findEnabledDate` 找目标，目标可见就直接聚焦，不可见就按 design 第 4 条用 `changeMonth` 切换视图后再聚焦，找不到就保持焦点不动；
  - 删除 `getNextAvailableDay`。

  验证方式：1.1 的 8 个用例，以及「跳过不可选」「切换视图」「没有日期网格」相关的用例全部通过。
- [x] 2.4 实现 design 第 5 条：进入时没有起点的情况下，offset 不为 0 就从视图边缘往外找，找到后切换视图并聚焦；offset 为 0 或找不到时调用 `daysContainer.focus()`，不再调用 `_input.focus()`。上下键分支的进入条件加上 `eventTarget === self.daysContainer`。验证方式：#3064、全部禁用、ctrl+右键翻到全禁用月份、焦点在 daysContainer 上按上下键这些用例全部通过，monthSelect 的防回归用例也通过。

## 3. 整体验证与提交

- [x] 3.1 运行 `npm test` 和 `npm run fmt:check`，全部通过。
- [x] 3.2 运行 `npm run build`，在 Chrome 中用构建出的 dist 手动检查：
  - `showMonths: 2` 停在 12 月和 1 月时，用方向键跨年；
  - 只用 `enable` 开放几个分散日期时，方向键能在这些日期之间跳转；
  - `disable: [() => true]` 时按方向键不卡顿，焦点留在日历里；
  - weekSelect 用方向键跨月后，周高亮仍然正确。
- [x] 3.3 提交。提交信息写明：修复 flatpickr/flatpickr#3099 和 flatpickr/flatpickr#3064；取代 flatpickr/flatpickr#3140（跨年用例来自这个 PR）；上下键跨月时落点有变化；`changeMonth` 现在支持任意偏移。然后更新 tracking issue #2 里对应两行的备注；勾选要等发版并回复上游之后再做。

## 4. verify 之后的修正

- [x] 4.1 `findEnabledDate` 无论是否设置 min/maxDate 都最多找 3653 天（spec「视图中没有可选日期时仍然可以导航」的边界改为两者取较近）。补用例：`disable: [() => true]` 加 `maxDate: "9999-12-31"` 按下键，焦点在 `daysContainer`，并且禁用规则被检查的次数少于 4000（这个测试文件用了假计时器，`Date.now()` 不会走动，所以用检查次数代替耗时；修改前实测为 2912181 次，约 2.3 秒）。验证方式：这个用例改前失败、改后通过。
- [x] 4.2 补足覆盖：跨年边界从 2025-12-31 按右键后断言视图仍是 2025 年 12 月；全禁用用例断言两次按键的检查次数少于 8000；「after paging into a month without enabled days」加一个 `allowInput: true` 的变体，焦点在 `daysContainer` 上按右键能落到 2026-03-20。验证方式：`npm test` 和 `npm run fmt:check` 全部通过后提交。
