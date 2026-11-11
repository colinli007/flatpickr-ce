import flatpickr from "index";
import rangePlugin, { Config } from "plugins/rangePlugin";
import { Options } from "types/options";
import { DayElement, Instance } from "types/instance";

flatpickr.defaultConfig.animate = false;

jest.useFakeTimers();

const createInstance = (config?: Options): Instance => {
  return flatpickr(document.createElement("input"), config);
};

describe("rangePlugin", () => {
  it("should correctly preload defaultDate", () => {
    const secondInput = document.createElement("input");
    const fp = createInstance({
      plugins: [rangePlugin({ input: secondInput })],
      defaultDate: ["2017-10-20", "2017-10-25"],
      dateFormat: "Y-m-d",
    });

    expect(fp.selectedDates.length).toEqual(2);
    expect(secondInput.value).toEqual("2017-10-25");
  });

  it("preloads the range from both inputs' values", () => {
    const input = document.createElement("input");
    const secondInput = document.createElement("input");
    input.value = "2017-10-20";
    secondInput.value = "2017-10-25";
    const fp = flatpickr(input, {
      plugins: [rangePlugin({ input: secondInput })],
      dateFormat: "Y-m-d",
    });

    expect(fp.selectedDates).toEqual([
      new Date(2017, 9, 20),
      new Date(2017, 9, 25),
    ]);
  });

  // flatpickr#3108: the two inputs preload as one range, kept or dropped whole
  describe("preloading both inputs with minDate and maxDate", () => {
    const preload = (first: string, second: string) => {
      const input = document.createElement("input");
      const secondInput = document.createElement("input");
      input.value = first;
      secondInput.value = second;
      const fp = flatpickr(input, {
        plugins: [rangePlugin({ input: secondInput })],
        minDate: "2025-07-21",
        maxDate: "2025-07-28",
      });

      return { fp, input, secondInput };
    };

    it("drops the range when its start is before minDate", () => {
      const { fp, input, secondInput } = preload("2025-07-15", "2025-07-25");

      expect(fp.selectedDates).toEqual([]);
      expect(input.value).toEqual("");
      expect(secondInput.value).toEqual("");
    });

    it("drops the range when its end is after maxDate", () => {
      const { fp, input, secondInput } = preload("2025-07-22", "2025-07-30");

      expect(fp.selectedDates).toEqual([]);
      expect(input.value).toEqual("");
      expect(secondInput.value).toEqual("");
    });

    it("keeps a range with both ends enabled", () => {
      const { fp, input, secondInput } = preload("2025-07-22", "2025-07-25");

      expect(fp.selectedDates).toEqual([
        new Date(2025, 6, 22),
        new Date(2025, 6, 25),
      ]);
      expect(input.value).toEqual("2025-07-22");
      expect(secondInput.value).toEqual("2025-07-25");
    });

    it("drops an end with no start to pair with", () => {
      const { fp, input, secondInput } = preload("", "2025-07-25");

      expect(fp.selectedDates).toEqual([]);
      expect(input.value).toEqual("");
      expect(secondInput.value).toEqual("");
    });
  });

  it("lets defaultDate override a prefilled second input", () => {
    const secondInput = document.createElement("input");
    secondInput.value = "2000-03-01";
    const fp = createInstance({
      plugins: [rangePlugin({ input: secondInput })],
      defaultDate: ["2000-01-01", "2000-02-01"],
      dateFormat: "Y-m-d",
    });

    expect(fp.selectedDates).toEqual([
      new Date(2000, 0, 1),
      new Date(2000, 1, 1),
    ]);
    expect(secondInput.value).toEqual("2000-02-01");
  });

  it("parses a prefilled second input in the format it displays", () => {
    const input = document.createElement("input");
    const secondInput = document.createElement("input");
    input.value = "2017-10-20";
    secondInput.value = "25/10/2017";
    const fp = flatpickr(input, {
      plugins: [rangePlugin({ input: secondInput })],
      dateFormat: "Y-m-d",
      altInput: true,
      altFormat: "d/m/Y",
    });

    expect(fp.selectedDates).toEqual([
      new Date(2017, 9, 20),
      new Date(2017, 9, 25),
    ]);
    expect(secondInput.value).toEqual("25/10/2017");
  });

  it("starts the cloned second input empty", () => {
    const wrapper = document.createElement("div");
    const input = document.createElement("input");
    input.value = "2017-10-20 to 2017-10-25";
    wrapper.appendChild(input);
    const fp = flatpickr(input, {
      plugins: [rangePlugin()],
      dateFormat: "Y-m-d",
    });

    expect(fp.selectedDates).toEqual([
      new Date(2017, 9, 20),
      new Date(2017, 9, 25),
    ]);
    expect((input.nextSibling as HTMLInputElement).value).toEqual("2017-10-25");
  });

  // flatpickr writes a same-day range as its one date (flatpickr#3010)
  describe("preloading one date", () => {
    const sameDay = [new Date(2017, 9, 20), new Date(2017, 9, 20)];

    const preload = (options: Options = {}) => {
      const input = document.createElement("input");
      input.value = "2017-10-20";
      document.body.append(input);
      const fp = flatpickr(input, { plugins: [rangePlugin()], ...options });
      const secondInput = input.nextSibling as HTMLInputElement;

      const clickOutside = () => {
        fp.open();
        document.body.dispatchEvent(
          new MouseEvent("mousedown", { bubbles: true })
        );
        jest.runAllTimers();
      };

      return { fp, input, secondInput, clickOutside };
    };

    afterEach(() => {
      document.body.innerHTML = "";
    });

    it("reads it in the first input alone as a same-day range", () => {
      const { fp, input, secondInput, clickOutside } = preload();
      expect(fp.selectedDates).toEqual(sameDay);
      expect([input.value, secondInput.value]).toEqual([
        "2017-10-20",
        "2017-10-20",
      ]);

      clickOutside();
      expect(fp.selectedDates).toEqual(sameDay);
      fp.destroy();
    });

    it("reads it in the original input with altInput as a same-day range", () => {
      const { fp, input, secondInput, clickOutside } = preload({
        altInput: true,
        altFormat: "d/m/Y",
      });
      expect(fp.selectedDates).toEqual(sameDay);

      clickOutside();
      expect(fp.selectedDates).toEqual(sameDay);
      expect([input.value, fp._input.value, secondInput.value]).toEqual([
        "2017-10-20",
        "20/10/2017",
        "20/10/2017",
      ]);
      fp.destroy();
    });
  });

  it("should set readonly attribute when allowInput is false", () => {
    const secondInput = document.createElement("input");
    const fp = createInstance({
      plugins: [rangePlugin({ input: secondInput })],
      allowInput: false,
    });

    expect(fp._input.getAttribute("readonly")).toBe("readonly");
    expect(secondInput.getAttribute("readonly")).toBe("readonly");
  });

  describe("opening", () => {
    let input: HTMLInputElement,
      secondInput: HTMLInputElement,
      fp: Instance,
      onOpen: jest.Mock,
      onClose: jest.Mock,
      anchors: (HTMLElement | undefined)[];

    beforeEach(() => {
      input = document.createElement("input");
      secondInput = document.createElement("input");
      document.body.append(input, secondInput);
      onOpen = jest.fn();
      onClose = jest.fn();
      anchors = [];
      fp = flatpickr(input, {
        plugins: [rangePlugin({ input: secondInput })],
        position: (_, anchor) => anchors.push(anchor),
        onOpen,
        onClose,
      });
    });

    afterEach(() => {
      fp.destroy();
      input.remove();
      secondInput.remove();
    });

    const focusAndClick = (elem: HTMLInputElement) => {
      elem.focus();
      elem.click();
    };

    it("fires onOpen once when either input opens the calendar", () => {
      focusAndClick(input);
      expect(onOpen).toHaveBeenCalledTimes(1);

      fp.close();
      focusAndClick(secondInput);
      expect(onOpen).toHaveBeenCalledTimes(2);
    });

    it("moves the open calendar between the inputs without reopening it", () => {
      focusAndClick(input);
      anchors = [];

      focusAndClick(secondInput);
      expect(anchors[anchors.length - 1]).toBe(secondInput);

      focusAndClick(input);
      expect(anchors[anchors.length - 1]).toBe(input);

      expect(onOpen).toHaveBeenCalledTimes(1);
      expect(fp.isOpen).toBe(true);
    });

    it("opens under the first input again after closing under the second", () => {
      focusAndClick(secondInput);
      document.body.dispatchEvent(
        new MouseEvent("mousedown", { bubbles: true })
      );
      expect(fp.isOpen).toBe(false);

      anchors = [];
      focusAndClick(input);
      expect(anchors).toEqual([input]);

      fp.close();
      anchors = [];
      fp.open();
      expect(anchors).toEqual([input]);
    });

    it("doesn't fire onOpen when selecting the end date closes the calendar", () => {
      fp.jumpToDate("2017-10-01");
      focusAndClick(input);
      (fp.days.childNodes[20] as HTMLElement).click();
      focusAndClick(secondInput);
      (fp.days.childNodes[25] as HTMLElement).click();
      jest.runAllTimers();

      expect(fp.selectedDates.length).toBe(2);
      expect(fp.isOpen).toBe(false);
      expect(onOpen).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("refocuses the second input after picking the start date without reopening", () => {
      fp.jumpToDate("2017-10-01");
      focusAndClick(secondInput);
      (fp.days.childNodes[20] as HTMLElement).click();
      jest.runAllTimers();

      expect(fp.selectedDates.length).toBe(1);
      expect(fp.isOpen).toBe(true);
      expect(document.activeElement).toBe(secondInput);
      expect(onOpen).toHaveBeenCalledTimes(1);
    });

    it("opens on the end of either input after browsing away (flatpickr#2835)", () => {
      const view = () => [fp.currentYear, fp.currentMonth];
      fp.setDate(["2017-10-20", "2017-12-05"]);

      focusAndClick(secondInput);
      fp.changeMonth(3);
      document.body.dispatchEvent(
        new MouseEvent("mousedown", { bubbles: true })
      );
      expect(view()).toEqual([2017, 11]);

      focusAndClick(input);
      expect(view()).toEqual([2017, 9]);
      fp.changeMonth(-5);
      fp.close();
      expect(view()).toEqual([2017, 9]);

      focusAndClick(secondInput);
      expect(view()).toEqual([2017, 11]);
    });
  });

  describe("anchoring", () => {
    let input: HTMLInputElement,
      secondInput: HTMLInputElement,
      wrap: HTMLDivElement,
      fp: Instance;
    const leftUnder = new Map<HTMLElement, string>();

    // jsdom has no layout: give each element its own box
    const stubRect = (elem: HTMLElement, left: number) => {
      elem.getBoundingClientRect = () =>
        ({
          top: 100,
          left,
          width: 100,
          right: left + 100,
          bottom: 130,
          height: 30,
        } as DOMRect);
    };

    beforeEach(() => {
      input = document.createElement("input");
      secondInput = document.createElement("input");
      wrap = document.createElement("div");
      document.body.append(input, secondInput, wrap);
      stubRect(input, 50);
      stubRect(secondInput, 500);
      stubRect(wrap, 250);
    });

    afterEach(() => {
      fp.destroy();
      input.remove();
      secondInput.remove();
      wrap.remove();
    });

    const create = (rangeConfig: Config = {}, options: Options = {}) => {
      fp = flatpickr(input, {
        plugins: [rangePlugin({ input: secondInput, ...rangeConfig })],
        ...options,
      });

      // where flatpickr puts the calendar under each element
      for (const elem of [input, secondInput, wrap]) {
        fp._positionCalendar(elem);
        leftUnder.set(elem, fp.calendarContainer.style.left);
      }
      fp.calendarContainer.style.left = "";
    };

    const expectUnder = (elem: HTMLElement) =>
      expect(fp.calendarContainer.style.left).toBe(leftUnder.get(elem));

    const resize = () => {
      fp.calendarContainer.style.left = ""; // only the resize can restore it
      window.dispatchEvent(new Event("resize"));
      jest.advanceTimersByTime(50); // resize is debounced
    };

    it("keeps the calendar under the second input when the window resizes", () => {
      create();
      input.focus();
      secondInput.focus();
      expectUnder(secondInput);

      resize();
      expectUnder(secondInput);
    });

    it("keeps the calendar under the first input with position left", () => {
      create({ position: "left" });
      input.focus();
      secondInput.focus();
      expectUnder(input);

      resize();
      expectUnder(input);
    });

    it("anchors the first input to positionElement", () => {
      create({}, { positionElement: wrap });
      input.focus();
      expectUnder(wrap);

      secondInput.focus();
      expectUnder(secondInput);

      input.focus();
      expectUnder(wrap);
    });
  });

  it("doesn't open from either input when clickOpens is false", () => {
    const input = document.createElement("input");
    const secondInput = document.createElement("input");
    document.body.append(input, secondInput);
    const onOpen = jest.fn();
    const fp = flatpickr(input, {
      plugins: [rangePlugin({ input: secondInput })],
      clickOpens: false,
      onOpen,
    });

    input.focus();
    input.click();
    secondInput.focus();
    secondInput.click();
    expect(fp.isOpen).toBe(false);
    expect(onOpen).not.toHaveBeenCalled();

    fp.open();
    expect(onOpen).toHaveBeenCalledTimes(1);

    fp.destroy();
    input.remove();
    secondInput.remove();
  });

  // a lone string is read as both ends (#3010); when neither parses, nothing is
  // left to select, so the range is cleared and both inputs follow
  it("clears both inputs when setDate can't parse the new value", () => {
    const secondInput = document.createElement("input");
    const errorHandler = jest.fn();
    const fp = createInstance({
      plugins: [rangePlugin({ input: secondInput })],
      defaultDate: ["2017-10-20", "2017-10-25"],
      errorHandler,
    });

    expect(() => fp.setDate("garbage", true)).not.toThrow();
    expect(errorHandler).toHaveBeenCalled();
    expect(fp.selectedDates).toEqual([]);
    expect(fp._input.value).toEqual("");
    expect(secondInput.value).toEqual("");
  });

  // flatpickr#3108: a range with an end ruled out is dropped as a whole
  it("clears both inputs when a typed end is past maxDate", () => {
    const input = document.createElement("input");
    const secondInput = document.createElement("input");
    document.body.append(input, secondInput);
    const fp = flatpickr(input, {
      plugins: [rangePlugin({ input: secondInput })],
      allowInput: true,
      maxDate: "2017-10-28",
      defaultDate: ["2017-10-20", "2017-10-25"],
    });

    secondInput.click();
    secondInput.value = "2017-10-30";
    secondInput.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    );
    jest.runAllTimers();

    expect(fp.selectedDates).toEqual([]);
    expect(input.value).toEqual("");
    expect(secondInput.value).toEqual("");

    fp.destroy();
    input.remove();
    secondInput.remove();
  });

  it("keeps the range when clicking outside with allowInput", () => {
    const input = document.createElement("input");
    const secondInput = document.createElement("input");
    document.body.append(input, secondInput);
    const onChange = jest.fn();
    const consoleError = jest.spyOn(console, "error").mockImplementation();
    const fp = flatpickr(input, {
      plugins: [rangePlugin({ input: secondInput })],
      allowInput: true,
      onChange,
    });
    fp.setDate(["2017-10-20", "2017-10-25"], true);
    onChange.mockClear();

    input.focus();
    fp.open();
    document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    jest.runAllTimers();

    expect(fp.selectedDates).toEqual([
      new Date(2017, 9, 20),
      new Date(2017, 9, 25),
    ]);
    expect(onChange).not.toHaveBeenCalled();
    expect(secondInput.value).toEqual("2017-10-25");
    expect(consoleError).not.toHaveBeenCalled();

    consoleError.mockRestore();
    fp.destroy();
    input.remove();
    secondInput.remove();
  });

  it("sets a same-day range from one date in a string, and one end otherwise", () => {
    const secondInput = document.createElement("input");
    const fp = createInstance({
      plugins: [rangePlugin({ input: secondInput })],
      defaultDate: ["2017-10-20", "2017-10-25"],
    });
    const shown = () => [fp._input.value, secondInput.value];

    // a range string, read as flatpickr reads it without the plugin
    fp.setDate("2017-10-22", true);
    expect(fp.selectedDates).toEqual([
      new Date(2017, 9, 22),
      new Date(2017, 9, 22),
    ]);
    expect(shown()).toEqual(["2017-10-22", "2017-10-22"]);

    fp.setDate(["2017-10-20", "2017-10-25"], true);
    fp.setDate(["2017-10-22"], true);
    expect(fp.selectedDates).toEqual([
      new Date(2017, 9, 22),
      new Date(2017, 9, 25),
    ]);

    fp.setDate(new Date(2017, 9, 23), true);
    expect(fp.selectedDates).toEqual([
      new Date(2017, 9, 23),
      new Date(2017, 9, 25),
    ]);
    expect(shown()).toEqual(["2017-10-23", "2017-10-25"]);
  });

  // the inputs show the start and the end, and commit the range they spell
  describe("typing into the inputs", () => {
    let input: HTMLInputElement,
      secondInput: HTMLInputElement,
      fp: Instance,
      onChange: jest.Mock,
      onValueUpdate: jest.Mock;

    const create = (options: Options = {}) => {
      fp = flatpickr(input, {
        plugins: [rangePlugin({ input: secondInput })],
        allowInput: true,
        defaultDate: ["2017-10-20", "2017-10-25"],
        onChange,
        onValueUpdate,
        ...options,
      });
    };

    beforeEach(() => {
      input = document.createElement("input");
      secondInput = document.createElement("input");
      document.body.append(input, secondInput);
      onChange = jest.fn();
      onValueUpdate = jest.fn();
    });

    afterEach(() => {
      fp.destroy();
      input.remove();
      secondInput.remove();
    });

    const range = (...days: number[]) =>
      days.map((day) => new Date(2017, 9, day));

    const shown = () => [fp._input.value, secondInput.value];

    const pressEnter = (elem: HTMLInputElement) => {
      elem.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Enter",
          keyCode: 13,
          bubbles: true,
        })
      );
      jest.runAllTimers();
    };

    const clickOutside = () => {
      document.body.dispatchEvent(
        new MouseEvent("mousedown", { bubbles: true })
      );
      jest.runAllTimers();
    };

    const focus = (elem: HTMLInputElement) => {
      elem.focus();
      jest.runAllTimers();
    };

    const clickDay = (day: number) => {
      (Array.from(fp.days.childNodes) as DayElement[])
        .find((d) => d.dateObj.getMonth() === 9 && d.dateObj.getDate() === day)!
        .click();
      jest.runAllTimers();
    };

    it("stays silent when moving to the second input without typing", () => {
      create();
      focus(input);
      focus(secondInput);

      expect(fp.selectedDates).toEqual(range(20, 25));
      expect(onValueUpdate).not.toHaveBeenCalled();
      expect(onChange).not.toHaveBeenCalled();
    });

    it("stays silent on Enter without typing", () => {
      create();
      focus(input);
      pressEnter(input);
      focus(secondInput);
      pressEnter(secondInput);

      expect(fp.selectedDates).toEqual(range(20, 25));
      expect(onValueUpdate).not.toHaveBeenCalled();
      expect(onChange).not.toHaveBeenCalled();
    });

    it("keeps the end when moving on from a typed start", () => {
      create();
      focus(input);
      input.value = "2017-10-22";
      focus(secondInput);

      expect(fp.selectedDates).toEqual(range(22, 25));
      expect(shown()).toEqual(["2017-10-22", "2017-10-25"]);
      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it("announces a typed start once on Enter", () => {
      create();
      focus(input);
      input.value = "2017-10-22";
      pressEnter(input);

      expect(fp.selectedDates).toEqual(range(22, 25));
      expect(shown()).toEqual(["2017-10-22", "2017-10-25"]);
      expect(onValueUpdate).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it("keeps the start when a typed end is committed by Enter", () => {
      create();
      focus(secondInput);
      secondInput.value = "2017-10-28";
      pressEnter(secondInput);

      expect(fp.selectedDates).toEqual(range(20, 28));
      expect(shown()).toEqual(["2017-10-20", "2017-10-28"]);
      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it("commits a typed end when clicking outside", () => {
      create();
      focus(secondInput);
      secondInput.value = "2017-10-28";
      clickOutside();

      expect(fp.selectedDates).toEqual(range(20, 28));
      expect(shown()).toEqual(["2017-10-20", "2017-10-28"]);
      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it("commits both ends typed before either is committed", () => {
      create();
      focus(secondInput);
      secondInput.value = "2017-10-28";
      focus(input);
      input.value = "2017-10-22";
      focus(secondInput);

      expect(fp.selectedDates).toEqual(range(22, 28));
      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it("takes the end along with a typed start past it, as picking a day does", () => {
      create();
      focus(input);
      input.value = "2017-10-26";
      focus(secondInput);

      expect(fp.selectedDates).toEqual(range(26, 26));
      expect(shown()).toEqual(["2017-10-26", "2017-10-26"]);
    });

    it("takes the start along with a typed end before it", () => {
      create();
      focus(secondInput);
      secondInput.value = "2017-10-18";
      pressEnter(secondInput);

      expect(fp.selectedDates).toEqual(range(18, 18));
      expect(shown()).toEqual(["2017-10-18", "2017-10-18"]);
    });

    it("takes the start along with a typed end before it when clickOpens is false", () => {
      create({ clickOpens: false });
      secondInput.value = "2017-10-18";
      pressEnter(secondInput);

      expect(fp.selectedDates).toEqual(range(18, 18));
    });

    // the second input commits on Enter and outside clicks only
    describe("an end emptied or typed as text that can't be parsed", () => {
      const errorHandler = jest.fn();

      beforeEach(() => errorHandler.mockClear());

      const commits: Record<string, (typedInto: HTMLInputElement) => void> = {
        "moving to the second input": () => focus(secondInput),
        Enter: (typedInto) => pressEnter(typedInto),
        "clicking outside": () => clickOutside(),
      };

      it.each([
        ["start", "", "moving to the second input"],
        ["start", "", "Enter"],
        ["start", "", "clicking outside"],
        ["start", "garbage", "moving to the second input"],
        ["start", "garbage", "Enter"],
        ["start", "garbage", "clicking outside"],
        ["end", "", "Enter"],
        ["end", "", "clicking outside"],
        ["end", "garbage", "Enter"],
        ["end", "garbage", "clicking outside"],
      ])(
        "keeps the other end as both ends: the %s as %j, then %s",
        (end, text, commit) => {
          create({ errorHandler });
          const typedInto = end === "start" ? fp._input : secondInput;
          const kept = end === "start" ? 25 : 20;
          focus(typedInto);
          typedInto.value = text;
          commits[commit](typedInto);

          expect(fp.selectedDates).toEqual(range(kept, kept));
          expect(shown()).toEqual([`2017-10-${kept}`, `2017-10-${kept}`]);
          expect(onChange).toHaveBeenCalledTimes(1);
          expect(errorHandler).toHaveBeenCalledTimes(text ? 1 : 0);
        }
      );

      it("keeps the other typed end as both ends", () => {
        create({ errorHandler });
        focus(secondInput);
        secondInput.value = "2017-10-28";
        focus(input);
        input.value = "garbage";
        clickOutside();

        expect(fp.selectedDates).toEqual(range(28, 28));
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(errorHandler).toHaveBeenCalledTimes(1);
      });

      it("drops the range when neither typed end can be parsed", () => {
        create({ errorHandler });
        focus(secondInput);
        secondInput.value = "garbage";
        focus(input);
        input.value = "rubbish";
        focus(secondInput);

        expect(fp.selectedDates).toEqual([]);
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(errorHandler).toHaveBeenCalledTimes(2);
      });
    });

    it("announces an end picked on the calendar once after leaving the first input", () => {
      create();
      focus(input);
      clickDay(22);
      expect(fp.selectedDates).toEqual(range(22, 25));
      onChange.mockClear();

      focus(secondInput);
      clickDay(27);

      expect(fp.selectedDates).toEqual(range(22, 27));
      expect(onChange).toHaveBeenCalledTimes(1);
    });

    // flatpickr#2700: the plugin keeps the other end, so nothing changes
    it.each([
      ["start", 20],
      ["end", 25],
    ])(
      "stays silent when picking the %s it has on the calendar",
      (end, day) => {
        create();
        focus(end === "start" ? input : secondInput);
        clickDay(day);

        expect(fp.selectedDates).toEqual(range(20, 25));
        expect(shown()).toEqual(["2017-10-20", "2017-10-25"]);
        expect(onChange).not.toHaveBeenCalled();
      }
    );

    it("builds a range typed start first, then end", () => {
      create({ defaultDate: undefined });
      focus(input);
      input.value = "2017-10-20";
      focus(secondInput);

      expect(fp.selectedDates).toEqual(range(20));
      expect(shown()).toEqual(["2017-10-20", ""]);

      secondInput.value = "2017-10-25";
      pressEnter(secondInput);

      expect(fp.selectedDates).toEqual(range(20, 25));
    });

    // flatpickr#3108: a range keeps both ends or neither
    it("drops a typed start alone when clicking outside", () => {
      create({ defaultDate: undefined });
      focus(input);
      input.value = "2017-10-20";
      clickOutside();

      expect(fp.selectedDates).toEqual([]);
      expect(shown()).toEqual(["", ""]);
    });

    it("keeps a same-day range and the view when clicking outside without typing", () => {
      const onMonthChange = jest.fn();
      // with the range still in view, closing leaves the view (flatpickr#2835)
      // and only a commit would move it
      create({
        defaultDate: ["2017-10-20", "2017-10-20"],
        showMonths: 2,
        onMonthChange,
      });
      focus(input);
      fp.changeMonth(-1);
      clickOutside();

      expect(fp.selectedDates).toEqual(range(20, 20));
      expect(fp.currentMonth).toEqual(8);
      expect(onMonthChange).toHaveBeenCalledTimes(1);
      expect(onChange).not.toHaveBeenCalled();
    });

    it("shows the range again after committing a typed start that keeps it", () => {
      create();
      focus(input);
      input.value = "2017-10-20 ";
      pressEnter(input);

      expect(fp.selectedDates).toEqual(range(20, 25));
      expect(shown()).toEqual(["2017-10-20", "2017-10-25"]);
    });

    it("keeps the whole range in the original input with altInput", () => {
      create({ altInput: true, altFormat: "d/m/Y" });
      focus(fp._input);
      fp._input.value = "22/10/2017";
      focus(secondInput);

      expect(fp.selectedDates).toEqual(range(22, 25));
      expect(input.value).toEqual("2017-10-22 to 2017-10-25");
      expect(shown()).toEqual(["22/10/2017", "25/10/2017"]);
    });

    it("shows a range set without triggerChange in both inputs", () => {
      create();
      fp.setDate(["2017-10-01", "2017-10-05"]);

      expect(shown()).toEqual(["2017-10-01", "2017-10-05"]);
    });

    it("empties both inputs when setDate clears the range without triggerChange", () => {
      create();
      fp.setDate([]);

      expect(shown()).toEqual(["", ""]);
    });

    it("keeps a range set without triggerChange when moving between the inputs", () => {
      create();
      fp.setDate(["2017-10-01", "2017-10-05"]);
      focus(input);
      focus(secondInput);

      expect(fp.selectedDates).toEqual(range(1, 5));
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  // flatpickr#2712: a day picked for an end of a range with a time
  describe("picking a day for an end with enableTime", () => {
    let input: HTMLInputElement,
      secondInput: HTMLInputElement,
      fp: Instance,
      onChange: jest.Mock;

    const create = (options: Options = {}) => {
      fp = flatpickr(input, {
        plugins: [rangePlugin({ input: secondInput })],
        enableTime: true,
        time_24hr: true,
        dateFormat: "Y-m-d H:i",
        defaultDate: ["2017-10-20 09:15", "2017-10-25 17:45"],
        onChange,
        ...options,
      });
    };

    beforeEach(() => {
      input = document.createElement("input");
      secondInput = document.createElement("input");
      document.body.append(input, secondInput);
      onChange = jest.fn();
    });

    afterEach(() => {
      fp.destroy();
      input.remove();
      secondInput.remove();
    });

    const selected = () =>
      fp.selectedDates.map((date) => fp.formatDate(date, "Y-m-d H:i"));

    const time = () => `${fp.hourElement!.value}:${fp.minuteElement!.value}`;

    const focus = (elem: HTMLInputElement) => {
      elem.focus();
      jest.runAllTimers();
    };

    const clickDay = (day: number) => {
      (Array.from(fp.days.childNodes) as DayElement[])
        .find((d) => d.dateObj.getMonth() === 9 && d.dateObj.getDate() === day)!
        .click();
      jest.runAllTimers();
    };

    const incrementHour = () => {
      fp.hourElement!.parentNode!.childNodes[1].dispatchEvent(
        new MouseEvent("click", { bubbles: true })
      );
      jest.runAllTimers();
    };

    it.each([
      ["start", 22, ["2017-10-22 09:15", "2017-10-25 17:45"], "09:15"],
      ["end", 27, ["2017-10-20 09:15", "2017-10-27 17:45"], "17:45"],
    ])(
      "keeps the time the %s shows on the day picked for it",
      (end, day, expected, shownTime) => {
        create();
        focus(end === "start" ? input : secondInput);
        expect(time()).toEqual(shownTime);

        clickDay(day);

        expect(selected()).toEqual(expected);
        expect(time()).toEqual(shownTime);
      }
    );

    it("keeps the time inputs on the start after picking its day", () => {
      create();
      focus(input);
      clickDay(22);
      incrementHour();

      expect(selected()).toEqual(["2017-10-22 10:15", "2017-10-25 17:45"]);
    });

    it.each([
      ["start", "past the end", 27, ["2017-10-27 09:15", "2017-10-27 09:15"]],
      ["end", "before the start", 18, ["2017-10-18 17:45", "2017-10-18 17:45"]],
    ])(
      "takes the other end along to the time of the %s picked %s",
      (end, _, day, expected) => {
        create();
        focus(end === "start" ? input : secondInput);
        clickDay(day);

        expect(selected()).toEqual(expected);
      }
    );

    it.each([
      ["start", 20],
      ["end", 25],
    ])("stays silent when picking the day the %s has", (end, day) => {
      create();
      focus(end === "start" ? input : secondInput);
      clickDay(day);

      expect(selected()).toEqual(["2017-10-20 09:15", "2017-10-25 17:45"]);
      expect(onChange).not.toHaveBeenCalled();
    });

    it.each([
      [
        "start",
        {
          minDate: "2017-10-22 10:30",
          defaultDate: ["2017-10-23 09:15", "2017-10-25 17:45"],
        },
        22,
        ["2017-10-22 10:30", "2017-10-25 17:45"],
      ],
      [
        "end",
        { maxDate: "2017-10-27 16:00" },
        27,
        ["2017-10-20 09:15", "2017-10-27 16:00"],
      ],
    ])(
      "holds the %s's time within the limit on the limit's day",
      (end, options, day, expected) => {
        create(options);
        focus(end === "start" ? input : secondInput);
        clickDay(day);

        expect(selected()).toEqual(expected);
      }
    );

    it("keeps the time of a date set for an end", () => {
      create();
      fp.setDate(new Date(2017, 9, 23, 8, 0), true);

      expect(selected()).toEqual(["2017-10-23 08:00", "2017-10-25 17:45"]);
      expect(time()).toEqual("08:00");
    });

    // a range without the plugin starts over, as from no dates
    it("leaves a new range without rangePlugin at the default time", () => {
      create({ plugins: [], mode: "range" });
      fp.open();
      clickDay(22);

      expect(selected()).toEqual(["2017-10-22 12:00"]);
      expect(time()).toEqual("12:00");
    });
  });
});
