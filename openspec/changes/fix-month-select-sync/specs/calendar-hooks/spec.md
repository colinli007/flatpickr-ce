## Purpose

规定 flatpickr 核心对外提供的日历视图钩子。插件和用户代码可以借助这些钩子，在核心重建日期格子后同步自己的视图。

## ADDED Requirements

### Requirement: onDaysBuilt 在每次重建日期格子后触发

核心 SHALL 在每次重建日期格子之后触发 `onDaysBuilt`，触发时 `currentYear`、`currentMonth`、`selectedDates` 都已经是新的值。不论重建是由哪个入口引起的，这个钩子都 MUST 触发。

#### Scenario: setDate 跨年
- **WHEN** 已注册 `onDaysBuilt`，调用 `setDate(new Date(2030, 0, 1))`（不传 triggerChange）
- **THEN** 钩子至少触发一次，并且最后一次触发时 `currentYear` 是 2030

#### Scenario: changeMonth 跨年
- **WHEN** 当前显示 2024 年 12 月，调用 `changeMonth(1)`
- **THEN** 钩子触发，触发时 `currentYear` 是 2025，`currentMonth` 是 0

#### Scenario: clear
- **WHEN** 已有选中日期，调用 `clear()`
- **THEN** 钩子触发，触发时 `selectedDates` 为空

#### Scenario: set 修改配置
- **WHEN** 调用 `set("maxDate", <某个日期>)`
- **THEN** 钩子触发

#### Scenario: 直接给 config.minDate 赋值
- **WHEN** 执行 `fp.config.minDate = <某个日期>`
- **THEN** 钩子触发

#### Scenario: 没有日期格子时不触发
- **WHEN** 以 `noCalendar: true` 创建实例并调用 `setDate`
- **THEN** 钩子不触发

### Requirement: onDaysBuilt 可以从配置和插件注册

核心 SHALL 允许 `onDaysBuilt` 和其他钩子一样，通过实例配置、插件返回的配置以及 `set("onDaysBuilt", ...)` 来注册，可以传单个函数，也可以传函数数组。

#### Scenario: 插件注册
- **WHEN** 一个插件在返回的配置里提供了 `onDaysBuilt`
- **THEN** 实例初始化完成后，每次重建日期格子时都会调用它

#### Scenario: 已有钩子不受影响
- **WHEN** 实例没有注册 `onDaysBuilt`
- **THEN** 其他钩子的触发顺序和次数都和改动前一样
