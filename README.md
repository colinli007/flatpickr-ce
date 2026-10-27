## flatpickr-ce - community edition of flatpickr
[![Actions Status](https://github.com/colinli007/flatpickr-ce/workflows/GitHub%20Actions/badge.svg)](https://github.com/colinli007/flatpickr-ce/actions)
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

> The `flatpickr-ce` npm package hasn't been published yet. The commands below apply once it is.

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

- Elements from another window or an iframe are now supported ([#3138](https://github.com/flatpickr/flatpickr/issues/3138), [#3096](https://github.com/flatpickr/flatpickr/issues/3096))
- Removed a dead `Event.path` check in the outside-click handler ([#2766](https://github.com/flatpickr/flatpickr/issues/2766))


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
