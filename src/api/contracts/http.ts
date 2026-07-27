/** HTTP envelopes, pagination contracts, and response helpers. */

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface CursorMeta {
  nextCursor: string | null;
}

export interface ApiSuccess<T> {
  data: T;
}

export interface ApiListSuccess<T> extends ApiSuccess<T[]> {
  meta: PageMeta;
}

export interface ApiCursorSuccess<T> extends ApiSuccess<T[]> {
  meta: CursorMeta;
}

export interface FieldErrors {
  [field: string]: string[];
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  fieldErrors?: FieldErrors;
}

export interface ApiErrorResponse {
  error: ApiErrorDetail;
}

export interface PageQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: string;
}

export interface ParsedPageQuery extends PageQuery {
  page: number;
  pageSize: number;
}

export interface PaginationOptions {
  defaultPage?: number;
  defaultPageSize?: number;
  maxPageSize?: number;
}

function parseNaturalNumber(value: string | null, fallback: number): number {
  if (value === null || !/^\d+$/.test(value)) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function parsePaginationQuery(
  searchParams: URLSearchParams,
  options: PaginationOptions = {},
): ParsedPageQuery {
  const defaultPage = options.defaultPage ?? 1;
  const defaultPageSize = options.defaultPageSize ?? 10;
  const maxPageSize = options.maxPageSize ?? 100;
  const page = parseNaturalNumber(searchParams.get("page"), defaultPage);
  const requestedPageSize = parseNaturalNumber(
    searchParams.get("pageSize"),
    defaultPageSize,
  );
  const search = searchParams.get("search")?.trim() || undefined;
  const sort = searchParams.get("sort")?.trim() || undefined;
  return paginationResult(page, requestedPageSize, maxPageSize, search, sort);
}

function paginationResult(
  page: number,
  requestedPageSize: number,
  maxPageSize: number,
  search?: string,
  sort?: string,
): ParsedPageQuery {
  return {
    page,
    pageSize: Math.min(requestedPageSize, maxPageSize),
    ...(search ? { search } : {}),
    ...(sort ? { sort } : {}),
  };
}

export function parseBooleanQuery(value: string | null): boolean | undefined {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  if (!headers.has("content-type")) {
    headers.set("content-type", JSON_HEADERS["content-type"]);
  }
  return new Response(JSON.stringify(body), { ...init, headers });
}

export function jsonSuccess<T>(data: T, init: ResponseInit = {}): Response {
  return jsonResponse({ data } satisfies ApiSuccess<T>, init);
}

export function jsonListSuccess<T>(
  data: T[],
  meta: PageMeta,
  init: ResponseInit = {},
): Response {
  return jsonResponse({ data, meta } satisfies ApiListSuccess<T>, init);
}

export function jsonError(
  status: number,
  code: string,
  message: string,
  fieldErrors?: FieldErrors,
  init: Omit<ResponseInit, "status"> = {},
): Response {
  const error: ApiErrorDetail = {
    code,
    message,
    ...(fieldErrors ? { fieldErrors } : {}),
  };
  return jsonResponse({ error } satisfies ApiErrorResponse, {
    ...init,
    status,
  });
}
