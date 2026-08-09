/**
 * Versioned public contracts for scoped external-provider integrations.
 *
 * @example import { selectIntegrationProvider } from "./src/integrations/v1.ts";
 */
export * from "./configuration.ts";
export * from "./contracts.ts";
export * from "./failures.ts";
export * from "./fixture_conformance.ts";
export {
  type PapermarkAuthorizationInput,
  type PapermarkIntegrationAdapterFactory,
  type PapermarkIntegrationCompositionInput,
  selectAuthorizedPapermarkProvider,
} from "./papermark/composition.ts";
export * from "./provider_selection.ts";
export * from "./readiness.ts";
