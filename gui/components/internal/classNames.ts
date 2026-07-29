/**
 * Joins conditional component class names without introducing a runtime dependency.
 *
 * @example classNames("base", active && "active")
 */
export function classNames(
  ...candidates: readonly (string | false | null | undefined)[]
): string {
  return candidates.filter(Boolean).join(" ");
}
