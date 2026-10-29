## Purpose

规定开启 `allowInput` 时，用户在输入框里手动输入的值什么时候提交、提交成什么值，以及什么时候、以什么顺序通知监听方。无论用户用哪种方式提交，监听方看到的值都要和实例里实际保存的值一致。

## ADDED Requirements

### Requirement: 三种提交方式行为一致

开启 `allowInput` 时，按回车、输入框失去焦点（焦点不是移到日历里）、日历打开时点击日历外部，这三种操作 SHALL 按同一套规则提交输入框里的文字：

- 只有在文字和 flatpickr 最后一次写入的内容不同（也就是用户改过）时才提交。没改过时，这三种操作 MUST NOT 修改选中的日期，也 MUST NOT 触发任何与值相关的事件。
- 配置了 `altInput` 时按 `altFormat` 解析，否则按 `dateFormat` 解析。
- 有时间选择器时，提交的时间 SHALL 按照在时间框里输入时的同一套规则，限制在 `minTime`/`maxTime`（以及 minDate/maxDate 当天的时间）范围内。

#### Scenario: 点击外部提交输入
- **WHEN** `allowInput: true`，日历打开，用户在输入框里输入 `1999-12-31`，然后在页面空白处按下鼠标
- **THEN** 选中日期变为 1999-12-31，输入框的值是 `1999-12-31`

#### Scenario: altInput 时按 altFormat 解析
- **WHEN** `allowInput: true, altInput: true, altFormat: "d.m.Y"`，用户在可见输入框里输入 `20.07.1969`，然后在页面空白处按下鼠标
- **THEN** 原始输入框的值是 `1969-07-20`

#### Scenario: 没改过就不提交
- **WHEN** 已选中 2001-01-01，用户聚焦输入框后没有修改，然后在页面空白处按下鼠标、按回车或让输入框失去焦点
- **THEN** 选中日期不变，`onChange` 和 `onValueUpdate` 都不触发

#### Scenario: altFormat 不带时间时，没输入不会丢掉时间
- **WHEN** `allowInput: true, altInput: true, altFormat: "d.m.Y", enableTime: true, defaultDate: "2020-01-22 03:04"`，用户聚焦可见输入框后不做修改，直接按回车
- **THEN** 选中日期的时间仍是 03:04，`onChange` 不触发

#### Scenario: 输入的时间早于 minTime
- **WHEN** `allowInput: true, enableTime: true, minTime: "09:00"`，用户输入 `2026-01-05 07:30` 后按回车
- **THEN** 选中日期的时间按时间框的规则被限制到 09:00 之后（结果为 09:30），输入框显示限制后的值

#### Scenario: 输入无效值
- **WHEN** `allowInput: true`，用户输入 `abc` 后提交
- **THEN** `errorHandler` 照常被调用，选中日期为空

### Requirement: 值变了才通知，并且只通知一次

提交 SHALL 比较提交前后的选中日期（按时间戳）。值变了时，SHALL 先触发 `onValueUpdate`，再触发 `onChange`（`onChange` 会在原始输入框上派发 change 和 input 事件）；变成空值时则和 `clear()` 一样，只触发 `onChange`。值没变时，这两个钩子都 MUST NOT 触发。提交使显示的年份或月份发生变化时，SHALL 在这两个钩子之前触发 `onYearChange`、`onMonthChange`，规则和 `setDate(..., true)` 一致。同一次操作只 MUST 通知一次，即使之后还有 blur 等其他提交时机。

#### Scenario: 点击外部提交了新值（flatpickr/flatpickr#2941）
- **WHEN** `allowInput: true`，用户输入 `1999-12-31` 后在页面空白处按下鼠标，随后输入框失去焦点
- **THEN** `onChange` 触发 1 次，原始输入框上派发了 change 事件

#### Scenario: altInput 时点击外部提交了新值
- **WHEN** `allowInput: true, altInput: true, altFormat: "d.m.Y", defaultDate: "2001-01-01"`，用户在可见输入框里输入 `20.07.1969` 后在页面空白处按下鼠标，随后输入框失去焦点
- **THEN** `onChange` 触发 1 次

#### Scenario: 手动清空后点击外部
- **WHEN** `allowInput: true, defaultDate: "2001-01-01"`，用户清空输入框后在页面空白处按下鼠标，随后输入框失去焦点
- **THEN** 输入框的值为空，`onChange` 触发 1 次，`onValueUpdate` 不触发

#### Scenario: 用 Tab 离开
- **WHEN** `allowInput: true`，用户输入 `1999-12-31` 后，输入框失去焦点，焦点移到页面上另一个输入框
- **THEN** `onChange` 触发 1 次

#### Scenario: 回车提交了跨月的新值
- **WHEN** `allowInput: true, defaultDate: "2001-01-01"`，用户输入 `1999-12-31` 后按回车
- **THEN** 依次触发 `onYearChange`、`onMonthChange`、`onValueUpdate`、`onChange` 各 1 次，并且都在 `onClose` 之前

#### Scenario: 回车时值没变
- **WHEN** `allowInput: true, defaultDate: "2001-01-01"`，用户没有修改输入框就按回车
- **THEN** `onChange` 不触发

#### Scenario: 同一天换一种写法
- **WHEN** `allowInput: true, defaultDate: "1999-01-05"`，用户把输入框改成 `1999-1-5` 后让它失去焦点
- **THEN** `onChange` 不触发，输入框的值恢复为 `1999-01-05`

#### Scenario: 原本为空时输入无效值
- **WHEN** `allowInput: true`，没有选中日期，用户输入 `abc` 后让输入框失去焦点
- **THEN** `onChange` 不触发，选中日期仍为空

#### Scenario: 解析后的时间和原来不同
- **WHEN** `allowInput: true`，`defaultDate` 是 2020-01-22 10:30 的 Date 对象，`dateFormat` 是 `Y-m-d`，用户输入 `2020-1-22` 后让输入框失去焦点
- **THEN** 选中日期变为 2020-01-22 00:00，`onChange` 触发 1 次

### Requirement: 点击外部时报告最终值

日历打开时点击外部，每次 SHALL 只提交一份待提交的编辑：用户改过输入框时，提交输入的值，不再提交时间框；否则沿用原来的方式提交时间框里的修改，由它自己负责通知。由手动输入引起的通知 SHALL 放在关闭日历、以及放弃未完成的 range 之后，用最终的选中日期和提交前的值比较。这和用鼠标点选日期时的顺序一致：先触发 `onClose`，再触发 `onChange`。

#### Scenario: 时间被夹取后只通知一次
- **WHEN** `allowInput: true, enableTime: true, minTime: "09:00"`，用户输入 `2026-01-05 07:30` 后在页面空白处按下鼠标，并且计时器已推进超过 300ms
- **THEN** `onChange` 只触发 1 次，触发时的选中日期是限制后的时间（09:30）

#### Scenario: 通知在 onClose 之后
- **WHEN** `allowInput: true`，用户输入 `1999-12-31` 后在页面空白处按下鼠标
- **THEN** `onClose` 先触发，`onChange` 后触发

#### Scenario: range 只输入了一个日期就点击外部
- **WHEN** `mode: "range", allowInput: true`，已选中 2026-01-05 到 2026-01-10，用户把输入框改成只有 `2026-01-07`，然后在页面空白处按下鼠标
- **THEN** 选中日期被清空，`onChange` 触发 1 次，触发时 `selectedDates` 为空
