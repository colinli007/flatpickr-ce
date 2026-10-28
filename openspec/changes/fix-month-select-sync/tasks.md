## 1. 核心新增 onDaysBuilt 钩子

- [x] 1.1 在 `__tests__/src/index.spec.ts` 中为 spec `calendar-hooks` 的 8 个场景写测试：setDate 跨年、changeMonth 跨年、clear、`set("maxDate")`、直接给 `config.minDate` 赋值、`noCalendar` 时不触发、插件注册、未注册时其他钩子不受影响。运行 `npx jest --config config/jest.json __tests__/src/index.spec.ts -t onDaysBuilt`，确认这些测试都失败（类型检查也会因为钩子名不存在而报错）。
- [x] 1.2 在 `src/types/options.ts` 的 `HookKey`、`HOOKS`、`Options`、`ParsedOptions` 和默认值里登记 `onDaysBuilt`。验证：`npx tsc --noEmit` 通过。
- [x] 1.3 在 `src/index.ts` 的 `buildDays()` 末尾、range 模式 `onMouseOver()` 之后加上 `triggerEvent("onDaysBuilt")`。验证：1.1 的测试全部通过，`npm run test:unit` 里原有的测试全部通过。

## 2. monthSelect 回归测试（应当失败）

- [x] 2.1 在 `__tests__/src/plugins/monthSelect/index.spec.ts` 中为「月份格子随实例状态同步」的 7 个场景写测试。所有 `setDate` 都传 `Date` 对象，因为插件把 `dateFormat` 改成了 `"F Y"`，字符串 `"2026-05-01"` 解析不了。手动输入的场景用 "August 1939" 加回车。运行 `npx jest --config config/jest.json __tests__/src/plugins/monthSelect`，确认在现有代码下这些测试失败。
- [x] 2.2 为「选中样式要匹配年份」「月份禁用规则和日期格子一致」「选中后焦点保持在月份上」补测试。焦点相关的测试要先把 input `appendChild` 到 `document.body`，在 `afterEach` 里调用 `destroy()` 并移除节点，否则在没挂到文档上的节点上调用 `focus()` 不会生效。点击场景要先 `focus()` 格子再派发 click 事件，模拟浏览器在 mousedown 时把焦点给到格子。运行同一个命令，记下哪些失败；已经通过的留着防回归。

## 3. monthSelect 改为由 onDaysBuilt 驱动

- [x] 3.1 新增 `render()`：先调用 `buildMonths()`（保留里面按月判断 today 的逻辑），再在 `selectedDates[0]` 的年份等于 `fp.currentYear` 时，给对应月份的格子加 `.selected`。插件返回的配置里加上 `onDaysBuilt: render`；`onReady` 里把 `setCurrentlySelected` 换成 `render`。验证：2.1 的 7 个场景全部通过。
- [x] 3.2 删除 `selectYear()`，翻年箭头的回调只保留 `fp.changeYear(...)`。验证：原有的 "year nav" 测试（#2277、#2275、#2279，以及 range 模式下放弃选择后仍然遵守 minDate）全部通过。
- [x] 3.3 删除 `setCurrentlySelected` 及它的三处调用（`onValueUpdate`、`onReady`、`setMonth` 末尾）。验证：原有的 "month cell styling" 和 "range mode" 测试全部通过，「选中样式要匹配年份」的测试通过。
- [x] 3.4 删除 `closeHook` 中的 `if (!fp.selectedDates.length) buildMonths()`。验证：两个 "clears the highlighting" 测试通过。

## 4. 选中后保留焦点

- [x] 4.1 在 `setMonth` 里，调用 `fp.setDate` 之前记下当前获得焦点的格子的 `$i`（没有就记 -1）；调用之后，如果不是 -1，就把焦点设到同一 `$i` 的新格子上。验证：回车和点击两个焦点场景的测试都通过。

## 5. 整体验证与提交

- [x] 5.1 运行 `npm test`（类型检查 + 全部单元测试）和 `npm run fmt:check`，全部通过。
- [x] 5.2 运行 `npm run build`，在浏览器里分别打开 inline 和弹出两种模式的 monthSelect，手动检查：用 `setDate` 跨年、输入一个往年的值、按 ctrl+方向键跨年、鼠标点选后接着用方向键，格子显示和焦点都正确。
- [x] 5.3 提交。提交信息里写明修复 flatpickr/flatpickr#3067、flatpickr/flatpickr#3109，取代 flatpickr/flatpickr#3068，并说明新增了 `onDaysBuilt` 钩子。在 tracking issue #2 对应的那一行更新备注；勾选要等发版并回复上游之后再做。
