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


## Looking for an upstream issue?

We don't reply on flatpickr/flatpickr issues, so many threads there won't say a fix exists. To see where an upstream issue stands here, search the [changelog](https://github.com/colinli007/flatpickr-ce/blob/main/CHANGELOG.md) for its number, or check the checklists by the year it was opened, which give every upstream issue and PR as fixed, answered, or won't fix: [2025–26](https://github.com/colinli007/flatpickr-ce/issues/2), [2024](https://github.com/colinli007/flatpickr-ce/issues/3), [2023](https://github.com/colinli007/flatpickr-ce/issues/8), [2022](https://github.com/colinli007/flatpickr-ce/issues/9), [2021](https://github.com/colinli007/flatpickr-ce/issues/10), [2020](https://github.com/colinli007/flatpickr-ce/issues/12), [2019](https://github.com/colinli007/flatpickr-ce/issues/13). If you see someone there hitting a bug that's fixed here, feel free to point them to it.


## What's changed since flatpickr 4.6.13

See the [changelog](https://github.com/colinli007/flatpickr-ce/blob/main/CHANGELOG.md) for every release's fixes and the behavior changes to check when upgrading.


## Features

- Dependency-free (no bloated bundles)
- Simple, polished UX
- Date + time input
- Range selections
- Ability to select multiple dates
- Can be used as just a time picker
- Display dates in a human-friendly format
- Easily disable specific dates, date ranges, or any date using arbitrary logic
- Week numbers
- 70+ locales
- 8 colorful themes (incl. dark and material)
- Numerous plugins


## Compatibility
IE9 and up, Edge, iOS Safari 6+, Chrome 8+, Firefox 6+


## Documentation

Demos and documentation: https://flatpickr.js.org. The API is the same, so everything there applies to flatpickr-ce.

Framework addons (they depend on the `flatpickr` package, so use the alias above):
* [angular2+-flatpickr addon](https://github.com/mezoistvan/ng2-flatpickr)
* [ember-flatpickr addon](https://www.npmjs.com/package/ember-flatpickr)
* [React Component](https://github.com/haoxins/react-flatpickr)
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

If flatpickr has made your life easier, you can [buy its original author a coffee on Ko-fi](https://ko-fi.com/A3381DJ9).
