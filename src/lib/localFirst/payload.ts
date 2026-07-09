import { stripLocalViewFields } from "../localDb/payload";

export function stripLocalFields<T extends Record<string, unknown>>(value: T) {
  return stripLocalViewFields(value);
}
