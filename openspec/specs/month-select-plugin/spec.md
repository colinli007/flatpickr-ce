# month-select-plugin Specification

## Purpose

规定 monthSelect 插件的月份格子在 flatpickr 实例的任何状态变化之后，都如实反映当前状态：显示的年份、选中的月份、禁用的月份、今天的标记，以及选中后焦点所在的位置。

## Requirements

### Requirement: 月份格子随实例状态同步

插件 SHALL 在实例的选中日期、显示年份或日期限制配置发生变化之后，按新状态重新显示月份格子。无论变化来自程序调用、用户输入还是年份导航，也无论是否触发了 change 事件，都 MUST 这样处理；`inline` 模式和弹出模式 MUST 表现一致。

#### Scenario: setDate 不触发 change 时跳到另一年
- **WHEN** 当前显示 2024 年，调用 `setDate(new Date(2026, 4, 1))`，不传 triggerChange
- **THEN** 年份显示为 2026，2026 年 5 月的格子带选中样式

#### Scenario: inline 模式下 setDate
- **WHEN** 以 `inline: true` 创建实例，然后调用 `setDate(new Date(2026, 4, 1))`
- **THEN** 不用打开日历，格子就已经显示 2026 年，并且 5 月带选中样式

#### Scenario: 手动输入往年的值后提交
- **WHEN** 配置了 `allowInput: true`，`maxDate` 为今天，用户在输入框里输入 "August 1939" 后按回车
- **THEN** 打开日历时显示 1939 年，1939 年的 12 个月都没有被禁用，8 月带选中样式

#### Scenario: clear 之后
- **WHEN** 已经选中了某个月份，调用 `clear()`
- **THEN** 格子里没有任何月份带选中样式

#### Scenario: 用 set 修改 maxDate
- **WHEN** 日历显示当前年份，调用 `set("maxDate", <当前年份的 3 月 1 日>)`
- **THEN** 当前年份 4 月到 12 月的格子立即显示为禁用

#### Scenario: 在年份输入框里直接输入年份
- **WHEN** 用户在年份输入框里输入另一个年份
- **THEN** 格子按这个年份重新计算禁用状态和选中样式

#### Scenario: ctrl+方向键或 changeMonth 跨年
- **WHEN** 当前显示的是某年 12 月，调用 `changeMonth(1)` 或按 ctrl+右方向键
- **THEN** 年份显示和格子都切换到下一年，格子的禁用状态按下一年计算

### Requirement: 选中样式要匹配年份

插件 SHALL 只在显示年份等于选中日期所在年份时，给选中日期所在的月份加选中样式。选中日期不是当月 1 号时也一样。

#### Scenario: 切到别的年份
- **WHEN** 选中的是 2025 年 3 月，用户切换到 2024 年
- **THEN** 2024 年的格子里没有任何月份带选中样式

#### Scenario: 切回选中日期所在的年份
- **WHEN** 接着切回 2025 年
- **THEN** 2025 年 3 月的格子带选中样式

#### Scenario: 选中日期不是 1 号
- **WHEN** 调用 `setDate(new Date(2026, 4, 15))`
- **THEN** 2026 年 5 月的格子带选中样式

### Requirement: 月份禁用规则和日期格子一致

插件 SHALL 用 flatpickr 判断日期是否可选的同一套规则（`minDate`、`maxDate`、`disable`、`enable`）来决定月份是否禁用。初始显示和切换年份之后，同一个年份的判断结果 MUST 相同。

#### Scenario: 切换年份后仍然遵守 disable
- **WHEN** 配置的 `disable` 包含明年 6 月 1 日，用户从今年切换到明年
- **THEN** 明年 6 月的格子显示为禁用，和直接以明年初始化时的结果一样

#### Scenario: minDate 所在的年份
- **WHEN** `minDate` 是去年的 3 月 20 日，当前显示去年
- **THEN** 去年 1 月和 2 月的格子显示为禁用，4 月到 12 月可以选，向前翻年的箭头显示为禁用

### Requirement: 选中后焦点保持在月份上

用户用鼠标点击或键盘回车选中一个月份、并且日历仍然打开时，插件 SHALL 把焦点留在这个月份的格子上，让用户可以继续用方向键导航。

#### Scenario: 回车选中后继续用方向键
- **WHEN** `inline` 模式下，焦点在 5 月的格子上，用户按回车，再按右方向键
- **THEN** 5 月被选中，焦点移动到 6 月的格子

#### Scenario: 点击选中后继续用方向键
- **WHEN** `inline` 模式下，用户点击 5 月的格子，再按右方向键
- **THEN** 5 月被选中，焦点移动到 6 月的格子
