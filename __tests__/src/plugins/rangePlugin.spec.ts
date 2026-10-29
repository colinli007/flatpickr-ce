import flatpickr from "index";
import rangePlugin from "plugins/rangePlugin";
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
      }) as Instance;
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

  it("keeps the calendar under the second input when the window resizes", () => {
    const input = document.createElement("input");
    const secondInput = document.createElement("input");
    document.body.append(input, secondInput);
    const rect = (left: number) => () =>
      ({
        top: 100,
        left,
        width: 100,
        right: left + 100,
        bottom: 130,
        height: 30,
      } as DOMRect);
    input.getBoundingClientRect = rect(50);
    secondInput.getBoundingClientRect = rect(500);
    const fp = flatpickr(input, {
      plugins: [rangePlugin({ input: secondInput })],
    });

    input.focus();
    const firstLeft = fp.calendarContainer.style.left;
    secondInput.focus();
    const secondLeft = fp.calendarContainer.style.left;
    expect(secondLeft).not.toBe(firstLeft);

    fp.calendarContainer.style.left = ""; // only the resize can restore it
    window.dispatchEvent(new Event("resize"));
    jest.advanceTimersByTime(50); // resize is debounced
    expect(fp.calendarContainer.style.left).toBe(secondLeft);

    fp.destroy();
    input.remove();
    secondInput.remove();
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
    }) as Instance;
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
