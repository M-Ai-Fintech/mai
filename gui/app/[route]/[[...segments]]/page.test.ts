import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import ShellRoute from "./page";

vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
  cookies: async () => ({ get: () => undefined }),
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("ShellRoute rollback boundary", () => {
  it("renders the explicit demo shell and screen through typed v1 contracts", async () => {
    vi.stubEnv("MAI_FRONTEND_DATA_SOURCE", "v1");
    vi.stubEnv("NEXT_PUBLIC_MAI_DEMO_READINESS_ENABLED", "true");
    const requests: string[] = [];
    vi.stubGlobal("fetch", async (input: RequestInfo | URL) => {
      const url = input instanceof Request ? input.url : String(input);
      requests.push(url);
      if (url.endsWith("/shell")) {
        return Response.json({
          data: {
            organization: {
              id: "workspace_investor-demo",
              name: "M&Ai synthetic demo",
            },
            deal: {
              id: "deal_serra-azul",
              name: "Serra Azul synthetic sell-side mandate",
              phase: "diligence",
            },
            permissions: ["workspace", "deal"],
            counts: { tasks: 1, approvals: 1, notifications: 0 },
          },
          meta: { correlationId: "cor_shell", freshness: "current" },
        });
      }
      return Response.json({
        data: {
          family: "command-center",
          items: [{
            id: "deal_serra-azul",
            title: "Investor demo review",
            summary: "Synthetic evidence ready for banker review.",
            status: "review-required",
          }],
        },
        meta: { correlationId: "cor_screen", freshness: "current" },
      });
    });

    const element = await ShellRoute({
      params: Promise.resolve({ route: "home" }),
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("M&amp;Ai synthetic demo");
    expect(html).toContain("Investor demo review");
    expect(requests.some((url) => url.endsWith("/shell"))).toBe(true);
    expect(
      requests.some((url) => url.endsWith("/screens/command-center")),
    ).toBe(true);
  });

  it("keeps v1 previous mode unavailable without a production legacy shell adapter", async () => {
    vi.stubEnv("MAI_FRONTEND_DATA_SOURCE", "v1");
    vi.stubEnv("NEXT_PUBLIC_MAI_DEMO_READINESS_ENABLED", "true");
    vi.stubEnv(
      "NEXT_PUBLIC_ADAPTER_CANARY_MAP",
      '{"application-shell":"previous"}',
    );

    const element = await ShellRoute({
      params: Promise.resolve({ route: "home" }),
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("Resource unavailable");
    expect(html).toContain(
      "The previous shell adapter is not registered for global.home.",
    );
    expect(html).not.toContain('data-shell-mode="global"');
    expect(html).not.toContain("Demo Advisory");
  });
});
