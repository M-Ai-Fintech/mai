import { describe, expect, it } from "vitest";

import { serverSession } from "./server-session";

describe("server session resolution", () => {
  it("keeps the browser cookie authoritative", () => {
    expect(serverSession("session_cookie", {
      NODE_ENV: "development",
      MAI_LOCAL_MVP_ENABLED: "true",
      MAI_LOCAL_SESSION_ID: "session_local-banker",
    })).toBe("session_cookie");
  });

  it("allows the explicit deterministic session only in local development", () => {
    expect(serverSession(undefined, {
      NODE_ENV: "development",
      MAI_LOCAL_MVP_ENABLED: "true",
      MAI_LOCAL_SESSION_ID: "session_local-banker",
    })).toBe("session_local-banker");
    expect(serverSession(undefined, {
      NODE_ENV: "production",
      MAI_LOCAL_MVP_ENABLED: "true",
      MAI_LOCAL_SESSION_ID: "session_local-banker",
    })).toBeUndefined();
  });

  it("retains the explicit synthetic demo session boundary", () => {
    expect(serverSession(undefined, {
      NODE_ENV: "production",
      NEXT_PUBLIC_MAI_DEMO_READINESS_ENABLED: "true",
      MAI_DEMO_SESSION_ID: "session_investor-demo",
    })).toBe("session_investor-demo");
  });

  it("fails closed for absent or malformed fallback identifiers", () => {
    expect(serverSession(undefined, {
      NODE_ENV: "development",
      MAI_LOCAL_MVP_ENABLED: "true",
      MAI_LOCAL_SESSION_ID: "not-a-session",
    })).toBeUndefined();
    expect(serverSession(undefined, {})).toBeUndefined();
  });
});
