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

A few options are inserted into the calendar as HTML, not text: `prevArrow`, `nextArrow`, what `getWeek` returns, the locale's short weekday names, and confirmDate's `confirmIcon`. Like the rest of the config, they are meant to come from your code: don't build them from user input or other untrusted data without escaping it.


## Contributing

Bug reports, triage and pull requests are all welcome. Fixes that are still open upstream can be reopened here.

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
