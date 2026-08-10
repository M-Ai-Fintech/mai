import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import ShellRoute from "./page";

afterEach(() => vi.unstubAllEnvs());

describe("ShellRoute rollback composition", () => {
  it("passes the explicit shell previous adapter through the v1 route flow", async () => {
    vi.stubEnv("MAI_FRONTEND_DATA_SOURCE", "v1");
    vi.stubEnv(
      "NEXT_PUBLIC_ADAPTER_CANARY_MAP",
      '{"application-shell":"previous"}',
    );

    const element = await ShellRoute({
      params: Promise.resolve({ route: "home" }),
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain('data-shell-mode="global"');
    expect(html).toContain('data-screen-family="command-center"');
    expect(html).toContain("Demo Advisory");
    expect(html).toContain("Temporarily unavailable");
  });
});
