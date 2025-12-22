import { SpecOption } from "../types";

export const specsOptions: SpecOption[] = [
  { key: "cpu-1-2", vCPU: 1, ram: 2 },
  { key: "cpu-2-4", vCPU: 2, ram: 4 },
  { key: "cpu-4-8", vCPU: 4, ram: 8 },
];

export function getUnitFromUnitString(value: string, unit: string) {
  return `${value}${unit}`;
}

export function getNumberFromUnitString(value: string) {
  // Assumes the value is in the format "10Gi", "512Mi", etc.
  return parseInt(value.replace(/\D/g, ""));
}
