import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import ShellRoute from "./page";

afterEach(() => vi.unstubAllEnvs());

describe("ShellRoute rollback boundary", () => {
  it("keeps v1 previous mode unavailable without a production legacy shell adapter", async () => {
    vi.stubEnv("MAI_FRONTEND_DATA_SOURCE", "v1");
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
