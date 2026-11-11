import flatpickr from "index";
import weekSelectPlugin, { PlusWeeks } from "plugins/weekSelect/weekSelect";
import { Instance } from "types/instance";
import { Plugin } from "types/options";

flatpickr.defaultConfig.animate = false;

jest.useFakeTimers();

describe("weekSelect", () => {
  it("keeps the selected week when closing after browsing away (flatpickr#2835)", () => {
    let atClose: Date[] = [];
    const fp = flatpickr(document.createElement("input"), {
      plugins: [weekSelectPlugin() as Plugin],
      onClose: (_, __, instance) => {
        const { weekStartDay, weekEndDay } = instance as Instance & PlusWeeks;
        atClose = [weekStartDay, weekEndDay];
      },
    }) as Instance & PlusWeeks;

    fp.jumpToDate("2016-10-20");
    fp.open();
    fp.days
      .querySelector('[aria-label="October 20, 2016"]')!
      .dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(fp.isOpen).toBe(false);

    fp.open();
    fp.changeMonth(2);
    fp.close();

    expect([fp.currentYear, fp.currentMonth]).toEqual([2016, 9]);
    expect(atClose).toEqual([new Date(2016, 9, 16), new Date(2016, 9, 22)]);
    expect(fp.weekStartDay).toEqual(new Date(2016, 9, 16));
    expect(fp.weekEndDay).toEqual(new Date(2016, 9, 22));
    expect(fp.days.querySelectorAll(".week.selected")).toHaveLength(7);

    fp.destroy();
  });

  describe("on a mobile device", () => {
    beforeEach(() => {
      jest.spyOn(navigator, "userAgent", "get").mockReturnValue("Android");
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("picks a week on the day grid instead of the native date input #2824", () => {
      const fp = flatpickr(document.createElement("input"), {
        // Plugin<PlusWeeks> takes the instance with the fields weekSelect adds
        plugins: [weekSelectPlugin() as Plugin],
      }) as Instance & PlusWeeks;

      expect(fp.isMobile).toBe(false);
      expect(fp.mobileInput).toBeUndefined();

      fp.jumpToDate("2016-10-20");
      fp.days
        .querySelector('[aria-label="October 20, 2016"]')!
        .dispatchEvent(new MouseEvent("click", { bubbles: true }));

      expect(fp.weekStartDay).toEqual(new Date(2016, 9, 16));
      expect(fp.weekEndDay).toEqual(new Date(2016, 9, 22));
      expect(fp.days.querySelectorAll(".week.selected")).toHaveLength(7);
    });
  });
});
