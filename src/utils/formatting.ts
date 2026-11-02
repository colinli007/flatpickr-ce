import { int, pad } from "../utils";
import { Locale } from "../types/locale";
import { ParsedOptions } from "../types/options";

export type token =
  | "D"
  | "F"
  | "G"
  | "H"
  | "J"
  | "K"
  | "M"
  | "S"
  | "U"
  | "W"
  | "Y"
  | "Z"
  | "d"
  | "h"
  | "i"
  | "j"
  | "l"
  | "m"
  | "n"
  | "s"
  | "u"
  | "w"
  | "y";

const doNothing = (): undefined => undefined;

export const monthToStr = (
  monthNumber: number,
  shorthand: boolean,
  locale: Locale
) => locale.months[shorthand ? "shorthand" : "longhand"][monthNumber];

// The parser matches names with the i flag, which compares characters by their
// upper case, so a matched month name is looked up the same way
const monthIndex = (monthNames: string[], monthName: string) =>
  monthNames.map((name) => name.toUpperCase()).indexOf(monthName.toUpperCase());

export type RevFormatFn = (
  date: Date,
  data: string,
  locale: Locale
) => Date | void | undefined;
export type RevFormat = Record<string, RevFormatFn>;

// Date carries a value past a field's range over into the next field (month 13
// into the next year, hour 24 into the next day), so a value the field doesn't
// have gives an invalid date, which the parser reports as such
const invalidDate = () => new Date(NaN);

const setInRange = (
  min: number,
  max: number,
  set: (dateObj: Date, value: number) => void
): RevFormatFn => (dateObj: Date, data: string) => {
  const value = parseFloat(data);
  if (value < min || value > max) return invalidDate();
  set(dateObj, value);
};

// The day is written after the year and the month (see createDateParser), so a
// day that month doesn't have moves the date into the next one
const setDay = (dateObj: Date, day: string) => {
  const value = parseFloat(day);
  dateObj.setDate(value);
  if (dateObj.getDate() !== value) return invalidDate();
};

const setMonth = setInRange(1, 12, (dateObj, month) => {
  dateObj.setMonth(month - 1, 1);
});

const setHours = setInRange(0, 23, (dateObj, hour) => {
  dateObj.setHours(hour);
});

const setHours12 = setInRange(0, 23, (dateObj, hour) => {
  dateObj.setHours((dateObj.getHours() >= 12 ? 12 : 0) + hour);
});

const setSeconds = setInRange(0, 59, (dateObj, seconds) => {
  dateObj.setSeconds(seconds);
});

// Month setters start the month on the 1st: the day, if any, is written after
// the month (see createDateParser), and the base date's day may not exist in it
export const revFormat: RevFormat = {
  D: doNothing,
  F: function (dateObj: Date, monthName: string, locale: Locale) {
    dateObj.setMonth(monthIndex(locale.months.longhand, monthName), 1);
  },
  G: setHours12,
  H: setHours,
  J: setDay,
  K: (dateObj: Date, amPM: string, locale: Locale) => {
    dateObj.setHours(
      (dateObj.getHours() % 12) +
        12 * int(new RegExp(locale.amPM[1], "i").test(amPM))
    );
  },
  M: function (dateObj: Date, shortMonth: string, locale: Locale) {
    dateObj.setMonth(monthIndex(locale.months.shorthand, shortMonth), 1);
  },
  S: setSeconds,
  U: (_: Date, unixSeconds: string) => new Date(parseFloat(unixSeconds) * 1000),

  W: function (dateObj: Date, weekNum: string, locale: Locale) {
    const weekNumber = parseInt(weekNum);
    const date = new Date(
      dateObj.getFullYear(),
      0,
      2 + (weekNumber - 1) * 7,
      0,
      0,
      0,
      0
    );
    date.setDate(date.getDate() - date.getDay() + locale.firstDayOfWeek);

    return date;
  },
  Y: (dateObj: Date, year: string) => {
    dateObj.setFullYear(parseFloat(year));
  },
  Z: (_: Date, ISODate: string) => new Date(ISODate),

  d: setDay,
  h: setHours12,
  i: setInRange(0, 59, (dateObj, minutes) => {
    dateObj.setMinutes(minutes);
  }),
  j: setDay,
  l: doNothing,
  m: setMonth,
  n: setMonth,
  s: setSeconds,
  u: (_: Date, unixMillSeconds: string) =>
    new Date(parseFloat(unixMillSeconds)),
  w: doNothing,
  y: (dateObj: Date, year: string) => {
    dateObj.setFullYear(2000 + parseFloat(year));
  },
};

export type TokenRegex = { [k in token]: string };
export const tokenRegex: TokenRegex = {
  D: "", // locale-dependent, setup on runtime
  F: "", // locale-dependent, setup on runtime
  G: "(\\d\\d|\\d)",
  H: "(\\d\\d|\\d)",
  J: "(\\d\\d|\\d)\\w+",
  K: "", // locale-dependent, setup on runtime
  M: "", // locale-dependent, setup on runtime
  S: "(\\d\\d|\\d)",
  U: "(.+)",
  W: "(\\d\\d|\\d)",
  Y: "(\\d{4})",
  Z: "(.+)",
  d: "(\\d\\d|\\d)",
  h: "(\\d\\d|\\d)",
  i: "(\\d\\d|\\d)",
  j: "(\\d\\d|\\d)",
  l: "", // locale-dependent, setup on runtime
  m: "(\\d\\d|\\d)",
  n: "(\\d\\d|\\d)",
  s: "(\\d\\d|\\d)",
  u: "(.+)",
  w: "(\\d\\d|\\d)",
  y: "(\\d{2})",
};

export type Formats = Record<
  token,
  (date: Date, locale: Locale, options: ParsedOptions) => string | number
>;
export const formats: Formats = {
  // get the date in UTC
  Z: (date: Date) => date.toISOString(),

  // weekday name, short, e.g. Thu
  D: function (date: Date, locale: Locale, options: ParsedOptions) {
    return locale.weekdays.shorthand[
      formats.w(date, locale, options) as number
    ];
  },

  // full month name e.g. January
  F: function (date: Date, locale: Locale, options: ParsedOptions) {
    return monthToStr(
      (formats.n(date, locale, options) as number) - 1,
      false,
      locale
    );
  },

  // padded hour 1-12
  G: function (date: Date, locale: Locale, options: ParsedOptions) {
    return pad(formats.h(date, locale, options));
  },

  // hours with leading zero e.g. 03
  H: (date: Date) => pad(date.getHours()),

  // day (1-30) with ordinal suffix e.g. 1st, 2nd
  J: function (date: Date, locale: Locale) {
    return locale.ordinal !== undefined
      ? date.getDate() + locale.ordinal(date.getDate())
      : date.getDate();
  },

  // AM/PM
  K: (date: Date, locale: Locale) => locale.amPM[int(date.getHours() > 11)],

  // shorthand month e.g. Jan, Sep, Oct, etc
  M: function (date: Date, locale: Locale) {
    return monthToStr(date.getMonth(), true, locale);
  },

  // seconds 00-59
  S: (date: Date) => pad(date.getSeconds()),

  // unix timestamp
  U: (date: Date) => date.getTime() / 1000,

  W: function (date: Date, _: Locale, options: ParsedOptions) {
    return options.getWeek(date);
  },

  // full year e.g. 2016, padded (0001-9999)
  Y: (date: Date) => pad(date.getFullYear(), 4),

  // day in month, padded (01-30)
  d: (date: Date) => pad(date.getDate()),

  // hour from 1-12 (am/pm)
  h: (date: Date) => (date.getHours() % 12 ? date.getHours() % 12 : 12),

  // minutes, padded with leading zero e.g. 09
  i: (date: Date) => pad(date.getMinutes()),

  // day in month (1-30)
  j: (date: Date) => date.getDate(),

  // weekday name, full, e.g. Thursday
  l: function (date: Date, locale: Locale) {
    return locale.weekdays.longhand[date.getDay()];
  },

  // padded month number (01-12)
  m: (date: Date) => pad(date.getMonth() + 1),

  // the month number (1-12)
  n: (date: Date) => date.getMonth() + 1,

  // seconds 0-59
  s: (date: Date) => date.getSeconds(),

  // Unix Milliseconds
  u: (date: Date) => date.getTime(),

  // number of the day of the week
  w: (date: Date) => date.getDay(),

  // last two digits of year e.g. 16 for 2016
  y: (date: Date) => String(date.getFullYear()).substring(2),
};
