/* Occitan locals for flatpickr */
import { CustomLocale } from "../types/locale";
import { FlatpickrFn } from "../types/instance";

const fp =
  typeof window !== "undefined" && window.flatpickr !== undefined
    ? window.flatpickr
    : ({
        l10ns: {},
      } as FlatpickrFn);

export const Occitan: CustomLocale = {
  weekdays: {
    shorthand: ["dg", "dl", "dm", "dc", "dj", "dv", "ds"],
    longhand: [
      "dimenge",
      "diluns",
      "dimars",
      "dimècres",
      "dijòus",
      "divendres",
      "dissabte",
    ],
  },

  months: {
    shorthand: [
      "gen.",
      "feb.",
      "març",
      "abr.",
      "mai",
      "junh",
      "jul.",
      "ago.",
      "set.",
      "oct.",
      "nov.",
      "dec.",
    ],
    longhand: [
      "genièr",
      "febrièr",
      "març",
      "abril",
      "mai",
      "junh",
      "julhet",
      "agost",
      "setembre",
      "octòbre",
      "novembre",
      "decembre",
    ],
  },

  ordinal: (nth) => (nth === 1 ? "èr" : ""),

  firstDayOfWeek: 1,
  time_24hr: true,
};

fp.l10ns.oc = Occitan;

export default fp.l10ns;
