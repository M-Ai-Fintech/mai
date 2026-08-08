import { assertEquals } from "@std/assert";
import {
  handleHealthRequest,
  RuntimeReadiness,
} from "../../../src/platform/operations/health.ts";

Deno.test("health endpoints distinguish liveness from database readiness", async () => {
  const readiness = new RuntimeReadiness("api");
  const live = handleHealthRequest(
    new Request("http://localhost/health/live"),
    readiness,
  );
  const ready = handleHealthRequest(
    new Request("http://localhost/health/ready"),
    readiness,
  );

  assertEquals(live?.status, 200);
  assertEquals((await live?.json()).state, "healthy");
  assertEquals(ready?.status, 503);
  assertEquals((await ready?.json()).state, "not-ready");

  readiness.setDatabaseState(true);
  const connected = handleHealthRequest(
    new Request("http://localhost/health/ready"),
    readiness,
  );
  assertEquals(connected?.status, 200);
  assertEquals((await connected?.json()).checks, [{
    name: "database",
    state: "healthy",
  }]);
});

Deno.test("health handler ignores unsupported routes and methods", () => {
  const readiness = new RuntimeReadiness("worker");
  assertEquals(
    handleHealthRequest(
      new Request("http://localhost/health/unknown"),
      readiness,
    ),
    null,
  );
  assertEquals(
    handleHealthRequest(
      new Request("http://localhost/health/live", { method: "POST" }),
      readiness,
    ),
    null,
  );
});

Deno.test("readiness enters a fail-closed draining state", async () => {
  const readiness = new RuntimeReadiness("api");
  readiness.setDatabaseState(true);
  readiness.beginDrain();

  const ready = handleHealthRequest(
    new Request("http://localhost/health/ready"),
    readiness,
  );
  assertEquals(ready?.status, 503);
  assertEquals((await ready?.json()).state, "draining");
  assertEquals(readiness.isAcceptingTraffic(), false);
  assertEquals(readiness.live().state, "healthy");
});
