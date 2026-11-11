import flatpickr from "index";
import scrollPlugin from "plugins/scrollPlugin";
import { Instance } from "types/instance";

flatpickr.defaultConfig.animate = false;

jest.useFakeTimers();

const wheelUp = (elem: Element) =>
  elem.dispatchEvent(
    new WheelEvent("wheel", { deltaY: -100, bubbles: true, cancelable: true })
  );

describe("scrollPlugin", () => {
  // flatpickr#2510: transpileModule, which the dist build and ts-jest's
  // isolatedModules use, turned the polyfill's const into a var that
  // shadowed window.CustomEvent
  it("steps the time inputs with the wheel", () => {
    const fp = flatpickr(document.createElement("input"), {
      enableTime: true,
      time_24hr: true,
      defaultDate: new Date(2099, 5, 5, 13, 20),
      plugins: [scrollPlugin()],
    }) as Instance;

    wheelUp(fp.hourElement!);
    wheelUp(fp.minuteElement!);

    expect(fp.hourElement!.value).toEqual("14");
    expect(fp.minuteElement!.value).toEqual("25");
    expect(fp.selectedDates[0]).toEqual(new Date(2099, 5, 5, 14, 25));
  });

  it("steps the year with the wheel", () => {
    const fp = flatpickr(document.createElement("input"), {
      defaultDate: new Date(2099, 5, 5),
      plugins: [scrollPlugin()],
    }) as Instance;

    wheelUp(fp.currentYearElement);

    expect(fp.currentYear).toEqual(2100);
    expect(fp.currentYearElement.value).toEqual("2100");
  });

  it("puts a CustomEvent on window where there is none", () => {
    const { CustomEvent } = window;
    delete (window as any).CustomEvent;

    try {
      jest.isolateModules(() => {
        const plugin = require("plugins/scrollPlugin").default;
        expect(typeof window.CustomEvent).toEqual("function");

        const fp = flatpickr(document.createElement("input"), {
          enableTime: true,
          time_24hr: true,
          defaultDate: new Date(2099, 5, 5, 13, 20),
          plugins: [plugin()],
        }) as Instance;

        wheelUp(fp.hourElement!);

        expect(fp.hourElement!.value).toEqual("14");
      });
    } finally {
      window.CustomEvent = CustomEvent;
    }
  });
});
