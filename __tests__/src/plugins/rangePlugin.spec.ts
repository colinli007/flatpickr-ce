import flatpickr from "index";
import rangePlugin from "plugins/rangePlugin";
import { Options } from "types/options";
import { Instance } from "types/instance";

type RangeInstance = Instance & {
  secondInput: HTMLInputElement;
};

flatpickr.defaultConfig.animate = false;

jest.useFakeTimers();

const createInstance = (config?: Options): Instance => {
  return flatpickr(
    document.createElement("input"),
    config as Options
  ) as Instance;
};

describe("rangePlugin", () => {
  it("should correctly preload defaultDate", () => {
    const secondInput = document.createElement("input");
    const fp = createInstance({
      plugins: [rangePlugin({ input: secondInput })],
      defaultDate: ["2017-10-20", "2017-10-25"],
      dateFormat: "Y-m-d",
    }) as RangeInstance;

    expect(fp.selectedDates.length).toEqual(2);
    expect(secondInput.value).toEqual("2017-10-25");
  });

  it("should set readonly attribute when allowInput is false", () => {
    const secondInput = document.createElement("input");
    const fp = createInstance({
      plugins: [rangePlugin({ input: secondInput })],
      allowInput: false,
    }) as RangeInstance;

    expect(fp._input.getAttribute("readonly")).toBe("readonly");
    expect(secondInput.getAttribute("readonly")).toBe("readonly");
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
