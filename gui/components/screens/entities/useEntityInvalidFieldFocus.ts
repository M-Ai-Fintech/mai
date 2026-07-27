import { type RefObject, useCallback } from "react";

import { type EntityFormErrors, firstEntityErrorField } from "./entity-state";

export function useEntityInvalidFieldFocus(
  formRootRef: RefObject<HTMLDivElement | null>,
) {
  return useCallback((errors: EntityFormErrors) => {
    const firstField = firstEntityErrorField(errors);
    if (!firstField) return;
    window.requestAnimationFrame(() => {
      formRootRef.current?.querySelector<HTMLElement>(
        `[data-entity-field="${firstField}"] input, [data-entity-field="${firstField}"] button`,
      )?.focus();
    });
  }, [formRootRef]);
}
