export {
  adapterCatalog,
  adapterDescriptorFor,
  adapterFamilies,
  isAdapterFamily,
} from "./catalog";
export {
  type AdapterActivation,
  type AdapterCanary,
  adapterCanaryFor,
  type AdapterCanaryKey,
  adapterCanaryModeFor,
  type AdapterMode,
} from "./feature-flags";
export {
  readScreenAdapter,
  type ScreenAdapterOptions,
  type ScreenPreviousAdapter,
  type ScreenPreviousAdapters,
} from "./screen-data";
export {
  type AdapterReadOptions,
  readAdapter,
  readFamilyAdapter,
} from "./runtime";
export type {
  AdapterFailure,
  AdapterReadContext,
  AdapterReadItem,
  AdapterReadModel,
  AdapterResult,
  AdapterState,
} from "./contracts";
