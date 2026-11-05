import flatpickr from "index";
import { Kurdish } from "l10n/ckb";
import { Basque } from "l10n/eu";
import { French } from "l10n/fr";
import { Irish } from "l10n/ga";
import { Greek } from "l10n/gr";
import { Japanese } from "l10n/ja";
import { Norwegian } from "l10n/no";
import { Russian } from "l10n/ru";
import { Turkmen } from "l10n/tk";
import { Vietnamese } from "l10n/vn";
import { Instance, DayElement } from "types/instance";
import { Options, DateRangeLimit } from "types/options";
import confirmDatePlugin from "plugins/confirmDate/confirmDate";
import { getDefaultHours } from "utils/dates";

flatpickr.defaultConfig.animate = false;
flatpickr.defaultConfig.closeOnSelect = true;

jest.useFakeTimers();

let elem: undefined | HTMLInputElement, fp: Instance;
const UA = navigator.userAgent;
let mockAgent: string | undefined;

(navigator as any).__defineGetter__("userAgent", function () {
  return mockAgent || UA;
});

function createInstance(config?: Options, el?: HTMLElement) {
  destroyInstance();
  fp = flatpickr(
    el || elem || document.createElement("input"),
    config || {}
  ) as Instance;
  return fp;
}

function destroyInstance() {
  if (fp) {
    fp.input.value = "";
    fp.destroy && fp.destroy();
  }
}

function beforeEachTest() {
  mockAgent = undefined;
  jest.runAllTimers();

  if (document.activeElement) {
    (document.activeElement as HTMLElement).blur();
  }

  destroyInstance();

  if (elem === undefined) {
    elem = document.createElement("input");
    document.body.appendChild(elem);
  }
}

function incrementTime(
  type:
    | "currentYearElement"
    | "hourElement"
    | "minuteElement"
    | "secondElement",
  by: number
) {
  const e = fp[type];
  const times = Math.abs(by);
  const childNodeNum = by >= 0 ? 1 : 2;

  if (e !== undefined && e.parentNode)
    for (let i = times; i--; )
      simulate(
        "click",
        e.parentNode.childNodes[childNodeNum],
        { which: 1 },
        MouseEvent
      );
}

function simulate(
  eventType: string,
  onElement: Node,
  options?: object,
  type?: any
) {
  const eventOptions = Object.assign(options || {}, { bubbles: true });
  const evt = new (type || CustomEvent)(eventType, eventOptions);
  try {
    Object.assign(evt, eventOptions);
  } catch (e) {}

  onElement.dispatchEvent(evt);
}

// simulate click
const clickOn = (element: Node) => {
  simulate("click", element, { which: 1 }, CustomEvent);
};

// simulate a pointer press away from the calendar, which is what documentClick listens for
const pressOutside = () => {
  simulate("mousedown", document.body, { which: 1 }, MouseEvent);
};

describe("flatpickr", () => {
  beforeEach(beforeEachTest);

  describe("init", () => {
    it("should gracefully handle no elements", () => {
      expect(flatpickr([])).toEqual([]);
    });

    it("should parse defaultDate", () => {
      createInstance({
        defaultDate: "2016-12-27T16:16:22.585Z",
        enableTime: true,
      });

      const date = new Date("2016-12-27T16:16:22.585Z");
      expect(fp.currentYear).toEqual(date.getFullYear());
      expect(fp.currentMonth).toEqual(date.getMonth());
      const selected = fp.days.querySelector(".selected");
      expect(selected).toBeTruthy();

      if (selected) expect(selected.textContent).toEqual(date.getDate() + "");
    });

    it("shouldn't parse out-of-bounds defaultDate", () => {
      createInstance({
        minDate: "2016-12-28T16:16:22.585Z",
        defaultDate: "2016-12-27T16:16:22.585Z",
      });

      expect(fp.days.querySelector(".selected")).toEqual(null);

      createInstance({
        defaultDate: "2016-12-27T16:16:22.585Z",
        enableTime: true,
      });

      fp.set("maxDate", "2016-12-25");
      fp.set("minDate", "2016-12-24");

      expect(fp.currentMonth).toEqual(11);
      expect(fp.days.querySelector(".selected")).toEqual(null);

      let enabledDays = fp.days.querySelectorAll(
        ".flatpickr-day:not(.flatpickr-disabled)"
      );

      expect(enabledDays.length).toEqual(2);
      expect(enabledDays[0].textContent).toEqual("24");
      expect(enabledDays[1].textContent).toEqual("25");

      createInstance({
        defaultDate: "2016-12-27T16:16:22.585Z",
        minDate: "2016-12-27T16:26:22.585Z",
        enableTime: true,
      });

      expect(fp.selectedDates.length).toBe(0);
      expect(fp.days.querySelector(".selected")).toEqual(null);
    });

    it("doesn't throw with undefined properties", () => {
      createInstance({
        onChange: undefined,
      });
      fp.set("minDate", "2016-10-20");
      expect(fp.config.minDate).toBeDefined();
    });
  });

  describe("datetimestring parser", () => {
    describe("date string parser", () => {
      it("should parse timestamp", () => {
        createInstance({
          defaultDate: 1477111633771,
        });

        const date = new Date("2016-10-22T04:47:13.771Z");
        expect(fp.selectedDates[0]).toBeDefined();
        expect(fp.selectedDates[0].getFullYear()).toEqual(date.getFullYear());
        expect(fp.selectedDates[0].getMonth()).toEqual(date.getMonth());
        expect(fp.selectedDates[0].getDate()).toEqual(date.getDate());
      });

      it("should parse unix time", () => {
        createInstance({
          defaultDate: "1477111633.771", // shouldnt parse as a timestamp
          dateFormat: "U",
        });

        const date = new Date("2016-10-22T04:47:13.771Z");
        expect(fp.selectedDates[0]).toBeDefined();
        expect(fp.selectedDates[0].getFullYear()).toEqual(date.getFullYear());
        expect(fp.selectedDates[0].getMonth()).toEqual(date.getMonth());
        expect(fp.selectedDates[0].getDate()).toEqual(date.getDate());
      });

      it('should parse "2016-10"', () => {
        createInstance({
          defaultDate: "2016-10",
        });

        expect(fp.selectedDates[0]).toBeDefined();
        expect(fp.selectedDates[0].getFullYear()).toEqual(2016);
        expect(fp.selectedDates[0].getMonth()).toEqual(9);
      });

      it('should parse "2016-10-20 3:30"', () => {
        createInstance({
          defaultDate: "2016-10-20 3:30",
          enableTime: true,
        });

        expect(fp.selectedDates[0]).toBeDefined();
        expect(fp.selectedDates[0].getFullYear()).toEqual(2016);
        expect(fp.selectedDates[0].getMonth()).toEqual(9);
        expect(fp.selectedDates[0].getDate()).toEqual(20);
        expect(fp.selectedDates[0].getHours()).toEqual(3);
        expect(fp.selectedDates[0].getMinutes()).toEqual(30);
      });

      it("should parse ISO8601", () => {
        createInstance({
          defaultDate: "2007-03-04T21:08:12",
          enableTime: true,
          enableSeconds: true,
        });

        expect(fp.selectedDates[0]).toBeDefined();
        expect(fp.selectedDates[0].getFullYear()).toEqual(2007);
        expect(fp.selectedDates[0].getMonth()).toEqual(2);
        expect(fp.selectedDates[0].getDate()).toEqual(4);
        expect(fp.selectedDates[0].getHours()).toEqual(21);
        expect(fp.selectedDates[0].getMinutes()).toEqual(8);
        expect(fp.selectedDates[0].getSeconds()).toEqual(12);
      });

      it('should parse "today"', () => {
        createInstance({});
        const today = fp.parseDate("today", undefined, true);
        expect(today).toBeDefined();

        today && expect(today.getHours()).toBe(0);
      });

      it("should parse AM/PM", () => {
        createInstance({
          dateFormat: "m/d/Y h:i K",
          enableTime: true,
          defaultDate: "8/3/2017 12:00 AM",
        });

        expect(fp.selectedDates[0]).toBeDefined();
        expect(fp.selectedDates[0].getFullYear()).toEqual(2017);
        expect(fp.selectedDates[0].getMonth()).toEqual(7);
        expect(fp.selectedDates[0].getDate()).toEqual(3);
        expect(fp.selectedDates[0].getHours()).toEqual(0);
        expect(fp.selectedDates[0].getMinutes()).toEqual(0);
      });

      it("should parse JSON datestrings", () => {
        createInstance({});

        const date = fp.parseDate("2016-12-27T16:16:22.585Z", undefined);
        expect(date).toBeDefined();

        if (!date) return;

        expect(date.getTime()).toBeDefined();
        expect(date.getTime()).toEqual(Date.parse("2016-12-27T16:16:22.585Z"));
      });

      it("should parse string with unicode characters", () => {
        createInstance({
          defaultDate: "03 février 2021",
          dateFormat: "d F Y",
          locale: French,
        });

        expect(fp.selectedDates[0]).toEqual(new Date("2021-02-03T00:00:00"));
      });

      it("should parse string with space contained in month names", () => {
        createInstance({
          defaultDate: "Dé Domhnaigh 5 Meán Fómhair 2021",
          dateFormat: "l j F Y",
          locale: Irish,
        });

        expect(fp.selectedDates[0]).toEqual(new Date("2021-09-05T00:00:00"));
      });

      it("should parse string without delimiters", () => {
        createInstance({
          defaultDate: "2021年2月3日",
          dateFormat: "Y年Fj日",
          locale: Japanese,
        });

        expect(fp.selectedDates[0]).toEqual(new Date("2021-02-03T00:00:00"));
      });

      describe("names in another case (flatpickr#3057)", () => {
        it.each([
          ["5 february 2025", "j F Y"],
          ["5 FEBRUARY 2025", "j F Y"],
          ["5 feb 2025", "j M Y"],
          ["wed, 5 feb 2025", "D, j M Y"],
          ["WEDNESDAY 5 February 2025", "l j F Y"],
        ])("parses %s with %s", (value, format) => {
          createInstance();

          expect(fp.parseDate(value, format)).toEqual(new Date(2025, 1, 5));
        });

        it("parses month names with non-ASCII letters", () => {
          createInstance({ locale: French });

          expect(fp.parseDate("03 FÉVRIER 2021", "d F Y")).toEqual(
            new Date(2021, 1, 3)
          );
        });

        it.each(["pm", "PM", "Pm"])("parses %s", (amPM) => {
          createInstance();

          expect(fp.parseDate(`8/3/2017 1:30 ${amPM}`, "m/d/Y h:i K")).toEqual(
            new Date(2017, 7, 3, 13, 30)
          );
        });
      });
    });

    describe("time string parser", () => {
      it('should parse "21:11"', () => {
        createInstance({
          defaultDate: "21:11",
          allowInput: true,
          enableTime: true,
          noCalendar: true,
        });

        expect(fp.selectedDates[0]).toBeDefined();
        expect(fp.selectedDates[0].getHours()).toEqual(21);
        expect(fp.selectedDates[0].getMinutes()).toEqual(11);
      });

      it('should parse "21:11:12"', () => {
        createInstance({
          allowInput: true,
          enableTime: true,
          enableSeconds: true,
          noCalendar: true,
          defaultDate: "21:11:12",
        });

        expect(fp.selectedDates[0]).toBeDefined();
        expect(fp.selectedDates[0].getHours()).toEqual(21);
        expect(fp.selectedDates[0].getMinutes()).toEqual(11);
        expect(fp.selectedDates[0].getSeconds()).toEqual(12);
      });

      it('should parse "11:59 PM"', () => {
        createInstance({
          allowInput: true,
          enableTime: true,
          noCalendar: true,
          dateFormat: "h:i K",
          defaultDate: "11:59 PM",
        });

        expect(fp.selectedDates[0]).toBeDefined();
        expect(fp.selectedDates[0].getHours()).toBe(23);
        expect(fp.selectedDates[0].getMinutes()).toBe(59);
        expect(fp.selectedDates[0].getSeconds()).toBe(0);

        expect(fp.amPM).toBeDefined();
        fp.amPM && expect(fp.amPM.innerHTML).toBe("PM");
      });

      it('should parse "3:05:03 PM"', () => {
        createInstance({
          allowInput: true,
          enableTime: true,
          enableSeconds: true,
          noCalendar: true,
          dateFormat: "h:i:S K",
          defaultDate: "3:05:03 PM",
        });

        expect(fp.selectedDates[0]).toBeDefined();
        expect(fp.selectedDates[0].getHours()).toBe(15);
        expect(fp.selectedDates[0].getMinutes()).toBe(5);
        expect(fp.selectedDates[0].getSeconds()).toBe(3);

        expect(fp.amPM).toBeDefined();
        fp.amPM && expect(fp.amPM.innerHTML).toBe("PM");
      });

      it("should parse defaultHour", () => {
        createInstance({
          enableTime: true,
          noCalendar: true,
          defaultHour: 0,
        });

        expect((fp.hourElement as HTMLInputElement).value).toEqual("12");

        createInstance({
          enableTime: true,
          noCalendar: true,
          defaultHour: 12,
        });

        expect((fp.hourElement as HTMLInputElement).value).toEqual("12");

        createInstance({
          enableTime: true,
          noCalendar: true,
          defaultHour: 23,
          time_24hr: true,
        });

        expect((fp.hourElement as HTMLInputElement).value).toEqual("23");
      });

      it("should parse string which has meridian indicator before hour", () => {
        createInstance({
          enableTime: true,
          noCalendar: true,
          dateFormat: "Kh時",
          defaultDate: "午後3時",
          locale: Japanese,
        });

        expect(fp.selectedDates[0]).toBeDefined();
        expect(fp.selectedDates[0].getHours()).toBe(15);
      });
    });

    describe("field order", () => {
      afterEach(() => {
        jest.setSystemTime(jest.getRealSystemTime());
      });

      it("parses a day the current month doesn't have with noCalendar #3078", () => {
        jest.setSystemTime(new Date(2025, 1, 25));
        createInstance({
          mode: "multiple",
          dateFormat: "d/m/Y",
          minDate: "30/01/2025",
          maxDate: "30/01/2025",
          noCalendar: true,
          defaultDate: ["30/01/2025"],
        });

        expect(fp.selectedDates).toEqual([new Date(2025, 0, 30)]);
        expect(fp.input.value).toEqual("30/01/2025");
      });

      it("parses into a month shorter than today's day with noCalendar", () => {
        jest.setSystemTime(new Date(2025, 0, 31));
        createInstance({ noCalendar: true });

        expect(fp.parseDate("15/02/2025", "d/m/Y")).toEqual(
          new Date(2025, 1, 15)
        );
        expect(fp.parseDate("02/15/2025", "m/d/Y")).toEqual(
          new Date(2025, 1, 15)
        );
        expect(fp.parseDate("2025-02-15")).toEqual(new Date(2025, 1, 15));
      });

      it.each([
        ["02/2025", "m/Y"],
        ["February 2025", "F Y"],
        ["Feb 2025", "M Y"],
      ])(
        "starts a month without a day on the 1st with noCalendar (%s)",
        (value, format) => {
          jest.setSystemTime(new Date(2025, 0, 31));
          createInstance({ noCalendar: true });

          expect(fp.parseDate(value, format)).toEqual(new Date(2025, 1, 1));
        }
      );

      it("keeps today for a time with noCalendar", () => {
        jest.setSystemTime(new Date(2025, 0, 31, 10));
        createInstance({ noCalendar: true, enableTime: true });

        expect(fp.parseDate("21:11", "H:i")).toEqual(
          new Date(2025, 0, 31, 21, 11)
        );
      });

      it("parses February 29th with a two-digit year", () => {
        jest.setSystemTime(new Date(2025, 5, 1));
        createInstance();

        expect(fp.parseDate("29/02/24", "d/m/y")).toEqual(
          new Date(2024, 1, 29)
        );
      });
    });

    describe("out-of-range fields (flatpickr#2988)", () => {
      const errorHandler = jest.fn();

      beforeEach(() => errorHandler.mockClear());

      it.each([
        ["77/77/7777", "m/d/Y"],
        ["13/01/2025", "m/d/Y"],
        ["00/10/2025", "m/d/Y"],
        ["02/31/2025", "m/d/Y"],
        ["31/04/2025", "d/m/Y"],
        ["29/02/2025", "d/m/Y"],
        ["00/10/2025", "d/m/Y"],
        ["32nd Jan 2025", "J M Y"],
        ["2025-01-01 24:00", "Y-m-d H:i"],
        ["2025-01-01 23:60", "Y-m-d H:i"],
        ["2025-01-01 23:59:60", "Y-m-d H:i:S"],
        ["2025-01-01 24:30 PM", "Y-m-d h:i K"],
      ])("rejects %s with %s", (value, format) => {
        createInstance({ errorHandler });

        expect(fp.parseDate(value, format)).toBeUndefined();
        expect(errorHandler).toHaveBeenCalledWith(
          new Error(`Invalid date provided: ${value}`)
        );
      });

      it.each([
        ["12/31/2025", "m/d/Y", new Date(2025, 11, 31)],
        ["29/02/2024", "d/m/Y", new Date(2024, 1, 29)],
        ["30/04/2025", "d/m/Y", new Date(2025, 3, 30)],
        [
          "2025-01-01 23:59:59",
          "Y-m-d H:i:S",
          new Date(2025, 0, 1, 23, 59, 59),
        ],
        ["2025-01-01 0:30 AM", "Y-m-d h:i K", new Date(2025, 0, 1, 0, 30)],
        ["2025-01-01 14:30", "Y-m-d h:i K", new Date(2025, 0, 1, 14, 30)],
      ])("still parses %s with %s", (value, format, date) => {
        createInstance({ errorHandler });

        expect(fp.parseDate(value, format)).toEqual(date);
        expect(errorHandler).not.toHaveBeenCalled();
      });

      it("rejects a typed date instead of rolling it over", () => {
        const onChange = jest.fn();
        createInstance({
          allowInput: true,
          dateFormat: "m/d/Y",
          errorHandler,
          onChange,
        });

        fp.input.focus();
        fp.input.value = "77/77/7777";
        fp.input.blur();

        expect(errorHandler).toHaveBeenCalled();
        expect(onChange).not.toHaveBeenCalled();
        expect(fp.selectedDates).toEqual([]);
        expect(fp.input.value).toEqual("");
      });

      it("drops an out-of-range defaultDate and setDate string", () => {
        createInstance({
          dateFormat: "d/m/Y",
          defaultDate: "31/04/2025",
          errorHandler,
        });

        expect(fp.selectedDates).toEqual([]);

        fp.setDate("30/04/2025");
        expect(fp.selectedDates).toEqual([new Date(2025, 3, 30)]);

        fp.setDate("31/04/2025");
        expect(fp.selectedDates).toEqual([]);
        expect(fp.input.value).toEqual("");
      });

      it("drops maxTime 24:00 instead of reading it as midnight", () => {
        const consoleWarn = jest.spyOn(console, "warn").mockImplementation();
        createInstance({ enableTime: true, maxTime: "24:00" });

        expect(fp.config.maxTime).toBeUndefined();
        expect(consoleWarn).toHaveBeenCalledWith(
          new Error("Invalid date provided: 24:00")
        );
        consoleWarn.mockRestore();
      });
    });
  });

  describe("date formatting", () => {
    describe("default formatter", () => {
      const DEFAULT_FORMAT_1 = "d.m.y H:i:S",
        DEFAULT_FORMAT_2 = "D j F, 'y",
        DEFAULT_FORMAT_3 = "Y-m-d";

      it(`should format the date with the pattern "${DEFAULT_FORMAT_1}"`, () => {
        const RESULT = "20.10.16 09:19:59";
        createInstance({
          dateFormat: DEFAULT_FORMAT_1,
        });

        fp.setDate("20.10.16 09:19:59");
        expect(fp.input.value).toEqual(RESULT);
        fp.setDate("2015.11.21 19:29:49");
        expect(fp.input.value).not.toEqual(RESULT);
      });

      it("should format dates for year 0001", () => {
        const RESULT = "0001-07-15";
        createInstance({
          dateFormat: DEFAULT_FORMAT_3,
        });

        fp.setDate("0001-07-15");
        expect(fp.input.value).toEqual(RESULT);
      });

      it(`should format the date with the pattern "${DEFAULT_FORMAT_2}"`, () => {
        const RESULT = "Thu 20 October, '16";
        createInstance({
          dateFormat: DEFAULT_FORMAT_2,
        });

        fp.setDate("Thu 20 October, '16");
        expect(fp.input.value).toEqual(RESULT);
        fp.setDate("2015-11-21T19:29:49Z");
        expect(fp.input.value).not.toEqual(RESULT);
      });
    });

    describe("custom formatter", () => {
      it("should format the date using the custom formatter", () => {
        const RESULT = "MAAAGIC.*^*.2016.*^*.20.*^*.10";
        createInstance({
          dateFormat: "YEAR-DAYOFMONTH-MONTH",
          formatDate(date, formatStr) {
            let segs = formatStr.split("-");
            return (
              "MAAAGIC.*^*." +
              segs
                .map((seg) => {
                  let mapped = null;
                  switch (seg) {
                    case "DAYOFMONTH":
                      mapped = date.getDate();
                      break;
                    case "MONTH":
                      mapped = date.getMonth() + 1;
                      break;
                    case "YEAR":
                      mapped = date.getFullYear();
                      break;
                  }
                  return "" + mapped;
                })
                .join(".*^*.")
            );
          },
        });

        fp.setDate(new Date(2016, 9, 20));
        expect(fp.input.value).toEqual(RESULT);

        fp.setDate(new Date(2016, 10, 20));
        expect(fp.input.value).not.toEqual(RESULT);
      });
    });
  });

  describe("API", () => {
    it("changeMonth()", () => {
      createInstance({
        defaultDate: "2016-12-20",
      });

      fp.changeMonth(1);
      expect(fp.currentYear).toEqual(2017);

      fp.changeMonth(-1);
      expect(fp.currentYear).toEqual(2016);

      fp.changeMonth(2);
      expect(fp.currentMonth).toEqual(1);
      expect(fp.currentYear).toEqual(2017);

      fp.changeMonth(14);
      expect(fp.currentYear).toEqual(2018);
      expect(fp.currentMonth).toEqual(3);
    });

    it("changeMonth() by more than a year", () => {
      const events: string[] = [];
      createInstance({
        defaultDate: "2016-12-20",
        onYearChange: () => events.push("year"),
        onMonthChange: () => events.push("month"),
      });

      fp.changeMonth(30);
      expect([fp.currentYear, fp.currentMonth]).toEqual([2019, 5]);
      expect(events).toEqual(["year", "month"]);

      fp.changeMonth(-30);
      expect([fp.currentYear, fp.currentMonth]).toEqual([2016, 11]);
    });

    it("destroy()", () => {
      let fired = false;
      const input = fp.input;

      createInstance({
        altInput: true,
        onKeyDown: [
          () => {
            fired = true;
          },
        ],
      });

      expect(input.type).toEqual("hidden");

      fp.open();
      fp.altInput &&
        simulate("keydown", fp.altInput, { keyCode: 37, bubbles: true }); // "ArrowLeft"
      expect(fired).toEqual(true);

      fp.destroy();

      expect(input.type).toEqual("text");
      expect(fp.altInput).toBeUndefined();
      expect(fp.config).toBeUndefined();

      fired = false;

      simulate("keydown", input, { keyCode: 37, bubbles: true }); // "ArrowLeft"
      simulate("keydown", document.body, { keyCode: 37, bubbles: true }); // "ArrowLeft"
      expect(fired).toEqual(false);
    });

    it("set (option, value)", () => {
      createInstance();
      fp.set("minDate", "2016-10-20");

      expect(fp.currentYearElement.min).toEqual("2016");
      expect(fp.config.minDate).toBeDefined();

      fp.set("minDate", null);
      expect(fp.currentYearElement.hasAttribute("min")).toEqual(false);

      fp.set("maxDate", "2016-10-20");

      expect(fp.config.maxDate).toBeDefined();
      expect(fp.currentYearElement.max).toEqual("2016");

      fp.set("maxDate", null);
      expect(fp.currentYearElement.hasAttribute("max")).toEqual(false);

      fp.set("mode", "range");
      expect(fp.config.mode).toEqual("range");

      const elem = document.createElement("div");
      fp.set("positionElement", elem);
      expect(fp._positionElement).toEqual(elem);
    });

    it("set() minDate/maxDate updates current view", () => {
      createInstance();
      const now = new Date();
      const nextMonth = new Date();
      nextMonth.setMonth(now.getMonth() + 1);

      expect(fp.currentMonth).toEqual(now.getMonth());

      fp.set("minDate", nextMonth);
      expect(fp.currentMonth).toEqual(nextMonth.getMonth());
    });

    describe("a range with an end that isn't enabled (flatpickr#3108)", () => {
      const minDate = "2025-07-21";
      const range = ["2025-07-15", "2025-07-25"];

      const selected = () =>
        fp.selectedDates.map((d) => fp.formatDate(d, "Y-m-d"));

      const dayElem = (date: string) =>
        Array.from(fp.days.querySelectorAll<DayElement>(".flatpickr-day")).find(
          (day) => fp.formatDate(day.dateObj, "Y-m-d") === date
        )!;

      const dayClasses = (date: string) => Array.from(dayElem(date).classList);

      describe("is dropped as a whole", () => {
        it("by setDate()", () => {
          const onChange = jest.fn();
          createInstance({ mode: "range", minDate, onChange });

          fp.setDate(range, true);
          expect(selected()).toEqual([]);
          expect(fp.input.value).toEqual("");
          expect(onChange).toHaveBeenCalledTimes(1);
          expect(onChange.mock.calls[0][0]).toEqual([]);
          expect(fp.days.querySelector(".selected")).toBeNull();

          fp.setDate(range.join(" to "));
          expect(selected()).toEqual([]);
        });

        it("by defaultDate and a prefilled input", () => {
          createInstance({ mode: "range", minDate, defaultDate: range });
          expect(selected()).toEqual([]);

          const input = document.createElement("input");
          input.value = range.join(" to ");
          createInstance({ mode: "range", minDate }, input);
          expect(selected()).toEqual([]);
        });

        it("by a typed value", () => {
          const onChange = jest.fn();
          createInstance({
            mode: "range",
            minDate,
            allowInput: true,
            onChange,
          });

          fp.input.focus();
          fp.input.value = range.join(" to ");
          fp.input.blur();

          expect(selected()).toEqual([]);
          expect(fp.input.value).toEqual("");
          expect(onChange).not.toHaveBeenCalled();
        });

        it("by set('minDate')", () => {
          createInstance({ mode: "range", defaultDate: range });

          fp.set("minDate", minDate);
          expect(selected()).toEqual([]);
          expect(fp.input.value).toEqual("");
        });

        it("when maxDate or disable rules out an end", () => {
          createInstance({
            mode: "range",
            maxDate: "2025-07-20",
            defaultDate: range,
          });
          expect(selected()).toEqual([]);

          createInstance({
            mode: "range",
            disable: ["2025-07-15"],
            defaultDate: range,
          });
          expect(selected()).toEqual([]);
        });
      });

      it("keeps a disabled day inside it", () => {
        createInstance({
          mode: "range",
          disable: ["2025-07-20"],
          defaultDate: range,
        });
        expect(selected()).toEqual(range);
      });

      it("leaves single and multiple dropping just the dates ruled out", () => {
        createInstance({ minDate, defaultDate: range[0] });
        expect(selected()).toEqual([]);

        createInstance({ mode: "multiple", minDate, defaultDate: range });
        expect(selected()).toEqual([range[1]]);

        fp.set("minDate", null);
        fp.setDate(range);
        fp.set("minDate", minDate);
        expect(selected()).toEqual([range[1]]);
      });

      it("marks a selected date that set('disable') rules out", () => {
        createInstance({ defaultDate: range[0] });

        fp.set("disable", [range[0]]);
        expect(selected()).toEqual([range[0]]);
        expect(dayClasses(range[0])).toEqual(
          expect.arrayContaining(["flatpickr-disabled", "selected"])
        );
        expect(fp.selectedDateElem).not.toBe(dayElem(range[0]));
      });

      describe("with allowInvalidPreload", () => {
        it("keeps both ends and marks them", () => {
          createInstance({
            mode: "range",
            minDate,
            defaultDate: range,
            allowInvalidPreload: true,
          });

          expect(selected()).toEqual(range);
          expect(fp.input.value).toEqual(range.join(" to "));
          expect(dayClasses(range[0])).toEqual(
            expect.arrayContaining([
              "flatpickr-disabled",
              "selected",
              "startRange",
            ])
          );
          expect(dayClasses(range[0])).not.toContain("inRange");
          expect(dayClasses(range[1])).toEqual(
            expect.arrayContaining(["selected", "endRange"])
          );
        });

        it("doesn't let the disabled end be clicked", () => {
          createInstance({
            mode: "range",
            minDate,
            defaultDate: range,
            allowInvalidPreload: true,
          });
          fp.open();

          clickOn(
            Array.from(fp.days.querySelectorAll(".flatpickr-day")).find((day) =>
              day.classList.contains("startRange")
            )!
          );
          expect(selected()).toEqual(range);
        });

        it("keeps them through set('minDate')", () => {
          createInstance({
            mode: "range",
            defaultDate: range,
            allowInvalidPreload: true,
          });

          fp.set("minDate", minDate);
          expect(selected()).toEqual(range);
          expect(fp.input.value).toEqual(range.join(" to "));
          expect(dayClasses(range[0])).toEqual(
            expect.arrayContaining(["flatpickr-disabled", "startRange"])
          );
        });

        it("starts keyboard focus from the enabled end", () => {
          createInstance({
            mode: "range",
            maxDate: "2025-07-20",
            defaultDate: range,
            allowInvalidPreload: true,
          });
          fp.open();

          simulate("keydown", fp._input, { keyCode: 40 });
          const active = document.activeElement as DayElement;
          expect(active.dateObj && fp.formatDate(active.dateObj, "Y-m-d")).toBe(
            range[0]
          );
        });

        it("marks a disabled single date as selected", () => {
          createInstance({
            minDate,
            defaultDate: range[0],
            allowInvalidPreload: true,
          });

          expect(dayClasses(range[0])).toEqual(
            expect.arrayContaining(["flatpickr-disabled", "selected"])
          );
        });
      });
    });

    describe("allowInvalidPreload with a value it can't parse (flatpickr#3000)", () => {
      const config = { allowInvalidPreload: true, errorHandler: jest.fn() };

      const selected = () =>
        fp.selectedDates.map((d) => fp.formatDate(d, "Y-m-d"));

      it("starts with nothing selected and the preloaded text kept", () => {
        const input = document.createElement("input");
        input.value = "not a date";
        createInstance(config, input);

        expect(fp.selectedDates).toEqual([]);
        expect(fp.input.value).toEqual("not a date");

        createInstance({ ...config, defaultDate: "not a date" });
        expect(fp.selectedDates).toEqual([]);
      });

      it("clears the selection on setDate()", () => {
        createInstance({ ...config, defaultDate: "2025-07-15" });

        fp.setDate("not a date");
        expect(fp.selectedDates).toEqual([]);
        expect(fp.input.value).toEqual("");
      });

      it("clears the selection when typed with allowInput", () => {
        createInstance({ ...config, allowInput: true });

        fp.input.focus();
        fp.input.value = "not a date";
        pressOutside();
        fp.input.blur();

        expect(fp.selectedDates).toEqual([]);
        expect(fp.input.value).toEqual("");
      });

      it("drops only the unparsable dates, still keeping disabled ones", () => {
        createInstance({
          ...config,
          mode: "multiple",
          minDate: "2025-07-21",
          defaultDate: ["2025-07-15", "not a date", "2025-07-25"],
        });
        expect(selected()).toEqual(["2025-07-15", "2025-07-25"]);

        createInstance({ ...config, mode: "range" });
        fp.setDate("2025-07-15 to not a date");
        expect(selected()).toEqual(["2025-07-15"]);
      });
    });

    // A same-day range is written as its one date without enableTime (#1478)
    describe("a range written as one date (flatpickr#3010)", () => {
      const sameDay = [new Date(2024, 3, 19), new Date(2024, 3, 19)];

      const preloaded = (value: string, config: Options = {}) => {
        const input = document.createElement("input");
        input.value = value;
        return createInstance({ mode: "range", ...config }, input);
      };

      const dayElem = (date: Date) =>
        Array.from(fp.days.querySelectorAll<DayElement>(".flatpickr-day")).find(
          (day) => day.dateObj.getTime() === date.getTime()
        )!;

      it("reads back as both ends and outlives an outside click", () => {
        createInstance({ mode: "range" });
        fp.setDate(sameDay);
        const written = fp.input.value;
        expect(written).toEqual("2024-04-19");

        const onChange = jest.fn();
        preloaded(written, { onChange });
        expect(fp.selectedDates).toEqual(sameDay);

        fp.open();
        pressOutside();
        expect(fp.selectedDates).toEqual(sameDay);
        expect(fp.input.value).toEqual("2024-04-19");
        expect(onChange).not.toHaveBeenCalled();
      });

      it("reads as both ends from defaultDate and setDate", () => {
        createInstance({ mode: "range", defaultDate: "2024-04-19" });
        expect(fp.selectedDates).toEqual(sameDay);

        fp.clear();
        fp.setDate("2024-04-19");
        expect(fp.selectedDates).toEqual(sameDay);
        expect(fp.input.value).toEqual("2024-04-19");
      });

      it("reads as both ends from the input with altInput", () => {
        preloaded("2024-04-19", { altInput: true, altFormat: "F j, Y" });
        expect(fp.selectedDates).toEqual(sameDay);
        expect(fp.altInput!.value).toEqual("April 19, 2024");

        fp.open();
        pressOutside();
        expect(fp.selectedDates).toEqual(sameDay);
      });

      it("leaves one date given as an array or a Date as the start", () => {
        createInstance({ mode: "range" });

        fp.setDate(["2024-04-19"]);
        expect(fp.selectedDates).toEqual([sameDay[0]]);

        fp.setDate(new Date(2024, 3, 19));
        expect(fp.selectedDates).toEqual([sameDay[0]]);
      });

      describe("typed with allowInput", () => {
        const onChange = jest.fn();

        beforeEach(() => {
          onChange.mockClear();
          createInstance({ mode: "range", allowInput: true, onChange });
          fp.input.focus();
          fp.input.value = "2024-04-19";
        });

        it("is committed as both ends by Enter", () => {
          simulate("keydown", fp._input, { keyCode: 13 });

          expect(fp.selectedDates).toEqual(sameDay);
          expect(fp.input.value).toEqual("2024-04-19");
          expect(onChange).toHaveBeenCalledTimes(1);

          // the range is complete: a day picked next starts a new one
          fp.open();
          clickOn(dayElem(new Date(2024, 3, 22)));
          expect(fp.selectedDates).toEqual([new Date(2024, 3, 22)]);
        });

        it("is committed as both ends by clicking outside", () => {
          pressOutside();
          fp.input.blur();

          expect(fp.selectedDates).toEqual(sameDay);
          expect(fp.input.value).toEqual("2024-04-19");
          expect(onChange).toHaveBeenCalledTimes(1);
        });
      });

      it("reads as the start with enableTime, which writes a same-day range as two", () => {
        createInstance({ mode: "range", enableTime: true, allowInput: true });
        const start = new Date(2024, 3, 19, 10, 0);

        fp.input.focus();
        fp.input.value = "2024-04-19 10:00";
        simulate("keydown", fp._input, { keyCode: 13 });
        expect(fp.selectedDates).toEqual([start]);

        fp.setDate("2024-04-19 10:00");
        expect(fp.selectedDates).toEqual([start]);

        fp.setDate([start, start]);
        expect(fp.input.value).toEqual("2024-04-19 10:00 to 2024-04-19 10:00");
      });

      it("reports a date it can't parse once for each end", () => {
        const errorHandler = jest.fn();
        createInstance({ mode: "range", errorHandler });

        fp.setDate("not a date");
        expect(fp.selectedDates).toEqual([]);
        expect(errorHandler).toHaveBeenCalledTimes(2);
      });
    });

    describe("multiple dates written with a conjunction (flatpickr#2922)", () => {
      const aug = (...days: number[]) =>
        days.map((day) => new Date(2023, 7, day));

      it("reads dates typed without the space after the comma", () => {
        createInstance({
          mode: "multiple",
          dateFormat: "d/m/Y",
          allowInput: true,
        });
        fp.input.focus();
        fp.input.value = "01/08/2023,02/08/2023,     03/08/2023,  05/08/2023";
        simulate("keydown", fp._input, { keyCode: 13 });

        expect(fp.selectedDates).toEqual(aug(1, 2, 3, 5));
        expect(fp.input.value).toEqual(
          "01/08/2023, 02/08/2023, 03/08/2023, 05/08/2023"
        );
      });

      it("reads back the dates it wrote with the default conjunction", () => {
        createInstance({ mode: "multiple", dateFormat: "d/m/Y" });
        fp.setDate("01/08/2023, 02/08/2023");

        expect(fp.selectedDates).toEqual(aug(1, 2));
      });

      it("doesn't split a date on a conjunction's text inside it", () => {
        createInstance({
          mode: "multiple",
          locale: French,
          dateFormat: "j F Y",
          conjunction: " et ",
        });
        fp.setDate("1 juillet 2023 et 2 juillet 2023");
        expect(fp.selectedDates).toEqual([
          new Date(2023, 6, 1),
          new Date(2023, 6, 2),
        ]);

        createInstance({ mode: "multiple", conjunction: " - " });
        fp.setDate("2023-08-01 - 2023-08-02");
        expect(fp.selectedDates).toEqual(aug(1, 2));

        createInstance({
          mode: "multiple",
          dateFormat: "d/m/Y",
          conjunction: " / ",
        });
        fp.setDate("01/08/2023 / 02/08/2023");
        expect(fp.selectedDates).toEqual(aug(1, 2));
      });

      it("gives parseDate each date without the space around it", () => {
        const parseDate = jest.fn((str: string) => {
          const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(str);
          return match
            ? new Date(+match[3], +match[2] - 1, +match[1])
            : new Date(NaN);
        });
        createInstance({ mode: "multiple", dateFormat: "d/m/Y", parseDate });
        fp.setDate("01/08/2023, 02/08/2023");

        expect(parseDate.mock.calls.map(([str]) => str)).toEqual([
          "01/08/2023",
          "02/08/2023",
        ]);
        expect(fp.selectedDates).toEqual(aug(1, 2));
      });

      it("splits on a conjunction of only spaces as it is", () => {
        createInstance({ mode: "multiple", conjunction: " " });
        fp.setDate("2023-08-01 2023-08-02  2023-08-03");

        expect(fp.selectedDates).toEqual(aug(1, 2, 3));
        expect(fp.input.value).toEqual("2023-08-01 2023-08-02 2023-08-03");
      });
    });

    describe("set() time options (flatpickr#3083)", () => {
      const selectFirstDay = () =>
        clickOn(fp.days.querySelector(".flatpickr-day:not(.prevMonthDay)")!);

      it("enableTime: true builds the time picker as if passed at creation", () => {
        createInstance();
        fp.set("enableTime", true);

        expect(fp.timeContainer).toBeDefined();
        expect(fp.timeContainer!.previousSibling).toBe(fp.innerContainer);
        expect(fp.calendarContainer.classList).toContain("hasTime");
        expect(fp.config.dateFormat).toEqual("Y-m-d H:i");

        fp.open();
        selectFirstDay();
        incrementTime("hourElement", 1);
        expect(fp.selectedDates[0].getHours()).toEqual(13);
        expect(fp.input.value).toMatch(/ 13:00$/);
        expect(fp.isOpen).toBe(true);
      });

      it("enableTime: false removes the time picker", () => {
        createInstance({ enableTime: true });
        const timeContainer = fp.timeContainer!;
        fp.set("enableTime", false);

        expect(timeContainer.parentNode).toBeNull();
        expect(fp.timeContainer).toBeUndefined();
        expect(fp.hourElement).toBeUndefined();
        expect(fp.amPM).toBeUndefined();
        expect(fp.calendarContainer.classList).not.toContain("hasTime");
        expect(fp.config.dateFormat).toEqual("Y-m-d");

        fp.open();
        selectFirstDay();
        expect(fp.selectedDates[0].getHours()).toEqual(0);
        expect(fp.input.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(fp.isOpen).toBe(false);
      });

      it("keeps a dateFormat or altFormat the user gave", () => {
        createInstance({ dateFormat: "d.m.Y", altInput: true });
        fp.set("enableTime", true);
        expect(fp.config.dateFormat).toEqual("d.m.Y");
        expect(fp.config.altFormat).toEqual("F j, Y h:i K");

        createInstance({ altInput: true, altFormat: "j F" });
        fp.set({ enableTime: true, dateFormat: "Y-m-d H:i:S" });
        expect(fp.config.dateFormat).toEqual("Y-m-d H:i:S");
        expect(fp.config.altFormat).toEqual("j F");
      });

      it("binds the rebuilt time inputs once", () => {
        createInstance({ enableTime: true });
        fp.set("enableTime", false);
        fp.set("enableTime", true);
        fp.setDate("2024-01-01 10:00");

        incrementTime("hourElement", 1);
        expect(fp.selectedDates[0].getHours()).toEqual(11);
      });

      it("time_24hr and enableSeconds rebuild the time picker in place", () => {
        createInstance({ enableTime: true, defaultDate: "2024-01-01 15:30" });
        const anchor = document.createElement("div");
        fp.calendarContainer.appendChild(anchor);

        fp.set("time_24hr", true);
        expect(fp.amPM).toBeUndefined();
        expect(fp.hourElement!.value).toEqual("15");
        expect(fp.timeContainer!.nextSibling).toBe(anchor);

        fp.set("enableSeconds", true);
        expect(fp.secondElement).toBeDefined();
        expect(fp.config.dateFormat).toEqual("Y-m-d H:i:S");
        expect(fp.input.value).toEqual("2024-01-01 15:30:00");
        expect(
          fp.calendarContainer.querySelectorAll(".flatpickr-time").length
        ).toEqual(1);
      });

      it("shows the selected time in 12-hour form", () => {
        createInstance({ defaultDate: new Date(2024, 0, 1, 15, 30) });
        fp.set("enableTime", true);
        expect(fp.hourElement!.value).toEqual("03");
        expect(fp.amPM!.textContent).toEqual("PM");

        createInstance({
          enableTime: true,
          time_24hr: true,
          defaultDate: "2024-01-01 00:00",
        });
        fp.set("time_24hr", false);
        expect(fp.hourElement!.value).toEqual("12");
        expect(fp.amPM!.textContent).toEqual("AM");
      });

      it("keeps a time_24hr given through set() when the locale changes", () => {
        createInstance({ enableTime: true });
        fp.set("time_24hr", true);
        fp.set("locale", "default");

        expect(fp.config.time_24hr).toBe(true);
        expect(fp.amPM).toBeUndefined();
      });

      it("locale rebuilds the time picker in its time_24hr (flatpickr#2954)", () => {
        createInstance({
          enableTime: true,
          noCalendar: true,
          defaultDate: "15:30",
        });
        fp.set("locale", French);

        expect(fp.config.time_24hr).toBe(true);
        expect(fp.amPM).toBeUndefined();
        expect(fp.hourElement!.value).toEqual("15");
        expect(fp.hourElement!.getAttribute("max")).toEqual("23");
        expect(fp.hourElement!.getAttribute("aria-label")).toEqual("heure");
        expect(fp.timeContainer!.classList).toContain("time24hr");
        expect(fp.calendarContainer.firstChild).toBe(fp.timeContainer);
        expect(
          fp.calendarContainer.querySelectorAll(".flatpickr-time").length
        ).toEqual(1);

        fp.set("locale", "default");
        expect(fp.config.time_24hr).toBe(false);
        expect(fp.hourElement!.value).toEqual("03");
        expect(fp.amPM!.textContent).toEqual("PM");

        incrementTime("hourElement", 1);
        expect(fp.selectedDates[0].getHours()).toEqual(16);
      });

      it("locale leaves a picker without enableTime without a time picker", () => {
        createInstance();
        fp.set("locale", French);

        expect(fp.timeContainer).toBeUndefined();
        expect(fp.calendarContainer.classList).not.toContain("hasTime");
      });

      it("keeps plugin elements after the time picker", () => {
        createInstance({
          plugins: [confirmDatePlugin({ showAlways: true })],
        });
        fp.set("enableTime", true);

        expect(fp.timeContainer!.nextSibling).toBe(
          fp.calendarContainer.querySelector(".flatpickr-confirm")
        );
      });

      it("rebuilds a noCalendar time picker", () => {
        createInstance({ noCalendar: true, enableTime: true });
        fp.set("enableSeconds", true);

        expect(fp.calendarContainer.firstChild).toBe(fp.timeContainer);
        expect(fp.calendarContainer.classList).toContain("noCalendar");
        expect(fp.config.dateFormat).toEqual("H:i:S");
      });

      it("switches the native mobile input type", () => {
        mockAgent = "Android";
        createInstance({ defaultDate: "2024-01-01" });
        fp.set("enableTime", true);

        expect(fp.mobileInput!.type).toEqual("datetime-local");
        expect(fp.mobileFormatStr).toEqual("Y-m-d\\TH:i:S");
        expect(fp.mobileInput!.value).toMatch(/^2024-01-01T00:00/);
      });

      it("locale leaves the native mobile input as it was", () => {
        mockAgent = "Android";
        createInstance({
          enableTime: true,
          noCalendar: true,
          enableSeconds: true,
          minDate: "02:30",
          defaultDate: "15:30:20",
        });
        const mobileInput = fp.mobileInput!;
        fp.set("locale", French);

        expect(fp.mobileInput).toBe(mobileInput);
        expect(mobileInput.type).toEqual("time");
        expect(mobileInput.step).toEqual("1");
        expect(mobileInput.min).toEqual("02:30:00");
        expect(mobileInput.value).toEqual("15:30:20");
        expect(fp.mobileFormatStr).toEqual("H:i:S");
      });
    });

    it("setDate (date)", () => {
      createInstance({
        enableTime: true,
      });
      fp.setDate("2016-10-20 03:00");

      expect(fp.selectedDates[0]).toBeDefined();
      expect(fp.selectedDates[0].getFullYear()).toEqual(2016);
      expect(fp.selectedDates[0].getMonth()).toEqual(9);
      expect(fp.selectedDates[0].getDate()).toEqual(20);
      expect(fp.selectedDates[0].getHours()).toEqual(3);

      expect(fp.currentYear).toEqual(2016);
      expect(fp.currentMonth).toEqual(9);

      if (fp.hourElement && fp.minuteElement && fp.amPM) {
        expect(fp.hourElement.value).toEqual("03");
        expect(fp.minuteElement.value).toEqual("00");
        expect(fp.amPM.textContent).toEqual("AM");
      }

      fp.setDate(0);
      expect(fp.selectedDates[0]).toBeDefined();
      expect(fp.selectedDates[0].getFullYear()).toBeLessThan(1971);

      fp.setDate("");
      expect(fp.selectedDates[0]).not.toBeDefined();
    });

    it("has valid latestSelectedDateObj", () => {
      createInstance({
        defaultDate: "2016-10-01 3:30",
        enableTime: true,
      });

      expect(fp.latestSelectedDateObj).toBeDefined();
      if (fp.latestSelectedDateObj) {
        expect(fp.latestSelectedDateObj.getFullYear()).toEqual(2016);
        expect(fp.latestSelectedDateObj.getMonth()).toEqual(9);
        expect(fp.latestSelectedDateObj.getDate()).toEqual(1);
      }

      if (fp.hourElement && fp.minuteElement && fp.amPM) {
        expect(fp.hourElement.value).toEqual("03");
        expect(fp.minuteElement.value).toEqual("30");
        expect(fp.amPM.textContent).toEqual("AM");
      }

      fp.setDate("2016-11-03 16:49");
      expect(fp.latestSelectedDateObj).toBeDefined();
      if (fp.latestSelectedDateObj) {
        expect(fp.latestSelectedDateObj.getFullYear()).toEqual(2016);
        expect(fp.latestSelectedDateObj.getMonth()).toEqual(10);
        expect(fp.latestSelectedDateObj.getDate()).toEqual(3);
      }

      if (fp.hourElement && fp.minuteElement && fp.amPM) {
        expect(fp.hourElement.value).toEqual("04");
        expect(fp.minuteElement.value).toEqual("49");
        expect(fp.amPM.textContent).toEqual("PM");
      }

      fp.setDate("");
      expect(fp.latestSelectedDateObj).toEqual(undefined);
    });

    it("parses dates in enable[] and disable[]", () => {
      createInstance({
        disable: [
          { from: "2016-11-20", to: "2016-12-20" },
          "2016-12-21",
          null as any,
        ],
        enable: [
          { from: "2016-11-20", to: "2016-12-20" },
          "2016-12-21",
          null as any,
        ],
      });

      expect(
        (fp.config.disable[0] as DateRangeLimit).from instanceof Date
      ).toBe(true);
      expect((fp.config.disable[0] as DateRangeLimit).to instanceof Date).toBe(
        true
      );
      expect(fp.config.disable[1] instanceof Date).toBe(true);

      expect(fp.config.disable.indexOf(null as any)).toBe(-1);

      expect(
        (fp.config.enable?.[0] as DateRangeLimit).from instanceof Date
      ).toBe(true);
      expect((fp.config.enable?.[0] as DateRangeLimit).to instanceof Date).toBe(
        true
      );
      expect(fp.config.enable?.[1] instanceof Date).toBe(true);

      expect(fp.config.enable?.indexOf(null as any)).toBe(-1);
    });

    describe("typed input commit", () => {
      const pressEnter = (target: Node = fp._input) =>
        simulate("keydown", target, { keyCode: 13 });

      it("dispatches change on the input when clicking outside", () => {
        createInstance({ allowInput: true });
        const changed = jest.fn();
        fp.input.addEventListener("change", changed);

        fp.input.focus();
        fp.input.value = "1999-12-31";
        pressOutside();
        fp.input.blur();

        expect(changed).toHaveBeenCalledTimes(1);
      });

      it("announces clearing like clear() does", () => {
        const onValueUpdate = jest.fn();
        const onChange = jest.fn();
        createInstance({
          allowInput: true,
          defaultDate: "2001-01-01",
          onValueUpdate,
          onChange,
        });

        fp.input.focus();
        fp.input.value = "";
        pressOutside();
        fp.input.blur();

        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onValueUpdate).not.toHaveBeenCalled();
      });

      it("announces once when leaving with Tab", () => {
        const onChange = jest.fn();
        createInstance({ allowInput: true, onChange });
        const next = document.createElement("input");
        document.body.appendChild(next);

        fp.input.focus();
        fp.input.value = "1999-12-31";
        next.focus();

        expect(onChange).toHaveBeenCalledTimes(1);
        next.remove();
      });

      it("announces the view change, then the value, before closing on Enter", () => {
        const events: string[] = [];
        const log = (name: string) => () => {
          events.push(name);
        };
        createInstance({
          allowInput: true,
          defaultDate: "2001-01-01",
          onYearChange: log("year"),
          onMonthChange: log("month"),
          onValueUpdate: log("value"),
          onChange: log("change"),
          onClose: log("close"),
        });

        fp.input.focus();
        fp.input.value = "1999-12-31";
        pressEnter();

        expect(events).toEqual(["year", "month", "value", "change", "close"]);
      });

      it("commits a date in another year without a calendar", () => {
        const onYearChange = jest.fn();
        createInstance({
          allowInput: true,
          noCalendar: true,
          defaultDate: "2001-01-01",
          onYearChange,
        });

        fp.input.focus();
        fp.input.value = "1999-12-31";
        pressEnter();

        expect(fp.selectedDates).toEqual([new Date(1999, 11, 31)]);
        expect(onYearChange).toHaveBeenCalledTimes(1);

        fp.changeMonth(1);
        expect(fp.currentYear).toBe(2000);
        expect(onYearChange).toHaveBeenCalledTimes(2);
      });

      it("stays silent on Enter or blur without an edit", () => {
        const onChange = jest.fn();
        createInstance({
          allowInput: true,
          defaultDate: "2001-01-01",
          onChange,
        });

        fp.input.focus();
        pressEnter();
        fp.input.focus();
        fp.input.blur();

        expect(onChange).not.toHaveBeenCalled();
      });

      it("stays silent when the same day is typed differently", () => {
        const onChange = jest.fn();
        createInstance({
          allowInput: true,
          defaultDate: "1999-01-05",
          onChange,
        });

        fp.input.focus();
        fp.input.value = "1999-1-5";
        fp.input.blur();

        expect(onChange).not.toHaveBeenCalled();
        expect(fp.input.value).toEqual("1999-01-05");
      });

      it("stays silent when an invalid value is typed into an empty input", () => {
        const onChange = jest.fn();
        const errorHandler = jest.fn();
        createInstance({ allowInput: true, onChange, errorHandler });

        fp.input.focus();
        fp.input.value = "abc";
        fp.input.blur();

        expect(errorHandler).toHaveBeenCalled();
        expect(onChange).not.toHaveBeenCalled();
        expect(fp.selectedDates).toEqual([]);
      });

      it("announces a time the format doesn't show", () => {
        const onChange = jest.fn();
        createInstance({
          allowInput: true,
          defaultDate: new Date(2020, 0, 22, 10, 30),
          onChange,
        });

        fp.input.focus();
        fp.input.value = "2020-1-22";
        fp.input.blur();

        expect(onChange).toHaveBeenCalledTimes(1);
        expect(fp.selectedDates[0].getHours()).toEqual(0);
      });

      it("keeps the time an altFormat drops when nothing is typed", () => {
        const onChange = jest.fn();
        createInstance({
          allowInput: true,
          altInput: true,
          altFormat: "d.m.Y",
          enableTime: true,
          defaultDate: "2020-01-22 03:04",
          onChange,
        });

        fp._input.focus();
        pressEnter();

        expect(fp.selectedDates[0].getHours()).toEqual(3);
        expect(fp.selectedDates[0].getMinutes()).toEqual(4);
        expect(onChange).not.toHaveBeenCalled();
      });

      it("keeps a typed time within minTime on Enter", () => {
        createInstance({
          allowInput: true,
          enableTime: true,
          minTime: "09:00",
        });

        fp.input.focus();
        fp.input.value = "2026-01-05 07:30";
        pressEnter();

        expect(fp.input.value).toEqual("2026-01-05 09:30");
      });

      it("announces a clamped time once when clicking outside", () => {
        const times: string[] = [];
        createInstance({
          allowInput: true,
          enableTime: true,
          minTime: "09:00",
          onChange: (dates) => times.push(fp.formatDate(dates[0], "H:i")),
        });

        fp.input.focus();
        fp.input.value = "2026-01-05 07:30";
        pressOutside();
        fp.input.blur();
        jest.advanceTimersByTime(500);

        expect(times).toEqual(["09:30"]);
      });

      it("announces after closing when clicking outside", () => {
        const events: string[] = [];
        createInstance({
          allowInput: true,
          onChange: () => events.push("change"),
          onClose: () => events.push("close"),
        });

        fp.input.focus();
        fp.input.value = "1999-12-31";
        pressOutside();

        expect(events).toEqual(["close", "change"]);
      });

      it("survives onClose destroying the instance when clicking outside", () => {
        const consoleError = jest.spyOn(console, "error").mockImplementation();
        createInstance({
          allowInput: true,
          onClose: (_, __, instance) => instance.destroy(),
        });

        fp.input.focus();
        fp.input.value = "1999-12-31";
        pressOutside();

        expect(consoleError).not.toHaveBeenCalled();
        consoleError.mockRestore();
      });

      it("announces the abandoned range once when clicking outside", () => {
        const announced: number[] = [];
        createInstance({
          mode: "range",
          allowInput: true,
          defaultDate: ["2026-01-05", "2026-01-10"],
          onChange: (dates) => announced.push(dates.length),
        });

        fp.input.focus();
        fp.input.value = "2026-01-07 to ";
        pressOutside();
        fp.input.blur();

        expect(fp.selectedDates).toEqual([]);
        expect(announced).toEqual([0]);
      });

      it("selects a month name typed in lowercase (flatpickr#3057)", () => {
        createInstance({ allowInput: true, dateFormat: "j F Y" });

        fp.input.focus();
        fp.input.value = "5 february 2025";
        pressEnter();

        expect(fp.selectedDates).toEqual([new Date(2025, 1, 5)]);
        expect(fp.input.value).toEqual("5 February 2025");
      });
    });

    describe("documentClick", () => {
      it("announces a direct entry committed by clicking outside when allowInput is true (#2941)", () => {
        const onChange = jest.fn();
        createInstance({ allowInput: true, onChange });

        fp.input.focus();
        fp.input.value = "1999-12-31";
        pressOutside();
        fp.input.blur();

        expect(fp.input.value).toEqual("1999-12-31");
        expect(onChange).toHaveBeenCalledTimes(1);
      });

      it("announces a direct entry committed by clicking outside when altInput is on (#2941)", () => {
        const onChange = jest.fn();
        createInstance({
          allowInput: true,
          altInput: true,
          altFormat: "d.m.Y",
          defaultDate: "2001-01-01",
          onChange,
        });

        const altInput = fp.altInput as HTMLInputElement;
        altInput.focus();
        altInput.value = "20.07.1969";
        pressOutside();
        altInput.blur();

        expect(fp.input.value).toEqual("1969-07-20");
        expect(onChange).toHaveBeenCalledTimes(1);
      });

      it("announces a direct entry cleared by hand and committed by clicking outside (#2941)", () => {
        const onChange = jest.fn();
        createInstance({
          allowInput: true,
          defaultDate: "2001-01-01",
          onChange,
        });

        fp.input.focus();
        fp.input.value = "";
        pressOutside();
        fp.input.blur();

        expect(fp.input.value).toEqual("");
        expect(onChange).toHaveBeenCalledTimes(1);
      });

      it("stays silent when clicking outside without a direct entry (#2941)", () => {
        const onChange = jest.fn();
        createInstance({
          allowInput: true,
          defaultDate: "2001-01-01",
          onChange,
        });

        fp.input.focus();
        pressOutside();
        fp.input.blur();

        expect(onChange).not.toHaveBeenCalled();
      });

      it("should close popup", () => {
        createInstance({
          mode: "range",
        });

        simulate("focus", fp._input, { which: 1, bubbles: true }, CustomEvent);
        fp._input.focus();

        expect(fp.isOpen).toBe(true);
        simulate("mousedown", window.document.body, { which: 1 }, CustomEvent);
        fp._input.blur();

        expect(fp.isOpen).toBe(false);
        expect(fp.calendarContainer.classList.contains("open")).toBe(false);

        expect(fp.selectedDates.length).toBe(0);
      });

      it("should set and clear the selectedDates", () => {
        createInstance({
          mode: "range",
        });

        simulate("focus", fp._input);
        simulate(
          "click",
          fp.days.childNodes[15],
          { which: 1, bubbles: true },
          CustomEvent
        );
        expect(fp.selectedDates.length).toBe(1);

        fp.isOpen = true;
        simulate("mousedown", window.document.body, { which: 1 }, CustomEvent);
        expect(fp.isOpen).toBe(false);
        expect(fp.selectedDates.length).toBe(0);
        expect(fp._input.value).toBe("");
      });

      it("should revert invalid date before closing #2089", () => {
        // To supress console.warn
        jest.spyOn(console, "warn").mockImplementation(() => {});

        createInstance({
          allowInput: true,
          defaultDate: ["2020-01-22", "2020-01-28"],
          mode: "range",
        });

        simulate("focus", fp._input);
        fp._input.value = "test";
        simulate("mousedown", window.document.body, { which: 1 }, CustomEvent);
        expect(fp.isOpen).toBe(false);
        expect(fp.selectedDates.length).toBe(0);
        expect(fp._input.value).toBe("");
      });

      it("should use altFormat when altInput is enabled", () => {
        createInstance({
          allowInput: true,
          altInput: true,
          altFormat: "j F Y",
          defaultDate: "2020-01-22",
        });

        expect(fp.selectedDates[0]).toEqual(new Date("2020-01-22T00:00:00"));
        simulate("focus", fp._input);
        simulate("mousedown", window.document.body, { which: 1 }, CustomEvent);
        expect(fp.isOpen).toBe(false);
        expect(fp.selectedDates[0]).toEqual(new Date("2020-01-22T00:00:00"));
        expect(fp._input.value).toBe("22 January 2020");
      });

      it("should be updated correctly via mouse events when altInput is enabled #2653", () => {
        createInstance({
          allowInput: true,
          altInput: true,
          altFormat: "j F Y H:i",
          defaultDate: "2020-01-22 03:04",
          enableTime: true,
        });

        expect(fp.selectedDates[0]).toEqual(new Date("2020-01-22T03:04:00"));
        simulate("focus", fp._input);
        simulate("mousedown", window.document.body, { which: 1 }, CustomEvent);
        expect(fp.isOpen).toBe(false);
        expect(fp._input.value).toBe("22 January 2020 03:04");
      });

      it("should trigger onChange only once", () => {
        let timesFired = 0;

        createInstance({
          allowInput: true,
          altInput: true,
          altFormat: "j F Y H:i",
          enableTime: true,
          onChange: () => timesFired++,
        });

        simulate("focus", fp._input);
        fp._input.value = "22 January 2020 03:04";
        simulate("blur", fp._input, { target: fp._input, test: 1 }, FocusEvent);
        expect(timesFired).toEqual(1);
      });

      it("should not close when the input is inside a shadow root #2766", () => {
        const host = document.createElement("div");
        document.body.appendChild(host);
        const shadowInput = document.createElement("input");
        host.attachShadow({ mode: "open" }).appendChild(shadowInput);

        createInstance({}, shadowInput);
        fp.open();

        shadowInput.dispatchEvent(
          new MouseEvent("mousedown", { bubbles: true, composed: true })
        );
        expect(fp.isOpen).toBe(true);

        simulate("mousedown", window.document.body, { which: 1 }, CustomEvent);
        expect(fp.isOpen).toBe(false);

        destroyInstance();
        host.remove();
      });

      it("should work with an element from another window #3138", () => {
        const iframe = document.createElement("iframe");
        document.body.appendChild(iframe);
        const frameDoc = iframe.contentDocument as Document;
        const frameInput = frameDoc.createElement("input");
        frameDoc.body.appendChild(frameInput);
        expect(frameInput instanceof HTMLElement).toBe(false);

        createInstance({}, frameInput);
        expect(fp.calendarContainer.ownerDocument).toBe(frameDoc);
        expect(frameDoc.body.contains(fp.calendarContainer)).toBe(true);

        fp.open();
        expect(fp.isOpen).toBe(true);
        frameDoc.body.dispatchEvent(
          new MouseEvent("mousedown", { bubbles: true })
        );
        expect(fp.isOpen).toBe(false);

        destroyInstance();
        iframe.remove();
      });

      it("should work with an element whose document has no window", () => {
        const template = document.createElement("template");
        template.innerHTML = "<input>";
        const clone = template.content.cloneNode(true) as DocumentFragment;
        const input = clone.querySelector("input") as HTMLInputElement;
        expect(input.ownerDocument.defaultView).toBe(null);

        createInstance({}, input);
        expect(fp.calendarContainer.ownerDocument).toBe(document);
        expect(document.body.contains(fp.calendarContainer)).toBe(true);

        destroyInstance();
      });
    });

    describe("document and window listeners (flatpickr#3069)", () => {
      let listeners: {
        on: string;
        type: string;
        callback: unknown;
        capture: boolean;
      }[];

      const isCapture = (options?: boolean | EventListenerOptions) =>
        typeof options === "boolean" ? options : !!options?.capture;

      // mirror the listeners added to and removed from target
      const track = (target: EventTarget, on: string) => {
        const { addEventListener, removeEventListener } = target;

        jest
          .spyOn(target, "addEventListener")
          .mockImplementation((type, callback, options) => {
            listeners.push({ on, type, callback, capture: isCapture(options) });
            addEventListener.call(target, type, callback, options);
          });
        jest
          .spyOn(target, "removeEventListener")
          .mockImplementation((type, callback, options) => {
            const capture = isCapture(options);
            listeners = listeners.filter(
              (l) =>
                l.on !== on ||
                l.type !== type ||
                l.callback !== callback ||
                l.capture !== capture
            );
            removeEventListener.call(target, type, callback, options);
          });
      };

      // what flatpickr has bound on the document and the window
      const bound = () =>
        listeners
          .map((l) => `${l.on} ${l.type}${l.capture ? " capture" : ""}`)
          .sort();

      const whileOpen = [
        "document focus capture",
        "document mousedown",
        "window resize",
      ];

      beforeEach(() => {
        listeners = [];
        track(document, "document");
        track(window, "window");
      });

      afterEach(() => jest.restoreAllMocks());

      it("binds them only while the calendar is open", () => {
        createInstance();
        expect(bound()).toEqual([]);

        fp.open();
        expect(bound()).toEqual(whileOpen);

        fp.close();
        expect(bound()).toEqual([]);
      });

      it("binds them once however often it opens", () => {
        createInstance();

        for (let i = 0; i < 3; i++) {
          fp.open();
          fp.open();
          expect(bound()).toEqual(whileOpen);

          fp.close();
          expect(bound()).toEqual([]);
        }
      });

      it("unbinds them when destroyed open or closed", () => {
        createInstance();
        fp.open();
        fp.destroy();
        expect(bound()).toEqual([]);

        createInstance();
        fp.open();
        fp.close();
        fp.destroy();
        expect(bound()).toEqual([]);
      });

      it("leaves none bound when onOpen closes the calendar", () => {
        createInstance({ onOpen: (_, __, instance) => instance.close() });
        fp.open();

        expect(fp.isOpen).toBe(false);
        expect(bound()).toEqual([]);
      });

      it("keeps them bound when onClose reopens the calendar", () => {
        createInstance({ onClose: (_, __, instance) => instance.open() });
        fp.open();
        pressOutside();

        expect(fp.isOpen).toBe(true);
        expect(bound()).toEqual(whileOpen);
      });

      it("binds no resize listener for a static calendar", () => {
        createInstance({ static: true });
        expect(bound()).toEqual([]);

        fp.open();
        expect(bound()).toEqual([
          "document focus capture",
          "document mousedown",
        ]);
      });

      it("binds none for an inline calendar or the native mobile input", () => {
        createInstance({ inline: true });
        fp.open();
        expect(bound()).toEqual([]);

        mockAgent = "Android";
        createInstance();
        fp.open();
        expect(bound()).toEqual([]);
      });

      it("binds touchstart instead of mousedown on touch screens", () => {
        (window as any).ontouchstart = null;
        createInstance();
        fp.open();
        delete (window as any).ontouchstart;

        expect(bound()).toEqual([
          "document focus capture",
          "document touchstart",
          "window resize",
        ]);

        simulate("touchstart", document.body);
        expect(fp.isOpen).toBe(false);
        expect(bound()).toEqual([]);
      });

      it("still closes on a press or a focus outside", () => {
        const other = document.createElement("input");
        document.body.appendChild(other);
        createInstance();

        fp.open();
        pressOutside();
        expect(fp.isOpen).toBe(false);

        fp.open();
        other.focus();
        expect(fp.isOpen).toBe(false);
        expect(bound()).toEqual([]);

        other.remove();
      });

      it("unbinds them when confirmDate's button closes the calendar", () => {
        createInstance({ enableTime: true, plugins: [confirmDatePlugin({})] });
        fp.open();
        clickOn(fp.calendarContainer.querySelector(".flatpickr-confirm")!);

        expect(fp.isOpen).toBe(false);
        expect(bound()).toEqual([]);
      });
    });

    it("onKeyDown", () => {
      createInstance({
        enableTime: true,
        altInput: true,
      });

      fp.jumpToDate("2016-2-1");

      fp.open();
      (fp.days.childNodes[15] as HTMLSpanElement).focus();

      simulate(
        "keydown",
        fp.days.childNodes[15],
        {
          keyCode: 13, // "Enter"
        },
        KeyboardEvent
      );

      expect(fp.selectedDates.length).toBe(1);
      simulate(
        "keydown",
        fp.calendarContainer,
        {
          keyCode: 27, // "Escape"
        },
        KeyboardEvent
      );

      expect(fp.isOpen).toEqual(false);
    });

    it("onKeyDown: arrow nav", () => {
      jest.runAllTimers();
      createInstance({
        defaultDate: "2017-01-01",
      });

      fp.open();
      fp.input.focus();

      simulate("keydown", fp.calendarContainer, {
        // "ArrowRight"
        keyCode: 39,
        ctrlKey: true,
      });
      expect(fp.currentMonth).toBe(1);
      expect(fp.currentYear).toBe(2017);

      simulate("keydown", fp.calendarContainer, {
        // "ArrowLeft"
        keyCode: 37,
        ctrlKey: true,
      });
      simulate("keydown", fp.calendarContainer, {
        // "ArrowLeft"
        keyCode: 37,
        ctrlKey: true,
      });
      expect(fp.currentMonth).toBe(11);
      expect(fp.currentYear).toBe(2016);
    });

    describe("keys in the month dropdown (flatpickr#3045)", () => {
      const press = (type: string, target: Element, keyCode: number) => {
        const evt = new CustomEvent(type, { bubbles: true, cancelable: true });
        Object.assign(evt, {
          keyCode,
          key: ({
            13: "Enter",
            37: "ArrowLeft",
            38: "ArrowUp",
            39: "ArrowRight",
            40: "ArrowDown",
          } as Record<number, string>)[keyCode],
        });
        target.dispatchEvent(evt);
        return evt;
      };

      it("doesn't take Enter on the month as a year", () => {
        createInstance({ defaultDate: "2020-06-15" });
        fp.open();

        press("keydown", fp.monthsDropdownContainer, 13);
        press("keyup", fp.monthsDropdownContainer, 13);

        expect(fp.currentYear).toEqual(2020);
        expect(fp.currentMonth).toEqual(5);
      });

      it("still reads every year input with showMonths > 1", () => {
        createInstance({ showMonths: 2, defaultDate: "2020-01-22" });
        fp.open();

        fp.yearElements[1].value = "2030";
        press("keyup", fp.yearElements[1], 13);

        expect(fp.currentYear).toEqual(2030);
      });

      it("leaves the arrow keys to the dropdown", () => {
        createInstance({ defaultDate: "2020-06-15", enableTime: true });
        fp.open();
        fp.monthsDropdownContainer.focus();

        for (const keyCode of [37, 38, 39, 40]) {
          const evt = press("keydown", fp.monthsDropdownContainer, keyCode);

          expect(evt.defaultPrevented).toBe(false);
          expect(document.activeElement).toBe(fp.monthsDropdownContainer);
        }
        expect(fp.currentYear).toEqual(2020);
        expect(fp.currentMonth).toEqual(5);
      });

      it("still steps the year with the arrow keys in the year input", () => {
        createInstance({ defaultDate: "2020-06-15" });
        fp.open();

        const evt = press("keydown", fp.currentYearElement, 38);

        expect(evt.defaultPrevented).toBe(true);
        expect(fp.currentYear).toEqual(2021);
      });
    });

    describe("a year past what a Date can hold (flatpickr#2906)", () => {
      const typeYear = (year: string) => {
        for (let i = 1; i <= year.length; i++) {
          fp.currentYearElement.value = year.slice(0, i);
          const evt = new CustomEvent("keyup", { bubbles: true });
          Object.assign(evt, { key: year[i - 1] });
          fp.currentYearElement.dispatchEvent(evt);
        }
      };

      // an Invalid Date month builds no day at all
      const expectDays = () => expect(fp.days.childNodes).toHaveLength(42);

      it("ignores a typed 7-digit year and keeps the calendar working", () => {
        createInstance({ defaultDate: "2023-05-31" });
        fp.open();

        typeYear("1234567");

        expect(fp.currentYear).toEqual(123456);
        expect(fp.currentYearElement.value).toEqual("1234567");
        expectDays();

        clickOn(fp.nextMonthNav);

        expect(fp.currentYear).toEqual(123456);
        expect(fp.currentMonth).toEqual(5);
        expect(fp.currentYearElement.value).toEqual("123456");
        expectDays();
      });

      it("ignores a 7-digit year entered with Enter", () => {
        createInstance({ defaultDate: "2023-05-31" });
        fp.open();

        fp.currentYearElement.value = "20232020";
        const evt = new CustomEvent("keyup", { bubbles: true });
        Object.assign(evt, { key: "Enter" });
        fp.currentYearElement.dispatchEvent(evt);

        expect(fp.currentYear).toEqual(2023);
        expectDays();
      });

      it("ignores changeYear() to such a year, either way", () => {
        createInstance({ defaultDate: "2023-05-31" });
        const onYearChange = jest.fn();
        fp.set("onYearChange", onYearChange);

        fp.changeYear(1234567);
        fp.changeYear(-1234567);

        expect(fp.currentYear).toEqual(2023);
        expect(fp.currentYearElement.value).toEqual("2023");
        expect(onYearChange).not.toHaveBeenCalled();
      });

      it("goes by the month shown in the last year a Date reaches", () => {
        createInstance({ defaultDate: "2023-01-15" });

        fp.changeYear(275760);
        expect(fp.currentYear).toEqual(275760);
        expectDays();

        fp.changeYear(2023);
        fp.changeMonth(9, false);
        fp.changeYear(275760);
        expect(fp.currentYear).toEqual(2023);
      });
    });

    it("onKeyDown closes flatpickr on Enter when allowInput set to true", () => {
      createInstance({
        enableTime: true,
        allowInput: true,
        altInput: true,
      });

      fp.jumpToDate("2016-2-1");

      fp.open();
      (fp.days.childNodes[15] as HTMLSpanElement).focus();

      simulate(
        "keydown",
        fp._input,
        {
          keyCode: 13, // "Enter"
        },
        KeyboardEvent
      );
      expect(fp.isOpen).toEqual(false);
    });

    describe("Escape in the input with allowInput (flatpickr#2915)", () => {
      const press = (keyCode: number) => {
        const evt = new KeyboardEvent("keydown", {
          keyCode,
          bubbles: true,
          cancelable: true,
        });
        fp._input.dispatchEvent(evt);
        return evt;
      };

      it.each([
        { allowInput: false },
        { allowInput: true },
        { allowInput: true, altInput: true },
      ])("closes the calendar as without allowInput: %p", (config) => {
        createInstance(config);
        fp._input.focus();
        expect(fp.isOpen).toBe(true);

        const evt = press(27);

        expect(fp.isOpen).toBe(false);
        expect(evt.defaultPrevented).toBe(true);
        expect(document.activeElement).toBe(fp._input);
      });

      it("leaves the typed text to be committed on blur", () => {
        const onChange = jest.fn();
        createInstance({ allowInput: true, onChange });
        fp._input.focus();
        fp._input.value = "2016-02-05";

        press(27);

        expect(fp._input.value).toEqual("2016-02-05");
        expect(fp.selectedDates).toEqual([]);
        expect(onChange).not.toHaveBeenCalled();

        fp._input.blur();

        expect(fp.selectedDates).toEqual([new Date(2016, 1, 5)]);
        expect(onChange).toHaveBeenCalledTimes(1);
      });

      it("leaves Escape alone while the calendar is closed", () => {
        const onClose = jest.fn();
        createInstance({ allowInput: true, clickOpens: false, onClose });
        fp._input.focus();

        const evt = press(27);

        expect(evt.defaultPrevented).toBe(false);
        expect(onClose).not.toHaveBeenCalled();
      });

      it("keeps the other keys for typing", () => {
        createInstance({ allowInput: true, enableTime: true });
        fp._input.focus();

        for (const keyCode of [8, 37, 38, 39, 40, 46]) {
          const evt = press(keyCode);

          expect(evt.defaultPrevented).toBe(false);
          expect(fp.isOpen).toBe(true);
          expect(document.activeElement).toBe(fp._input);
        }
      });
    });

    it("enabling dates by function", () => {
      createInstance({
        enable: [(d) => d.getDate() === 6, new Date()],
        disable: [{ from: "2016-10-20", to: "2016-10-25" }],
      });

      expect(fp.isEnabled("2016-10-06")).toBe(true);
      expect(fp.isEnabled(new Date())).toBe(true);
      expect(fp.isEnabled("2016-10-20")).toBe(false);
      expect(fp.isEnabled("2016-10-22")).toBe(false);
      expect(fp.isEnabled("2016-10-25")).toBe(false);
    });

    describe("enable and disable with a time of day (flatpickr#2855)", () => {
      const day = "2025-03-10";
      const value = "2025-03-10 16:00";
      const at = new Date(2025, 2, 10, 16, 0);

      it("keeps a value on a day enable lists", () => {
        createInstance({ enableTime: true, enable: [day], defaultDate: value });
        expect(fp.selectedDates).toEqual([at]);
        expect(fp.input.value).toEqual(value);

        fp.clear();
        fp.setDate(value);
        expect(fp.selectedDates).toEqual([at]);

        fp.setDate("2025-03-11 16:00");
        expect(fp.selectedDates).toEqual([]);
      });

      it("drops a value on a day disable lists", () => {
        createInstance({
          enableTime: true,
          disable: [day],
          defaultDate: value,
        });
        expect(fp.selectedDates).toEqual([]);

        fp.setDate(value);
        expect(fp.selectedDates).toEqual([]);

        fp.setDate("2025-03-11 16:00");
        expect(fp.selectedDates).toEqual([new Date(2025, 2, 11, 16, 0)]);
      });

      it("reads the last day of a range as enabled or disabled all day", () => {
        const range = { from: "2025-03-08", to: day };

        createInstance({
          enableTime: true,
          enable: [range],
          defaultDate: value,
        });
        expect(fp.selectedDates).toEqual([at]);

        createInstance({
          enableTime: true,
          disable: [range],
          defaultDate: value,
        });
        expect(fp.selectedDates).toEqual([]);
      });

      it("gives a rule function the day, as a click does", () => {
        const rule = jest.fn((d: Date) => d.getDate() === 10);
        createInstance({
          enableTime: true,
          enable: [rule],
          defaultDate: value,
        });

        expect(fp.selectedDates).toEqual([at]);
        rule.mock.calls.forEach(([d]) => expect(d.getHours()).toBe(0));
      });

      it("keeps the dates of multiple and range on enabled days", () => {
        createInstance({
          mode: "multiple",
          enableTime: true,
          enable: [day],
          defaultDate: [value, "2025-03-11 09:00"],
        });
        expect(fp.selectedDates).toEqual([at]);

        createInstance({
          mode: "range",
          enableTime: true,
          enable: [{ from: "2025-03-08", to: day }],
          defaultDate: `2025-03-08 09:00 to ${value}`,
        });
        expect(fp.selectedDates).toEqual([new Date(2025, 2, 8, 9, 0), at]);
      });

      it("keeps a value typed with allowInput", () => {
        createInstance({ enableTime: true, allowInput: true, enable: [day] });
        fp.input.focus();
        fp.input.value = value;
        simulate("keydown", fp._input, { keyCode: 13 });

        expect(fp.selectedDates).toEqual([at]);
      });

      it("still compares minDate and maxDate with the time", () => {
        createInstance({
          enableTime: true,
          enable: [day],
          minDate: "2025-03-10 12:00",
          maxDate: "2025-03-10 18:00",
        });

        expect(fp.isEnabled("2025-03-10 10:00", false)).toBe(false);
        expect(fp.isEnabled(value, false)).toBe(true);
        expect(fp.isEnabled("2025-03-10 19:00", false)).toBe(false);

        fp.setDate("2025-03-10 10:00");
        expect(fp.selectedDates).toEqual([]);
        fp.setDate(value);
        expect(fp.selectedDates).toEqual([at]);
      });
    });

    describe("clear()", () => {
      it("resets currentMonth and currentYear", () => {
        createInstance({
          defaultDate: "2016-01-20",
        });

        fp.changeMonth(-1);

        expect(fp.currentMonth).toEqual(11);
        expect(fp.currentYear).toEqual(2015);

        fp.clear();

        expect(fp.currentMonth).toEqual(0);
        expect(fp.currentYear).toEqual(2016);
      });

      it("keeps the view within a minDate set after init (flatpickr#3002)", () => {
        createInstance({ now: "2024-04-10" });

        fp.set("minDate", "2024-06-15");
        fp.clear();

        expect(fp.currentMonth).toEqual(5);
        expect(fp.currentYear).toEqual(2024);
      });

      it("keeps the view within a maxDate set after init", () => {
        createInstance({ now: "2024-04-10" });

        fp.set("maxDate", "2023-11-15");
        fp.clear();

        expect(fp.currentMonth).toEqual(10);
        expect(fp.currentYear).toEqual(2023);
      });

      it("returns to minDate's month when it rules out the defaultDate", () => {
        createInstance({ defaultDate: "2016-01-20" });

        fp.set("minDate", "2016-03-05");
        fp.clear();

        expect(fp.currentMonth).toEqual(2);
        expect(fp.currentYear).toEqual(2016);
      });

      it("moves the view off a selected date a later minDate rules out", () => {
        createInstance({ defaultDate: "2016-01-20", now: "2016-01-10" });

        fp.set("minDate", "2016-03-05");

        expect(fp.selectedDates).toEqual([]);
        expect(fp.latestSelectedDateObj).toBeUndefined();
        expect(fp.currentMonth).toEqual(2);
        expect(fp.currentYear).toEqual(2016);
      });

      it("moves the view off a selected date a later maxDate rules out", () => {
        createInstance({ defaultDate: "2016-05-20", now: "2016-06-10" });

        fp.set("maxDate", "2016-03-05");

        expect(fp.latestSelectedDateObj).toBeUndefined();
        expect(fp.currentMonth).toEqual(2);
        expect(fp.currentYear).toEqual(2016);
      });

      it("keeps the latest pick through a minDate that still allows it", () => {
        createInstance({
          mode: "multiple",
          defaultDate: ["2016-01-05", "2016-03-20"],
          now: "2016-01-10",
        });
        expect(fp.latestSelectedDateObj).toEqual(new Date(2016, 0, 5));

        fp.set("minDate", "2016-01-01");
        expect(fp.latestSelectedDateObj).toEqual(new Date(2016, 0, 5));
        expect(fp.currentMonth).toEqual(0);

        fp.set("minDate", "2016-02-01");
        expect(fp.selectedDates).toEqual([new Date(2016, 2, 20)]);
        expect(fp.latestSelectedDateObj).toEqual(new Date(2016, 2, 20));
        expect(fp.currentMonth).toEqual(2);
      });

      it("keeps the view within minDate when a range is abandoned", () => {
        createInstance({ mode: "range", now: "2024-04-10" });

        fp.set("minDate", "2024-06-15");
        fp.open();
        (fp.days.querySelector(
          ".flatpickr-day:not(.flatpickr-disabled)"
        ) as HTMLElement).dispatchEvent(
          new MouseEvent("click", { bubbles: true })
        );
        document.body.dispatchEvent(
          new MouseEvent("mousedown", { bubbles: true })
        );

        expect(fp.selectedDates).toEqual([]);
        expect(fp.currentMonth).toEqual(5);
        expect(fp.currentYear).toEqual(2024);
      });
    });

    it("triggers monthChange on jump", (done) => {
      const fp = createInstance({
        defaultDate: new Date(2019, 3, 17),
        onMonthChange: () => {
          expect(fp.currentMonth).toEqual(4);
          done();
        },
      });

      fp.jumpToDate(new Date(2019, 4, 17), true);
    });

    it("triggers yearChange on jump", (done) => {
      const fp = createInstance({
        defaultDate: new Date(2019, 3, 17),
        onYearChange: () => {
          expect(fp.currentYear).toEqual(2020);
          done();
        },
      });

      fp.jumpToDate(new Date(2020, 4, 17), true);
    });

    it("open() and clickOpens interaction", () => {
      const fp = createInstance({
        clickOpens: false,
      });

      simulate("click", fp._input);
      expect(fp.isOpen).toEqual(false);

      fp.open();
      expect(fp.isOpen).toEqual(true);
    });
  });

  describe("UI", () => {
    it("mode: multiple", () => {
      createInstance({
        mode: "multiple",
      });

      fp.jumpToDate("2017-1-1");
      fp.open();

      simulate("keydown", fp.days.childNodes[0], { keyCode: 13 }); // "Enter"
      expect(fp.selectedDates.length).toBe(1);

      simulate("keydown", fp.days.childNodes[0], { keyCode: 13 }); // "Enter"
      expect(fp.selectedDates.length).toBe(0);
    });

    it("switch month to selectedDate", () => {
      createInstance();
      fp.jumpToDate("2017-1-1");
      expect(fp.currentMonth).toBe(0);

      simulate("click", fp.days.childNodes[41], { which: 1 }, MouseEvent);
      expect(fp.selectedDates.length).toBe(1);
      expect(fp.currentMonth).toBe(1);
    });

    it("static calendar", () => {
      createInstance({
        static: true,
      });

      expect(fp.calendarContainer.classList.contains("static")).toBe(true);
      if (!fp.element.parentNode) return;
      expect(
        (fp.element.parentNode as Element).classList.contains(
          "flatpickr-wrapper"
        )
      ).toBe(true);
      expect(fp.element.parentNode.childNodes[0]).toEqual(fp.element);
      expect(fp.element.parentNode.childNodes[1]).toEqual(fp.calendarContainer);
    });

    describe("altInput with a static calendar (flatpickr#3037)", () => {
      function wrapElement() {
        const element = document.createElement("div");
        element.innerHTML =
          '<div class="group"><input data-input><span></span></div>' +
          "<button data-toggle></button>";
        document.body.appendChild(element);
        return element;
      }

      for (const config of [{}, { inline: true }]) {
        it(`puts it next to the input in a wrap element${
          config.inline ? " (inline)" : ""
        }`, () => {
          const element = wrapElement();
          const input = element.querySelector("input") as HTMLInputElement;

          createInstance(
            { ...config, wrap: true, static: true, altInput: true },
            element
          );

          expect(input.nextSibling).toBe(fp.altInput);
          const wrapper = element.parentNode as Element;
          expect(wrapper.classList.contains("flatpickr-wrapper")).toBe(true);
          expect(Array.from(wrapper.childNodes)).toEqual([
            element,
            fp.calendarContainer,
          ]);

          fp.destroy();
          element.remove();
        });
      }

      it("puts it in the wrapper when the element is the input", () => {
        const input = document.createElement("input");
        document.body.appendChild(input);

        createInstance({ static: true, altInput: true }, input);

        const wrapper = input.parentNode as Element;
        expect(wrapper.classList.contains("flatpickr-wrapper")).toBe(true);
        expect(Array.from(wrapper.childNodes)).toEqual([
          input,
          fp.altInput,
          fp.calendarContainer,
        ]);

        fp.destroy();
        input.remove();
      });

      it("leaves the wrap element as it was on destroy", () => {
        const element = wrapElement();
        const group = element.firstChild as Element;
        const children = Array.from(group.childNodes);

        createInstance({ wrap: true, static: true, altInput: true }, element);
        const altInput = fp.altInput as HTMLInputElement;
        fp.destroy();

        expect(element.parentNode).toBe(document.body);
        expect(Array.from(group.childNodes)).toEqual(children);
        expect(altInput.parentNode).toBeNull();

        element.remove();
      });
    });

    it("range mode - no month jump", () => {
      createInstance({
        mode: "range",
        maxDate: "today",
        defaultDate: ["2019-02-01", "2019-02-27"],
      });

      fp.open();
      simulate("click", fp.prevMonthNav, { which: 1 }, CustomEvent);
      expect(fp.currentMonth).toEqual(0);

      simulate("click", fp.days.children[2], { which: 1 }, CustomEvent);
      expect(fp.currentMonth).toEqual(0);
    });

    describe("picking a day across a year end (flatpickr#3003)", () => {
      const pick = (date: string) =>
        clickOn(
          Array.from(
            fp.daysContainer!.querySelectorAll<DayElement>(".flatpickr-day")
          ).find(
            (day) =>
              !day.classList.contains("hidden") &&
              fp.formatDate(day.dateObj, "Y-m-d") === date
          )!
        );

      const view = () => [fp.currentYear, fp.currentMonth];

      it.each([
        ["single", 2, "2025-12-01", "2026-01-15"],
        ["multiple", 2, "2025-12-01", "2026-01-15"],
        ["single", 3, "2025-11-01", "2026-01-15"],
      ] as const)(
        "keeps the view on a shown month of the next year (%s, showMonths: %s)",
        (mode, showMonths, defaultDate, date) => {
          const events: string[] = [];
          createInstance({
            mode,
            showMonths,
            defaultDate,
            onMonthChange: () => events.push("month"),
            onYearChange: () => events.push("year"),
          });
          const shown = view();
          fp.open();

          pick(date);

          expect(fp.formatDate(fp.latestSelectedDateObj!, "Y-m-d")).toBe(date);
          expect(view()).toEqual(shown);
          expect(events).toEqual([]);
        }
      );

      it.each([
        ["2025-12-01", "2026-01-02", [2026, 0]],
        ["2026-01-15", "2025-12-31", [2025, 11]],
      ])(
        "still moves to a day of the next or previous year outside the month (from %s to %s)",
        (defaultDate, date, expected) => {
          const events: string[] = [];
          createInstance({
            defaultDate,
            onMonthChange: () => events.push("month"),
            onYearChange: () => events.push("year"),
          });
          fp.open();

          pick(date);

          expect(view()).toEqual(expected);
          expect(events).toEqual(["year", "month"]);
        }
      );
    });

    it("sets the date on direct entry when allowInput is true - blur", () => {
      createInstance({ allowInput: true });
      expect(fp.selectedDates[0]).toBeUndefined();

      fp.input.focus();
      fp.input.value = "1999-12-31";
      fp.input.blur();

      expect(fp.selectedDates[0]).toBeDefined();
      expect(fp.selectedDates[0].getFullYear()).toEqual(1999);
      expect(fp.selectedDates[0].getMonth()).toEqual(11); // 11 === December
      expect(fp.selectedDates[0].getDate()).toEqual(31);
    });

    it("updates the date on direct entry when allowInput is true - blur", () => {
      createInstance({
        allowInput: true,
        enableTime: true,
        defaultDate: "2001-01-01 01:01",
      });
      expect(fp.selectedDates[0]).toBeDefined();
      expect(fp.selectedDates[0].getFullYear()).toEqual(2001);
      expect(fp.selectedDates[0].getMonth()).toEqual(0); // 0 === January
      expect(fp.selectedDates[0].getDate()).toEqual(1);
      expect(fp.selectedDates[0].getHours()).toEqual(1);
      expect(fp.selectedDates[0].getMinutes()).toEqual(1);

      fp.input.focus();
      fp.input.value = "1969-07-20 20:17";
      fp.input.blur();

      expect(fp.selectedDates[0]).toBeDefined();
      expect(fp.selectedDates[0].getFullYear()).toEqual(1969);
      expect(fp.selectedDates[0].getMonth()).toEqual(6); // 6 === July
      expect(fp.selectedDates[0].getDate()).toEqual(20);
      expect(fp.selectedDates[0].getHours()).toEqual(20);
      expect(fp.selectedDates[0].getMinutes()).toEqual(17);
    });

    it("sets the date on direct entry when allowInput is true - document click", () => {
      createInstance({ allowInput: true });
      expect(fp.selectedDates[0]).toBeUndefined();

      fp.input.focus();
      fp.input.value = "1999-12-31";
      clickOn(document.body);
      fp.input.blur();

      expect(fp.selectedDates[0]).toBeDefined();
      expect(fp.selectedDates[0].getFullYear()).toEqual(1999);
      expect(fp.selectedDates[0].getMonth()).toEqual(11); // 11 === December
      expect(fp.selectedDates[0].getDate()).toEqual(31);
    });

    it("updates the date on direct entry when allowInput is true - document click", () => {
      createInstance({
        allowInput: true,
        enableTime: true,
        defaultDate: "2001-01-01 01:01",
      });
      expect(fp.selectedDates[0]).toBeDefined();
      expect(fp.selectedDates[0].getFullYear()).toEqual(2001);
      expect(fp.selectedDates[0].getMonth()).toEqual(0); // 0 === January
      expect(fp.selectedDates[0].getDate()).toEqual(1);
      expect(fp.selectedDates[0].getHours()).toEqual(1);
      expect(fp.selectedDates[0].getMinutes()).toEqual(1);

      fp.input.focus();
      fp.input.value = "1969-07-20 20:17";
      clickOn(document.body);
      fp.input.blur();

      expect(fp.selectedDates[0]).toBeDefined();
      expect(fp.selectedDates[0].getFullYear()).toEqual(1969);
      expect(fp.selectedDates[0].getMonth()).toEqual(6); // 6 === July
      expect(fp.selectedDates[0].getDate()).toEqual(20);
      expect(fp.selectedDates[0].getHours()).toEqual(20);
      expect(fp.selectedDates[0].getMinutes()).toEqual(17);
    });

    it("Renders week numbers correctly", () => {
      createInstance({
        weekNumbers: true,
      });
      fp.changeYear(2022);
      fp.changeMonth(1);

      while (fp.currentYear != 2023) {
        const expectedWeekNumbers = Array(6)
          .fill(null)
          .map((_, i) =>
            fp.config.getWeek(
              (fp.days.children[7 * i + 6] as DayElement).dateObj
            )
          );

        const actualWeekNumbers = Array.from(
          fp.weekWrapper!.children[1].children
        ).map((w) => parseInt((w as DayElement).innerHTML, 10));

        expect(actualWeekNumbers).toEqual(expectedWeekNumbers);
        fp.changeMonth(1, true);
      }
    });

    describe("ids of the calendar's form fields (flatpickr#3118)", () => {
      const fieldsOf = (instance: Instance) =>
        Array.from(
          instance.calendarContainer.querySelectorAll<
            HTMLInputElement | HTMLSelectElement
          >("input, select")
        );
      const idsOf = (instance: Instance) =>
        fieldsOf(instance).map((field) => field.id);
      const timeConfig = { enableTime: true, enableSeconds: true };

      it("gives the month dropdown, year and time inputs an id and no name", () => {
        createInstance(timeConfig);

        const fields = fieldsOf(fp);
        expect(fields).toEqual([
          fp.monthsDropdownContainer,
          fp.currentYearElement,
          fp.hourElement,
          fp.minuteElement,
          fp.secondElement,
        ]);
        for (const field of fields) {
          expect(field.id).not.toEqual("");
          expect(document.getElementById(field.id)).toBe(field);
          expect(field.name).toEqual("");
        }
      });

      it("doesn't repeat ids across instances", () => {
        createInstance(timeConfig);
        const other = flatpickr(
          document.createElement("input"),
          timeConfig
        ) as Instance;

        const ids = [...idsOf(fp), ...idsOf(other)];
        expect(new Set(ids).size).toEqual(10);

        other.destroy();
      });

      it("doesn't reuse a destroyed instance's ids while another lives", () => {
        createInstance(timeConfig);
        const ids = idsOf(fp);
        expect(ids).not.toContain("");
        const destroyed = flatpickr(
          document.createElement("input"),
          timeConfig
        ) as Instance;
        destroyed.destroy();
        const created = flatpickr(
          document.createElement("input"),
          timeConfig
        ) as Instance;

        expect(idsOf(created).filter((id) => ids.includes(id))).toEqual([]);

        created.destroy();
      });

      for (const config of [{ static: true }, { inline: true }]) {
        it(`doesn't add the fields to a form's data (${
          Object.keys(config)[0]
        })`, () => {
          const form = document.createElement("form");
          const input = document.createElement("input");
          input.name = "date";
          form.appendChild(input);
          document.body.appendChild(form);

          createInstance(
            { ...config, ...timeConfig, defaultDate: "2024-03-05 10:20:30" },
            input
          );

          const entries: [string, FormDataEntryValue][] = [];
          new FormData(form).forEach((value, key) =>
            entries.push([key, value])
          );

          expect(form.contains(fp.calendarContainer)).toBe(true);
          expect(entries).toEqual([["date", "2024-03-05 10:20:30"]]);

          fp.destroy();
          form.remove();
        });
      }

      it("gives each month's year input its own id with showMonths", () => {
        createInstance({ showMonths: 2 });

        const ids = fp.yearElements.map((year) => year.id);
        expect(ids).toHaveLength(2);
        expect(ids).not.toContain("");
        expect(new Set(ids).size).toEqual(2);
      });

      it("keeps the ids when set() rebuilds the months", () => {
        createInstance();
        const monthId = fp.monthsDropdownContainer.id;
        const yearId = fp.currentYearElement.id;

        fp.set("showMonths", 2);
        expect(fp.yearElements[0].id).toEqual(yearId);
        expect(fp.yearElements[1].id).not.toEqual("");
        expect(fp.yearElements[1].id).not.toEqual(yearId);

        fp.set("showMonths", 1);
        expect(idsOf(fp)).toEqual([monthId, yearId]);
      });

      it("keeps the ids when set() rebuilds the time picker", () => {
        createInstance(timeConfig);
        const ids = idsOf(fp);
        expect(ids).not.toContain("");

        fp.set("enableTime", false);
        expect(fp.hourElement).toBeUndefined();
        fp.set("enableTime", true);
        expect(idsOf(fp)).toEqual(ids);

        fp.set("time_24hr", true);
        expect(idsOf(fp)).toEqual(ids);
      });
    });

    describe("time inputs off their increments in a form (flatpickr#2923)", () => {
      let form: HTMLFormElement;
      let input: HTMLInputElement;

      beforeEach(() => {
        form = document.createElement("form");
        input = document.createElement("input");
        form.appendChild(input);
        document.body.appendChild(form);
      });

      afterEach(() => {
        fp.destroy();
        form.remove();
      });

      const createInForm = (config: Options) => {
        createInstance({ enableTime: true, ...config }, input);
        expect(form.contains(fp.calendarContainer)).toBe(true);
      };

      const placements: [string, () => Options][] = [
        ["static", () => ({ static: true })],
        ["inline", () => ({ inline: true })],
        ["appendTo", () => ({ appendTo: form })],
      ];

      for (const [name, placement] of placements) {
        it(`leaves the form valid with a minute held to minDate (${name})`, () => {
          createInForm({
            ...placement(),
            // the default time is held to 14:07, off the default increment of 5
            minDate: "2099-06-05 14:07",
          });

          expect(fp.minuteElement!.value).toEqual("07");
          expect(form.checkValidity()).toBe(true);
        });
      }

      it("leaves the form valid with an hour and seconds off their increments", () => {
        createInForm({
          inline: true,
          enableSeconds: true,
          time_24hr: true,
          hourIncrement: 2,
          defaultDate: "2099-06-05 13:07:37",
        });

        expect(form.checkValidity()).toBe(true);
      });

      it("steps by hourIncrement and minuteIncrement, the seconds with the minutes", () => {
        createInForm({
          inline: true,
          enableSeconds: true,
          time_24hr: true,
          hourIncrement: 2,
          minuteIncrement: 10,
          defaultDate: "2099-06-05 13:07:37",
        });

        incrementTime("hourElement", 1);
        incrementTime("minuteElement", 1);
        incrementTime("secondElement", -1);
        expect(fp.input.value).toEqual("2099-06-05 15:17:27");

        simulate("keydown", fp.minuteElement!, { keyCode: 38, which: 38 });
        expect(fp.input.value).toEqual("2099-06-05 15:27:27");
      });

      it("steps by increments given through set()", () => {
        createInForm({ inline: true, defaultDate: "2099-06-05 13:07" });
        fp.set({ hourIncrement: 3, minuteIncrement: 15 });

        incrementTime("hourElement", 1);
        incrementTime("minuteElement", 1);
        expect(fp.input.value).toEqual("2099-06-05 16:22");
      });

      it("steps by an hourIncrement given as a data attribute", () => {
        const input = document.createElement("input");
        input.setAttribute("data-hour-increment", "1");
        createInstance(
          { enableTime: true, defaultDate: "2099-06-05 11:00" },
          input
        );

        incrementTime("hourElement", 1);
        expect(fp.amPM!.textContent).toEqual("PM");
        expect(fp.selectedDates[0]).toEqual(new Date(2099, 5, 5, 12, 0));
      });
    });

    describe("mobile calendar", () => {
      describe(".isMobile", () => {
        it("returns true", () => {
          mockAgent = "Android";
          createInstance();

          expect(fp.isMobile).toBe(true);
        });
      });

      describe("init", () => {
        it("with value", () => {
          mockAgent = "Android";
          createInstance({
            enableTime: true,
          });

          const mobileInput = fp.mobileInput as HTMLInputElement;
          mobileInput.value = "2016-10-20T02:30";
          simulate("change", mobileInput);

          expect(fp.selectedDates.length).toBe(1);
          expect(fp.latestSelectedDateObj).toBeDefined();

          if (!fp.latestSelectedDateObj) return;
          expect(fp.latestSelectedDateObj.getFullYear()).toBe(2016);
          expect(fp.latestSelectedDateObj.getMonth()).toBe(9);
          expect(fp.latestSelectedDateObj.getDate()).toBe(20);
          expect(fp.latestSelectedDateObj.getHours()).toBe(2);
          expect(fp.latestSelectedDateObj.getMinutes()).toBe(30);
        });

        it("doesn't rewrite the native value while typing #3144", () => {
          mockAgent = "Android";
          createInstance({
            enableTime: true,
            noCalendar: true,
            dateFormat: "H:i",
            defaultDate: "05:05",
          });

          const mobileInput = fp.mobileInput as HTMLInputElement;
          // first digit of "15" typed into the hour field
          mobileInput.value = "01:05";
          simulate("change", mobileInput);

          expect(fp.input.value).toBe("01:05");
          expect(mobileInput.value).toBe("01:05");

          fp.setDate("13:30");
          expect(mobileInput.value).toBe("13:30:00");
        });

        it("copy className and adds own", () => {
          const el = document.createElement("input");
          el.className = "foo bar";

          mockAgent = "Android";
          createInstance({}, el);

          const mobileInput = fp.mobileInput as HTMLInputElement;

          expect(mobileInput.classList).toContain("foo");
          expect(mobileInput.classList).toContain("bar");
          expect(mobileInput.classList).toContain("flatpickr-mobile");
        });

        describe("step attribute", () => {
          it("copy value if present", () => {
            const el = document.createElement("input");
            el.setAttribute("step", "3");

            mockAgent = "Android";
            createInstance({}, el);

            const mobileInput = fp.mobileInput as HTMLInputElement;

            expect(mobileInput.getAttribute("step")).toBe("3");
          });

          it("don't set a default value if not present", () => {
            const el = document.createElement("input");
            el.removeAttribute("step");

            mockAgent = "Android";
            createInstance({}, el);

            const mobileInput = fp.mobileInput as HTMLInputElement;

            expect(mobileInput.getAttribute("step")).toBe(null);
          });
        });

        it("with other attributes", () => {
          const el = document.createElement("input");
          el.placeholder = "foo";
          el.disabled = true;
          el.required = true;

          mockAgent = "Android";
          createInstance({}, el);

          const mobileInput = fp.mobileInput as HTMLInputElement;

          expect(mobileInput.placeholder).toBe("foo");
          expect(mobileInput.disabled).toBe(true);
          expect(mobileInput.required).toBe(true);
        });

        it("with confirmDatePlugin", () => {
          mockAgent = "Android";
          createInstance({
            defaultDate: "2016-10-01",
            plugins: [confirmDatePlugin({})],
          });

          expect(fp.isMobile).toBe(true);

          fp.setDate("2016-10-20", true);
          expect(fp.input.value).toBe("2016-10-20");
        });

        it("moves to another year", () => {
          mockAgent = "Android";
          const onYearChange = jest.fn();
          createInstance({ defaultDate: "2001-01-01", onYearChange });

          fp.setDate("1999-12-31", true);
          expect(fp.mobileInput!.value).toBe("1999-12-31");

          fp.changeYear(1998);
          expect(fp.currentYear).toBe(1998);
          expect(onYearChange).toHaveBeenCalledTimes(2);

          fp.changeMonth(1);
          expect(fp.currentYear).toBe(1999);
          expect(onYearChange).toHaveBeenCalledTimes(3);
        });

        it("follows the options plugins set", () => {
          mockAgent = "Android";
          createInstance({
            plugins: [() => ({ disableMobile: true })],
          });

          expect(fp.isMobile).toBe(false);
          expect(fp.mobileInput).toBeUndefined();
        });
      });

      describe("min and max #2860", () => {
        it("follow set()", () => {
          mockAgent = "Android";
          createInstance({ minDate: "2016-10-10" });
          const mobileInput = fp.mobileInput as HTMLInputElement;
          expect(mobileInput.min).toBe("2016-10-10");

          fp.set("minDate", "2016-10-12");
          fp.set("maxDate", "2016-10-20");
          expect(mobileInput.min).toBe("2016-10-12");
          expect(mobileInput.max).toBe("2016-10-20");

          fp.set({ minDate: "2016-10-01", maxDate: "2016-10-31" });
          expect(mobileInput.min).toBe("2016-10-01");
          expect(mobileInput.max).toBe("2016-10-31");

          fp.set("minDate", null);
          expect(mobileInput.hasAttribute("min")).toBe(false);
          expect(mobileInput.max).toBe("2016-10-31");
        });

        it("follow a direct config assignment", () => {
          mockAgent = "Android";
          createInstance({ minDate: "2016-10-10", maxDate: "2016-10-20" });
          const mobileInput = fp.mobileInput as HTMLInputElement;

          fp.config.minDate = new Date(2016, 9, 12);
          expect(mobileInput.min).toBe("2016-10-12");

          fp.config.maxDate = undefined;
          expect(mobileInput.hasAttribute("max")).toBe(false);
        });

        it("are written as a date and time with enableTime", () => {
          mockAgent = "Android";
          createInstance({ enableTime: true, minDate: "2016-10-10 09:30" });
          const mobileInput = fp.mobileInput as HTMLInputElement;
          expect(mobileInput.min).toBe("2016-10-10T09:30:00");

          // seconds in min would move the step's grid off whole minutes
          fp.set("minDate", new Date(2016, 9, 10, 14, 23, 47));
          fp.set("maxDate", new Date(2016, 9, 20, 18, 45, 30));
          expect(mobileInput.min).toBe("2016-10-10T14:24:00");
          expect(mobileInput.max).toBe("2016-10-20T18:45:00");
        });

        it("are written as a time with noCalendar", () => {
          mockAgent = "Android";
          createInstance({
            enableTime: true,
            noCalendar: true,
            dateFormat: "H:i",
            minDate: "02:30",
          });
          const mobileInput = fp.mobileInput as HTMLInputElement;
          expect(mobileInput.type).toBe("time");
          expect(mobileInput.min).toBe("02:30:00");

          fp.set("maxDate", "18:00");
          expect(mobileInput.max).toBe("18:00:00");
        });

        it("follow the input type set() switches to", () => {
          mockAgent = "Android";
          createInstance({ minDate: "2016-10-10", maxDate: "2016-10-20" });
          const mobileInput = fp.mobileInput as HTMLInputElement;

          fp.set("enableTime", true);
          expect(mobileInput.min).toBe("2016-10-10T00:00:00");
          expect(mobileInput.max).toBe("2016-10-20T00:00:00");

          fp.set("enableTime", false);
          expect(mobileInput.min).toBe("2016-10-10");
          expect(mobileInput.max).toBe("2016-10-20");
        });

        it("raise a min with seconds to a time flatpickr keeps", () => {
          mockAgent = "Android";
          createInstance({
            enableTime: true,
            minDate: new Date(2016, 9, 10, 14, 23, 47),
          });
          const mobileInput = fp.mobileInput as HTMLInputElement;
          expect(mobileInput.min).toBe("2016-10-10T14:24:00");

          // the earliest value the native picker offers is selected
          mobileInput.value = mobileInput.min;
          simulate("change", mobileInput);
          expect(fp.selectedDates).toHaveLength(1);
        });

        it("raise a min with milliseconds with a step of seconds", () => {
          mockAgent = "Android";
          createInstance({
            enableTime: true,
            enableSeconds: true,
            minDate: new Date(2016, 9, 10, 14, 23, 47, 500),
            maxDate: new Date(2016, 9, 20, 18, 45, 30, 500),
          });
          const mobileInput = fp.mobileInput as HTMLInputElement;
          expect(mobileInput.min).toBe("2016-10-10T14:23:48");
          expect(mobileInput.max).toBe("2016-10-20T18:45:30");
        });

        it("keep min on its day with a date input", () => {
          mockAgent = "Android";
          createInstance({ minDate: new Date(2016, 9, 10, 23, 59, 30) });
          expect(fp.mobileInput!.min).toBe("2016-10-10");
        });
      });

      describe("seconds #2908", () => {
        it("get a step of 1 s with enableSeconds", () => {
          mockAgent = "Android";
          createInstance({
            enableTime: true,
            noCalendar: true,
            enableSeconds: true,
            defaultDate: "00:00:00",
          });
          const mobileInput = fp.mobileInput as HTMLInputElement;
          // with a step of whole minutes, "00:00:00" shows as "00:00"
          expect(mobileInput.type).toBe("time");
          expect(mobileInput.step).toBe("1");
          expect(mobileInput.value).toBe("00:00:00");
        });

        it("leave a value with seconds valid with enableSeconds", () => {
          mockAgent = "Android";
          createInstance({ enableTime: true, enableSeconds: true });
          const mobileInput = fp.mobileInput as HTMLInputElement;

          fp.setDate("2016-10-10 14:23:47");
          expect(mobileInput.validity.stepMismatch).toBe(false);
        });

        it("follow set()", () => {
          mockAgent = "Android";
          createInstance({ enableTime: true });
          const mobileInput = fp.mobileInput as HTMLInputElement;
          expect(mobileInput.hasAttribute("step")).toBe(false);

          fp.set("enableSeconds", true);
          expect(mobileInput.step).toBe("1");

          fp.set("enableSeconds", false);
          expect(mobileInput.hasAttribute("step")).toBe(false);
        });

        it("keep the input's own step", () => {
          const el = document.createElement("input");
          el.setAttribute("step", "60");

          mockAgent = "Android";
          createInstance({ enableTime: true, enableSeconds: true }, el);
          const mobileInput = fp.mobileInput as HTMLInputElement;
          expect(mobileInput.step).toBe("60");

          fp.set("enableSeconds", false);
          expect(mobileInput.step).toBe("60");
        });

        it("keep the seconds of min and max with a step of seconds", () => {
          mockAgent = "Android";
          createInstance({
            enableTime: true,
            enableSeconds: true,
            minDate: new Date(2016, 9, 10, 14, 23, 47),
          });
          const mobileInput = fp.mobileInput as HTMLInputElement;
          expect(mobileInput.min).toBe("2016-10-10T14:23:47");

          fp.set("maxDate", new Date(2016, 9, 20, 18, 45, 30));
          expect(mobileInput.max).toBe("2016-10-20T18:45:30");

          fp.set("enableSeconds", false);
          expect(mobileInput.min).toBe("2016-10-10T14:24:00");
          expect(mobileInput.max).toBe("2016-10-20T18:45:00");
        });

        it("cut min and max to the minute by the input's own step", () => {
          const minDate = new Date(2016, 9, 10, 14, 23, 47);
          const el = document.createElement("input");

          el.setAttribute("step", "60");
          mockAgent = "Android";
          createInstance(
            { enableTime: true, enableSeconds: true, minDate },
            el
          );
          expect(fp.mobileInput!.min).toBe("2016-10-10T14:24:00");

          el.setAttribute("step", "1");
          createInstance({ enableTime: true, minDate }, el);
          expect(fp.mobileInput!.min).toBe("2016-10-10T14:23:47");
        });
      });

      describe("a value with seconds #2393", () => {
        const withSeconds = new Date(2016, 9, 10, 14, 23, 47);

        it("is cut to the minute with a step of whole minutes", () => {
          mockAgent = "Android";
          createInstance({ enableTime: true, defaultDate: withSeconds });
          const mobileInput = fp.mobileInput as HTMLInputElement;
          expect(mobileInput.value).toBe("2016-10-10T14:23");
          // without a min, the step counts from the value attribute
          expect(mobileInput.defaultValue).toBe("2016-10-10T14:23:00");
          expect(fp.selectedDates[0]).toEqual(withSeconds);

          fp.setDate(new Date(2016, 9, 12, 9, 5, 30));
          expect(mobileInput.value).toBe("2016-10-12T09:05");
          expect(mobileInput.validity.stepMismatch).toBe(false);
        });

        it("is cut to the minute in a time input", () => {
          mockAgent = "Android";
          createInstance({
            enableTime: true,
            noCalendar: true,
            defaultDate: withSeconds,
          });
          const mobileInput = fp.mobileInput as HTMLInputElement;
          expect(mobileInput.type).toBe("time");
          expect(mobileInput.value).toBe("14:23:00");

          fp.setDate(new Date(2016, 9, 12, 9, 5, 30));
          expect(mobileInput.value).toBe("09:05:00");
          expect(mobileInput.validity.stepMismatch).toBe(false);
        });

        it("lies on the step counted from min", () => {
          mockAgent = "Android";
          createInstance({
            enableTime: true,
            minDate: new Date(2016, 9, 1, 8, 0, 30),
            defaultDate: withSeconds,
          });
          const mobileInput = fp.mobileInput as HTMLInputElement;
          expect(mobileInput.min).toBe("2016-10-01T08:01:00");
          expect(mobileInput.validity.stepMismatch).toBe(false);
        });

        it("keeps its seconds with a step of seconds", () => {
          mockAgent = "Android";
          createInstance({
            enableTime: true,
            noCalendar: true,
            defaultDate: withSeconds,
          });
          const mobileInput = fp.mobileInput as HTMLInputElement;

          fp.set("enableSeconds", true);
          expect(mobileInput.value).toBe("14:23:47");

          fp.set("enableSeconds", false);
          expect(mobileInput.value).toBe("14:23:00");
        });

        it("follows the input's own step", () => {
          const el = document.createElement("input");
          el.setAttribute("step", "1");

          mockAgent = "Android";
          const config = {
            enableTime: true,
            noCalendar: true,
            defaultDate: withSeconds,
          };
          createInstance(config, el);
          expect(fp.mobileInput!.value).toBe("14:23:47");

          el.setAttribute("step", "60");
          createInstance({ ...config, enableSeconds: true }, el);
          expect(fp.mobileInput!.value).toBe("14:23:00");
        });

        it("picked in the native input is put on its step", () => {
          mockAgent = "Android";
          createInstance({ enableTime: true });
          const mobileInput = fp.mobileInput as HTMLInputElement;

          mobileInput.value = "2016-10-10T14:23:47";
          simulate("change", mobileInput);
          expect(mobileInput.value).toBe("2016-10-10T14:23");
          expect(mobileInput.validity.stepMismatch).toBe(false);
        });
      });
    });

    it("selectDate() + onChange() through GUI", () => {
      function verifySelected(date: Date | undefined) {
        expect(date).toBeDefined();
        if (!date) return;
        expect(date.getFullYear()).toEqual(2016);
        expect(date.getMonth()).toEqual(9);
        expect(date.getDate()).toEqual(10);
      }

      createInstance({
        enableTime: true,
        defaultDate: "2016-10-01 3:30",
        onChange: (dates) => {
          if (dates.length) verifySelected(dates[0]);
        },
      });

      fp.open();
      simulate("click", fp.days.childNodes[15], { which: 1 }, MouseEvent); // oct 10

      verifySelected(fp.selectedDates[0]);
    });

    it("year input", () => {
      createInstance();
      fp.currentYearElement.value = "2000";
      simulate("keyup", fp.currentYearElement, KeyboardEvent);

      expect(fp.currentYear).toEqual(2000);
      incrementTime("currentYearElement", 1);

      expect(fp.currentYear).toEqual(2001);
      expect(fp.currentYearElement.value).toEqual("2001");
      expect(
        (fp.days.childNodes[10] as DayElement).dateObj.getFullYear()
      ).toEqual(2001);
    });

    it("time input and increments", () => {
      createInstance({
        enableTime: true,
        defaultDate: "2017-1-1 10:00",
        //minDate: "2017-1-01 3:35",
      });

      expect(fp.hourElement).toBeDefined();
      expect(fp.minuteElement).toBeDefined();
      expect(fp.amPM).toBeDefined();

      if (!fp.hourElement || !fp.minuteElement || !fp.amPM) return;

      expect(fp.hourElement.value).toEqual("10");
      expect(fp.minuteElement.value).toEqual("00");
      expect(fp.amPM.textContent).toEqual("AM");

      incrementTime("hourElement", 1);
      expect(fp.hourElement.value).toEqual("11");

      incrementTime("minuteElement", 1);
      expect(fp.minuteElement.value).toEqual("05");

      simulate("click", fp.amPM, { which: 1 }, MouseEvent);
      expect(fp.amPM.textContent).toEqual("PM");

      simulate("increment", fp.hourElement, {
        delta: 1,
      });

      expect(fp.hourElement.value).toEqual("12");

      fp.hourElement.value = "9";
      simulate("input", fp.hourElement);
      simulate("blur", fp.hourElement);
      expect(fp.hourElement.value).toEqual("09");
    });

    describe("secondIncrement (flatpickr#2912)", () => {
      it("steps the seconds input apart from the minutes", () => {
        createInstance({
          enableTime: true,
          enableSeconds: true,
          secondIncrement: 15,
          defaultDate: "2017-1-1 10:00:30",
        });

        incrementTime("secondElement", 1);
        expect(fp.secondElement!.value).toEqual("45");

        incrementTime("minuteElement", 1);
        expect(fp.minuteElement!.value).toEqual("05");
        expect(fp.secondElement!.value).toEqual("45");

        fp.open();
        simulate("keydown", fp.secondElement!, { keyCode: 40, which: 40 });
        expect(fp.secondElement!.value).toEqual("30");
      });

      it("defaults to minuteIncrement", () => {
        createInstance({
          enableTime: true,
          enableSeconds: true,
          minuteIncrement: 10,
          defaultDate: "2017-1-1 10:00:30",
        });

        incrementTime("secondElement", 1);
        expect(fp.secondElement!.value).toEqual("40");

        fp.set("minuteIncrement", 1);
        incrementTime("secondElement", 1);
        expect(fp.secondElement!.value).toEqual("41");
      });

      it("takes a value given through set()", () => {
        createInstance({
          enableTime: true,
          enableSeconds: true,
          defaultDate: "2017-1-1 10:00:30",
        });
        fp.set("secondIncrement", 1);

        incrementTime("secondElement", -1);
        expect(fp.secondElement!.value).toEqual("29");
      });

      it("applies to seconds added through set()", () => {
        createInstance({
          enableTime: true,
          secondIncrement: 20,
          defaultDate: "2017-1-1 10:00:00",
        });
        fp.set("enableSeconds", true);

        incrementTime("secondElement", 1);
        expect(fp.secondElement!.value).toEqual("20");
      });

      it("takes a data attribute", () => {
        const input = document.createElement("input");
        input.setAttribute("data-second-increment", "15");
        createInstance(
          {
            enableTime: true,
            enableSeconds: true,
            defaultDate: "2017-1-1 10:00:20",
          },
          input
        );

        incrementTime("secondElement", 1);
        expect(fp.secondElement!.value).toEqual("35");
      });
    });

    it("time input respects minDate", () => {
      createInstance({
        enableTime: true,
        dateFormat: "Y-m-d H:i",
        defaultDate: "2017-1-1 4:00",
        minDate: "2017-1-01 3:35",
      });

      expect(!!fp.minDateHasTime).toBe(true);

      const [hourElem, minuteElem] = [
        fp.hourElement as HTMLInputElement,
        fp.minuteElement as HTMLInputElement,
      ];
      incrementTime("hourElement", -1);
      expect(hourElem.value).toEqual("03");
      expect(minuteElem.value).toEqual("35");

      incrementTime("hourElement", -1);
      expect(hourElem.value).toEqual("03"); // unchanged

      incrementTime("minuteElement", -1);
      expect(minuteElem.value).toEqual("35"); // can't go lower than min

      incrementTime("minuteElement", 1);
      expect(minuteElem.value).toEqual("40");

      hourElem.value = "2";
      simulate("input", hourElem);

      simulate("blur", hourElem);

      expect(hourElem.value).toEqual("03");

      minuteElem.value = "00";
      simulate("input", minuteElem);
      simulate("blur", minuteElem);
      expect(minuteElem.value).toEqual("35");
    });

    it("time input respects maxDate", () => {
      createInstance({
        enableTime: true,
        defaultDate: "2017-1-1 3:00",
        maxDate: "2017-1-01 3:35",
      });

      const [hourElem, minuteElem] = [
        fp.hourElement as HTMLInputElement,
        fp.minuteElement as HTMLInputElement,
      ];

      incrementTime("hourElement", -1);
      expect(hourElem.value).toEqual("02"); // ok

      incrementTime("hourElement", 3);
      expect(hourElem.value).toEqual("03");

      incrementTime("minuteElement", 8);
      expect(minuteElem.value).toEqual("35"); // can't go higher than 35
    });

    it("time input respects same-day minDate/maxDate", () => {
      createInstance({
        enableTime: true,
        minDate: "2017-1-01 2:00 PM",
        maxDate: "2017-1-01 3:35 PM",
      });

      const [hourElem, minuteElem] = [
        fp.hourElement as HTMLInputElement,
        fp.minuteElement as HTMLInputElement,
      ];

      fp.setDate("2017-1-1 2:30 PM");

      incrementTime("hourElement", -1);

      simulate(
        "wheel",
        hourElem,
        {
          wheelDelta: -1,
        },
        MouseEvent
      );

      expect(hourElem.value).toEqual("02"); // ok

      incrementTime("hourElement", 4);
      expect(hourElem.value).toEqual("03");

      incrementTime("minuteElement", 8);
      simulate(
        "wheel",
        minuteElem,
        {
          wheelDelta: 1,
        },
        MouseEvent
      );

      expect(minuteElem.value).toEqual("35"); // can't go higher than 35
    });

    it("time picker: implicit selectedDate", () => {
      createInstance({
        enableTime: true,
        noCalendar: true,
      });

      expect(fp.selectedDates.length).toEqual(0);
      fp.open();
      incrementTime("minuteElement", 1);

      expect(fp.selectedDates.length).toEqual(1);
      expect(fp.selectedDates[0].getDate()).toEqual(new Date().getDate());
    });

    it("time picker: minDate", () => {
      createInstance({
        noCalendar: true,
        enableTime: true,
        dateFormat: "H:i",
        minDate: "23:59",
      });

      fp.open();

      simulate("increment", fp.minuteElement as Node, {
        delta: 1,
      });

      expect(fp.input.value.length).toBeGreaterThan(0);
    });

    it("getDefaultHours()", () => {
      const fp = createInstance({
        noCalendar: true,
        enableTime: true,
        dateFormat: "H:i",
        minDate: "02:30",
        defaultHour: 2,
        defaultMinute: 45,
      });
      const values = getDefaultHours(fp.config, new Date());
      expect(values.hours).toEqual(2);
      expect(values.minutes).toEqual(45);
      expect(fp.hourElement!.value).toEqual("02");
      expect(fp.minuteElement!.value).toEqual("45");
    });

    it("getDefaultHours() keeps default seconds below maxDate's", () => {
      const fp = createInstance({
        enableTime: true,
        enableSeconds: true,
        maxDate: new Date(2024, 5, 21, 12, 0, 24),
        defaultHour: 12,
        defaultMinute: 0,
        defaultSeconds: 10,
      });
      const maxDay = new Date(2024, 5, 21);
      expect(getDefaultHours(fp.config, maxDay).seconds).toEqual(10);

      fp.set("defaultSeconds", 30);
      expect(getDefaultHours(fp.config, maxDay).seconds).toEqual(24);
    });

    describe("default time within minDate and maxDate", () => {
      beforeEach(() => {
        jest.setSystemTime(new Date(2023, 5, 1, 9));
      });

      afterEach(() => {
        jest.setSystemTime(jest.getRealSystemTime());
      });

      const expectTime = (hours: string, minutes: string) => {
        expect(fp.hourElement!.value).toEqual(hours);
        expect(fp.minuteElement!.value).toEqual(minutes);
      };

      it("keeps defaultHour and defaultMinute with a date-only maxDate #2894", () => {
        createInstance({
          dateFormat: "Y-m-d H:i",
          enableTime: true,
          defaultHour: 12,
          defaultMinute: 30,
          minDate: "2023-04-21",
          maxDate: "2024-04-21",
          time_24hr: true,
          minuteIncrement: 15,
          inline: true,
        });
        expectTime("12", "30");
      });

      it("keeps the default time on the day of a date-only maxDate", () => {
        createInstance({
          enableTime: true,
          defaultMinute: 30,
          maxDate: "2023-06-01",
        });
        expectTime("12", "30");

        clickOn(
          Array.from(
            fp.days.querySelectorAll<DayElement>(".flatpickr-day")
          ).find((day) => fp.formatDate(day.dateObj, "Y-m-d") === "2023-06-01")!
        );
        expect(fp.selectedDates[0]).toEqual(new Date(2023, 5, 1, 12, 30));

        fp.clear();
        expectTime("12", "30");

        incrementTime("minuteElement", 1);
        expect(fp.selectedDates[0]).toEqual(new Date(2023, 5, 1, 12, 35));
      });

      it("holds the default time within maxDate's time on its own day only", () => {
        createInstance({ enableTime: true, maxDate: "2023-06-01 10:00" });
        expectTime("10", "00");

        createInstance({ enableTime: true, maxDate: "2023-06-02 10:00" });
        expectTime("12", "00");
      });

      it("holds the default time within minDate's time on its own day only", () => {
        createInstance({ enableTime: true, minDate: "2023-06-01 14:00" });
        expectTime("02", "00");

        createInstance({ enableTime: true, minDate: "2023-05-31 14:00" });
        expectTime("12", "00");

        // a later minDate is the day a time picked first goes on
        createInstance({ enableTime: true, minDate: "2023-06-05 14:00" });
        expectTime("02", "00");

        incrementTime("minuteElement", 1);
        expect(fp.selectedDates[0]).toEqual(new Date(2023, 5, 5, 14, 5));
      });

      it("puts a time picked first on an earlier maxDate's day", () => {
        createInstance({ enableTime: true, maxDate: "2023-05-30" });
        expectTime("12", "00");

        incrementTime("minuteElement", 1);
        expect(fp.selectedDates[0]).toEqual(new Date(2023, 4, 30, 12, 5));
      });
    });

    it("time picker: default hours/mins", () => {
      createInstance({
        noCalendar: true,
        enableTime: true,
        dateFormat: "H:i",
        minDate: "02:30",
        defaultHour: 2,
        defaultMinute: 45,
      });

      expect(fp.hourElement!.value).toEqual("02");
      expect(fp.minuteElement!.value).toEqual("45");

      fp.open();
      simulate("increment", fp.hourElement!, {
        delta: 1,
      });
      expect(fp.input.value).toEqual("03:45");

      createInstance({
        enableTime: true,
        minDate: new Date().setHours(2, 30),
        defaultHour: 12,
        defaultMinute: 45,
      });

      simulate("click", fp.todayDateElem as DayElement, { which: 1 });
      expect((fp.latestSelectedDateObj as Date).getHours()).toEqual(12);
      expect((fp.latestSelectedDateObj as Date).getMinutes()).toEqual(45);

      createInstance({
        enableTime: true,
        minDate: new Date().setHours(6, 30),
        defaultHour: 3,
        defaultMinute: 0,
      });

      simulate("click", fp.todayDateElem as DayElement, { which: 1 });
      expect((fp.latestSelectedDateObj as Date).getHours()).toEqual(6);
      expect((fp.latestSelectedDateObj as Date).getMinutes()).toEqual(30);
    });

    it("time picker: minDate + bounds", () => {
      createInstance({
        noCalendar: true,
        enableTime: true,
        dateFormat: "H:i",
        minDate: "02:30",
        defaultDate: "3:30",
      });

      fp.open();

      incrementTime("hourElement", -1);
      expect(fp.input.value).toEqual("02:30");

      incrementTime("hourElement", -1);
      expect(fp.input.value).toEqual("02:30");
    });

    it("time picker: minTime/maxTime reversed", () => {
      createInstance({
        enableTime: true,
        minTime: "05:30",
        maxTime: "03:30",
        defaultDate: "2021-07-01 1:29",
      });

      fp.open();

      expect(fp.input.value).toEqual("2021-07-01 01:29");

      incrementTime("hourElement", +1);
      expect(fp.input.value).toEqual("2021-07-01 02:29");

      incrementTime("hourElement", +1);
      expect(fp.input.value).toEqual("2021-07-01 03:29");

      incrementTime("hourElement", +1);
      expect(fp.input.value).toEqual("2021-07-01 05:30");

      incrementTime("hourElement", +1);
      expect(fp.input.value).toEqual("2021-07-01 06:30");

      incrementTime("hourElement", -1);
      incrementTime("hourElement", -1);
      incrementTime("hourElement", -1);
      expect(fp.input.value).toEqual("2021-07-01 05:30");
    });

    it("time picker: minTime/maxTime seconds only bound their own hour", () => {
      createInstance({
        enableTime: true,
        enableSeconds: true,
        time_24hr: true,
        minTime: "12:00:12",
        maxTime: "18:00:24",
        defaultDate: "2024-06-18 13:00:11",
      });

      fp.open();

      incrementTime("secondElement", -1);
      expect(fp.input.value).toEqual("2024-06-18 13:00:06");

      fp.setDate("2024-06-18 17:00:43");
      incrementTime("secondElement", 1);
      expect(fp.input.value).toEqual("2024-06-18 17:00:48");

      fp.setDate("2024-06-18 12:00:12");
      incrementTime("secondElement", -1);
      expect(fp.input.value).toEqual("2024-06-18 12:00:12");

      fp.setDate("2024-06-18 18:00:24");
      incrementTime("secondElement", 1);
      expect(fp.input.value).toEqual("2024-06-18 18:00:24");
    });

    it("time picker: minDate/maxDate seconds only bound their own hour", () => {
      createInstance({
        enableTime: true,
        enableSeconds: true,
        time_24hr: true,
        minDate: "2024-06-18 12:00:12",
        maxDate: "2024-06-21 12:00:24",
        defaultDate: "2024-06-18 13:00:11",
      });

      fp.open();

      incrementTime("secondElement", -1);
      expect(fp.input.value).toEqual("2024-06-18 13:00:06");

      fp.setDate("2024-06-21 07:00:43");
      incrementTime("secondElement", 1);
      expect(fp.input.value).toEqual("2024-06-21 07:00:48");
    });

    it("time picker: minDate/maxDate + preloading", () => {
      createInstance({
        enableTime: true,
        noCalendar: true,
        dateFormat: "H:i",
        minDate: "02:30",
        defaultDate: "3:30",
        defaultHour: 9,
      });

      const [hours, minutes, amPM] = [
        fp.hourElement as HTMLInputElement,
        fp.minuteElement as HTMLInputElement,
        fp.amPM as HTMLSpanElement,
      ];

      expect(hours.value).toBe("03");
      expect(minutes.value).toBe("30");
      expect(amPM.textContent).toBe("AM");

      incrementTime("hourElement", -1);
      expect(hours.value).toBe("02");

      fp.set("maxDate", "04:30");
      incrementTime("hourElement", 3);
      expect(hours.value).toBe("04");

      simulate("click", amPM, { which: 1 }, MouseEvent);
      expect(amPM.textContent).toBe("AM");

      fp.clear();

      fp.setDate("03:30");
      expect(hours.value).toBe("03");

      fp.setDate("05:30");
      // date exceeds maxDate - value is reset to maxDate's
      expect(hours.value).toBe("04");

      fp.setDate("00:30");
      // date lower than minDate - value is reset to defaultHour
      // since defaultHour > maxDate, value is reset to maxDate
      expect(hours.value).toBe("04");
    });

    it("should delay time input validation on keydown", () => {
      createInstance({
        enableTime: true,
        defaultDate: new Date().setHours(17, 30, 0, 0),
        minDate: new Date().setHours(16, 30, 0, 0),
        time_24hr: true,
      });

      const hours = fp.hourElement as HTMLInputElement;

      hours.value = "16";
      simulate("input", hours, {}, KeyboardEvent);

      jest.runAllTimers();
      expect(hours.value).toEqual("16");

      hours.value = "1";

      simulate("input", hours);
      expect(hours.value).toEqual("1");
      simulate("blur", hours);
      expect(hours.value).toEqual("16");
    });

    it("should have working strap mode", () => {
      let wrapper = document.createElement("div");
      const input = document.createElement("input");
      input.setAttribute("data-input", "");

      wrapper.appendChild(input);

      ["open", "close", "toggle", "clear"].forEach((type) => {
        let e = document.createElement("button");
        e.setAttribute(`data-${type}`, "");
        wrapper.appendChild(e);
      });

      const instance = createInstance(
        {
          wrap: true,
        },
        wrapper
      );

      expect(instance.input).toEqual(input);

      simulate("click", wrapper.childNodes[1], { which: 1 }, MouseEvent); // open
      expect(instance.isOpen).toEqual(true);

      simulate("click", wrapper.childNodes[2], { which: 1 }, MouseEvent); // close
      expect(instance.isOpen).toEqual(false);

      simulate("click", wrapper.childNodes[3], { which: 1 }, MouseEvent); // toggle
      expect(instance.isOpen).toEqual(true);
      simulate("click", wrapper.childNodes[3], { which: 1 }, MouseEvent);
      expect(instance.isOpen).toEqual(false);

      instance.setDate(new Date());
      expect(instance.selectedDates.length).toEqual(1);

      expect(instance.selectedDateElem).toBeDefined();
      instance.selectedDateElem &&
        expect(
          parseInt(instance.selectedDateElem.textContent as string)
        ).toEqual(new Date().getDate());

      simulate("click", wrapper.childNodes[4], { which: 1 }, MouseEvent); // clear
      expect(instance.selectedDates.length).toEqual(0);
      expect(instance.input.value).toEqual("");

      instance.destroy();
      wrapper.parentNode && wrapper.parentNode.removeChild(wrapper);
    });

    it("Time picker initial entry", () => {
      const fp = createInstance({
        enableTime: true,
        noCalendar: true,
        dateFormat: "H:i",
        time_24hr: true,
      });
      fp._input.click();
      fp.hourElement!.value = "16";

      simulate(
        "keydown",
        fp.hourElement!,
        {
          keyCode: 13, // "Enter"
        },
        KeyboardEvent
      );

      expect(fp.hourElement!.value).toEqual("16");
    });

    it("valid mouseover behavior in range mode", () => {
      createInstance({
        mode: "range",
      });

      const day = (i: number) => fp.days.childNodes[i] as DayElement;

      simulate("mouseover", fp.days.childNodes[15]);
      expect(fp.selectedDates.length).toEqual(0);

      fp.setDate(["2016-1-17"]);
      expect(fp.selectedDates.length).toEqual(1);

      simulate("mouseover", fp.days.childNodes[32]);
      expect(day(21).classList.contains("startRange")).toEqual(true);

      for (let i = 0; i < 42; i++)
        expect(day(i).classList.contains("inRange")).toEqual(i > 21 && i < 32);

      expect(day(32).classList.contains("endRange")).toEqual(true);

      fp.clear();
      fp.set("disable", ["2016-1-12", "2016-1-20"]);
      fp.setDate(["2016-1-17"]);

      simulate("mouseover", day(32));
      expect(day(32).classList.contains("endRange")).toEqual(false);
      expect(day(24).classList.contains("flatpickr-disabled")).toEqual(true);
      expect(day(25).classList.contains("notAllowed")).toEqual(true);

      for (let i = 25; i < 32; i++)
        expect(day(i).classList.contains("inRange")).toEqual(false);

      for (let i = 17; i < 22; i++) {
        expect(day(i).classList.contains("notAllowed")).toEqual(false);
        expect(day(i).classList.contains("flatpickr-disabled")).toEqual(false);
      }

      simulate("click", fp.days.childNodes[17], { which: 1 }, MouseEvent);
      expect(fp.selectedDates.length).toEqual(2);
      expect(fp.input.value).toEqual("2016-01-13 to 2016-01-17");
    });

    describe("a day past a disabled one, picked without a hover (flatpickr#2974)", () => {
      const dayElem = (date: string) =>
        Array.from(
          fp.daysContainer!.querySelectorAll<DayElement>(".flatpickr-day")
        ).find(
          (day) =>
            !day.classList.contains("hidden") &&
            fp.formatDate(day.dateObj, "Y-m-d") === date
        )!;

      const pick = (date: string) => clickOn(dayElem(date));
      const hover = (date: string) => simulate("mouseover", dayElem(date));
      const enter = (date: string) =>
        simulate("keydown", dayElem(date), { keyCode: 13 }); // "Enter"

      const selected = () =>
        fp.selectedDates.map((date) => fp.formatDate(date, "Y-m-d"));

      function open(config: Options) {
        createInstance({ disable: ["2025-07-15"], ...config });
        fp.jumpToDate("2025-07-01");
        fp.open();
      }

      it("doesn't end a range across it", () => {
        const onChange = jest.fn();
        open({ mode: "range", onChange });

        pick("2025-07-10");
        onChange.mockClear();
        pick("2025-07-20");

        expect(selected()).toEqual(["2025-07-10"]);
        expect(onChange).not.toHaveBeenCalled();
        expect(dayElem("2025-07-20").classList.contains("notAllowed")).toBe(
          true
        );
      });

      it.each([
        [
          "an end before the start, across it",
          () => (pick("2025-07-20"), pick("2025-07-10")),
          ["2025-07-20"],
        ],
        [
          "an end before it",
          () => (pick("2025-07-10"), pick("2025-07-14")),
          ["2025-07-10", "2025-07-14"],
        ],
        [
          "an end across it, hovered first",
          () => (pick("2025-07-10"), hover("2025-07-20"), pick("2025-07-20")),
          ["2025-07-10"],
        ],
      ])("keeps the outcome of %s", (_, act, expected) => {
        open({ mode: "range" });
        act();
        expect(selected()).toEqual(expected);
      });

      it.each([
        [
          "a click in single mode",
          { defaultDate: "2025-07-10" },
          () => pick("2025-07-20"),
          ["2025-07-20"],
        ],
        [
          "Enter in single mode",
          { defaultDate: "2025-07-10" },
          () => enter("2025-07-20"),
          ["2025-07-20"],
        ],
        [
          "a click in multiple mode",
          { mode: "multiple" },
          () => (pick("2025-07-10"), pick("2025-07-20")),
          ["2025-07-10", "2025-07-20"],
        ],
      ] as [string, Options, () => void, string[]][])(
        "still picks it with %s",
        (_, config, act, expected) => {
          open(config);
          act();
          expect(selected()).toEqual(expected);
        }
      );
    });

    it("adds disabled class to disabled prev/next month arrows", () => {
      const isArrowDisabled = (which: "prevMonthNav" | "nextMonthNav") =>
        fp[which].classList.contains("flatpickr-disabled");
      createInstance({
        minDate: "2099-1-1",
        maxDate: "2099-3-4",
        inline: true,
      });

      expect(fp.currentMonth).toBe(0);
      expect(isArrowDisabled("prevMonthNav")).toBe(true);
      expect(isArrowDisabled("nextMonthNav")).toBe(false);

      simulate("click", fp.nextMonthNav, { which: 1 }, MouseEvent);

      expect(fp.currentMonth).toBe(1);
      expect(isArrowDisabled("prevMonthNav")).toBe(false);
      expect(isArrowDisabled("nextMonthNav")).toBe(false);

      simulate("click", fp.nextMonthNav, { which: 1 }, MouseEvent);

      expect(fp.currentMonth).toBe(2);
      expect(isArrowDisabled("prevMonthNav")).toBe(false);
      expect(isArrowDisabled("nextMonthNav")).toBe(true);
    });

    it("idempotent on focus in and out", () => {
      createInstance({
        allowInput: true,
      });

      fp._input.focus();
      clickOn(document.body);
      expect(fp._input.value).toEqual("");
    });

    it("time-picker focuses out onto input", () => {
      createInstance({ mode: "time" });
      fp.open();

      expect(fp.hourElement).toBeDefined();
      expect(fp.minuteElement).toBeDefined();
      expect(fp.amPM).toBeDefined();

      if (!fp.hourElement || !fp.minuteElement || !fp.amPM) return;

      fp.minuteElement.focus();
      expect(document.activeElement).toStrictEqual(fp.minuteElement);

      simulate(
        "keydown",
        fp.minuteElement,
        {
          keyCode: 9, // Tab
        },
        KeyboardEvent
      );
      expect(document.activeElement).toStrictEqual(fp.amPM);

      simulate(
        "keydown",
        fp.amPM,
        {
          keyCode: 9, // Tab
          shiftKey: true,
        },
        KeyboardEvent
      );
      expect(document.activeElement).toStrictEqual(fp.minuteElement);

      simulate(
        "keydown",
        fp.amPM,
        {
          keyCode: 9, // Tab
        },
        KeyboardEvent
      );
      expect(document.activeElement).toStrictEqual(fp._input);
    });

    it("dropdown should correctly load months with minDate", () => {
      const fp = createInstance({
        defaultDate: new Date(2019, 5, 11),
        minDate: new Date(2019, 4, 11),
      }) as Instance;

      const monthsDropdown = fp.calendarContainer.querySelector(
        ".flatpickr-monthDropdown-months"
      );

      expect(monthsDropdown).toBeTruthy();
      if (!monthsDropdown) return;

      const months = monthsDropdown.querySelectorAll(
        ".flatpickr-monthDropdown-month"
      );

      expect(months.length).toEqual(8);
      if (months.length != 8) return;

      expect(months[0].innerHTML).toEqual("May");
      expect(months[7].innerHTML).toEqual("December");
    });

    it("dropdown follows the year the view moves to", () => {
      createInstance({
        allowInput: true,
        defaultDate: new Date(2019, 5, 11),
        minDate: new Date(2019, 4, 11),
      });

      const monthCount = () =>
        fp.calendarContainer.querySelectorAll(".flatpickr-monthDropdown-month")
          .length;

      fp.setDate(new Date(2020, 2, 1), true);
      expect(monthCount()).toEqual(12);

      fp.changeYear(2019);
      expect(monthCount()).toEqual(8);

      fp.changeYear(2021);
      fp._input.focus();
      fp._input.value = "2019-06-11";
      simulate("keydown", fp._input, { keyCode: 13 });
      expect(fp.currentYear).toEqual(2019);
      expect(monthCount()).toEqual(8);
    });

    it("dropdown should correctly load months with maxDate", () => {
      const fp = createInstance({
        defaultDate: new Date(2019, 4, 11),
        maxDate: new Date(2019, 8, 11),
      }) as Instance;

      const monthsDropdown = fp.calendarContainer.querySelector(
        ".flatpickr-monthDropdown-months"
      );

      expect(monthsDropdown).toBeTruthy();
      if (!monthsDropdown) return;

      const months = monthsDropdown.querySelectorAll(
        ".flatpickr-monthDropdown-month"
      );

      expect(months.length).toEqual(9);
      if (months.length != 9) return;

      expect(months[0].innerHTML).toEqual("January");
      expect(months[months.length - 1].innerHTML).toEqual("September");
    });

    it("dropdown should change month", () => {
      const fp = createInstance({
        defaultDate: new Date(2019, 1, 1),
      }) as Instance;

      const monthsDropdown = fp.calendarContainer.querySelector(
        ".flatpickr-monthDropdown-months"
      ) as HTMLSelectElement;

      monthsDropdown.value = "3";

      var evt = document.createEvent("HTMLEvents");
      evt.initEvent("change", false, true);
      monthsDropdown.dispatchEvent(evt);

      expect(fp.currentMonth).toEqual(3);
    });
  });

  describe("Localization", () => {
    it.each(["M", "F"])(
      "parses numeric month names with the %s token",
      (token) => {
        createInstance({
          locale: {
            months: {
              shorthand: [
                "1",
                "2",
                "3",
                "4",
                "5",
                "6",
                "7",
                "8",
                "9",
                "10",
                "11",
                "12",
              ],
              longhand: [
                "1",
                "2",
                "3",
                "4",
                "5",
                "6",
                "7",
                "8",
                "9",
                "10",
                "11",
                "12",
              ],
            },
          },
        });

        for (let month = 0; month < 12; month++) {
          const date = new Date(2025, month, 24);
          for (const format of [
            `Y-${token}-d`,
            `d-${token}-Y`,
            `Y-d-${token}`,
          ]) {
            const formatted = fp.formatDate(date, format);
            expect(fp.parseDate(formatted, format)).toEqual(date);
          }
          expect(fp.formatDate(date, token)).toEqual(String(month + 1));
        }
      }
    );

    it("By locale config option", () => {
      createInstance({
        locale: Russian,
      });

      expect(fp.l10n.months.longhand[0]).toEqual("Январь");

      createInstance();
      expect(fp.l10n.months.longhand[0]).toEqual("January");
    });

    it("By locale key of a loaded locale file (flatpickr#2848)", () => {
      expect(flatpickr.l10ns.ga).toBe(Irish);
      expect(flatpickr.l10ns.hr).not.toBe(Irish);

      createInstance({ locale: "ga" });
      expect(fp.l10n.months.longhand[0]).toEqual("Eanáir");
    });

    it("By ISO code vi for Vietnamese (flatpickr#2867)", () => {
      expect(flatpickr.l10ns.vi).toBe(Vietnamese);
      expect(flatpickr.l10ns.vn).toBe(Vietnamese);

      createInstance({ locale: "vi" });
      expect(fp.l10n.months.longhand[0]).toEqual("Tháng một");
    });

    it("By ISO code el for Greek (flatpickr#2796)", () => {
      expect(flatpickr.l10ns.el).toBe(Greek);
      expect(flatpickr.l10ns.gr).toBe(Greek);

      createInstance({ locale: "el" });
      expect(fp.l10n.months.longhand[0]).toEqual("Ιανουάριος");
    });

    it("By ISO code nb for Norwegian Bokmål (flatpickr#2904)", () => {
      expect(flatpickr.l10ns.nb).toBe(Norwegian);
      expect(flatpickr.l10ns.no).toBe(Norwegian);

      createInstance({ locale: "nb" });
      expect(fp.l10n.weekdays.longhand[2]).toEqual("Tirsdag");
    });

    it("By language code tk for Turkmen (flatpickr#2664)", () => {
      expect(flatpickr.l10ns.tk).toBe(Turkmen);

      createInstance({ locale: "tk" });
      expect(fp.l10n.months.longhand[0]).toEqual("Ýanwar");

      const ordinals = [1, 6, 9, 10, 20, 26, 30, 31].map((day) =>
        fp.formatDate(new Date(2025, 0, day), "J")
      );
      expect(ordinals).toEqual([
        "1-nji",
        "6-njy",
        "9-njy",
        "10-njy",
        "20-nji",
        "26-njy",
        "30-njy",
        "31-nji",
      ]);
    });

    it("By language code eu for Basque (flatpickr#2706)", () => {
      expect(flatpickr.l10ns.eu).toBe(Basque);

      createInstance({ locale: "eu" });
      expect(fp.l10n.months.longhand[0]).toEqual("Urtarrila");
      // Euskaltzaindia's abbreviation for Asteartea is "ar.", not "as."
      expect(fp.formatDate(new Date(2025, 0, 7), "D")).toEqual("ar.");
    });

    it("abbreviates Kurdish (Sorani) weekdays (flatpickr#2895)", () => {
      createInstance({ locale: Kurdish });

      const weekdays = Array.from(
        fp.weekdayContainer.querySelectorAll(".flatpickr-weekday"),
        (weekday) => (weekday.textContent || "").trim()
      );
      expect(weekdays).toEqual([
        "شەممە",
        "یەک",
        "دوو",
        "سێ",
        "چوار",
        "پێنج",
        "هەینی",
      ]);

      // Sunday, 2 February 2025, through Saturday
      for (let day = 2; day <= 8; day++) {
        const date = new Date(2025, 1, day);
        const formatted = fp.formatDate(date, "D j F Y");
        expect(formatted.split(" ")[0]).toEqual(weekdays[(day - 1) % 7]);
        expect(fp.parseDate(formatted, "D j F Y")).toEqual(date);
      }
    });

    it("By overriding default locale", () => {
      flatpickr.localize(Russian);
      expect(flatpickr.l10ns.default.months.longhand[0]).toEqual("Январь");

      createInstance();
      expect(fp.l10n.months.longhand[0]).toEqual("Январь");
    });

    it("correctly formats altInput", () => {
      createInstance({
        locale: Russian,
        altInput: true,
        altFormat: "F",
        dateFormat: "Z",
        defaultDate: "2016-12-27T16:16:22.585Z",
      });

      const altInput = fp.altInput as HTMLInputElement;
      expect(altInput.value).toEqual("Декабрь");

      fp.destroy();

      createInstance({
        locale: "en",
        altInput: true,
        altFormat: "F",
        defaultDate: "2016-12-27T16:16:22.585Z",
      });
      expect((fp.altInput as HTMLInputElement).value).toEqual("December");
    });
  });

  describe("keyboard navigation", () => {
    const dayElem = (date: string) =>
      Array.from(
        fp.daysContainer!.querySelectorAll<DayElement>(".flatpickr-day")
      ).find(
        (day) =>
          !day.classList.contains("hidden") &&
          fp.formatDate(day.dateObj, "Y-m-d") === date
      )!;

    const focusedDate = () => {
      const active = document.activeElement as DayElement;
      return active.dateObj && fp.formatDate(active.dateObj, "Y-m-d");
    };

    const press = (
      keyCode: number,
      target: Node = document.activeElement!,
      options: object = {}
    ) => simulate("keydown", target, { keyCode, ...options });

    const startOn = (config: Options, date: string) => {
      createInstance(config);
      fp.open();
      dayElem(date).focus();
    };

    // from flatpickr/flatpickr#3140
    it.each([
      [39, "2026-01-15", "2026-01-16"],
      [37, "2026-01-15", "2026-01-14"],
      [38, "2026-01-15", "2026-01-08"],
      [40, "2026-01-15", "2026-01-22"],
      [37, "2026-01-01", "2025-12-31"],
      [39, "2025-12-31", "2026-01-01"],
    ])(
      "navigates across years with multiple months (%s, %s)",
      (keyCode, from, to) => {
        startOn(
          { mode: "range", showMonths: 2, defaultDate: "2025-12-01" },
          from
        );
        press(keyCode);
        expect(focusedDate()).toBe(to);
      }
    );

    it("keeps the view when crossing a year inside it", () => {
      startOn({ showMonths: 2, defaultDate: "2025-12-01" }, "2026-01-01");
      press(37);

      expect(focusedDate()).toBe("2025-12-31");
      expect([fp.currentYear, fp.currentMonth]).toEqual([2025, 11]);

      press(39);

      expect(focusedDate()).toBe("2026-01-01");
      expect([fp.currentYear, fp.currentMonth]).toEqual([2025, 11]);
    });

    it("moves down to the same weekday of the next month", () => {
      // weeks start on Sunday, so the last row is Aug 30 - Sep 5
      startOn(
        { defaultDate: "2026-08-15", locale: { firstDayOfWeek: 0 } },
        "2026-08-30"
      );
      press(40);

      expect(focusedDate()).toBe("2026-09-06");
      expect(fp.currentMonth).toBe(8);
    });

    it("skips disabled dates", () => {
      startOn(
        {
          defaultDate: "2026-01-15",
          disable: ["2026-01-16", "2026-01-17", "2026-01-22"],
        },
        "2026-01-15"
      );

      press(39);
      expect(focusedDate()).toBe("2026-01-18");

      dayElem("2026-01-15").focus();
      press(40);
      expect(focusedDate()).toBe("2026-01-23");
    });

    it("stays on minDate", () => {
      startOn(
        { minDate: "2026-01-10", defaultDate: "2026-01-10" },
        "2026-01-10"
      );
      press(37);

      expect(focusedDate()).toBe("2026-01-10");
    });

    it("shifts multiple months just enough to show the target", () => {
      startOn({ showMonths: 2, defaultDate: "2025-12-01" }, "2026-01-31");
      press(39);

      expect(focusedDate()).toBe("2026-02-01");
      expect([fp.currentYear, fp.currentMonth]).toEqual([2026, 0]);

      startOn({ showMonths: 2, defaultDate: "2025-12-01" }, "2025-12-01");
      press(37);

      expect(focusedDate()).toBe("2025-11-30");
      expect([fp.currentYear, fp.currentMonth]).toEqual([2025, 10]);
    });

    it("focuses a visible day of the next month without changing it", () => {
      startOn({ defaultDate: "2026-01-15" }, "2026-01-31");
      press(39);

      expect(focusedDate()).toBe("2026-02-01");
      expect(fp.currentMonth).toBe(0);
    });

    it("fires onMonthChange once, after the new days are built", () => {
      const monthsShown: number[] = [];
      startOn(
        {
          defaultDate: "2026-01-15",
          enable: ["2026-01-15", "2026-05-20"],
          onMonthChange: (_, __, instance) =>
            monthsShown.push(
              instance.days
                .querySelector<DayElement>(".flatpickr-day:not(.prevMonthDay)")!
                .dateObj.getMonth()
            ),
        },
        "2026-01-15"
      );
      press(39);

      expect(focusedDate()).toBe("2026-05-20");
      expect(monthsShown).toEqual([4]);
    });

    describe("without an enabled day in view (#3064)", () => {
      it("reaches the enabled days months apart", () => {
        createInstance({ enable: ["2026-03-30", "2026-05-21"] });
        fp.jumpToDate("2026-01-01");
        fp.open();

        press(40, fp._input);
        expect(focusedDate()).toBe("2026-03-30");
        expect(fp.currentMonth).toBe(2);

        press(39);
        expect(focusedDate()).toBe("2026-05-21");
        expect(fp.currentMonth).toBe(4);

        press(39);
        expect(focusedDate()).toBe("2026-05-21");
      });

      // timers are faked in this file, so count date checks instead of time:
      // each search looks at most ten years ahead
      it("keeps the focus in the calendar when every date is disabled", () => {
        let checks = 0;
        createInstance({ disable: [() => (checks++, true)] });
        fp.open();

        checks = 0;
        press(40, fp._input);
        expect(document.activeElement).toBe(fp.daysContainer);

        press(39);
        expect(document.activeElement).toBe(fp.daysContainer);
        expect(checks).toBeLessThan(2 * 4000);
      });

      it("gives up within ten years when maxDate is further away", () => {
        let checks = 0;
        createInstance({
          disable: [() => (checks++, true)],
          maxDate: "9999-12-31",
        });
        fp.open();

        checks = 0;
        press(40, fp._input);

        expect(document.activeElement).toBe(fp.daysContainer);
        expect(checks).toBeLessThan(4000);
      });

      describe("after paging into a month without enabled days", () => {
        beforeEach(() => {
          startOn(
            {
              defaultDate: "2026-01-15",
              enable: ["2026-01-15", "2026-03-20"],
            },
            "2026-01-15"
          );
          press(39, document.activeElement!, { ctrlKey: true });
        });

        it("keeps the focus on the days", () => {
          expect(fp.currentMonth).toBe(1);
          expect(document.activeElement).toBe(fp.daysContainer);
        });

        it("goes on with left/right", () => {
          press(39);
          expect(focusedDate()).toBe("2026-03-20");
          expect(fp.currentMonth).toBe(2);
        });

        it("goes on with up/down", () => {
          press(40);
          expect(focusedDate()).toBe("2026-03-20");
        });

        it("goes on paging with ctrl+up/down", () => {
          press(40, document.activeElement!, { ctrlKey: true });
          expect(fp.currentYear).toBe(2025);
        });
      });

      it("goes on from the days with allowInput", () => {
        startOn(
          {
            allowInput: true,
            defaultDate: "2026-01-15",
            enable: ["2026-01-15", "2026-03-20"],
          },
          "2026-01-15"
        );
        press(39, document.activeElement!, { ctrlKey: true });
        expect(document.activeElement).toBe(fp.daysContainer);

        press(39);
        expect(focusedDate()).toBe("2026-03-20");
      });
    });

    it("starts from the selected date", () => {
      createInstance({ defaultDate: "2026-01-15" });
      fp.open();

      press(40, fp._input);
      expect(focusedDate()).toBe("2026-01-15");
    });

    it("does nothing without a calendar", () => {
      const consoleError = jest.spyOn(console, "error").mockImplementation();
      createInstance({ noCalendar: true, enableTime: true });
      fp.open();

      press(40, fp._input);

      expect(consoleError).not.toHaveBeenCalled();
      consoleError.mockRestore();
    });
  });

  describe("events + hooks", () => {
    describe("onOpen", () => {
      it("should fire only once", () => {
        let timesFired = 0;

        const fp = createInstance({
          onOpen: () => timesFired++,
        });

        fp.open();
        expect(timesFired).toEqual(1);
      });
    });
    describe("onBlur", () => {
      it("doesn't misfire", () => {
        let timesFired = 0;
        const fp = createInstance({
          allowInput: true,
          onChange: () => timesFired++,
        });
        fp._input.focus();
        simulate("blur", fp._input);
        expect(timesFired).toEqual(0);
      });
    });

    describe("the instance on its element (flatpickr#2977)", () => {
      it("is there in the hooks init fires", () => {
        const el = document.createElement("input");
        const seen: (Instance | undefined)[] = [];
        const record = () => {
          seen.push(el._flatpickr);
        };
        createInstance({ onDayCreate: record, onReady: record }, el);

        expect(seen.length).toBeGreaterThan(1);
        seen.forEach((instance) => expect(instance).toBe(fp));
      });

      it("is the new one when the element is set up again", () => {
        const el = document.createElement("input");
        const seen: (Instance | undefined)[] = [];
        const record = () => {
          seen.push(el._flatpickr);
        };
        const first = flatpickr(el, {
          onReady: record,
          onDestroy: record,
        }) as Instance;
        const second = flatpickr(el, { onReady: record }) as Instance;

        expect(seen.length).toBe(3);
        expect(seen[0]).toBe(first);
        expect(seen[1]).toBe(first);
        expect(seen[2]).toBe(second);
        expect(el._flatpickr).toBe(second);
        second.destroy();
      });

      it("is each element's own with several elements", () => {
        const els = [
          document.createElement("input"),
          document.createElement("input"),
        ];
        const seen: boolean[] = [];
        const instances = flatpickr(els, {
          onReady: (_, __, instance) => {
            seen.push(instance.element._flatpickr === instance);
          },
        });

        expect(seen).toEqual([true, true]);
        expect(els[0]._flatpickr).toBe(instances[0]);
        expect(els[1]._flatpickr).toBe(instances[1]);
        instances.forEach((instance) => instance.destroy());
      });

      it("isn't left there when init throws", () => {
        const consoleError = jest.spyOn(console, "error").mockImplementation();
        const el = document.createElement("input");
        const instances = flatpickr(el, {
          plugins: [
            () => {
              throw new Error("plugin");
            },
          ],
        });

        expect(instances).toEqual([]);
        expect(el._flatpickr).toBeUndefined();
        expect(consoleError).toHaveBeenCalledTimes(1);
        consoleError.mockRestore();
      });
    });

    describe("onDaysBuilt", () => {
      it("fires after setDate moves to another year", () => {
        const years: number[] = [];
        const fp = createInstance({
          defaultDate: new Date(2024, 0, 1),
          onDaysBuilt: (_, __, instance) => years.push(instance.currentYear),
        });

        years.length = 0;
        fp.setDate(new Date(2030, 0, 1));

        expect(years.length).toBeGreaterThan(0);
        expect(years[years.length - 1]).toEqual(2030);
      });

      it("fires when changeMonth crosses a year", () => {
        const views: [number, number][] = [];
        const fp = createInstance({
          defaultDate: new Date(2024, 11, 15),
          onDaysBuilt: (_, __, instance) =>
            views.push([instance.currentYear, instance.currentMonth]),
        });

        views.length = 0;
        fp.changeMonth(1);

        expect(views).toEqual([[2025, 0]]);
      });

      it("fires on clear with no selected dates", () => {
        const selectedCounts: number[] = [];
        const fp = createInstance({
          defaultDate: new Date(2024, 0, 1),
          onDaysBuilt: (dates) => selectedCounts.push(dates.length),
        });

        selectedCounts.length = 0;
        fp.clear();

        expect(selectedCounts.length).toBeGreaterThan(0);
        expect(selectedCounts[selectedCounts.length - 1]).toEqual(0);
      });

      it("fires on set()", () => {
        let timesFired = 0;
        const fp = createInstance({ onDaysBuilt: () => timesFired++ });

        timesFired = 0;
        fp.set("maxDate", new Date(2030, 0, 1));

        expect(timesFired).toBeGreaterThan(0);
      });

      it("fires when config.minDate is assigned directly", () => {
        let timesFired = 0;
        const fp = createInstance({ onDaysBuilt: () => timesFired++ });

        timesFired = 0;
        fp.config.minDate = new Date(2020, 0, 1);

        expect(timesFired).toBeGreaterThan(0);
      });

      it("doesn't fire without a calendar", () => {
        let timesFired = 0;
        const fp = createInstance({
          noCalendar: true,
          enableTime: true,
          onDaysBuilt: () => timesFired++,
        });

        fp.setDate("12:00");

        expect(timesFired).toEqual(0);
      });

      it("can be registered by a plugin", () => {
        let timesFired = 0;
        const fp = createInstance({
          plugins: [() => ({ onDaysBuilt: () => timesFired++ })],
        });

        timesFired = 0;
        fp.changeMonth(1);

        expect(timesFired).toEqual(1);
      });

      it("leaves the other hooks untouched", () => {
        const hookLog = (onDaysBuilt?: () => void) => {
          const log: string[] = [];
          const record = (name: string) => () => {
            log.push(name);
          };
          const fp = createInstance({
            defaultDate: new Date(2024, 11, 15),
            onChange: record("onChange"),
            onMonthChange: record("onMonthChange"),
            onYearChange: record("onYearChange"),
            onValueUpdate: record("onValueUpdate"),
            onDayCreate: record("onDayCreate"),
            ...(onDaysBuilt && { onDaysBuilt }),
          });

          fp.setDate(new Date(2030, 0, 1), true);
          fp.changeMonth(1);
          fp.clear();
          fp.set("maxDate", new Date(2031, 0, 1));
          return log;
        };

        expect(hookLog(() => undefined)).toEqual(hookLog());
      });
    });
  });

  describe("positioning", () => {
    // jsdom has no layout, so the geometry positionCalendar reads is stubbed
    const stubbed: Array<[object, string]> = [];

    function stub(target: object, prop: string, value: unknown) {
      Object.defineProperty(target, prop, { value, configurable: true });
      stubbed.push([target, prop]);
    }

    function stubRect(el: Element, top: number, left: number, width = 0) {
      stub(el, "getBoundingClientRect", () => ({
        top,
        left,
        width,
        right: left + width,
        bottom: top + 30,
        height: 30,
      }));
    }

    function position(config: Options = {}) {
      const fp = createInstance(config);
      stubRect(fp._positionElement, 100, 50, 100);
      stub(fp._positionElement, "offsetHeight", 30);
      stub(fp.calendarContainer, "offsetWidth", 300);
      return fp;
    }

    // the calendar's height is the sum of its children's
    function stubHeights(fp: Instance, viewport: number, calendar: number) {
      stub(window, "innerHeight", viewport);
      stub(fp.calendarContainer.children[0], "offsetHeight", calendar);
    }

    beforeEach(() => {
      stub(window, "pageXOffset", 0);
      stub(window, "pageYOffset", 200);
      stub(window, "innerHeight", 768);
      stub(document.body, "offsetWidth", 1000);
    });

    afterEach(() => {
      for (const [target, prop] of stubbed.splice(0))
        delete (target as any)[prop];
    });

    it("places the calendar in page coordinates by default", () => {
      const fp = position();
      fp._positionCalendar();

      expect(fp.calendarContainer.style.top).toEqual("332px");
      expect(fp.calendarContainer.style.left).toEqual("50px");
    });

    it("falls back to page coordinates while the calendar is hidden", () => {
      const fp = position();
      stub(fp.calendarContainer, "offsetParent", null);
      fp._positionCalendar();

      expect(fp.calendarContainer.style.top).toEqual("332px");
      expect(fp.calendarContainer.style.left).toEqual("50px");
    });

    it("positions relative to a positioned appendTo container", () => {
      const container = document.createElement("div");
      document.body.appendChild(container);
      const fp = position({ appendTo: container });
      stub(fp.calendarContainer, "offsetParent", container);
      stubRect(container, 40, 10);
      stub(container, "clientTop", 3);
      stub(container, "clientLeft", 3);
      stub(container, "scrollTop", 20);
      fp._positionCalendar();

      // 332 - (200 + 40 + 3 - 20), 50 - (10 + 3)
      expect(fp.calendarContainer.style.top).toEqual("109px");
      expect(fp.calendarContainer.style.left).toEqual("37px");
      container.remove();
    });

    it("positions relative to <body> only when it is positioned", () => {
      const fp = position();
      stub(fp.calendarContainer, "offsetParent", document.body);
      stubRect(document.body, -192, 8);
      // jsdom doesn't compute the initial value of position
      document.body.style.position = "static";
      document.documentElement.style.position = "static";
      fp._positionCalendar();
      expect(fp.calendarContainer.style.top).toEqual("332px");

      document.body.style.position = "relative";
      fp._positionCalendar();
      document.body.style.position = "";
      document.documentElement.style.position = "";

      // 332 - (200 - 192), 50 - 8
      expect(fp.calendarContainer.style.top).toEqual("324px");
      expect(fp.calendarContainer.style.left).toEqual("42px");
    });

    it("positions relative to <html> when it is positioned and <body> isn't", () => {
      // scroll locks such as Vuetify's dialog fix <html> at -scrollY, so the
      // page itself no longer scrolls
      stub(window, "pageYOffset", 0);
      const fp = position();
      stub(fp.calendarContainer, "offsetParent", document.body);
      stubRect(document.documentElement, -2148, 0);
      document.body.style.position = "static";
      document.documentElement.style.position = "fixed";
      fp._positionCalendar();
      document.body.style.position = "";
      document.documentElement.style.position = "";

      // 132 - (0 - 2148)
      expect(fp.calendarContainer.style.top).toEqual("2280px");
      expect(fp.calendarContainer.style.left).toEqual("50px");
    });

    it("doesn't take the page's scroll off twice for a positioned <html>", () => {
      stub(window, "pageXOffset", 30);
      const fp = position();
      stub(fp.calendarContainer, "offsetParent", document.body);
      stubRect(document.documentElement, -200, -30);
      // <html>'s scroll offsets are the page's
      stub(document.documentElement, "scrollTop", 200);
      stub(document.documentElement, "scrollLeft", 30);
      document.body.style.position = "static";
      document.documentElement.style.position = "relative";
      fp._positionCalendar();
      document.body.style.position = "";
      document.documentElement.style.position = "";

      // 332 - (200 - 200), 80 - (30 - 30)
      expect(fp.calendarContainer.style.top).toEqual("332px");
      expect(fp.calendarContainer.style.left).toEqual("80px");
    });

    it("aligns the right edges near the right side of the page", () => {
      const fp = position();
      stubRect(fp._positionElement, 100, 250, 100);
      stub(document.body, "offsetWidth", 500);
      fp._positionCalendar();

      // input right edge (350) - calendar width (300)
      expect(fp.calendarContainer.style.left).toEqual("50px");
      expect(fp.calendarContainer.classList.contains("rightMost")).toBe(true);
    });

    it("centers a calendar wider than the space next to the input", () => {
      const fp = position();
      stubRect(fp._positionElement, 100, 120, 80);
      stub(document.body, "offsetWidth", 400);
      const sheets = document.styleSheets.length;
      fp._positionCalendar();

      const calendar = fp.calendarContainer;
      expect(calendar.style.left).toEqual("50px");
      expect(calendar.style.getPropertyValue("--fp-arrow-left")).toEqual(
        "70px"
      );
      expect(calendar.classList.contains("centerMost")).toBe(true);
      expect(calendar.classList.contains("rightMost")).toBe(false);
      expect(document.styleSheets.length).toEqual(sheets);

      stub(document.body, "offsetWidth", 1000);
      fp._positionCalendar();
      expect(calendar.classList.contains("centerMost")).toBe(false);
    });

    function hasArrow(fp: Instance) {
      const { classList } = fp.calendarContainer;
      return (
        classList.contains("arrowTop") || classList.contains("arrowBottom")
      );
    }

    it("keeps a calendar that fits neither above nor below in the viewport", () => {
      const fp = position();
      stubHeights(fp, 400, 300);
      fp._positionCalendar();

      // 270px below the input and 100px above: its bottom meets the
      // viewport's, 200 + 400 - 300, and it no longer points at the input
      expect(fp.calendarContainer.style.top).toEqual("300px");
      expect(hasArrow(fp)).toBe(false);
    });

    it("keeps it on the side with more room", () => {
      const fp = position();
      stubRect(fp._positionElement, 250, 50, 100);
      stubHeights(fp, 400, 300);
      fp._positionCalendar();

      // 250px above the input and 120px below: its top meets the viewport's
      expect(fp.calendarContainer.style.top).toEqual("200px");
      expect(hasArrow(fp)).toBe(false);
    });

    it("sticks a calendar taller than the viewport to its top", () => {
      const fp = position();
      stubHeights(fp, 250, 300);
      fp._positionCalendar();

      expect(fp.calendarContainer.style.top).toEqual("200px");
      expect(hasArrow(fp)).toBe(false);
    });

    it("keeps it in the viewport inside a positioned appendTo container", () => {
      const container = document.createElement("div");
      document.body.appendChild(container);
      const fp = position({ appendTo: container });
      stub(fp.calendarContainer, "offsetParent", container);
      stubRect(container, 40, 10);
      stub(container, "clientTop", 3);
      stub(container, "scrollTop", 20);
      stubHeights(fp, 400, 300);
      fp._positionCalendar();

      // 300 - (200 + 40 + 3 - 20)
      expect(fp.calendarContainer.style.top).toEqual("77px");
      container.remove();
    });

    it("leaves an explicitly placed calendar where it was put", () => {
      const below = position({ position: "below" });
      stubHeights(below, 400, 300);
      below._positionCalendar();
      expect(below.calendarContainer.style.top).toEqual("332px");
      expect(below.calendarContainer.classList.contains("arrowTop")).toBe(true);

      const above = position({ position: "above" });
      stubHeights(above, 400, 300);
      above._positionCalendar();
      // 200 + 100 - 300 - 2
      expect(above.calendarContainer.style.top).toEqual("-2px");
      expect(above.calendarContainer.classList.contains("arrowBottom")).toBe(
        true
      );
    });

    it("still points at the input when the calendar fits on one side", () => {
      const fp = position();
      stubHeights(fp, 400, 200);
      fp._positionCalendar();
      expect(fp.calendarContainer.style.top).toEqual("332px");
      expect(fp.calendarContainer.classList.contains("arrowTop")).toBe(true);

      stubRect(fp._positionElement, 250, 50, 100);
      fp._positionCalendar();
      // 200 + 250 - 200 - 2
      expect(fp.calendarContainer.style.top).toEqual("248px");
      expect(fp.calendarContainer.classList.contains("arrowBottom")).toBe(true);
    });

    it("leaves static and inline calendars pointing at the input", () => {
      for (const config of [{ static: true }, { inline: true }]) {
        const fp = position(config);
        stubHeights(fp, 400, 300);
        fp._positionCalendar();
        expect(fp.calendarContainer.classList.contains("arrowTop")).toBe(true);
      }
    });
  });

  describe("server-side rendering", () => {
    it("can be imported", () => {
      expect(typeof flatpickr).toEqual("function");
    });
  });
});
