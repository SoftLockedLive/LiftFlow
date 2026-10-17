import { useEffect, useState } from "react";
import { getProfile } from "./profile";

// Every stored weight is canonical pounds at full float precision. Weights convert
// only at the edges: inputs go display -> lb on save, displays go lb -> display.
// The profile's `units` value is "lbs" or "kg"; labels are always "lb" / "kg".

export const KG_PER_LB = 0.45359237;
export const UNITS_EVENT = "liftflow-profile-updated";

export function normalizeUnits(value) {
  return value === "kg" ? "kg" : "lbs";
}

export function getUnits() {
  if (typeof window === "undefined") return "lbs";
  return normalizeUnits(getProfile().units);
}

export function unitLabel(units) {
  return normalizeUnits(units) === "kg" ? "kg" : "lb";
}

// lb -> display unit, unrounded.
export function toDisplay(lb, units) {
  const value = Number(lb);
  if (!Number.isFinite(value)) return 0;
  return normalizeUnits(units) === "kg" ? value * KG_PER_LB : value;
}

// A typed weight as a number. Accepts a decimal comma ("62,5", from phones set to a
// comma locale) but not a thousands separator ("1,000" stays invalid). Weights are
// never negative, so "-5" is invalid too. Returns NaN when the text is not a weight.
function parseWeight(value) {
  if (typeof value === "number") return value >= 0 ? value : NaN;
  const text = String(value ?? "").trim();
  const number = Number(/^\d*,\d{1,2}$/.test(text) ? text.replace(",", ".") : text);
  return number >= 0 ? number : NaN;
}

// Display unit -> lb, unrounded (storage keeps full precision).
export function fromDisplay(value, units) {
  const number = parseWeight(value);
  if (!Number.isFinite(number)) return 0;
  return normalizeUnits(units) === "kg" ? number / KG_PER_LB : number;
}

// Round to `decimals` places, dropping float noise (60 kg logged reads back 60, not 59.99999).
export function roundTo(value, decimals = 2) {
  const factor = 10 ** decimals;
  const rounded = Math.round(Number(value || 0) * factor) / factor;
  return Object.is(rounded, -0) ? 0 : rounded;
}

// lb -> display number rounded to 0.01 (trailing zeros vanish when printed).
export function displayNumber(lb, units, decimals = 2) {
  return roundTo(toDisplay(lb, units), decimals);
}

// Input value for a stored lb weight: "" when empty/zero, otherwise the trimmed display number.
export function toInputValue(lb, units) {
  const number = Number(lb);
  if (!(number > 0)) return "";
  return String(displayNumber(number, units));
}

// Stored lb from a display input string; "" stays "" so optional fields remain empty.
export function fromInputValue(value, units) {
  const text = String(value ?? "").trim();
  if (text === "") return "";
  const number = parseWeight(text);
  return Number.isFinite(number) ? fromDisplay(number, units) : "";
}

// "102.5 kg", "220.46 lb". Options: unit (default true) appends the label;
// decimals (default 2); grouping (default false) adds thousands separators.
export function formatWeight(lb, units, opts = {}) {
  const { unit = true, decimals = 2, grouping = false } = opts;
  const value = roundTo(toDisplay(lb, units), decimals);
  const text = grouping ? value.toLocaleString(undefined, { maximumFractionDigits: decimals }) : String(value);
  return unit ? `${text} ${unitLabel(units)}` : text;
}

// Volume totals: whole numbers with thousands separators ("12,345 kg").
export function formatVolume(lb, units, opts = {}) {
  return formatWeight(lb, units, { decimals: 0, grouping: true, ...opts });
}

// Re-renders with the current units; updates when the profile is saved or restored
// (the `liftflow-profile-updated` event) or changed in another tab.
export function useUnits() {
  const [units, setUnits] = useState("lbs");

  useEffect(() => {
    function sync() {
      setUnits(getUnits());
    }
    const timer = window.setTimeout(sync, 0);
    window.addEventListener(UNITS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(UNITS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return units;
}
