export async function digestInvitationToken(token: string): Promise<string> {
  assertToken(token);
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(
    new Uint8Array(digest),
    (value) => value.toString(16).padStart(2, "0"),
  ).join("");
}

export async function verifyInvitationToken(
  token: string,
  expectedDigest: string,
): Promise<boolean> {
  const actual = await digestInvitationToken(token);
  return constantTimeEqual(actual, expectedDigest);
}

function assertToken(token: string): void {
  if (token.trim().length > 0 && token.length <= 4096) return;
  throw new Error(
    `Invitation token "${token}" is invalid; expected 1-4096 characters.`,
  );
}

function constantTimeEqual(left: string, right: string): boolean {
  if (!/^[0-9a-f]{64}$/.test(right)) return false;
  let difference = left.length ^ right.length;
  for (let index = 0; index < left.length; index++) {
    difference |= left.charCodeAt(index) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}
