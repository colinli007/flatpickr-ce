import { Plugin } from "../../types/options";
import { Instance, DayElement } from "../../types/instance";
import { clearNode, getEventTarget, toggleClass } from "../../utils/dom";

export interface Config {
  /** years shown per page */
  yearsPerPage: number;
  /** columns of the year grid */
  columns: number;
  dateFormat: string;
  altFormat: string;
  theme: string;
}

export type YearElement = HTMLSpanElement & { dateObj: Date; $year: number };

const defaultConfig: Config = {
  yearsPerPage: 12,
  columns: 3,
  dateFormat: "Y",
  altFormat: "Y",
  theme: "light",
};

// new Date(year, 0, 1) maps years 0-99 to 1900-1999, setFullYear doesn't
function firstDayOfYear(year: number): Date {
  const date = new Date(2000, 0, 1);
  date.setFullYear(year, 0, 1);
  return date;
}

function nextDay(date: Date): Date {
  const next = new Date(date.getTime());
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() + 1);
  return next;
}

// n modulo m, also for negative n
const mod = (n: number, m: number) => ((n % m) + m) % m;

function yearSelectPlugin(pluginConfig?: Partial<Config>): Plugin {
  const config = { ...defaultConfig, ...pluginConfig };
  config.yearsPerPage = Math.max(
    1,
    Math.floor(config.yearsPerPage) || defaultConfig.yearsPerPage
  );
  config.columns = Math.max(
    1,
    Math.floor(config.columns) || defaultConfig.columns
  );

  return (fp: Instance) => {
    // set here rather than in onReady, so defaultDate and altInput use them
    fp.config.dateFormat = config.dateFormat;
    fp.config.altFormat = config.altFormat;

    const self = {
      yearsContainer: null as null | HTMLDivElement,
      title: null as null | HTMLSpanElement,
    };

    const minYear = () =>
      fp.config.minDate ? fp.config.minDate.getFullYear() : null;
    const maxYear = () =>
      fp.config.maxDate ? fp.config.maxDate.getFullYear() : null;

    function clampYear(year: number) {
      const min = minYear();
      const max = maxYear();
      if (max !== null && year > max) year = max;
      if (min !== null && year < min) year = min;
      return year;
    }

    // Pages are aligned to multiples of yearsPerPage, so the page on show
    // follows fp.currentYear alone, which every API call already moves
    const pageStartOf = (year: number) => year - mod(year, config.yearsPerPage);
    const pageStart = () => pageStartOf(fp.currentYear);

    // whether the page starting at `start` has a year within minDate / maxDate
    function isPageInBounds(start: number) {
      const min = minYear();
      const max = maxYear();
      return (
        (min === null || start + config.yearsPerPage - 1 >= min) &&
        (max === null || start <= max)
      );
    }

    // The date picked for a year: its first day that setDate keeps, checked
    // with the same isEnabled(date, false) setDate filters by, so minDate's
    // time, disable and enable are honored. None when no day can be picked.
    function dateForYear(year: number): Date | undefined {
      const min = minYear();
      const max = maxYear();
      if ((min !== null && year < min) || (max !== null && year > max))
        return undefined;

      let date = firstDayOfYear(year);
      // start from minDate, keeping its time, when it falls within the year
      if (fp.config.minDate && date < fp.config.minDate)
        date = new Date(fp.config.minDate.getTime());

      for (; date.getFullYear() === year; date = nextDay(date)) {
        if (fp.isEnabled(date, false)) return date;
      }

      return undefined;
    }

    function cellOf(year: number): YearElement | null {
      const index = year - pageStart();
      if (!self.yearsContainer || index < 0 || index >= config.yearsPerPage)
        return null;
      return self.yearsContainer.children[index] as YearElement;
    }

    function clearUnnecessaryDOMElements() {
      if (!fp.rContainer) return;

      clearNode(fp.rContainer);

      for (const element of fp.monthElements) {
        if (element.parentNode) element.parentNode.removeChild(element);
      }

      // the year input sits in a .numInputWrapper with its arrows
      for (const element of fp.yearElements) {
        const wrapper = element.parentNode;
        if (wrapper && wrapper.parentNode)
          wrapper.parentNode.removeChild(wrapper);
      }
    }

    function build() {
      if (!fp.rContainer) return;

      self.title = fp._createElement<HTMLSpanElement>(
        "span",
        "flatpickr-yearSelect-title"
      );
      self.title.setAttribute("aria-live", "polite");

      const currentMonth = fp.monthNav.querySelector(
        ".flatpickr-current-month"
      );
      if (currentMonth) currentMonth.appendChild(self.title);

      self.yearsContainer = fp._createElement<HTMLDivElement>(
        "div",
        "flatpickr-yearSelect-years"
      );
      self.yearsContainer.tabIndex = -1;
      self.yearsContainer.setAttribute("role", "listbox");
      if (fp.config.mode !== "single")
        self.yearsContainer.setAttribute("aria-multiselectable", "true");

      fp.rContainer.appendChild(self.yearsContainer);

      fp.calendarContainer.classList.add("flatpickr-yearSelect");
      fp.calendarContainer.classList.add(
        `flatpickr-yearSelect-theme-${config.theme}`
      );
    }

    function buildYears() {
      if (!self.yearsContainer) return;

      const focusedYear = self.yearsContainer.contains(document.activeElement)
        ? (document.activeElement as YearElement).$year
        : undefined;

      const selectedYears = fp.selectedDates.map((d) => d.getFullYear());
      const isRange = fp.config.mode === "range";
      const rangeStart =
        isRange && selectedYears.length ? Math.min(...selectedYears) : null;
      const rangeEnd =
        isRange && selectedYears.length === 2
          ? Math.max(...selectedYears)
          : null;
      const thisYear = new Date().getFullYear();
      const startYear = pageStart();
      const lastYear = startYear + config.yearsPerPage - 1;
      const width = `${100 / config.columns}%`;

      clearNode(self.yearsContainer);

      const frag = document.createDocumentFragment();

      for (let i = 0; i < config.yearsPerPage; i++) {
        const year = startYear + i;
        const date = dateForYear(year);
        const selected = selectedYears.indexOf(year) !== -1;

        const cell = fp._createElement<YearElement>(
          "span",
          "flatpickr-yearSelect-year",
          String(year)
        );
        cell.tabIndex = -1;
        cell.style.width = width;
        cell.$year = year;
        // onMouseOver reads the date of every cell, disabled ones included
        cell.dateObj = date || firstDayOfYear(year);
        cell.setAttribute("role", "option");
        cell.setAttribute("aria-label", String(year));
        cell.setAttribute("aria-selected", String(selected));

        if (year === thisYear) {
          cell.classList.add("today");
          cell.setAttribute("aria-current", "date");
        }

        if (selected) cell.classList.add("selected");

        if (rangeStart !== null) {
          if (year === rangeStart) cell.classList.add("startRange");
          if (rangeEnd !== null) {
            if (year === rangeEnd) cell.classList.add("endRange");
            if (year > rangeStart && year < rangeEnd)
              cell.classList.add("inRange");
          }
        }

        if (date) {
          cell.addEventListener("click", selectYear);
        } else {
          cell.classList.add("flatpickr-disabled");
          cell.setAttribute("aria-disabled", "true");
        }

        frag.appendChild(cell);
      }

      self.yearsContainer.appendChild(frag);

      const pageLabel = `${startYear} – ${lastYear}`;
      if (self.title) self.title.textContent = pageLabel;
      self.yearsContainer.setAttribute("aria-label", pageLabel);

      toggleClass(
        fp.prevMonthNav,
        "flatpickr-disabled",
        !isPageInBounds(startYear - config.yearsPerPage)
      );
      toggleClass(
        fp.nextMonthNav,
        "flatpickr-disabled",
        !isPageInBounds(startYear + config.yearsPerPage)
      );
      fp.prevMonthNav.setAttribute(
        "aria-label",
        `${startYear - config.yearsPerPage} – ${startYear - 1}`
      );
      fp.nextMonthNav.setAttribute(
        "aria-label",
        `${lastYear + 1} – ${lastYear + config.yearsPerPage}`
      );

      // rebuilding the cells loses the focus, so carry it over
      if (focusedYear !== undefined) {
        const cell = cellOf(focusedYear);
        if (cell) cell.focus();
      }
    }

    function changePage(delta: number) {
      const year = fp.currentYear + delta * config.yearsPerPage;
      if (!isPageInBounds(pageStartOf(year))) return;

      // a page in bounds holds the clamped year, which changeYear accepts
      fp.changeYear(clampYear(year));
    }

    function bindEvents() {
      fp._bind(fp.prevMonthNav, "click", (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        changePage(-1);
      });

      fp._bind(fp.nextMonthNav, "click", (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        changePage(1);
      });

      fp._bind(
        self.yearsContainer as HTMLElement,
        "mouseover",
        (e: MouseEvent) => {
          if (fp.config.mode === "range")
            fp.onMouseOver(
              getEventTarget(e) as DayElement,
              "flatpickr-yearSelect-year"
            );
        }
      );
    }

    // a click and Enter both refuse a disabled year, and one that a range
    // can't reach past a disabled date (marked by onMouseOver)
    const isPickable = (cell: Element) =>
      !cell.classList.contains("flatpickr-disabled") &&
      !cell.classList.contains("notAllowed");

    function selectYear(e: Event) {
      e.preventDefault();
      e.stopPropagation();

      const eventTarget = getEventTarget(e);

      if (!(eventTarget instanceof Element) || !isPickable(eventTarget)) return;

      setYear((eventTarget as YearElement).$year);
    }

    function setYear(year: number) {
      const date = dateForYear(year);
      if (!date) return;

      let selectedDates: Date[] = [];

      switch (fp.config.mode) {
        case "single":
          selectedDates = [date];
          break;

        case "multiple":
          // picking a year again unselects it
          selectedDates = fp.selectedDates.filter(
            (d) => d.getFullYear() !== year
          );
          if (selectedDates.length === fp.selectedDates.length)
            selectedDates.push(date);
          break;

        case "range":
          selectedDates =
            fp.selectedDates.length === 2
              ? [date]
              : fp.selectedDates.concat([date]);
          break;
      }

      fp.setDate(selectedDates, true);
      // setDate shows the last selected date; stay on the year picked, as a
      // click on a day does, and tell onYearChange where the view ends up
      fp.jumpToDate(date, true);

      if (fp.config.closeOnSelect) {
        const single = fp.config.mode === "single";
        const range =
          fp.config.mode === "range" && fp.selectedDates.length === 2;

        if (single || range) fp.close();
      }
    }

    function onKeyDown(_: any, __: any, ___: any, e: KeyboardEvent) {
      if (!self.yearsContainer) return;

      const shifts: Record<number, number> = {
        37: -1,
        39: 1,
        38: -config.columns,
        40: config.columns,
      };
      const shift = shifts[e.keyCode];

      if (shift === undefined && e.keyCode !== 13) return;

      const active = document.activeElement as YearElement | null;
      const isYearFocused =
        !!active &&
        self.yearsContainer.contains(active) &&
        active.$year !== undefined;

      if (e.keyCode === 13) {
        if (isYearFocused && isPickable(active!)) setYear(active!.$year);
        return;
      }

      e.preventDefault();

      if (!isYearFocused) {
        // first arrow press: focus the selected year, this year or the first
        // enabled one
        let target = cellOf(
          fp.selectedDates.length
            ? fp.selectedDates[0].getFullYear()
            : new Date().getFullYear()
        );
        if (!target || target.classList.contains("flatpickr-disabled"))
          target = self.yearsContainer.querySelector(
            ".flatpickr-yearSelect-year:not(.flatpickr-disabled)"
          );
        if (target) target.focus();
        return;
      }

      // disabled years can be focused and passed over, only not picked
      const year = clampYear(active!.$year + shift);
      if (year === active!.$year) return;

      // moving past the edge of the page turns the page
      if (!cellOf(year)) fp.changeYear(year);

      const cell = cellOf(year);
      if (cell) cell.focus();
    }

    // reopen on the page of the selected year, or this year; unlike
    // changeYear, jumpToDate fires no onYearChange
    function onOpen() {
      fp.jumpToDate();
    }

    function closeHook() {
      if (fp.config?.mode === "range" && fp.selectedDates.length === 1)
        fp.clear(false);
    }

    function destroyPluginInstance() {
      if (self.yearsContainer !== null) {
        const years = self.yearsContainer.querySelectorAll(
          ".flatpickr-yearSelect-year"
        );

        for (let index = 0; index < years.length; index++) {
          years[index].removeEventListener("click", selectYear);
        }
      }

      self.yearsContainer = null;
      self.title = null;
    }

    return {
      // the native date input can't pick a year
      disableMobile: true,
      onParseConfig() {
        fp.config.enableTime = false;
        fp.config.noCalendar = false;
        fp.config.weekNumbers = false;
        fp.config.showMonths = 1;
      },
      onDaysBuilt: buildYears,
      onOpen,
      onKeyDown,
      onReady: [
        clearUnnecessaryDOMElements,
        build,
        bindEvents,
        buildYears,
        () => {
          fp.config.onClose.push(closeHook);
          fp.loadedPlugins.push("yearSelect");
        },
      ],
      onDestroy: [
        destroyPluginInstance,
        () => {
          fp.config.onClose = fp.config.onClose.filter(
            (hook) => hook !== closeHook
          );
        },
      ],
    };
  };
}

export default yearSelectPlugin;
