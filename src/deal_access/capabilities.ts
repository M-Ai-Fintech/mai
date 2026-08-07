const CAPABILITY_BYTE_LENGTH = 32;
const CAPABILITY_LENGTH = 43;

export type InvitationCapability = string & {
  readonly __invitationCapability: unique symbol;
};

export function issueInvitationToken(): InvitationCapability {
  const bytes = crypto.getRandomValues(new Uint8Array(CAPABILITY_BYTE_LENGTH));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(
    /=+$/,
    "",
  ) as InvitationCapability;
}

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
  if (token.length === CAPABILITY_LENGTH && /^[A-Za-z0-9_-]+$/.test(token)) {
    return;
  }
  throw new Error(
    "Invitation capability is invalid; expected a 256-bit base64url value issued by the trusted capability issuer.",
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
