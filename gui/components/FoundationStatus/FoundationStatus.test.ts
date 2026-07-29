import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import FoundationPage from "@/app/page";

import { FoundationStatus } from "./FoundationStatus";

function expectExplicitFoundationBoundary(): void {
  const html = renderToStaticMarkup(createElement(FoundationStatus));

  expect(html).toContain("product screens are not implemented");
  expect(html).toContain("does not provide production product capabilities");
  expect(html).toContain("A backend is required");
  expect(html).not.toMatch(/Stitch|Mastercard/);
}

function expectUnavailableCapabilityList(): void {
  const html = renderToStaticMarkup(createElement(FoundationStatus));

  expect(html).toContain("Persisted approvals and immutable audit records");
  expect(html).toContain("Agent execution and external communication");
  expect(html).toContain("Production document synchronization");
  expect(html).toContain("Backend-backed notifications and tasks");
}

function expectGovernedOwnershipBoundary(): void {
  const html = renderToStaticMarkup(createElement(FoundationStatus));

  expect(html).toContain("Figma is the sole visual and interaction authority");
  expect(html).toContain("MAI-96 owns tokens");
  expect(html).toContain("MAI-97 owns components");
  expect(html).toContain("MAI-98 owns the approved Shell");
}

function expectRootRouteUsesFoundationStatus(): void {
  const html = renderToStaticMarkup(FoundationPage());

  expect(html).toContain("data-foundation-status");
  expect(html).not.toContain("dashboard");
}

describe("MAI-95 foundation status", () => {
  it(
    "renders explicit non-production capability messaging",
    expectExplicitFoundationBoundary,
  );
  it(
    "enumerates unavailable production capabilities",
    expectUnavailableCapabilityList,
  );
  it(
    "identifies Figma and the deferred task owners",
    expectGovernedOwnershipBoundary,
  );
  it(
    "is the only retained product-facing root entry",
    expectRootRouteUsesFoundationStatus,
  );
});
