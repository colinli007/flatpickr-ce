import flatpickr from "index";
import momentPlugin from "plugins/momentPlugin";
import { Instance } from "types/instance";

flatpickr.defaultConfig.animate = false;

jest.useFakeTimers();

// Records what the plugin adds to the date, which it leaves as it is
const fakeMoment = (added: [number, string][]) => (date: Date) => ({
  add: (amount: number, unit: string) => added.push([amount, unit]),
  toDate: () => new Date(date.getTime()),
  format: () => "",
  locale: () => undefined,
});

describe("momentPlugin", () => {
  it("adds hourIncrement and minuteIncrement, the seconds with the minutes", () => {
    const added: [number, string][] = [];
    const fp = flatpickr(document.createElement("input"), {
      enableTime: true,
      enableSeconds: true,
      hourIncrement: 2,
      minuteIncrement: 10,
      defaultDate: new Date(2099, 5, 5, 13, 7, 37),
      plugins: [momentPlugin({ moment: fakeMoment(added) })],
    }) as Instance;

    for (const input of [fp.hourElement, fp.minuteElement, fp.secondElement])
      (input!.parentNode!.querySelector(".arrowUp") as HTMLElement).click();

    expect(added).toEqual([
      [2, "hour"],
      [10, "minute"],
      [10, "second"],
    ]);

    fp.destroy();
  });

  it("adds secondIncrement to the seconds when it's given", () => {
    const added: [number, string][] = [];
    const fp = flatpickr(document.createElement("input"), {
      enableTime: true,
      enableSeconds: true,
      secondIncrement: 15,
      defaultDate: new Date(2099, 5, 5, 13, 7, 37),
      plugins: [momentPlugin({ moment: fakeMoment(added) })],
    }) as Instance;

    (fp.secondElement!.parentNode!.querySelector(
      ".arrowUp"
    ) as HTMLElement).click();

    expect(added).toEqual([[15, "second"]]);

    fp.destroy();
  });
});
