import type { ValuationScope } from "./basis.ts";
import type {
  ValuationComparison,
  ValuationResult,
  ValuationScenario,
} from "./model.ts";
import type {
  ValuationComparisonId,
  ValuationResultId,
  ValuationScenarioId,
} from "./ids.ts";

export interface ValuationReadPort {
  findScenario(
    scope: ValuationScope,
    id: ValuationScenarioId,
  ): Promise<ValuationScenario | undefined>;
  findResult(
    scope: ValuationScope,
    id: ValuationResultId,
  ): Promise<ValuationResult | undefined>;
  findComparison(
    scope: ValuationScope,
    id: ValuationComparisonId,
  ): Promise<ValuationComparison | undefined>;
}
