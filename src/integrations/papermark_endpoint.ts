import type { IntegrationEnvironment } from "./contracts.ts";

/**
 * Validates Papermark's environment-specific endpoint allow-list.
 *
 * @example assertPapermarkEndpointForEnvironment("http://localhost:3000/api", "local-development")
 */
export function assertPapermarkEndpointForEnvironment(
  endpoint: string,
  environment: IntegrationEnvironment,
): void {
  const parsed = parsePapermarkEndpoint(endpoint);
  const path = parsed.pathname.replace(/\/+$/, "") || "/";
  const isLocal = isLocalPapermarkEndpoint(parsed, path);
  const isHosted = isHostedPapermarkEndpoint(parsed, path);
  if (environment === "local-development" && !isLocal) {
    throw new Error(
      "Papermark local-development requires the approved localhost endpoint; hosted provider URLs are not permitted.",
    );
  }
  if (environment === "sandbox-certification" && !isHosted) {
    throw new Error(
      "Papermark sandbox-certification requires the official hosted endpoint.",
    );
  }
}

function parsePapermarkEndpoint(endpoint: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(endpoint);
  } catch {
    throw new Error(
      "Papermark endpoint is invalid; expected an approved absolute HTTP(S) URL.",
    );
  }
  if (
    parsed.username || parsed.password || parsed.search || parsed.hash ||
    (parsed.protocol !== "http:" && parsed.protocol !== "https:")
  ) {
    throw new Error(
      "Papermark endpoint is invalid; expected an approved URL without credentials, query, or fragment.",
    );
  }
  return parsed;
}

function isLocalPapermarkEndpoint(parsed: URL, path: string): boolean {
  return parsed.protocol === "http:" && parsed.hostname === "localhost" &&
    parsed.port === "3000" && path === "/api";
}

function isHostedPapermarkEndpoint(parsed: URL, path: string): boolean {
  return parsed.protocol === "https:" &&
    parsed.hostname === "api.papermark.com" && parsed.port === "" &&
    path === "/";
}
