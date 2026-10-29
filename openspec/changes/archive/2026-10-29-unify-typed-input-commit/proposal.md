## Why

开启 `allowInput` 后，用户在输入框里手动输入的值可以通过三种方式提交，但这三种方式的提交和通知规则各不相同：

| 提交方式 | 现在的行为 |
|---|---|
| 按回车 | 总是触发 `onChange`，值没变也触发；存下的时间不受 `minTime`/`maxTime` 约束 |
| 失去焦点（Tab、点击其他可聚焦元素） | 输入框里的文字和格式化后的值不一样就触发；时间同样不受约束 |
| 日历打开时点击日历外部 | 静默修改值：不触发 `onChange`，输入框上也不派发 change/input 事件。之后 `updateTime` 会顺带把时间夹到合法范围，再自己触发一次 `onValueUpdate`，并延迟 300ms 触发一次 `onChange` |

上游 flatpickr/flatpickr#2941 报告的就是第三种情况：用 Tab 离开时监听方能收到 change，用鼠标点外面就收不到，绑定在输入框上的框架模型和表单监听因此和实际值不一致。上游 PR flatpickr/flatpickr#3136 只是给第三条路径加上了第二条路径那种基于文字的判断，三条路径仍然各写各的，回车无条件触发的问题也还在。

## What Changes

- 三种提交方式统一调用同一个提交函数，规则一致：
  - **要不要提交**：输入框里的文字和 flatpickr 最后一次写进去的内容不一样，也就是用户改过，才提交。没改过就什么都不做。
  - **提交成什么值**：配置了 `altInput` 就按 `altFormat` 解析，否则按 `dateFormat`。有时间选择器时，再按和时间输入框相同的规则，把时间夹到 `minTime`/`maxTime`（以及 minDate/maxDate 当天的时间）之内。
  - **要不要通知**：比较提交前后实例里的选中日期（按时间戳比较）。值变了才依次触发 `onValueUpdate`、`onChange`，`onChange` 会同时在原始输入框上派发 change 和 input 事件；如果变成了空值，就和 `clear()` 一样只触发 `onChange`；同一次操作只通知一次。如果提交导致显示的年份或月份变化，就和 `setDate(..., true)` 一样先触发 `onYearChange`/`onMonthChange`。
- 点击外部时，一次只提交一份待提交的编辑：用户手动改过输入框，就提交输入的值；否则照旧用 `updateTime` 提交时间框里的修改，由它自己负责通知。通知放在关闭日历、以及放弃不完整的 range 之后，报告的是这次点击的最终值。这个顺序和用鼠标点选日期时一致：都是先触发 `onClose`，再触发 `onChange`。
- **行为变化（都不是破坏性的）**：
  - 点击外部提交了新值时，现在会触发 `onChange`。这是对 #2941 的修复。
  - 回车提交时，如果值没变（没改，或者只是把同一天换了一种写法），不再触发 `onChange`。
  - 失去焦点提交时，同一天换一种写法、或者原本为空时输入了无效值，不再触发 `onChange`。
  - 回车和失去焦点提交的时间，现在会被夹到 `minTime`/`maxTime` 之内。以前会原样存下不合法的时间。
  - 用户没输入就按回车或点击外部时，不再重新解析输入框。以前如果 `altFormat` 不带时间（比如 `d.m.Y`），这样操作会把时间清成 00:00，并且触发 `onChange`。
  - 手动清空输入框后点击外部，现在会触发 `onChange`（和回车、失去焦点一样，不触发 `onValueUpdate`）。
  - rangePlugin 配合 `allowInput` 时，点击外部导致选区被清空后，监听方会收到 `onChange`，插件也会据此清空第二个输入框。以前第二个输入框会一直显示旧日期。

## Capabilities

### New Capabilities

- `typed-input-commit`：开启 `allowInput` 时，手动输入的值什么时候提交、提交成什么值、什么时候以什么顺序通知监听方。

### Modified Capabilities

（无。现有 spec `calendar-hooks`、`month-select-plugin`、`keyboard-navigation` 的要求不受影响。）

## Impact

- 代码：`src/index.ts` 中的 `documentClick`、`onBlur`、`onKeyDown` 回车分支，以及 `jumpToDate`（把「视图变化时触发事件」这段抽成共用函数）。
- 测试：`__tests__/src/index.spec.ts` 中的 `describe("documentClick")`，包括从 flatpickr/flatpickr#3136 移植的 4 个用例。这个 describe 里已有的用例虽然会派发 `mousedown` 进入 `documentClick`，但没有一个断言钩子的触发情况。另外，`direct entry … document click` 这两个用例（1114、1129 行）派发的是 `click`，提交其实发生在之后的 `blur()` 里。
- 公共 API：签名都不变。
- 上游对应：修复 flatpickr/flatpickr#2941，取代 PR flatpickr/flatpickr#3136。
