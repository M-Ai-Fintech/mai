import { noopObserve, type ToolExecutionContext } from "@mastra/core/tools";

export const testToolContext: ToolExecutionContext = {
  observe: noopObserve,
};
