import flatpickr from "index";
import rangePlugin, { Config } from "plugins/rangePlugin";
import { Options } from "types/options";
import { Instance } from "types/instance";

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
    input.value = "2017-10-20";
    wrapper.appendChild(input);
    const fp = flatpickr(input, {
      plugins: [rangePlugin()],
      dateFormat: "Y-m-d",
    });

    expect(fp.selectedDates).toEqual([new Date(2017, 9, 20)]);
    expect((input.nextSibling as HTMLInputElement).value).toEqual("");
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

  // _input only shows the first date with this plugin, so flatpickr reads it
  // as an edit and the range gets cleared, as it always has; now it's announced
  // and the second input follows
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

  it("announces the range it clears when clicking outside with allowInput", () => {
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

    expect(fp.selectedDates).toEqual([]);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(secondInput.value).toEqual("");
    expect(consoleError).not.toHaveBeenCalled();

    consoleError.mockRestore();
    fp.destroy();
    input.remove();
    secondInput.remove();
  });
});
