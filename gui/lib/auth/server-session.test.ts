import { describe, expect, it } from "vitest";

import { serverSession } from "./server-session";

describe("server session resolution", () => {
  it("keeps the browser cookie authoritative", () => {
    expect(serverSession("session_cookie", {
      NODE_ENV: "production",
      DENO_ENV: "preview",
      NEXT_PUBLIC_MAI_DEMO_READINESS_ENABLED: "true",
      MAI_DEMO_SESSION_ID: "session_investor-demo",
      LOCAL_RUNTIME_PROFILE: "preview",
      MAI_LOCAL_MVP_ENABLED: "true",
      MAI_LOCAL_SESSION_ID: "session_local-banker",
    })).toBe("session_cookie");
  });

  it("allows the explicit deterministic session only in the local runtime", () => {
    expect(serverSession(undefined, {
      NODE_ENV: "development",
      LOCAL_RUNTIME_PROFILE: "local",
      MAI_LOCAL_MVP_ENABLED: "true",
      MAI_LOCAL_SESSION_ID: "session_local-banker",
    })).toBe("session_local-banker");
    expect(serverSession(undefined, {
      NODE_ENV: "development",
      MAI_LOCAL_MVP_ENABLED: "true",
      MAI_LOCAL_SESSION_ID: "session_local-banker",
    })).toBeUndefined();
  });

  it("rejects the local fallback when DENO_ENV is production", () => {
    expect(serverSession(undefined, {
      NODE_ENV: "development",
      DENO_ENV: "production",
      LOCAL_RUNTIME_PROFILE: "local",
      MAI_LOCAL_MVP_ENABLED: "true",
      MAI_LOCAL_SESSION_ID: "session_local-banker",
    })).toBeUndefined();
  });

  it("rejects the local fallback in an unapproved DENO_ENV", () => {
    expect(serverSession(undefined, {
      NODE_ENV: "development",
      DENO_ENV: "preview",
      LOCAL_RUNTIME_PROFILE: "local",
      MAI_LOCAL_MVP_ENABLED: "true",
      MAI_LOCAL_SESSION_ID: "session_local-banker",
    })).toBeUndefined();
  });

  it("allows the explicit synthetic demo session in the local-demo runtime", () => {
    expect(serverSession(undefined, {
      NODE_ENV: "development",
      DENO_ENV: "local-demo",
      NEXT_PUBLIC_MAI_DEMO_READINESS_ENABLED: "true",
      MAI_DEMO_SESSION_ID: "session_investor-demo",
    })).toBe("session_investor-demo");
  });

  it("allows the explicit synthetic demo session in the test runtime", () => {
    expect(serverSession(undefined, {
      NODE_ENV: "test",
      DENO_ENV: "test",
      NEXT_PUBLIC_MAI_DEMO_READINESS_ENABLED: "true",
      MAI_DEMO_SESSION_ID: "session_investor-demo",
    })).toBe("session_investor-demo");
  });

  it("keeps the local fallback when the test runtime uses the local profile", () => {
    expect(serverSession(undefined, {
      NODE_ENV: "test",
      DENO_ENV: "test",
      LOCAL_RUNTIME_PROFILE: "local",
      MAI_LOCAL_MVP_ENABLED: "true",
      MAI_LOCAL_SESSION_ID: "session_local-banker",
    })).toBe("session_local-banker");
  });

  it("rejects synthetic demo authentication in production", () => {
    expect(serverSession(undefined, {
      NODE_ENV: "production",
      DENO_ENV: "local-demo",
      NEXT_PUBLIC_MAI_DEMO_READINESS_ENABLED: "true",
      MAI_DEMO_SESSION_ID: "session_investor-demo",
    })).toBeUndefined();
  });

  it("rejects the public flag without an approved server runtime", () => {
    expect(serverSession(undefined, {
      NODE_ENV: "development",
      NEXT_PUBLIC_MAI_DEMO_READINESS_ENABLED: "true",
      MAI_DEMO_SESSION_ID: "session_investor-demo",
    })).toBeUndefined();
  });

  it("rejects synthetic sessions in non-local execution", () => {
    expect(serverSession(undefined, {
      NODE_ENV: "development",
      DENO_ENV: "preview",
      LOCAL_RUNTIME_PROFILE: "preview",
      MAI_LOCAL_MVP_ENABLED: "true",
      MAI_LOCAL_SESSION_ID: "session_local-banker",
      NEXT_PUBLIC_MAI_DEMO_READINESS_ENABLED: "true",
      MAI_DEMO_SESSION_ID: "session_investor-demo",
    })).toBeUndefined();
  });

  it("fails closed for absent or malformed fallback identifiers", () => {
    expect(serverSession(undefined, {
      NODE_ENV: "development",
      LOCAL_RUNTIME_PROFILE: "local",
      MAI_LOCAL_MVP_ENABLED: "true",
      MAI_LOCAL_SESSION_ID: "not-a-session",
    })).toBeUndefined();
    expect(serverSession(undefined, {
      NODE_ENV: "development",
      DENO_ENV: "local-demo",
      NEXT_PUBLIC_MAI_DEMO_READINESS_ENABLED: "true",
      MAI_DEMO_SESSION_ID: "session bad",
    })).toBeUndefined();
    expect(serverSession(undefined, {})).toBeUndefined();
  });
});
