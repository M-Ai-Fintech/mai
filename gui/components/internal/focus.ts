const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "a[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

/**
 * Lists focusable descendants in document order for modal focus containment.
 *
 * @example focusableElements(dialog)
 */
export function focusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    .filter((element) => !element.hidden && element.getAttribute("aria-hidden") !== "true");
}

/**
 * Focuses an explicit initial target or the first available modal control.
 *
 * @example focusInitialElement(dialog, initialFocusRef?.current)
 */
export function focusInitialElement(
  container: HTMLElement,
  preferred?: HTMLElement | null,
): void {
  (preferred ?? focusableElements(container)[0] ?? container).focus();
}

/**
 * Keeps Tab navigation within a modal container.
 *
 * @example containTabFocus(event, dialog)
 */
export function containTabFocus(
  event: KeyboardEvent,
  container: HTMLElement,
): void {
  if (event.key !== "Tab") return;
  const focusable = focusableElements(container);
  if (focusable.length === 0) {
    event.preventDefault();
    container.focus();
    return;
  }
  const first = focusable[0];
  const last = focusable.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
