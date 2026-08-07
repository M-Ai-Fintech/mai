const MINIMUM_CAPABILITY_LENGTH = 32;

export async function digestInvitationToken(token: string): Promise<string> {
  assertCapabilityToken(token);
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
  try {
    return constantTimeEqual(
      await digestInvitationToken(token),
      expectedDigest,
    );
  } catch {
    return false;
  }
}

function assertCapabilityToken(token: string): void {
  if (
    token.trim().length >= MINIMUM_CAPABILITY_LENGTH && token.length <= 4096
  ) {
    return;
  }
  throw new Error(
    `Invitation capability "${token}" is invalid; expected 32-4096 non-whitespace characters.`,
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
