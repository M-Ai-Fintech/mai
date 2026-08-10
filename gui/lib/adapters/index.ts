export {
  adapterCatalog,
  adapterDescriptorFor,
  adapterFamilies,
  isAdapterFamily,
} from "./catalog";
export {
  adapterCanaryFor,
  type AdapterActivation,
  type AdapterCanary,
  type AdapterMode,
} from "./feature-flags";
export {
  readScreenAdapter,
} from "./screen-data";
export {
  readAdapter,
  readFamilyAdapter,
  type AdapterReadOptions,
} from "./runtime";
export type {
  AdapterFailure,
  AdapterReadItem,
  AdapterReadModel,
  AdapterReadContext,
  AdapterResult,
  AdapterState,
} from "./contracts";
