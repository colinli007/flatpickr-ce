import flatpickr from "index";
import yearSelectPlugin, {
  Config as PluginConfig,
} from "plugins/yearSelect/index";
import { Instance } from "types/instance";
import { Options } from "types/options";

flatpickr.defaultConfig.animate = false;

jest.useFakeTimers();

const createInstance = (
  options: Options = {},
  pluginConfig: Partial<PluginConfig> = {}
): Instance =>
  flatpickr(document.createElement("input"), {
    plugins: [yearSelectPlugin(pluginConfig)],
    ...options,
  }) as Instance;

const years = (fp: Instance) =>
  Array.from(
    fp.calendarContainer.querySelectorAll(".flatpickr-yearSelect-year")
  ) as HTMLElement[];

const cell = (fp: Instance, year: number) =>
  years(fp).find((el) => el.textContent === String(year));

const yearsWith = (fp: Instance, className: string) =>
  years(fp)
    .filter((el) => el.classList.contains(className))
    .map((el) => Number(el.textContent));

const title = (fp: Instance) =>
  fp.calendarContainer.querySelector(".flatpickr-yearSelect-title")!
    .textContent;

const click = (el: Element | undefined) =>
  el!.dispatchEvent(new MouseEvent("click", { bubbles: true }));

const keydown = (fp: Instance, keyCode: number) =>
  (document.activeElement || fp.input).dispatchEvent(
    new KeyboardEvent("keydown", { keyCode, bubbles: true } as any)
  );

describe("yearSelect", () => {
  const thisYear = new Date().getFullYear();
  let fp: Instance;

  afterEach(() => {
    fp && fp.destroy();
  });

  describe("grid", () => {
    it("replaces the day grid and month header with a page of years", () => {
      fp = createInstance({ defaultDate: new Date(2020, 5, 10) });

      expect(fp.calendarContainer.querySelector(".dayContainer")).toBeNull();
      expect(fp.monthNav.querySelector(".cur-year")).toBeNull();
      expect(years(fp)).toHaveLength(12);
      expect(title(fp)).toEqual("2016 – 2027");
      expect(yearsWith(fp, "selected")).toEqual([2020]);
    });

    it("honors the yearsPerPage and columns options", () => {
      fp = createInstance(
        { defaultDate: new Date(2030, 0, 1) },
        { yearsPerPage: 20, columns: 4 }
      );

      expect(years(fp)).toHaveLength(20);
      expect(title(fp)).toEqual("2020 – 2039");
      expect(cell(fp, 2030)!.style.width).toEqual("25%");
    });

    it("marks this year", () => {
      fp = createInstance();
      expect(yearsWith(fp, "today")).toEqual([thisYear]);
      expect(yearsWith(fp, "selected")).toEqual([]);
    });

    it("pages with the prev/next buttons", () => {
      fp = createInstance({ defaultDate: new Date(2020, 0, 1) });

      click(fp.nextMonthNav);
      expect(title(fp)).toEqual("2028 – 2039");

      click(fp.prevMonthNav);
      click(fp.prevMonthNav);
      expect(title(fp)).toEqual("2004 – 2015");
    });

    it("reopens on the page of the selected year", () => {
      fp = createInstance({ defaultDate: new Date(2020, 0, 1) });
      fp.open();
      click(fp.nextMonthNav);
      fp.close();
      fp.open();

      expect(title(fp)).toEqual("2016 – 2027");
    });

    it("doesn't fire onYearChange when reopening", () => {
      const onYearChange = jest.fn();
      fp = createInstance({ defaultDate: new Date(2020, 0, 1), onYearChange });
      fp.open();
      click(fp.nextMonthNav);
      fp.close();
      onYearChange.mockClear();

      fp.open();

      expect(title(fp)).toEqual("2016 – 2027");
      expect(onYearChange).not.toHaveBeenCalled();
    });
  });

  describe("stays in sync with the instance", () => {
    beforeEach(() => {
      fp = createInstance({ defaultDate: new Date(2020, 0, 1) });
      fp.open();
    });

    it("after setDate without triggering change", () => {
      fp.setDate(new Date(2031, 0, 1));
      expect(yearsWith(fp, "selected")).toEqual([2031]);
      expect(title(fp)).toEqual("2028 – 2039");
    });

    it("after clear", () => {
      fp.clear();
      expect(yearsWith(fp, "selected")).toEqual([]);
    });

    it('after set("minDate")', () => {
      fp.set("minDate", new Date(2018, 0, 1));
      expect(yearsWith(fp, "flatpickr-disabled")).toEqual([2016, 2017]);
    });

    it("after changeYear", () => {
      fp.changeYear(2050);
      expect(title(fp)).toEqual("2040 – 2051");
    });

    it("after jumpToDate", () => {
      fp.jumpToDate(new Date(1990, 5, 1));
      expect(title(fp)).toEqual("1980 – 1991");
    });

    it("in inline mode", () => {
      fp.destroy();
      fp = createInstance({ inline: true });
      fp.setDate(new Date(2031, 0, 1));
      expect(yearsWith(fp, "selected")).toEqual([2031]);
    });
  });

  describe("minDate / maxDate", () => {
    beforeEach(() => {
      fp = createInstance({
        defaultDate: new Date(2022, 0, 1),
        minDate: new Date(2019, 5, 15),
        maxDate: new Date(2026, 2, 1),
      });
      fp.open();
    });

    it("disables the years out of bounds and the buttons at the ends", () => {
      expect(title(fp)).toEqual("2016 – 2027");
      expect(yearsWith(fp, "flatpickr-disabled")).toEqual([
        2016,
        2017,
        2018,
        2027,
      ]);
      expect(fp.prevMonthNav.classList).toContain("flatpickr-disabled");
      expect(fp.nextMonthNav.classList).toContain("flatpickr-disabled");
    });

    it("ignores a click on a disabled year", () => {
      click(cell(fp, 2027));
      expect(fp.input.value).toEqual("2022");
    });

    it("picks the bound when it falls within the year", () => {
      click(cell(fp, 2019));
      expect(fp.input.value).toEqual("2019");
      expect(fp.selectedDates[0]).toEqual(new Date(2019, 5, 15));

      fp.open();
      click(cell(fp, 2026));
      expect(fp.selectedDates[0]).toEqual(new Date(2026, 0, 1));
    });

    it("keeps the time of minDate", () => {
      fp.destroy();
      const minDate = new Date(2019, 5, 15, 14, 30);
      fp = createInstance({ minDate });
      fp.open();
      fp.changeYear(2019);

      click(cell(fp, 2019));

      expect(fp.selectedDates).toEqual([minDate]);
      expect(fp.input.value).toEqual("2019");
    });
  });

  describe("disable / enable", () => {
    it("picks the first day of the year that isn't disabled", () => {
      fp = createInstance({
        defaultDate: new Date(2018, 0, 1),
        disable: [new Date(2020, 0, 1)],
      });
      fp.open();

      click(cell(fp, 2020));

      expect(fp.selectedDates).toEqual([new Date(2020, 0, 2)]);
      expect(fp.input.value).toEqual("2020");
    });

    it("disables the years without a day to pick", () => {
      fp = createInstance({ enable: [new Date(2021, 4, 3)] });
      fp.open();
      fp.changeYear(2021);

      expect(
        years(fp)
          .filter((el) => !el.classList.contains("flatpickr-disabled"))
          .map((el) => Number(el.textContent))
      ).toEqual([2021]);

      click(cell(fp, 2020));
      expect(fp.selectedDates).toEqual([]);

      click(cell(fp, 2021));
      expect(fp.selectedDates).toEqual([new Date(2021, 4, 3)]);
    });
  });

  describe("formats", () => {
    it("formats defaultDate", () => {
      fp = createInstance({ defaultDate: new Date(2015, 5, 10) });
      expect(fp.input.value).toEqual("2015");
    });

    it("formats altInput", () => {
      fp = createInstance({
        altInput: true,
        defaultDate: new Date(2021, 3, 1),
      });
      expect(fp.input.value).toEqual("2021");
      expect(fp.altInput!.value).toEqual("2021");
    });

    it("takes custom formats", () => {
      fp = createInstance(
        { altInput: true, defaultDate: new Date(2021, 3, 1) },
        { dateFormat: "Y-m-d", altFormat: "y" }
      );
      expect(fp.input.value).toEqual("2021-04-01");
      expect(fp.altInput!.value).toEqual("21");
    });

    it("handles years before 1900", () => {
      fp = createInstance({ defaultDate: "1850" });
      fp.open();
      expect(yearsWith(fp, "selected")).toEqual([1850]);

      fp.changeYear(48);
      click(cell(fp, 48));
      expect(fp.selectedDates[0].getFullYear()).toEqual(48);
    });
  });

  describe("selection", () => {
    it("selects a year and closes", () => {
      const onChange = jest.fn();
      fp = createInstance({ defaultDate: new Date(2020, 0, 1), onChange });
      fp.open();

      click(cell(fp, 2023));

      expect(fp.input.value).toEqual("2023");
      expect(fp.selectedDates[0]).toEqual(new Date(2023, 0, 1));
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(fp.isOpen).toBe(false);
    });

    it("toggles years in multiple mode", () => {
      fp = createInstance({
        mode: "multiple",
        defaultDate: new Date(2020, 0, 1),
      });
      fp.open();

      click(cell(fp, 2023));
      click(cell(fp, 2016));
      click(cell(fp, 2020));

      expect(yearsWith(fp, "selected")).toEqual([2016, 2023]);
      expect(fp.isOpen).toBe(true);
    });

    it("stays on the page of the year picked in multiple mode", () => {
      fp = createInstance({
        mode: "multiple",
        defaultDate: new Date(2020, 0, 1),
      });
      fp.open();
      click(fp.prevMonthNav);

      click(cell(fp, 2010));
      expect(title(fp)).toEqual("2004 – 2015");

      fp.redraw();
      expect(title(fp)).toEqual("2004 – 2015");

      click(cell(fp, 2010));
      expect(title(fp)).toEqual("2004 – 2015");
      expect(fp.selectedDates).toEqual([new Date(2020, 0, 1)]);
    });

    describe("in range mode", () => {
      beforeEach(() => {
        fp = createInstance({
          mode: "range",
          defaultDate: new Date(2020, 0, 1),
        });
        fp.clear();
        fp.open();
        // opening shows this year's page: move to a fixed one
        fp.changeYear(2000);
      });

      it("stays open after the first year and closes after the second", () => {
        click(cell(fp, 1997));
        expect(fp.isOpen).toBe(true);

        click(cell(fp, 2001));
        expect(fp.isOpen).toBe(false);
        expect(fp.selectedDates).toEqual([
          new Date(1997, 0, 1),
          new Date(2001, 0, 1),
        ]);
        expect(yearsWith(fp, "startRange")).toEqual([1997]);
        expect(yearsWith(fp, "inRange")).toEqual([1998, 1999, 2000]);
        expect(yearsWith(fp, "endRange")).toEqual([2001]);
      });

      it("previews the range on hover", () => {
        click(cell(fp, 1997));
        cell(fp, 2000)!.dispatchEvent(
          new MouseEvent("mouseover", { bubbles: true })
        );
        expect(yearsWith(fp, "inRange")).toEqual([1998, 1999]);
        expect(yearsWith(fp, "endRange")).toEqual([2000]);
      });

      it("tells onYearChange the year it stays on", () => {
        const reported: number[] = [];
        fp.set("onYearChange", (_: Date[], __: string, self: Instance) =>
          reported.push(self.currentYear)
        );
        fp.set("closeOnSelect", false);

        click(cell(fp, 2001));
        click(fp.prevMonthNav);
        click(cell(fp, 1985));

        expect(title(fp)).toEqual("1980 – 1991");
        expect(reported[reported.length - 1]).toEqual(1985);
      });

      it("doesn't pick past a disabled date with Enter", () => {
        fp.set("disable", [new Date(1999, 3, 1)]);
        click(cell(fp, 1997));
        cell(fp, 2001)!.dispatchEvent(
          new MouseEvent("mouseover", { bubbles: true })
        );
        cell(fp, 2001)!.focus();

        keydown(fp, 13);

        expect(fp.selectedDates).toEqual([new Date(1997, 0, 1)]);
      });

      it("drops a half range on close", () => {
        click(cell(fp, 1997));
        fp.close();
        expect(fp.selectedDates).toHaveLength(0);
      });
    });
  });

  describe("keyboard", () => {
    beforeEach(() => {
      fp = createInstance({ defaultDate: new Date(2020, 0, 1) });
      fp.open();
      cell(fp, 2020)!.focus();
    });

    it("moves by year and by row", () => {
      keydown(fp, 39);
      expect(document.activeElement!.textContent).toEqual("2021");

      keydown(fp, 40);
      expect(document.activeElement!.textContent).toEqual("2024");
    });

    it("turns the page past its edges", () => {
      keydown(fp, 38);
      keydown(fp, 38);
      keydown(fp, 38);
      expect(document.activeElement!.textContent).toEqual("2011");
      expect(title(fp)).toEqual("2004 – 2015");
    });

    it("passes over a disabled year without picking it", () => {
      fp.set("disable", [(date: Date) => date.getFullYear() === 2021]);
      cell(fp, 2020)!.focus();

      keydown(fp, 39);
      expect(document.activeElement!.textContent).toEqual("2021");
      keydown(fp, 13);
      expect(fp.input.value).toEqual("2020");

      keydown(fp, 39);
      expect(document.activeElement!.textContent).toEqual("2022");
    });

    it("selects with Enter", () => {
      keydown(fp, 37);
      keydown(fp, 13);
      expect(fp.input.value).toEqual("2019");
    });
  });

  describe("accessibility and theme", () => {
    it("sets roles and labels", () => {
      fp = createInstance({ defaultDate: new Date(2020, 0, 1) });
      const container = fp.calendarContainer.querySelector(
        ".flatpickr-yearSelect-years"
      )!;

      expect(container.getAttribute("role")).toEqual("listbox");
      expect(container.getAttribute("aria-label")).toEqual("2016 – 2027");
      expect(cell(fp, 2020)!.getAttribute("role")).toEqual("option");
      expect(cell(fp, 2020)!.getAttribute("aria-selected")).toEqual("true");
      expect(fp.prevMonthNav.getAttribute("aria-label")).toEqual("2004 – 2015");
    });

    it("adds the theme class", () => {
      fp = createInstance({}, { theme: "dark" });
      expect(fp.calendarContainer.classList).toContain(
        "flatpickr-yearSelect-theme-dark"
      );
    });
  });

  it("keeps its grid on mobile devices", () => {
    const userAgent = navigator.userAgent;
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      configurable: true,
    });

    fp = createInstance();

    Object.defineProperty(navigator, "userAgent", {
      value: userAgent,
      configurable: true,
    });

    expect(fp.isMobile).toBe(false);
    expect(years(fp)).toHaveLength(12);
  });

  it("is destroyed cleanly", () => {
    fp = createInstance({ mode: "range" });
    const calendar = fp.calendarContainer;
    document.body.appendChild(calendar);

    expect(() => fp.destroy()).not.toThrow();
    expect(calendar.parentNode).toBeNull();
    fp = undefined as any;
  });
});
