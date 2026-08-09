import type { CalculationBinding } from "./definitions/index.ts";
import type { CostMetadata, StepRecord } from "../agent_runtime/model.ts";
import type { StepExecutionContext } from "../agent_runtime/runner.ts";

export interface GovernedCalculationRequest {
  readonly capability: string;
  readonly binding: CalculationBinding;
  readonly input: unknown;
  readonly step: StepRecord;
  readonly context: StepExecutionContext;
}

export interface GovernedCalculationOutput {
  readonly value: Readonly<Record<string, unknown>>;
  readonly cost: CostMetadata;
}

/** Typed seam for an existing deterministic pure calculation engine. */
export interface GovernedCalculationPort {
  readonly name: string;
  readonly deterministic: true;
  execute(
    request: GovernedCalculationRequest,
  ): Promise<GovernedCalculationOutput>;
}

export interface GovernedCalculationPortRegistry {
  resolve(name: string): GovernedCalculationPort | undefined;
}

export function hasCalculationPort(
  registry: GovernedCalculationPortRegistry,
  binding: CalculationBinding,
): boolean {
  const port = registry.resolve(binding.purePort);
  return port?.name === binding.purePort && port.deterministic === true;
}

/** Resolves only an exact declared deterministic port. */
export class CalculationPortRegistry
  implements GovernedCalculationPortRegistry {
  private readonly ports: ReadonlyMap<string, GovernedCalculationPort>;

  constructor(ports: readonly GovernedCalculationPort[]) {
    const entries = new Map<string, GovernedCalculationPort>();
    for (const port of ports) {
      if (entries.has(port.name)) {
        throw new Error(
          `Calculation pure port "${port.name}" was declared more than once; expected one owned implementation.`,
        );
      }
      entries.set(port.name, port);
    }
    this.ports = entries;
  }

  resolve(name: string): GovernedCalculationPort | undefined {
    const port = this.ports.get(name);
    return port?.name === name && port.deterministic === true
      ? port
      : undefined;
  }
}
