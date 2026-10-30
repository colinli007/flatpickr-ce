import { Plugin } from "../../types/options";
import { Instance, DayElement } from "../../types/instance";
import { clearNode, getEventTarget } from "../../utils/dom";

export interface Config {
  /** years shown per page */
  range: number;
  /** columns of the year grid */
  columns: number;
  dateFormat: string;
  altFormat: string;
  theme: string;
}

export type YearElement = HTMLSpanElement & { dateObj: Date; $year: number };

const defaultConfig: Config = {
  range: 12,
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

function yearSelectPlugin(pluginConfig?: Partial<Config>): Plugin {
  const config = { ...defaultConfig, ...pluginConfig };
  config.range = Math.max(1, Math.floor(config.range) || defaultConfig.range);
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
      // first year of the page on show
      startYear: 0,
    };

    const minYear = () =>
      fp.config.minDate ? fp.config.minDate.getFullYear() : null;
    const maxYear = () =>
      fp.config.maxDate ? fp.config.maxDate.getFullYear() : null;

    function isYearEnabled(year: number) {
      const min = minYear();
      const max = maxYear();
      return (min === null || year >= min) && (max === null || year <= max);
    }

    function clampYear(year: number) {
      const min = minYear();
      const max = maxYear();
      if (max !== null && year > max) year = max;
      if (min !== null && year < min) year = min;
      return year;
    }

    // The date picked for a year: January 1st, or minDate / maxDate when they
    // fall within that year, as flatpickr drops dates out of bounds
    function dateForYear(year: number): Date {
      let date = firstDayOfYear(year);
      if (fp.config.minDate && date < fp.config.minDate)
        date = new Date(fp.config.minDate.getTime());
      if (fp.config.maxDate && date > fp.config.maxDate)
        date = new Date(fp.config.maxDate.getTime());
      date.setHours(0, 0, 0, 0);
      return date;
    }

    // A page centered on the year, short of pages lying wholly out of bounds
    function pageStartFor(year: number) {
      let start = year - Math.floor(config.range / 2);
      const min = minYear();
      const max = maxYear();
      if (max !== null && start + config.range - 1 > max)
        start = max - config.range + 1;
      if (min !== null && start < min) start = min;
      return start;
    }

    const isInPage = (year: number) =>
      year >= self.startYear && year < self.startYear + config.range;

    function cellOf(year: number): YearElement | null {
      const index = year - self.startYear;
      if (!self.yearsContainer || index < 0 || index >= config.range)
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
      self.yearsContainer.style.gridTemplateColumns = `repeat(${config.columns}, 1fr)`;

      fp.rContainer.appendChild(self.yearsContainer);

      fp.calendarContainer.classList.add(
        "flatpickr-yearSelect",
        `flatpickr-yearSelect-theme-${config.theme}`
      );

      self.startYear = pageStartFor(fp.currentYear);
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
      const lastYear = self.startYear + config.range - 1;

      clearNode(self.yearsContainer);

      const frag = document.createDocumentFragment();

      for (let i = 0; i < config.range; i++) {
        const year = self.startYear + i;
        const selected = selectedYears.indexOf(year) !== -1;

        const cell = fp._createElement<YearElement>(
          "span",
          "flatpickr-yearSelect-year",
          String(year)
        );
        cell.tabIndex = -1;
        cell.$year = year;
        cell.dateObj = dateForYear(year);
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

        if (isYearEnabled(year)) {
          cell.addEventListener("click", selectYear);
        } else {
          cell.classList.add("flatpickr-disabled");
          cell.setAttribute("aria-disabled", "true");
        }

        frag.appendChild(cell);
      }

      self.yearsContainer.appendChild(frag);

      const pageLabel = `${self.startYear} – ${lastYear}`;
      if (self.title) self.title.textContent = pageLabel;
      self.yearsContainer.setAttribute("aria-label", pageLabel);

      const min = minYear();
      const max = maxYear();
      const prevDisabled = min !== null && self.startYear <= min;
      const nextDisabled = max !== null && lastYear >= max;

      fp.prevMonthNav.classList.toggle("flatpickr-disabled", prevDisabled);
      fp.nextMonthNav.classList.toggle("flatpickr-disabled", nextDisabled);
      fp.prevMonthNav.setAttribute(
        "aria-label",
        `${self.startYear - config.range} – ${self.startYear - 1}`
      );
      fp.nextMonthNav.setAttribute(
        "aria-label",
        `${lastYear + 1} – ${lastYear + config.range}`
      );

      // rebuilding the cells loses the focus, so carry it over
      if (focusedYear !== undefined) {
        const cell = cellOf(focusedYear);
        if (cell) cell.focus();
      }
    }

    // Follow fp.currentYear, which setDate, clear, changeYear, jumpToDate and
    // set("minDate"/"maxDate") all move, then rebuild the cells
    function render() {
      if (!self.yearsContainer) return;

      if (!isInPage(fp.currentYear))
        self.startYear = pageStartFor(fp.currentYear);

      buildYears();
    }

    function changePage(delta: number) {
      const min = minYear();
      const max = maxYear();
      if (delta < 0 && min !== null && self.startYear <= min) return;
      if (delta > 0 && max !== null && self.startYear + config.range - 1 >= max)
        return;

      const start = self.startYear + delta * config.range;
      self.startYear = start;
      // keep fp.currentYear on the page, so redraws don't page back
      fp.changeYear(clampYear(start + Math.floor(config.range / 2)));
      self.startYear = start;
      buildYears();
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

    function selectYear(e: Event) {
      e.preventDefault();
      e.stopPropagation();

      const eventTarget = getEventTarget(e);

      if (!(eventTarget instanceof Element)) return;
      if (eventTarget.classList.contains("flatpickr-disabled")) return;
      if (eventTarget.classList.contains("notAllowed")) return;

      setYear((eventTarget as YearElement).$year);
    }

    function setYear(year: number) {
      if (!self.yearsContainer || !isYearEnabled(year)) return;

      const date = dateForYear(year);
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
          selectedDates.sort((a, b) => a.getTime() - b.getTime());
          break;

        case "range":
          if (fp.selectedDates.length === 2) {
            selectedDates = [date];
          } else {
            selectedDates = fp.selectedDates.concat([date]);
            selectedDates.sort((a, b) => a.getTime() - b.getTime());
          }
          break;
      }

      // stay on the page that was clicked
      const start = self.startYear;
      fp.setDate(selectedDates, true);
      self.startYear = start;
      buildYears();

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
        if (isYearFocused && !active!.classList.contains("flatpickr-disabled"))
          setYear(active!.$year);
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

      const year = clampYear(active!.$year + shift);
      if (year === active!.$year || !isYearEnabled(year)) return;

      // moving past the edge of the page turns the page
      if (!cellOf(year)) changePage(year < self.startYear ? -1 : 1);

      const cell = cellOf(year);
      if (cell) cell.focus();
    }

    // reopen on the page of the selected year, or this year
    function onOpen() {
      if (!self.yearsContainer) return;

      const year = fp.selectedDates.length
        ? fp.selectedDates[0].getFullYear()
        : clampYear(new Date().getFullYear());

      self.startYear = pageStartFor(year);
      if (fp.currentYear !== year) fp.changeYear(year);
      self.startYear = pageStartFor(year);
      buildYears();
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
      onDaysBuilt: render,
      onOpen,
      onKeyDown,
      onReady: [
        clearUnnecessaryDOMElements,
        build,
        bindEvents,
        render,
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
