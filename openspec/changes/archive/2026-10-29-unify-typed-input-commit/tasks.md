## 1. 回归测试（应当失败）

- [x] 1.1 在 `__tests__/src/index.spec.ts` 的 `describe("documentClick")` 中加入 `pressOutside` 辅助函数（`simulate("mousedown", document.body, { which: 1 }, MouseEvent)`），并移植 flatpickr/flatpickr#3136 的 4 个用例：点击外部提交、altInput 时点击外部提交、手动清空后点击外部、没改过时点击外部。运行 `npx jest --config config/jest.json __tests__/src/index.spec.ts -t "documentClick"`，确认前 3 个因为 `onChange` 被调用 0 次而失败，第 4 个通过。
- [x] 1.2 在 `describe("typed input commit")` 中为 spec 中其余的场景写用例：
  - 点击外部后原始输入框上派发了 change 事件；
  - 清空后只触发 `onChange`，不触发 `onValueUpdate`；
  - 用 Tab 离开：先 blur，再在另一个 input 上派发 focus，断言只通知 1 次；
  - 回车提交跨年的值：断言事件依次为 `onYearChange`、`onMonthChange`、`onValueUpdate`、`onChange`、`onClose`；
  - 没改过时按回车或让输入框失去焦点：不触发；
  - 同一天换一种写法；
  - 原本为空时输入 `abc`：断言 `errorHandler` 被调用、`onChange` 不触发；
  - 解析后时间变成 00:00 时会通知；
  - altFormat 不带时间、没输入时按回车，时间保持不变；
  - `minTime` 下回车提交 07:30 会被夹取；
  - `minTime` 下点击外部提交 07:30：先 `jest.advanceTimersByTime(500)`，再断言 `onChange` 只触发 1 次，并且值是夹取后的；
  - 点击外部时 `onClose` 在 `onChange` 之前；
  - range 原本有两个日期，只输入一个日期后点击外部：被清空，并且只通知 1 次。

  运行 `npx jest --config config/jest.json __tests__/src/index.spec.ts -t "typed input commit|documentClick"`，记下哪些失败；已经通过的用例留着防回归。

## 2. 实现

- [x] 2.1 从 `jumpToDate` 中抽出 `triggerViewChange(oldYear, oldMonth)`（design 第 6 条），`jumpToDate` 在 `triggerChange` 为真时调用它。验证方式：原有用例全部通过，特别是 `changeMonth()`、`jumpToDate` 相关用例，以及 `onDaysBuilt` 的「leaves the other hooks untouched」。
- [x] 2.2 新增 `commitTypedValue()` 和 `announceCommit(snapshot)`（design 第 1 至 4 条）：时间戳比较；有时间选择器时调用 `setHoursFromInputs()` 加 `updateValue(false)` 夹取时间。回车分支改为 `announceCommit(commitTypedValue())` 后再 `close()`、`blur()`；`onBlur` 保留「焦点不是移到日历」的条件，满足时调用同样的函数。验证方式：1.2 中与回车、失去焦点相关的用例全部通过。
- [x] 2.3 改写 `documentClick`（design 第 4、5 条）：只有在没有手动输入提交时才调用 `updateTime()`；关闭日历并放弃不完整的 range 之后，再调用 `announceCommit`。验证方式：1.1、1.2 的全部用例通过，`describe("documentClick")` 中原有的用例和 4 个「direct entry」用例都通过。
- [x] 2.4 确认 rangePlugin 配合 `allowInput` 的结果不比现在更糟：在 `__tests__/src/plugins/rangePlugin.spec.ts` 中加一个用例：先用 `setDate(dates, true)` 设置两个日期（和用户选择后的状态一致），聚焦第一个输入框后点击外部，断言 `selectedDates` 被清空（和现在一致）、`onChange` 只触发 1 次、没有异常、计时器推进后第二个输入框被清空。实施时发现 rangePlugin 收到空选区的 `onValueUpdate` 会抛异常，据此加了 design 第 3 条。验证方式：用例通过。

## 3. 整体验证与提交

- [x] 3.1 运行 `npm test` 和 `npm run fmt:check`，全部通过。
- [x] 3.2 运行 `npm run build`，在 Chrome 中用 dist 手动检查，给 input 挂上 `change` 监听，确认触发次数符合 spec。要检查的操作：
  - `allowInput: true` 时输入后点击页面空白处；
  - 按 Tab 离开；
  - 按回车；
  - 没改过时点击外部；
  - altInput 加 allowInput 时输入后点击外部；
  - `enableTime` 加 `minTime` 时输入早于下限的时间后点击外部。
- [x] 3.3 提交。提交信息写明：修复 flatpickr/flatpickr#2941，取代 flatpickr/flatpickr#3136（4 个用例来自该 PR），以及各项行为变化。然后更新 tracking issue #2 中 #3136 那一行的备注；勾选要等发版并回复上游之后。
