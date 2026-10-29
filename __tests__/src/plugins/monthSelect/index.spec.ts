import flatpickr from "index";
import confirmDatePlugin from "plugins/confirmDate/confirmDate";
import monthSelectPlugin, {
  Config as PluginConfig,
} from "plugins/monthSelect/index";
import { German } from "l10n/de";
import { Instance } from "types/instance";
import { Options } from "types/options";

flatpickr.defaultConfig.animate = false;

jest.useFakeTimers();

const createInstance = (options?: Options, pluginConfig?: PluginConfig) =>
  flatpickr(document.createElement("input"), {
    plugins: [monthSelectPlugin({ ...pluginConfig })],
    ...options,
  });

describe("monthSelect", () => {
  // memoized instance
  const fp = (): Instance => {
    return (fpInstance =
      fpInstance ||
      flatpickr(document.createElement("input"), {
        plugins: [monthSelectPlugin({})],
        ...options,
      }));
  };

  let fpInstance: Instance | undefined;
  let options: Options;

  const getPrevButton = (): Element => {
    return fp().monthNav.querySelector(".flatpickr-prev-month")!;
  };

  const getNextButton = (): Element => {
    return fp().monthNav.querySelector(".flatpickr-next-month")!;
  };

  beforeEach(() => {
    fpInstance = undefined;
    options = {};
  });

  describe("with explicit defaultDate", () => {
    beforeEach(() => {
      options = { defaultDate: new Date("2019-03-20") };
    });

    it("preloads defaultDate", () => {
      expect(fp().input.value).toEqual("March 2019");
    });

    describe("and locale", () => {
      beforeEach(() => {
        options = {
          defaultDate: new Date("2019-03-20"),
          locale: German,
        };
      });

      it("preloads defaultDate", () => {
        expect(fp().input.value).toEqual("März 2019");
      });

      describe("and custom date format", () => {
        beforeEach(() => {
          options = {
            defaultDate: new Date("2019-03-20"),
            locale: German,
            plugins: [monthSelectPlugin({ dateFormat: "m.y" })],
          };
        });

        it("preloads defaultDate", () => {
          expect(fp().input.value).toEqual("03.19");
        });
      });
    });

    describe("and altInput with custom formats", () => {
      beforeEach(() => {
        options = {
          defaultDate: new Date("2019-03-20"),
          altInput: true,
          plugins: [monthSelectPlugin({ dateFormat: "m.y", altFormat: "m y" })],
        };
      });

      it("preloads defaultDate and altInput", () => {
        expect(fp().input.value).toEqual("03.19");
        expect(fp().altInput).toBeDefined();
        expect(fp().altInput!.value).toEqual("03 19");
      });
    });
  });

  describe("year nav", () => {
    describe("next/prev year buttons", () => {
      const thisYear = new Date().getFullYear();

      it("updates year value shown to user #2277", () => {
        getPrevButton().dispatchEvent(new MouseEvent("click"));
        expect(fp().currentYearElement.value).toEqual(`${thisYear - 1}`);

        getNextButton().dispatchEvent(new MouseEvent("click"));
        getNextButton().dispatchEvent(new MouseEvent("click"));
        expect(fp().currentYearElement.value).toEqual(`${thisYear + 1}`);
      });

      describe("when current month is not Jan/Dec (#2275)", () => {
        beforeEach(() => {
          options = { defaultDate: new Date(`${thisYear}-03-20`) };
        });

        it("increments/decrements .currentYear property", () => {
          getPrevButton().dispatchEvent(new MouseEvent("click"));
          expect(fp().currentYear).toEqual(thisYear - 1);

          getNextButton().dispatchEvent(new MouseEvent("click"));
          expect(fp().currentYear).toEqual(thisYear);
        });
      });

      describe("with minDate/maxDate options (#2279)", () => {
        beforeEach(() => {
          options = {
            minDate: `${thisYear - 1}-03-20`,
            maxDate: `${thisYear + 1}-03-20`,
          };
        });

        it("prohibits paging beyond them", () => {
          getPrevButton().dispatchEvent(new MouseEvent("click"));
          expect(getPrevButton().classList).toContain("flatpickr-disabled");

          getNextButton().dispatchEvent(new MouseEvent("click"));
          getNextButton().dispatchEvent(new MouseEvent("click"));
          expect(getNextButton().classList).toContain("flatpickr-disabled");
        });
      });

      describe("when in range mode, after abandoning input", () => {
        beforeEach(() => {
          options = {
            mode: "range",
            minDate: `${thisYear - 1}-03-20`,
          };

          fp().input.dispatchEvent(new MouseEvent("click")); // open flatpickr

          fp()
            .rContainer!.querySelectorAll(".flatpickr-monthSelect-month")![1]
            .dispatchEvent(new MouseEvent("click")); // pick start date

          document.dispatchEvent(new MouseEvent("click")); // abandon input
        });

        it("still honors minDate options", () => {
          getPrevButton().dispatchEvent(new MouseEvent("click"));
          expect(getPrevButton().classList).toContain("flatpickr-disabled");
        });
      });
    });
  });

  describe("month cell styling", () => {
    describe("for current month of current year ('today' cell)", () => {
      const getTodayCell = (): Element | null | undefined =>
        fp().rContainer?.querySelector(".today");
      const currentMonth = fp().l10n.months.longhand[new Date().getMonth()];

      it("applies .today CSS class", () => {
        expect(getTodayCell()?.textContent).toEqual(currentMonth);

        getPrevButton().dispatchEvent(new MouseEvent("click"));
        expect(getTodayCell()).toBeNull();

        getNextButton().dispatchEvent(new MouseEvent("click"));
        expect(getTodayCell()?.textContent).toEqual(currentMonth);
      });
    });

    describe("for selected cells", () => {
      const getSelectedCell = (): Element | null | undefined =>
        fp().rContainer?.querySelector(".selected");

      const getSelectionTarget = (): Element | null | undefined =>
        fp().rContainer!.querySelector(
          ".flatpickr-monthSelect-month:nth-child(6)"
        )!;

      it("applies .selected CSS class", () => {
        expect(getSelectedCell()).toBeNull();

        getSelectionTarget()?.dispatchEvent(new MouseEvent("click"));
        expect(getSelectedCell()?.textContent).toEqual("June");

        getPrevButton().dispatchEvent(new MouseEvent("click"));
        expect(getSelectedCell()).toBeNull();

        getNextButton().dispatchEvent(new MouseEvent("click"));
        expect(getSelectedCell()?.textContent).toEqual("June");
      });
    });
  });

  describe("range mode", () => {
    const getMonthCells = (instance?: Instance): NodeListOf<Element> => {
      return (instance || fp()).rContainer!.querySelectorAll(
        ".flatpickr-monthSelect-month"
      )!;
    };

    describe("after first selection/click", () => {
      beforeEach(() => {
        options = { mode: "range" };

        fp().input.dispatchEvent(new MouseEvent("click")); // open flatpickr
        getMonthCells()[1].dispatchEvent(new MouseEvent("click"));
      });

      it("keeps calendar open until second selection/click", () => {
        expect(fp().calendarContainer.classList).toContain("open");

        getMonthCells()[5].dispatchEvent(new MouseEvent("click"));
        expect(fp().calendarContainer.classList).not.toContain("open");
      });

      describe("when hovering over other another month cell", () => {
        beforeEach(() => {
          getMonthCells()[5].dispatchEvent(
            new MouseEvent("mouseover", { bubbles: true })
          );
        });

        it("highlights all cells in the tentative range", () => {
          expect(getMonthCells()[1].classList).toContain("startRange");

          Array.from(getMonthCells())
            .slice(2, 5)
            .forEach((cell) => {
              expect(cell.classList).toContain("inRange");
            });

          expect(getMonthCells()[5].classList).toContain("endRange");
        });

        describe("and then prematurely abandoning input", () => {
          describe("by clicking out", () => {
            beforeEach(() => {
              document.dispatchEvent(new MouseEvent("mousedown")); // close flatpickr
            });

            it("clears the highlighting", () => {
              getMonthCells().forEach((cell) => {
                expect(cell.classList).not.toContain("startRange");
                expect(cell.classList).not.toContain("inRange");
                expect(cell.classList).not.toContain("endRange");
              });
            });
          });

          describe("by alt-tabbing out and back in", () => {
            beforeEach(() => {
              window.document.dispatchEvent(new FocusEvent("blur"));
              window.document.dispatchEvent(new FocusEvent("focus"));
            });

            it("clears the highlighting", () => {
              getMonthCells().forEach((cell) => {
                expect(cell.classList).not.toContain("startRange");
                expect(cell.classList).not.toContain("inRange");
                expect(cell.classList).not.toContain("endRange");
              });
            });
          });
        });
      });

      describe("when hovering over another month cell in a different year", () => {
        beforeEach(() => {
          getNextButton().dispatchEvent(new MouseEvent("click"));

          getMonthCells()[5].dispatchEvent(
            new MouseEvent("mouseover", { bubbles: true })
          );
        });

        it("highlights all visible cells in the tentative range", () => {
          Array.from(getMonthCells())
            .slice(0, 5)
            .forEach((cell) => {
              expect(cell.classList).toContain("inRange");
            });

          expect(getMonthCells()[5].classList).toContain("endRange");
        });
      });
    });

    describe("after two clicks (completed range selection)", () => {
      beforeEach(() => {
        options = { mode: "range" };

        fp().input.dispatchEvent(new MouseEvent("click")); // open flatpickr
        getMonthCells()[1].dispatchEvent(new MouseEvent("click"));
        getMonthCells()[5].dispatchEvent(new MouseEvent("click"));
      });

      describe("when clicking again to start over", () => {
        beforeEach(() => {
          fp().input.dispatchEvent(new MouseEvent("click")); // reopen flatpickr

          getMonthCells()[3].dispatchEvent(new MouseEvent("click"));
          getMonthCells()[3].dispatchEvent(
            new MouseEvent("mouseover", { bubbles: true })
          ); // class changes seem to be triggered by hover, not click...
        });

        it("clears the highlighting", () => {
          expect(getMonthCells()[3].classList).toContain("startRange");

          [
            ...Array.from(getMonthCells()).slice(0, 3),
            ...Array.from(getMonthCells()).slice(4),
          ].forEach((cell) => {
            expect(cell.classList).not.toContain("startRange");
            expect(cell.classList).not.toContain("inRange");
            expect(cell.classList).not.toContain("endRange");
          });
        });
      });
    });

    describe("events", () => {
      it("fires change events", () => {
        const fn = jest.fn();
        const fp = createInstance({
          onChange: fn,
        });

        getMonthCells(fp)[3].dispatchEvent(new MouseEvent("click"));

        expect(fn).toHaveBeenCalled();
      });
    });
  });

  describe("syncing with the instance state", () => {
    const thisYear = new Date().getFullYear();

    let mounted: Instance | undefined;

    const createMountedInstance = (config: Options) => {
      const input = document.createElement("input");
      document.body.appendChild(input);
      mounted = flatpickr(input, {
        plugins: [monthSelectPlugin({})],
        ...config,
      }) as Instance;
      return mounted;
    };

    afterEach(() => {
      if (mounted) {
        const input = mounted.input;
        mounted.destroy();
        input.remove();
        mounted = undefined;
      }
    });

    const monthCells = (instance: Instance) =>
      Array.from(
        instance.rContainer!.querySelectorAll<HTMLElement>(
          ".flatpickr-monthSelect-month"
        )
      );

    const selectedMonths = (instance: Instance) =>
      monthCells(instance)
        .filter((cell) => cell.classList.contains("selected"))
        .map((cell) => cell.textContent);

    const disabledMonths = (instance: Instance) =>
      monthCells(instance)
        .map((cell, i) =>
          cell.classList.contains("flatpickr-disabled") ? i : -1
        )
        .filter((i) => i !== -1);

    const cellYears = (instance: Instance) =>
      monthCells(instance).map((cell) =>
        (cell as HTMLElement & { dateObj: Date }).dateObj.getFullYear()
      );

    const keyEvent = (
      type: string,
      target: EventTarget,
      keyCode: number,
      init: KeyboardEventInit = {}
    ) => {
      const event = new KeyboardEvent(type, { bubbles: true, ...init });
      Object.defineProperty(event, "keyCode", { value: keyCode });
      target.dispatchEvent(event);
    };

    it("follows setDate to another year without triggerChange", () => {
      const fp = createInstance({ defaultDate: new Date(2024, 0, 1) });

      fp.setDate(new Date(2026, 4, 1));

      expect(fp.currentYearElement.value).toEqual("2026");
      expect(cellYears(fp)).toEqual(Array(12).fill(2026));
      expect(selectedMonths(fp)).toEqual(["May"]);
    });

    it("follows setDate in inline mode", () => {
      const fp = createInstance({
        inline: true,
        defaultDate: new Date(2024, 0, 1),
      });

      fp.setDate(new Date(2026, 4, 1));

      expect(cellYears(fp)).toEqual(Array(12).fill(2026));
      expect(selectedMonths(fp)).toEqual(["May"]);
    });

    it("follows a typed value from a past year (#3109)", () => {
      const fp = createInstance({ allowInput: true, maxDate: new Date() });

      fp._input.value = "August 1939";
      keyEvent("keydown", fp._input, 13);
      fp.open();

      expect(fp.currentYearElement.value).toEqual("1939");
      expect(disabledMonths(fp)).toEqual([]);
      expect(selectedMonths(fp)).toEqual(["August"]);
    });

    it("clears the selection on clear()", () => {
      const fp = createInstance({ defaultDate: new Date(2024, 2, 1) });

      fp.clear();

      expect(selectedMonths(fp)).toEqual([]);
    });

    it("applies a maxDate changed through set()", () => {
      const fp = createInstance();

      fp.set("maxDate", new Date(thisYear, 2, 1));

      expect(disabledMonths(fp)).toEqual([3, 4, 5, 6, 7, 8, 9, 10, 11]);
    });

    it("follows a year typed into the year input", () => {
      const fp = createInstance({
        defaultDate: new Date(2024, 2, 1),
        disable: [new Date(2030, 5, 1)],
      });

      fp.currentYearElement.value = "2030";
      keyEvent("keyup", fp.currentYearElement, 48);

      expect(cellYears(fp)).toEqual(Array(12).fill(2030));
      expect(disabledMonths(fp)).toEqual([5]);
      expect(selectedMonths(fp)).toEqual([]);
    });

    it("follows changeMonth across a year", () => {
      const fp = createInstance({
        defaultDate: new Date(2024, 11, 1),
        maxDate: new Date(2025, 5, 1),
      });

      fp.changeMonth(1);

      expect(fp.currentYearElement.value).toEqual("2025");
      expect(cellYears(fp)).toEqual(Array(12).fill(2025));
      expect(disabledMonths(fp)).toEqual([6, 7, 8, 9, 10, 11]);
    });

    describe("selected month", () => {
      beforeEach(() => {
        options = { defaultDate: new Date(2025, 2, 20) };
      });

      it("is only highlighted in the selected date's year", () => {
        expect(selectedMonths(fp())).toEqual(["March"]);

        getPrevButton().dispatchEvent(new MouseEvent("click"));
        expect(selectedMonths(fp())).toEqual([]);

        getNextButton().dispatchEvent(new MouseEvent("click"));
        expect(selectedMonths(fp())).toEqual(["March"]);
      });

      it("is highlighted for a date that isn't the 1st", () => {
        fp().setDate(new Date(2026, 4, 15));

        expect(selectedMonths(fp())).toEqual(["May"]);
      });
    });

    describe("disabled months", () => {
      it("honor disable after changing the year, as on init", () => {
        const disable = [new Date(thisYear + 1, 5, 1)];
        const navigated = createInstance({ disable });

        navigated.nextMonthNav.dispatchEvent(new MouseEvent("click"));
        const initialized = createInstance({
          disable,
          defaultDate: new Date(thisYear + 1, 0, 1),
        });

        expect(disabledMonths(navigated)).toContain(5);
        expect(disabledMonths(navigated)).toEqual(disabledMonths(initialized));
      });

      it("honor minDate in its year", () => {
        const fp = createInstance({
          minDate: new Date(thisYear - 1, 2, 20),
        });

        fp.prevMonthNav.dispatchEvent(new MouseEvent("click"));

        expect(disabledMonths(fp)).toEqual(expect.arrayContaining([0, 1]));
        expect(disabledMonths(fp).filter((i) => i >= 3)).toEqual([]);
        expect(fp.prevMonthNav.classList).toContain("flatpickr-disabled");
      });
    });

    describe("focus after selecting a month", () => {
      it("stays on the month selected with Enter", () => {
        const fp = createMountedInstance({ inline: true });
        const may = monthCells(fp)[4];

        may.focus();
        keyEvent("keydown", may, 13);
        keyEvent("keydown", document.activeElement!, 39);

        expect(selectedMonths(fp)).toEqual(["May"]);
        expect(document.activeElement).toBe(monthCells(fp)[5]);
      });

      it("stays on the month selected with a click", () => {
        const fp = createMountedInstance({ inline: true });
        const may = monthCells(fp)[4];

        may.focus();
        may.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        keyEvent("keydown", document.activeElement!, 39);

        expect(selectedMonths(fp)).toEqual(["May"]);
        expect(document.activeElement).toBe(monthCells(fp)[5]);
      });
    });

    describe("core keyboard navigation", () => {
      it("leaves arrow keys to the month cells", () => {
        // two adjacent enabled months that the hidden day grid doesn't show,
        // so the day grid itself has nothing enabled in view
        const currentMonth = new Date().getMonth();
        const month = currentMonth <= 6 ? 9 : 1;
        const fp = createMountedInstance({
          enable: [
            new Date(thisYear, month, 1),
            new Date(thisYear, month + 1, 1),
            new Date(thisYear + 2, 5, 1),
          ],
        });
        fp.open();

        monthCells(fp)[month].focus();
        keyEvent("keydown", document.activeElement!, 39);

        expect(fp.currentYear).toEqual(thisYear);
        expect(document.activeElement).toBe(monthCells(fp)[month + 1]);
      });
    });
  });

  describe("on a mobile device", () => {
    beforeEach(() => {
      jest.spyOn(navigator, "userAgent", "get").mockReturnValue("Android");
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("shows the month grid instead of the native date input #3119", () => {
      const fp = createInstance() as Instance;

      expect(fp.isMobile).toBe(false);
      expect(fp.mobileInput).toBeUndefined();

      fp.rContainer!.querySelectorAll(
        ".flatpickr-monthSelect-month"
      )[3].dispatchEvent(new MouseEvent("click"));

      expect(fp.selectedDates[0].getMonth()).toEqual(3);
    });

    it("keeps the confirmDate button, whatever the plugin order", () => {
      const orders = [
        [confirmDatePlugin({}), monthSelectPlugin({})],
        [monthSelectPlugin({}), confirmDatePlugin({})],
      ];

      orders.forEach((plugins) => {
        const fp = flatpickr(document.createElement("input"), {
          plugins,
        }) as Instance;

        expect(
          fp.calendarContainer.querySelector(".flatpickr-confirm")
        ).not.toBeNull();
      });
    });
  });
});
