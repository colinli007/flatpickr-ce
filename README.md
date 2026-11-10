## flatpickr-ce - community edition of flatpickr
[![Actions Status](https://github.com/colinli007/flatpickr-ce/workflows/GitHub%20Actions/badge.svg)](https://github.com/colinli007/flatpickr-ce/actions)
[![npm version](https://img.shields.io/npm/v/flatpickr-ce.svg)](https://www.npmjs.com/package/flatpickr-ce)
[![License](https://img.shields.io/badge/license-MIT-blue.svg?style=plastic)](https://raw.githubusercontent.com/colinli007/flatpickr-ce/main/LICENSE.md)

flatpickr-ce is a community-maintained edition of [flatpickr](https://github.com/flatpickr/flatpickr), the lightweight, dependency-free datetime picker created by [Gregory Petrosyan (chmln)](https://github.com/chmln). The upstream repository hasn't had a release since 2022, so this repo picks up its open fixes and pull requests ([context](https://github.com/flatpickr/flatpickr/issues/1646)).

- Drop-in replacement: same API, options, themes and plugins; only the package name changes.
- Full git history, with the original MIT license and credits.
- Issues and pull requests are welcome [here](https://github.com/colinli007/flatpickr-ce/issues).


![blue](https://cloud.githubusercontent.com/assets/11352152/14549371/3cbb65da-028d-11e6-976d-a6f63f32061f.PNG)
![green](https://cloud.githubusercontent.com/assets/11352152/14549373/3cbe975a-028d-11e6-9192-43975f0146da.PNG)
![confetti](https://cloud.githubusercontent.com/assets/11352152/14549440/de9bf55e-028d-11e6-9271-46782a99efea.PNG)
![red](https://cloud.githubusercontent.com/assets/11352152/14549374/3cc01102-028d-11e6-9ff4-0cf208a310c4.PNG)
![default](https://cloud.githubusercontent.com/assets/11352152/14549370/3cadb750-028d-11e6-818d-c6a1bc6349fc.PNG)
![dark](https://cloud.githubusercontent.com/assets/11352152/14549372/3cbc8514-028d-11e6-8daf-ec1ba01c9d7e.PNG)


## Install

```sh
npm install flatpickr-ce
```

```js
import flatpickr from "flatpickr-ce";
import "flatpickr-ce/dist/flatpickr.css";

flatpickr("#date", { enableTime: true });
```

### Migrating from flatpickr

The API is unchanged, so swapping the package is enough. To keep your existing `flatpickr` imports (and keep the addons listed below working), install it under the old name with an npm alias:

```sh
npm install flatpickr@npm:flatpickr-ce
```


## What's changed since flatpickr 4.6.13

### 4.10.0

- The native mobile input follows `set("minDate")` and `set("maxDate")`, and its `min` and `max` are a date and time with `enableTime` and a time with `noCalendar`, on a time its picker can offer ([#2860](https://github.com/flatpickr/flatpickr/issues/2860))
- With `enableSeconds`, the native mobile input shows and picks seconds ([#2908](https://github.com/flatpickr/flatpickr/issues/2908))
- New `secondIncrement` option for the seconds input; without it the seconds step by `minuteIncrement` as before ([#2912](https://github.com/flatpickr/flatpickr/pull/2912))
- A time off its increment, as `minDate` can give, no longer keeps a form with the calendar inside it from submitting, and `set("hourIncrement")` and `set("minuteIncrement")` apply at once ([#2923](https://github.com/flatpickr/flatpickr/issues/2923))
- `enable` and `disable` are checked by day for a value with a time, as for a click ([#2855](https://github.com/flatpickr/flatpickr/issues/2855))
- The default time is held to `minDate` and `maxDate` only on their own day, so a date-only `maxDate` no longer turns it into 00:00 ([#2894](https://github.com/flatpickr/flatpickr/issues/2894))
- In multiple mode, dates typed without the space after the conjunction, such as `01/08/2023,02/08/2023`, are read as separate dates ([#2922](https://github.com/flatpickr/flatpickr/issues/2922))
- monthSelect's multiple mode adds and removes months on click ([#2849](https://github.com/flatpickr/flatpickr/issues/2849), [#2858](https://github.com/flatpickr/flatpickr/issues/2858))
- In range mode, a tapped end can no longer cross a disabled day ([#2974](https://github.com/flatpickr/flatpickr/pull/2974))
- With `allowInput`, Escape in the input closes the calendar ([#2915](https://github.com/flatpickr/flatpickr/pull/2915))
- `set("locale")` switches the time inputs to the locale's 12- or 24-hour form and AM/PM ([#2954](https://github.com/flatpickr/flatpickr/issues/2954))
- A year past what a Date can hold leaves the calendar as it was instead of breaking it ([#2906](https://github.com/flatpickr/flatpickr/issues/2906))
- `element._flatpickr` is the instance in the hooks `init` fires and in plugins ([#2977](https://github.com/flatpickr/flatpickr/issues/2977))
- The airbnb theme's IE rule is a media query that CSS parsers such as lightningcss accept ([#2976](https://github.com/flatpickr/flatpickr/issues/2976))
- The main entry is typed as `export =`, so the default import works under `moduleResolution` `node16` and `nodenext` ([#2857](https://github.com/flatpickr/flatpickr/pull/2857))
- Locales: Finnish ranges are separated with an en dash and Indonesian ones with "sampai"; Irish is registered as `ga`, Vietnamese also as `vi` and Norwegian also as `nb`; the Kurdish (Sorani) weekday shorthand is abbreviated ([#2842](https://github.com/flatpickr/flatpickr/pull/2842), [#2966](https://github.com/flatpickr/flatpickr/pull/2966), [#2848](https://github.com/flatpickr/flatpickr/pull/2848), [#2867](https://github.com/flatpickr/flatpickr/pull/2867), [#2904](https://github.com/flatpickr/flatpickr/pull/2904), [#2895](https://github.com/flatpickr/flatpickr/pull/2895))

Behavior changes to check when upgrading:

- Finnish ranges saved with " to " and Indonesian ones saved with " - " read as a same-day range of their first date. Replace the separator in stored values, or keep it with `locale: { ...Finnish, rangeSeparator: " to " }`.
- `locale: "hr"` no longer gives Irish; use `"ga"`.
- TypeScript: under `moduleResolution` `node` with neither `esModuleInterop` nor `allowSyntheticDefaultImports`, the default import is an error (TS1259); turn on `allowSyntheticDefaultImports`. `import * as flatpickr` is typed as the function itself, so `flatpickr.default(...)` no longer compiles.
- A value with a time (`defaultDate`, `setDate`, typed text) on a day `disable` lists is dropped, and one on a day `enable` lists is kept; an `enable` or `disable` function is called with midnight of its day, as for a click.
- In multiple mode, a conjunction without leading whitespace whose trimmed part appears in `dateFormat`, such as the default ", " with `"j,M,Y"`, now splits a date apart. A custom `parseDate` gets each date with the whitespace around it trimmed.
- With the native mobile input and `enableTime` or `noCalendar`, the native picker keeps to `minDate` and `maxDate`, which it ignored. A value kept outside them, as `allowInvalidPreload` keeps one, leaves the input invalid, so its form doesn't submit until it's changed.
- The calendar's hour, minute and second inputs have no `step` attribute.
- With `enableTime`, `set("locale")` rebuilds the time inputs, so listeners attached directly to them are lost, as on `set("time_24hr")`.
- In monthSelect, the view stays on the year of the month picked.

### 4.9.0

- New yearSelect plugin: a year-only picker modeled on monthSelect, for single, multiple and range mode ([#5](https://github.com/colinli007/flatpickr-ce/issues/5), [#6](https://github.com/colinli007/flatpickr-ce/pull/6))
- In range mode, a same-day range written as one date reads back as that range instead of a start that a click outside drops ([#3010](https://github.com/flatpickr/flatpickr/issues/3010))
- rangePlugin with `allowInput` commits what is typed into its two inputs as one range: a click outside keeps the range, and `onChange` fires once per commit
- A date or time with a field out of range, such as `02/31/2025` or `24:00`, is invalid instead of rolling over ([#2988](https://github.com/flatpickr/flatpickr/issues/2988))
- Month names, weekday names and AM/PM are parsed in any case ([#3057](https://github.com/flatpickr/flatpickr/pull/3057))
- `allowInvalidPreload` no longer throws on a value it can't parse ([#3000](https://github.com/flatpickr/flatpickr/issues/3000), [#2760](https://github.com/flatpickr/flatpickr/issues/2760), [#2856](https://github.com/flatpickr/flatpickr/issues/2856))
- `clear()`, and `set("minDate")` or `set("maxDate")`, keep the view within the current limits ([#3002](https://github.com/flatpickr/flatpickr/issues/3002))
- With `showMonths > 1`, picking a day in a shown month of the next year keeps the view ([#3003](https://github.com/flatpickr/flatpickr/issues/3003))
- Enter and the arrow keys in the month dropdown no longer change the year or move the focus ([#3045](https://github.com/flatpickr/flatpickr/pull/3045))
- Seconds are only clamped to `minTime`/`maxTime` within their hour ([#3023](https://github.com/flatpickr/flatpickr/issues/3023), [#3024](https://github.com/flatpickr/flatpickr/pull/3024))
- With `wrap`, `static` and `altInput`, the altInput stays next to the input ([#3037](https://github.com/flatpickr/flatpickr/issues/3037))
- The Hebrew range separator is " עד ", and the Breton name of Wednesday is fixed ([#3014](https://github.com/flatpickr/flatpickr/issues/3014), [#3088](https://github.com/flatpickr/flatpickr/pull/3088))

Behavior changes to check when upgrading:

- In range mode without `enableTime`, a string with one date (the input's value, `defaultDate`, `setDate`, typed text) is a same-day range, so the next day picked starts a new range instead of finishing it. With rangePlugin, `setDate("2024-04-19")` sets a same-day range in both inputs.
- A date with a field out of range is reported to `errorHandler` and selects nothing, also in `minDate`, `maxDate`, `enable` and `disable`. `maxTime: "24:00"` is dropped; use `"23:59"`.
- Hebrew ranges saved with " אל " read as a same-day range of their first date. Replace the separator in stored values, or keep it with `locale: { ...Hebrew, rangeSeparator: " אל " }`.
- With rangePlugin and `allowInput`, an emptied or unparsable end leaves the other end as both ends instead of clearing the range, and an end typed before the start takes the start along.
- With `wrap`, `static` and `altInput`, the altInput is inside the wrap element, which changes DOM snapshots.

### 4.8.0

- A typed value is committed the same way on Enter, blur and a click outside, and `onChange` now fires when a click outside commits it ([#2941](https://github.com/flatpickr/flatpickr/issues/2941), [#3136](https://github.com/flatpickr/flatpickr/pull/3136))
- The arrow keys move by date, also across years with `showMonths > 1`, and skip past months where every day is disabled ([#3099](https://github.com/flatpickr/flatpickr/issues/3099), [#3140](https://github.com/flatpickr/flatpickr/pull/3140), [#3064](https://github.com/flatpickr/flatpickr/issues/3064))
- `set("enableTime")`, `set("time_24hr")` and `set("enableSeconds")` take effect ([#3083](https://github.com/flatpickr/flatpickr/issues/3083))
- Formats with numeric month names parse correctly ([#3115](https://github.com/flatpickr/flatpickr/issues/3115), [#3139](https://github.com/flatpickr/flatpickr/pull/3139)), and with `noCalendar` a date no longer rolls over depending on today's day ([#3078](https://github.com/flatpickr/flatpickr/issues/3078))
- A `range` value with an end ruled out by `minDate`, `maxDate`, `enable` or `disable` is dropped as a whole instead of leaving half a range; `allowInvalidPreload` keeps the whole range ([#3108](https://github.com/flatpickr/flatpickr/issues/3108))
- The calendar lines up with its input under scroll locks that fix `<html>` in place, such as Vuetify's dialogs ([#3122](https://github.com/flatpickr/flatpickr/issues/3122)), and one that fits neither above nor below its input is kept in the viewport ([#3094](https://github.com/flatpickr/flatpickr/issues/3094))
- The document and window listeners are only bound while the calendar is open ([#3069](https://github.com/flatpickr/flatpickr/issues/3069)), and the calendar's own fields have ids, so Chrome no longer flags them ([#3118](https://github.com/flatpickr/flatpickr/issues/3118))
- The native mobile input isn't rewritten while it's being typed into ([#3144](https://github.com/flatpickr/flatpickr/issues/3144), [#3145](https://github.com/flatpickr/flatpickr/pull/3145)), and moving to another year without a calendar no longer throws
- monthSelect stays in sync after `setDate` and typed input, and shows its own grid on mobile devices ([#3067](https://github.com/flatpickr/flatpickr/issues/3067), [#3109](https://github.com/flatpickr/flatpickr/issues/3109), [#3119](https://github.com/flatpickr/flatpickr/issues/3119)); plugins can rebuild their cells on the new `onDaysBuilt` hook
- rangePlugin fires `onOpen` once per opening, lets `defaultDate` override a prefilled second input, and parses that input in the format it displays ([#3114](https://github.com/flatpickr/flatpickr/issues/3114))
- New Galician, Breton and Tajik locales, a Bulgarian range separator, and localized aria labels in 12 more locales ([#3137](https://github.com/flatpickr/flatpickr/pull/3137), [#3088](https://github.com/flatpickr/flatpickr/pull/3088), [#3106](https://github.com/flatpickr/flatpickr/pull/3106), [#3081](https://github.com/flatpickr/flatpickr/pull/3081), [#3131](https://github.com/flatpickr/flatpickr/pull/3131), [#3079](https://github.com/flatpickr/flatpickr/pull/3079))

Behavior changes to check when upgrading:

- Enter no longer fires `onChange` for an unchanged value, and typed times are held within `minTime`/`maxTime`.
- `fp.isMobile` isn't set yet while plugin factories run; read it in a hook. Options a plugin returns (such as `disableMobile`) now decide whether the native mobile input is used.
- With `noCalendar`, a format with a month but no day (e.g. `m/Y`) lands on the 1st.
- A selected date that is disabled carries the `selected` class next to `flatpickr-disabled`.
- A calendar that fits neither above nor below its input may cover it, and shows no arrow.
- Listeners a page adds to the document after creating the picker and before opening it now run before flatpickr's.
- The month dropdown, year and time inputs have ids (`flatpickr-<n>-month`, `-year-<i>`, `-hour`, `-minute`, `-second`), which changes DOM snapshots.

### 4.7.0 – 4.7.2

- Elements from another window or an iframe are now supported ([#3138](https://github.com/flatpickr/flatpickr/issues/3138), [#3096](https://github.com/flatpickr/flatpickr/issues/3096))
- Removed a dead `Event.path` check in the outside-click handler ([#2766](https://github.com/flatpickr/flatpickr/issues/2766))
- The calendar is now positioned correctly when `appendTo` is a positioned element, such as a container inside shadow DOM, a fixed or transformed modal, or a scrolling container ([#1024](https://github.com/flatpickr/flatpickr/issues/1024), [#2362](https://github.com/flatpickr/flatpickr/pull/2362))
- Near the right edge of the page, the calendar now lines up with the input's right edge, and centering it no longer inserts a new stylesheet rule on every open


## Features

Browsers' native date and time inputs are inconsistent and limited, and most other pickers pull in heavy dependencies like jQuery, Bootstrap or moment.js. flatpickr is good-looking out of the box, dependency-free, powerful and extensible:

- Dependency-free (no bloated bundles)
- Simple, polished UX
- Date + time input
- Range selections
- Ability to select multiple dates
- Can be used as just a time picker
- Display dates in a human-friendly format
- Easily disable specific dates, date ranges, or any date using arbitrary logic
- Week numbers
- 51 locales
- 8 colorful themes (incl. dark and material)
- Numerous plugins
- Libraries available for React, Angular, Vue, Ember, and more

![](https://user-images.githubusercontent.com/11352152/36033089-f37dc1d0-0d7d-11e8-8ec4-c7a56d1ff92e.png)


## Compatibility
IE9 and up, Edge, iOS Safari 6+, Chrome 8+, Firefox 6+


## Documentation

Demos and documentation: https://flatpickr.js.org. The API is the same, so everything there applies to flatpickr-ce.

Framework addons (they depend on the `flatpickr` package, so use the alias above):
* [angular2+-flatpickr addon](https://github.com/mezoistvan/ng2-flatpickr)
* [angularJS-flatpickr addon](https://www.npmjs.com/package/angular-flatpickr)
* [ember-flatpickr addon](https://www.npmjs.com/package/ember-flatpickr)
* [Preact Component](https://github.com/molnarmark/preact-flatpickr)
* [React Component](https://github.com/coderhaoxin/react-flatpickr)
* [Stimulus.js Controller](https://github.com/adrienpoly/stimulus-flatpickr)
* [Svelte Component](https://github.com/jacobmischka/svelte-flatpickr)
* [vue-flatpickr component](https://github.com/ankurk91/vue-flatpickr-component)
* [lit-flatpickr component](https://github.com/Matsuuu/lit-flatpickr)

### Options are trusted

A few options are inserted into the calendar as HTML, not text: `prevArrow`, `nextArrow`, what `getWeek` returns and confirmDate's `confirmIcon`. Like the rest of the config, they are meant to come from your code: don't build them from user input or other untrusted data without escaping it.


## Contributing

Bug reports, triage and pull requests are all welcome. Fixes that are still open upstream can be reopened here.

To report a bug, start from [this fiddle](https://jsfiddle.net/gh/get/library/pure/colinli007/flatpickr-ce/tree/main/.github/repro), which loads the latest flatpickr-ce from jsDelivr: reproduce the bug there, save it and link it in the issue.

```sh
npm install
npm test          # typecheck + unit tests
npm run fmt       # prettier
npm start         # dev server with live reload
```


## Credits & license

flatpickr was created by [Gregory Petrosyan](https://github.com/chmln) and its many contributors. flatpickr-ce keeps the original [MIT license](LICENSE.md).

If flatpickr has made your life easier, you can buy its original author a cup of coffee:

<a href='https://ko-fi.com/A3381DJ9' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://az743702.vo.msecnd.net/cdn/kofi4.png?v=0' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a>
