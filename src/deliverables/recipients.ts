import type { RecipientScope, ReleasePurpose } from "./model.ts";

export function scopeContainsRecipient(
  scope: RecipientScope,
  recipientId: string,
  purpose: ReleasePurpose,
): boolean {
  if (scope.purpose !== purpose) return false;
  return scope.recipientIds?.includes(recipientId) ?? false;
}

export function assertRecipientPurpose(
  scope: RecipientScope,
  purpose: ReleasePurpose,
): void {
  if (scope.purpose === purpose) return;
  throw new Error(
    `Recipient scope purpose "${scope.purpose}" does not match requested purpose "${purpose}".`,
  );
}
