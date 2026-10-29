## Context

开启 `allowInput` 后，有三处会把用户手动输入的文字提交成日期，每处都直接调用 `setDate`：

```
onKeyDown 回车 (src/index.ts:1709)   setDate(text, true,  fmt)  --> 总是触发年/月事件、onValueUpdate、onChange
onBlur        (src/index.ts:1677)   text != getDateStr() 时：setDate(text, true, fmt)
documentClick (src/index.ts:1526)   setDate(text, false, fmt)  --> 不通知（#2941）
                                    然后 updateTime() --> 夹取时间，触发 onValueUpdate，300ms 后再触发 onChange
                                    然后 close()，如果是只选了一个日期的 range，再 clear(false)
```

`fmt` 的两种写法（按事件目标判断，或按 `config.altInput` 判断）结果相同，因为配置了 altInput 时 `self._input` 就是 altInput（`src/index.ts:2678`）。

已核实的事实（包括 Fable 评审时实测的结果）：
- `setDate(value, triggerChange)`（`src/index.ts:2546`）：
  - value 为空时走 `clear(triggerChange)`；
  - 否则依次执行 `jumpToDate(undefined, triggerChange)`、`setHoursFromDate()`，解析失败时走 `clear(false)`，接着 `updateValue(triggerChange)`（`src/index.ts:2877`，`triggerChange` 为真时才触发 `onValueUpdate`），最后在 `triggerChange` 为真时触发 `onChange`；
  - `jumpToDate` 只在 `triggerChange` 为真时触发 `onYearChange`/`onMonthChange`（`src/index.ts:533-543`）；
  - `clear` 不触发 `onValueUpdate`。
- 时间夹取（`minTime`/`maxTime`，以及 minDate/maxDate 当天的时间）只写在 `setHoursFromInputs` 里（`src/index.ts:240-325`），它从时间框读取时分秒。`setDate` 会通过 `setHoursFromDate` 把时间框同步成解析出来的时间，但自己不做夹取。所以现在回车和失去焦点会存下不合法的时间；点击外部之所以合法，只是因为后面恰好跑了 `updateTime`，它既会夹取时间，又会自己再通知一次。
- 已有的先例 `updateTime`（`src/index.ts:211-217`）是比较修改前后的值，有变化才通知。
- `selectDate`（鼠标点选日期）是先 `focusAndClose()`，再 `triggerChange()`（`src/index.ts:2451-2454`），所以通知在 `onClose` 之后。回车路径则是先通知、再关闭。核心里两种顺序都存在。
- `documentClick` 绑定在 `mousedown`/`touchstart` 上，同时以捕获方式绑定在 document 的 `focus` 上（`src/index.ts:455-457`）。`describe("documentClick")` 里已经有用例会派发 `mousedown` 进入这条路径，但没有一个断言钩子是否触发。`direct entry … document click` 这两个用例（1114、1129 行）派发的是 `click`，真正的提交发生在之后的 `blur()` 里。
- `getDateStr(dateFormat)` 的精度比 `selectedDates` 粗。例如 `Y-m-d` 不含时间：原值是 10:30，重新输入同一天后会变成 00:00，格式化出来的字符串却完全一样。

## Goals / Non-Goals

**Goals:**
- 三处入口共用同一个提交函数，用同一套规则判断「要不要提交」「提交成什么值」「要不要通知」。
- 每次操作最多通知一次，并且通知的是最终保存的值。

**Non-Goals:**
- 不处理 rangePlugin 配合 `allowInput` 的问题。插件会把 `_input` 改写成只剩第一个日期，导致「用户没改过」的判断永远不成立；现在聚焦后点击外部就会把选区静默清空，这是已有的 bug。改动后清空仍会发生，但监听方会收到 `onChange`，插件也会据此清空第二个输入框，比现在好。tasks 里有一项用来确认这一点。
- 不改用鼠标点选第一个日期、再点击外部放弃的路径。这时 `onChange` 已经通知过一个日期，放弃时 `clear(false)` 不再通知，属于另一个已有问题。
- 不让程序调用的 `setDate` 也去夹取时间。
- 不改 `allowInput` 关闭时的任何行为，也不改移动端的原生输入框（移动端下 `bindEvents` 直接返回，这三处入口都不存在）。

## Decisions

### 1. 把「提交」和「通知」拆成两个函数

```
commitTypedValue(): 提交前快照 | undefined
  如果 _input 的文字（去掉末尾空格）等于 getDateStr()，说明没改过，返回 undefined
  记下快照 = { dates: 选中日期的时间戳串, year: currentYear, month: currentMonth }
  setDate(文字, false, altInput ? altFormat : dateFormat)
  如果有时间选择器：setHoursFromInputs()，再 updateValue(false)   // 时间按时间框的规则夹取
  返回快照

announceCommit(快照 | undefined)
  如果快照为空，直接返回
  triggerViewChange(快照.year, 快照.month)   // 和 jumpToDate 共用
  如果选中日期的时间戳串和快照不同：
    选中日期不为空时触发 onValueUpdate   // 变成空值等同于 clear()，只发 onChange
    触发 onChange
```

三处入口这样调用：
- **回车**：`announceCommit(commitTypedValue())`，然后 `close()`、`blur()`。通知在 `onClose` 之前，和现在一样。
- **失去焦点**：保留「焦点不是移到日历里」这个条件，满足时 `announceCommit(commitTypedValue())`。原来比较文字的逻辑挪进了 `commitTypedValue`。
- **点击外部**：
  ```
  const committed = allowInput ? commitTypedValue() : undefined
  if (committed === undefined && 有时间框且输入框不为空) updateTime()
  close()
  如果是只选了一个日期的 range：clear(false)
  announceCommit(committed)
  ```

### 2. 「要不要通知」比较时间戳，不比较格式化后的字符串

`onChange` 交给监听方的第一个参数就是 `selectedDates`。所以判断值是否变化，最直接的依据是这些 Date 的时间戳。比较 `getDateStr(dateFormat)` 会漏掉格式没有表达出来的部分，比如时间、秒。反过来，只要时间戳相同，任何格式化出来的字符串也都相同，所以用时间戳比较不会出现多报。它也不受 `formatDate` 被覆盖的影响。

「要不要提交」仍然比较文字：要判断的是「用户是否改过输入框」，比的就是输入框里的文字和 flatpickr 最后一次写进去的内容 `getDateStr()`（格式和 `_input` 一致）。没改过就不调用 `setDate`，这样就不会因为 `altFormat` 精度不够而在重新解析时丢掉信息。

考虑过但没有采用的方案：
- **上游 #3136 的做法**：只在点击外部这条路径上沿用比较文字的判断，把结果当作 `setDate` 的 triggerChange。三条路径的规则仍然不一致；回车还是无条件通知；同一天换一种写法、或者原本为空时输入无效值，也会多通知一次。
- **比较 `getDateStr(dateFormat)`**：上面已经说过，会漏报精度之外的变化。

### 3. 变成空值时只触发 `onChange`

`onValueUpdate` 从来不会在 `clear()` 里触发。依赖这个前提的代码确实存在：rangePlugin 的 `onValueUpdate`（`src/plugins/rangePlugin.ts:164-180`）收到空选区会读取 `selDates[0].getTime()` 并抛出异常，异常会打断 `triggerEvent` 的循环，后面的用户钩子也就不会执行。这个问题是实施 tasks 2.4 时发现的。所以通知时沿用「结果是什么操作，就发什么事件」的规则：结果不为空，和 `setDate(..., true)` 一样依次触发 `onValueUpdate`、`onChange`；结果为空，等同于一次清空，和 `clear()` 一样只触发 `onChange`。手动清空后回车或失去焦点（`setDate("", true)` 走的是 `clear(true)`），以及点击外部时放弃不完整的 range，都属于后一种。

### 4. 提交时就夹取时间，点击外部一次只提交一份编辑

时间夹取放进 `commitTypedValue`：调用的是现有的 `setHoursFromInputs`。`setDate` 刚刚已经把时间框同步成解析出来的时间，这里读回来、夹取、写回去，然后用 `updateValue(false)` 改写输入框。这样三条路径存下的时间都是合法的。

点击外部时，用户手动输入的值一旦提交，时间框就已经被这个值覆盖，不会再有待提交的时间修改。这时 `updateTime` 唯一能做的就是再夹取一次（已经不需要）并且自己再通知一次（会造成重复通知），所以跳过它。没有手动输入时，`updateTime` 照常执行，负责提交时间框里的修改并按原有方式通知，由于 `commitTypedValue` 返回 `undefined`，`announceCommit` 不会再通知。所以每次点击都只有一个通知来源。

考虑过但没有采用的方案：
- **保留 `updateTime`，在它之后再通知**：`updateTime` 会触发自己的 `onValueUpdate`，并在 300ms 后触发 `onChange`，和这里的通知重复。
- **在 `updateTime` 之前通知**：通知的是还没夹取的非法值，紧接着又被改掉。

### 5. 点击外部时最后才通知

点击外部这一次操作的最终值，要等关闭日历、并放弃只选了一个日期的 range 之后才确定，所以通知放在最后，并且和提交前的快照比较：
- range 原本为空，只输入了一个日期，结果被清空：前后都为空，不通知。
- range 原本有两个日期，结果被清空：通知一次，此时选中日期为空。

这样监听方看到的始终是实例里的真实值，不会先收到一个随即就被改掉的中间值。`onChange` 因此出现在 `onClose` 之后，和用鼠标点选日期时一致。range 的清空仍然放在 `close()` 之后，`onClose` 回调看到的选中日期和现在一样。

### 6. 抽出 `triggerViewChange(oldYear, oldMonth)`

把 `jumpToDate` 里「年份变了就触发 `onYearChange` 并调用 `buildMonthSwitch`；年份或月份变了就触发 `onMonthChange`」这一段抽成函数。`jumpToDate` 在 `triggerChange` 为真时调用它，`announceCommit` 也调用它。这样提交手动输入时的年、月事件和 `setDate(..., true)` 完全一致，回车和失去焦点也不会因为改成 `setDate(..., false)` 而丢掉这两个事件。

## Risks / Trade-offs

- [行为变化] 回车时值没变就不再通知；失去焦点时同一天换一种写法、或原本为空时输入无效值，也不再通知；回车和失去焦点提交的时间会被夹取到合法范围。→ 前两条符合 `onChange` 的定义（选中日期变了才触发），第三条修正了以前会存下不合法时间的问题。发版说明里写明。
- [点击外部时通知顺序变化] 由手动输入引起的通知会出现在 `onClose` 之后。→ 和用鼠标点选日期的顺序一致。以前这条路径根本不通知，所以不存在依赖旧顺序的用法。
- [同一天换一种写法后，框架模型可能和输入框不同步]（这一条未经验证）用户输入 `1999-1-5` 的过程中，原生 input 事件可能已经把这段文字写进了框架的模型。提交后输入框被改写成 `1999-01-05`，但值没变，不会再派发事件。是否真的会出现这种情况，取决于各个封装库是否监听原生 input 事件，这一点还没有核实。不过两者解析出来是同一天，即使出现，影响也很小。
- [`buildMonthSwitch` 多调用一次] 年份变化时，`triggerViewChange` 会在 `setDate` 内部的 redraw 之后再重建一次月份下拉框，结果相同，只是多做了一次。

## Migration Plan

不需要迁移，公共 API 没有变化，按补丁版本发布。发版说明写明：修复 #2941；三种提交方式统一为「值变了才通知」；手动输入的时间会遵守 `minTime`/`maxTime`；在 `altFormat` 精度不足时，没有输入就不会再丢掉时间。
