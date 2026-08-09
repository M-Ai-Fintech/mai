import { z } from "zod";

const capabilityName = z.string().regex(
  /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/,
);
const text = z.string().trim().min(1);

export const calculationBindingSchema = z.object({
  capability: capabilityName.refine((value) =>
    value.startsWith("calculation.")
  ),
  purePort: text,
  operation: text,
  action: text,
}).strict();

export type CalculationBinding = z.infer<typeof calculationBindingSchema>;

export const calculationLineageSchema = z.object({
  capability: capabilityName.refine((value) =>
    value.startsWith("calculation.")
  ),
  purePort: text,
  operation: text,
  action: text,
  stepId: text,
}).strict();

export type CalculationLineage = z.infer<typeof calculationLineageSchema>;

export function validateCalculationBindings(
  bindings: readonly CalculationBinding[],
  allowedCapabilities: readonly string[],
  purePorts: readonly { readonly name: string; readonly deterministic: true }[],
  context: z.RefinementCtx,
): void {
  if (
    new Set(bindings.map((binding) => binding.capability)).size !==
      bindings.length
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["calculationBindings"],
      message: "Calculation bindings must name each capability once.",
    });
  }
  for (const binding of bindings) {
    if (!allowedCapabilities.includes(binding.capability)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["calculationBindings"],
        message:
          `Calculation capability "${binding.capability}" is not allowed by the definition.`,
      });
    }
    const port = purePorts.find((candidate) =>
      candidate.name === binding.purePort
    );
    if (port !== undefined && port.deterministic) continue;
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["calculationBindings"],
      message:
        `Calculation binding "${binding.capability}" references pure port "${binding.purePort}" without a deterministic declaration.`,
    });
  }
}
