import { Plugin } from "../types/options";

export interface Config {
  input?: string | HTMLInputElement;
  position?: "left";
}

declare global {
  interface Window {
    rangePlugin: (config?: Config) => void;
  }
}

function rangePlugin(config: Config = {}): Plugin {
  return function (fp) {
    let dateFormat = "",
      secondInput: HTMLInputElement,
      _secondInputFocused: boolean,
      _prevDates: Date[] = [];

    // the anchor flatpickr itself uses for fp._input
    const firstInputAnchor = () => fp.config.positionElement || fp._input;

    // the selected dates as the inputs show them: the start in fp._input and
    // the end in the second input
    const shownValue = () => {
      const [first = "", second = ""] = fp.selectedDates.map((d) =>
        fp.formatDate(d, dateFormat)
      );
      return [first, second];
    };

    // What was typed into the inputs since they showed the selected dates, if
    // anything, as the range flatpickr commits: both ends, or none
    const typedValue = () => {
      const shown = shownValue();
      const ends = [fp._input.value, secondInput.value];
      const typed = [0, 1].filter((i) => ends[i] !== shown[i]);

      if (typed.length === 0) return undefined;

      const dates = ends.map((text) => fp.parseDate(text, dateFormat));

      // a typed end that was emptied or doesn't parse leaves the other end as
      // both ends, or none when that one doesn't parse either
      typed.forEach((i) => {
        if (!dates[i]) ends[i] = dates[1 - i] ? ends[1 - i] : "";
      });

      // one end typed past the other takes it along, as a day picked past it
      // does in onValueUpdate
      if (typed.length === 1 && dates[0] && dates[1] && dates[0] > dates[1])
        ends[1 - typed[0]] = ends[typed[0]];

      return ends.join(fp.l10n.rangeSeparator);
    };

    const createSecondInput = () => {
      if (config.input) {
        secondInput =
          config.input instanceof Element
            ? config.input
            : (window.document.querySelector(config.input) as HTMLInputElement);

        if (!secondInput) {
          fp.config.errorHandler(new Error("Invalid input element specified"));
          return;
        }

        if (fp.config.wrap) {
          secondInput = secondInput.querySelector(
            "[data-input]"
          ) as HTMLInputElement;
        }
      } else {
        secondInput = fp._input.cloneNode() as HTMLInputElement;
        secondInput.removeAttribute("id");
        // cloneNode copies the first input's value too
        secondInput.value = "";
        secondInput._flatpickr = undefined;
      }

      // like flatpickr's own input, it only preloads without a defaultDate
      if (!fp.config.defaultDate && secondInput.value) {
        const parsedDate = fp.parseDate(secondInput.value, dateFormat);

        // the inputs preload as one range: this end replaces the one flatpickr
        // read from the first input (a lone date is read as both, #3010) and
        // only pairs with a kept start; onReady's setDate then checks the
        // pair (#3108)
        if (parsedDate && fp.selectedDates.length > 0)
          fp.selectedDates = [fp.selectedDates[0], parsedDate];
      }

      secondInput.setAttribute("data-fp-omit", "");

      if (fp.config.clickOpens) {
        fp._bind(secondInput, ["focus", "click"], () => {
          if (fp.selectedDates[1]) {
            fp.latestSelectedDateObj = fp.selectedDates[1];
            fp._setHoursFromDate(fp.selectedDates[1]);
            fp.jumpToDate(fp.selectedDates[1]);
          }

          _secondInputFocused = true;

          // flatpickr positions from _positionElement when opening and on resize
          fp._positionElement =
            config.position === "left" ? firstInputAnchor() : secondInput;
          // already open under the first input: only move it
          if (fp.isOpen) fp._positionCalendar(fp._positionElement);
          else fp.open();
        });
      }

      if (fp.config.allowInput)
        fp._bind(secondInput, "keydown", (e: KeyboardEvent) => {
          if (e.key === "Enter") {
            const typed = typedValue();
            if (typed !== undefined) fp.setDate(typed, true, dateFormat);
            secondInput.click();
          }
        });

      if (!config.input && fp._input.parentNode)
        fp._input.parentNode.insertBefore(secondInput, fp._input.nextSibling);
    };

    const plugin = {
      onParseConfig() {
        fp.config.mode = "range";

        dateFormat = fp.config.altInput
          ? fp.config.altFormat
          : fp.config.dateFormat;
      },

      onReady() {
        createSecondInput();
        fp.config.ignoredFocusElements.push(secondInput);
        if (fp.config.allowInput) {
          fp._input.removeAttribute("readonly");
          secondInput.removeAttribute("readonly");
        } else {
          secondInput.setAttribute("readonly", "readonly");
        }

        // flatpickr's own write keeps the whole range in fp.input with altInput
        const showValue = fp._showValue;
        fp._showValue = () => {
          showValue();
          const [first, second] = shownValue();
          fp._input.value = first;
          secondInput.value = second;
        };
        fp._typedValue = typedValue;

        // flatpickr itself opens the calendar from fp._input, before this runs
        fp._bind(fp._input, "focus", () => {
          const anchor = firstInputAnchor();
          // back from the second input: move the open calendar under this one
          if (fp.isOpen && fp._positionElement !== anchor)
            fp._positionCalendar(anchor);
          fp._positionElement = anchor;

          fp.latestSelectedDateObj = fp.selectedDates[0];
          fp._setHoursFromDate(fp.selectedDates[0]);
          _secondInputFocused = false;
          fp.jumpToDate(fp.selectedDates[0]);
        });

        fp.setDate(fp.selectedDates, false);
        plugin.onValueUpdate(fp.selectedDates);
        fp.loadedPlugins.push("range");
      },

      onClose() {
        // flatpickr's own openings, focus or fp.open(), belong to fp._input
        fp._positionElement = firstInputAnchor();
      },

      onChange() {
        if (!fp.selectedDates.length) {
          setTimeout(() => {
            if (fp.selectedDates.length) return;

            _prevDates = [];
          }, 10);
        }

        if (_secondInputFocused) {
          setTimeout(() => {
            secondInput.focus();
          }, 0);
        }
      },

      onDestroy() {
        if (!config.input && secondInput.parentNode)
          secondInput.parentNode.removeChild(secondInput);
      },

      onValueUpdate(selDates: Date[]) {
        if (!secondInput) return;

        // one side of the range is left, from a day picked on the calendar or
        // setDate with one date: keep the other side (a range ruled out, or
        // dropping both, leaves nothing to keep). Typed ends come in pairs
        // from typedValue
        const isEdit = selDates.length === 1 && _prevDates.length === 2;

        if (isEdit) {
          const newSelectedDate = selDates[0];
          const newDates = _secondInputFocused
            ? [_prevDates[0], newSelectedDate]
            : [newSelectedDate, _prevDates[1]];

          if (newDates[0].getTime() > newDates[1].getTime()) {
            if (_secondInputFocused) {
              newDates[0] = newDates[1];
            } else {
              newDates[1] = newDates[0];
            }
          }

          fp.setDate(newDates, false);
          _prevDates = [...newDates];
        } else {
          _prevDates = [...selDates];
        }
      },
    };

    return plugin;
  };
}

export default rangePlugin;
