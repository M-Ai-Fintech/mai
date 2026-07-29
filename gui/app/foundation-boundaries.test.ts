import { Children, createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import ApplicationError from "./error";
import RootLayout from "./layout";
import ApplicationNotFound from "./not-found";
import {
  I18nProvider,
  useTranslation,
} from "@/lib/i18n/I18nProvider";

function TranslationProbe() {
  const { t } = useTranslation();
  return createElement("span", null, t("foundation.screensUnavailable"));
}

function expectMinimalRootBoundary(): void {
  const html = renderToStaticMarkup(
    RootLayout({ children: createElement("p", null, "child route") }),
  );

  expect(html).toContain('<html lang="en">');
  expect(html).toContain("child route");
  expect(html).not.toMatch(/sidebar|topbar|dashboard/i);
}

function expectRetainedI18nProvider(): void {
  const html = renderToStaticMarkup(
    createElement(I18nProvider, null, createElement(TranslationProbe)),
  );

  expect(html).toContain("Product screens are not implemented.");
}

function expectRecoverableErrorBoundary(): void {
  const reset = vi.fn();
  const element = ApplicationError({
    error: new Error("test failure"),
    reset,
  });
  const children = Children.toArray(element.props.children);
  const button = children.at(-1) as ReactElement<{ onClick: () => void }>;

  expect(renderToStaticMarkup(element)).toContain(
    "No product action was completed.",
  );
  button.props.onClick();
  expect(reset).toHaveBeenCalledOnce();
}

function expectDeferredRouteBoundary(): void {
  const html = renderToStaticMarkup(ApplicationNotFound());

  expect(html).toContain("Product route not implemented.");
  expect(html).toContain("established in MAI-98");
}

describe("MAI-95 application boundaries", () => {
  it("keeps a server-first root without the old Shell", expectMinimalRootBoundary);
  it("retains the i18n provider behavior", expectRetainedI18nProvider);
  it("provides a recoverable client error boundary", expectRecoverableErrorBoundary);
  it("labels deferred routes without inventing navigation", expectDeferredRouteBoundary);
});
