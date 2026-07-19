import { CursorPage, ListQuery, Page } from "./types.ts";

export const clone = <T>(value: T): T => structuredClone(value);

export function pageOf<T>(items: T[], query: ListQuery): Page<T> {
  const page = Math.max(1, Math.trunc(query.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Math.trunc(query.pageSize ?? 10)));
  const total = items.length;
  const start = (page - 1) * pageSize;
  return {
    data: clone(items.slice(start, start + pageSize)),
    meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
}

export function cursorPage<T extends { id: string }>(
  items: T[],
  cursor?: string,
  limit = 20,
): CursorPage<T> {
  const safeLimit = Math.min(100, Math.max(1, Math.trunc(limit)));
  const cursorIndex = cursor
    ? items.findIndex((item) => item.id === cursor)
    : -1;
  const start = cursorIndex >= 0 ? cursorIndex + 1 : 0;
  const data = items.slice(start, start + safeLimit);
  return {
    data: clone(data),
    meta: {
      nextCursor: start + safeLimit < items.length && data.length > 0
        ? data[data.length - 1].id
        : null,
    },
  };
}

export function normalizedTaxId(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

export function normalizedSearch(value?: string): string {
  return value?.trim().toLocaleLowerCase() ?? "";
}
