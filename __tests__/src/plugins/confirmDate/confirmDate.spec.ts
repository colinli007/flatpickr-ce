import flatpickr from "index";
import confirmDatePlugin from "plugins/confirmDate/confirmDate";
import { Instance } from "types/instance";
import { Options } from "types/options";

flatpickr.defaultConfig.animate = false;

jest.useFakeTimers();

const keyDown = (target: Element, key: string, keyCode: number) =>
  target.dispatchEvent(
    new KeyboardEvent("keydown", { key, keyCode, bubbles: true })
  );

const confirmButton = (fp: Instance) =>
  fp.calendarContainer.querySelector<HTMLElement>(".flatpickr-confirm")!;

describe("confirmDate", () => {
  describe("one plugin value shared by several instances (flatpickr#2298)", () => {
    // The two ways a page gives every picker the same confirmDatePlugin({...})
    const sharingWays: [string, (options: Options) => Instance[]][] = [
      [
        "one flatpickr() call for several inputs",
        (options) =>
          flatpickr(
            [document.createElement("input"), document.createElement("input")],
            { ...options, plugins: [confirmDatePlugin({})] }
          ),
      ],
      [
        "setDefaults",
        (options) => {
          flatpickr.setDefaults({ plugins: [confirmDatePlugin({})] });
          try {
            return [
              flatpickr(document.createElement("input"), options),
              flatpickr(document.createElement("input"), options),
            ];
          } finally {
            delete flatpickr.defaultConfig.plugins;
          }
        },
      ],
    ];

    let instances: Instance[] = [];

    afterEach(() => {
      instances.forEach((fp) => fp.destroy());
      instances = [];
    });

    sharingWays.forEach(([way, createInstances]) => {
      describe(`through ${way}`, () => {
        it("moves Tab from the last time input to the picker's own button", () => {
          instances = createInstances({ enableTime: true });

          instances.forEach((fp) => {
            fp.open();
            fp.amPM!.focus();
            keyDown(fp.amPM!, "Tab", 9);

            expect(document.activeElement).toBe(confirmButton(fp));
            fp.close();
          });
        });

        it("closes the picker whose button gets Enter", () => {
          instances = createInstances({ enableTime: true });

          instances.forEach((fp) => {
            fp.open();
            keyDown(confirmButton(fp), "Enter", 13);

            expect(fp.isOpen).toBe(false);
          });
        });

        it("shows the button of the picker whose date changed", () => {
          instances = createInstances({ enableTime: true });
          const [a, b] = instances;

          a.setDate("2016-10-20 10:00", true);
          expect(confirmButton(a).classList).toContain("visible");
          expect(confirmButton(b).classList).not.toContain("visible");

          a.clear();
          expect(confirmButton(a).classList).not.toContain("visible");
        });
      });
    });
  });
});
