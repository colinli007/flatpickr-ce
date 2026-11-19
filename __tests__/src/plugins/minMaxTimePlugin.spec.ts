import flatpickr from "index";
import minMaxTimePlugin from "plugins/minMaxTimePlugin";
import { Instance } from "types/instance";

flatpickr.defaultConfig.animate = false;

jest.useFakeTimers();

describe("minMaxTimePlugin", () => {
  describe("with a page's formatDate and parseDate (flatpickr#2170)", () => {
    // A page's date functions, as with moment or date-fns: their tokens
    // aren't flatpickr's
    const pageFormatDate = (date: Date, format: string) => {
      const fields: Record<string, number> = {
        YYYY: date.getFullYear(),
        MM: date.getMonth() + 1,
        DD: date.getDate(),
        HH: date.getHours(),
        mm: date.getMinutes(),
      };
      return format.replace(/YYYY|MM|DD|HH|mm/g, (t) =>
        `000${fields[t]}`.slice(-t.length)
      );
    };
    const pageParseDate = (str: string) => {
      const [d, m, y, h, i] = (str.match(/\d+/g) || []).map(Number);
      return new Date(y, m - 1, d, h, i);
    };

    it("keeps minTime and maxTime on a day without limits of its own", () => {
      const errorHandler = jest.fn();
      const fp = flatpickr(document.createElement("input"), {
        enableTime: true,
        dateFormat: "DD.MM.YYYY HH:mm",
        formatDate: pageFormatDate,
        parseDate: pageParseDate,
        errorHandler,
        minTime: "09:00",
        maxTime: "17:30",
        plugins: [
          minMaxTimePlugin({
            // the table's days in the page's format
            tableDateFormat: "YYYY-MM-DD",
            table: { "2020-05-13": { minTime: "10:15" } },
          }),
        ],
      }) as Instance;

      fp.setDate("13.05.2020 08:00", true);
      expect(fp.input.value).toBe("13.05.2020 10:15");

      fp.setDate("12.05.2020 08:00", true);
      expect(fp.input.value).toBe("12.05.2020 09:00");

      fp.setDate("12.05.2020 18:00", true);
      expect(fp.input.value).toBe("12.05.2020 17:30");

      expect(errorHandler).not.toHaveBeenCalled();

      fp.destroy();
    });

    it("finds a day by the plugin's own default key", () => {
      const fp = flatpickr(document.createElement("input"), {
        enableTime: true,
        dateFormat: "DD.MM.YYYY HH:mm",
        formatDate: pageFormatDate,
        parseDate: pageParseDate,
        minTime: "09:00",
        maxTime: "17:30",
        plugins: [
          // no tableDateFormat: the keys are the plugin's default, Y-m-d
          minMaxTimePlugin({ table: { "2020-05-13": { minTime: "10:15" } } }),
        ],
      }) as Instance;

      fp.setDate("13.05.2020 08:00", true);
      expect(fp.input.value).toBe("13.05.2020 10:15");

      fp.destroy();
    });
  });
});
