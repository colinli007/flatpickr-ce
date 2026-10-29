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
        secondInput._flatpickr = undefined;
      }

      // like flatpickr's own input, it only preloads without a defaultDate
      if (!fp.config.defaultDate && secondInput.value) {
        const parsedDate = fp.parseDate(secondInput.value, dateFormat);

        if (parsedDate) fp.selectedDates.push(parsedDate);
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
            fp.setDate(
              [fp.selectedDates[0], secondInput.value],
              true,
              dateFormat
            );
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

        if (fp.config.allowInput)
          fp._bind(fp._input, "keydown", (e: KeyboardEvent) => {
            if (e.key === "Enter")
              fp.setDate(
                [fp._input.value, fp.selectedDates[1]],
                true,
                dateFormat
              );
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

            secondInput.value = "";
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

        // flatpickr dropped one side of the range: keep the other side
        const isEdit = selDates.length < _prevDates.length;

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

        const [first = "", second = ""] = fp.selectedDates.map((d) =>
          fp.formatDate(d, dateFormat)
        );
        fp._input.value = first;
        secondInput.value = second;
      },
    };

    return plugin;
  };
}

export default rangePlugin;
