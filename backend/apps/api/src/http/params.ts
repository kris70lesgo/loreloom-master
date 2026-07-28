import { HttpError } from "./errors.js";

export function stringParam(value: string | string[] | undefined, name: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new HttpError(400, `${name} is required.`);
  }

  return value;
}
