/** Shared scalar and value-object contracts for the MVP_6 API boundary. */

export type UUID = string;
export type ISODateTime = string;
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };
export type JsonObject = Record<string, unknown>;

export enum Currency {
  BRL = "BRL",
  USD = "USD",
  EUR = "EUR",
}

export interface Money {
  amountMinor: string;
  currency: Currency;
}

export interface VersionedResource {
  version: number;
}
