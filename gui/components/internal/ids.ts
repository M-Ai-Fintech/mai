import { useId } from "react";

/**
 * Returns a caller-supplied ID or a stable React-generated component ID.
 *
 * @example useComponentId("amount", "field")
 */
export function useComponentId(
  suppliedId: string | undefined,
  prefix: string,
): string {
  const reactId = useId();
  return suppliedId ?? `${prefix}-${reactId.replaceAll(":", "")}`;
}
