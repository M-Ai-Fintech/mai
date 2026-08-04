import type { Calculation } from "./model.ts";

export function freezeCalculation(input: Calculation): Calculation {
  return Object.freeze({
    ...input,
    inputReferences: Object.freeze([...input.inputReferences]),
    output: Object.freeze({ ...input.output }),
  });
}

export type { Calculation };
