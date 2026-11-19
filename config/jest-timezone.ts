// Tests run in a zone with daylight saving time, where March 8th, 2020 skips
// 2:00-3:00 AM, so dates are parsed and written against a day missing an hour
// (flatpickr#2145). The zone is read when the process starts, and a test can't
// change it, so it is set here, before the test workers start.
export default () => {
  process.env.TZ = "America/Chicago";
};
