import { z } from "zod";
import { jsonError } from "../contracts.ts";
import { ResolvedMvpRouteDependencies } from "./dependencies.ts";

export const uuid = z.string().uuid();

export interface MvpRouteContext extends ResolvedMvpRouteDependencies {
  request: Request;
  url: URL;
  path: string;
  method: string;
}

export type MvpDomainRouteHandler = (
  context: MvpRouteContext,
) => Response | null | Promise<Response | null>;

export class HttpRouteError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
  }
}

export async function bodyAsJson(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new HttpRouteError(
      415,
      "UNSUPPORTED_MEDIA_TYPE",
      "Content-Type must be application/json",
    );
  }
  try {
    return await request.json();
  } catch {
    throw new HttpRouteError(
      400,
      "INVALID_JSON",
      "Request body must contain valid JSON",
    );
  }
}

export function validateId(value: string, field = "id"): string {
  const parsed = uuid.safeParse(value);
  if (!parsed.success) {
    throw new HttpRouteError(400, "INVALID_ID", `${field} must be a UUID`, {
      [field]: ["Must be a UUID"],
    });
  }
  return parsed.data;
}

export function validationError(error: z.ZodError): Response {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const field = issue.path.join(".") || "body";
    (fieldErrors[field] ??= []).push(issue.message);
  }
  return jsonError(
    422,
    "VALIDATION_ERROR",
    "Request validation failed",
    fieldErrors,
  );
}

export function methodNotAllowed(allowed: string[]): Response {
  return jsonError(405, "METHOD_NOT_ALLOWED", "Method not allowed", undefined, {
    headers: { allow: allowed.join(", ") },
  });
}

export function parseLimit(value: string | null, fallback: number): number {
  if (!value || !/^\d+$/.test(value)) return fallback;
  return Math.min(100, Math.max(1, Number(value)));
}
