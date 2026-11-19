/* Bulgarian locals for flatpickr */
import { CustomLocale } from "../types/locale";
import { FlatpickrFn } from "../types/instance";

const fp =
  typeof window !== "undefined" && window.flatpickr !== undefined
    ? window.flatpickr
    : ({
        l10ns: {},
      } as FlatpickrFn);

export const Bulgarian: CustomLocale = {
  weekdays: {
    shorthand: ["нд", "пн", "вт", "ср", "чт", "пт", "сб"],
    longhand: [
      "неделя",
      "понеделник",
      "вторник",
      "сряда",
      "четвъртък",
      "петък",
      "събота",
    ],
  },

  months: {
    shorthand: [
      "яну",
      "фев",
      "март",
      "апр",
      "май",
      "юни",
      "юли",
      "авг",
      "сеп",
      "окт",
      "ное",
      "дек",
    ],
    longhand: [
      "януари",
      "февруари",
      "март",
      "април",
      "май",
      "юни",
      "юли",
      "август",
      "септември",
      "октомври",
      "ноември",
      "декември",
    ],
  },
  time_24hr: true,
  firstDayOfWeek: 1,
  rangeSeparator: " до ",
};

fp.l10ns.bg = Bulgarian;
export default fp.l10ns;
