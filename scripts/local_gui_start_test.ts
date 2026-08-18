import { assertEquals } from "@std/assert";
import {
  parseLocalGuiEnvironment,
  resolveLocalGuiEnvironment,
} from "./local_gui_start.ts";

Deno.test("local GUI launcher parses the generated runtime contract", () => {
  assertEquals(
    parseLocalGuiEnvironment(
      "MAI_API_BASE_URL=http://127.0.0.1:18000\nMAI_FRONTEND_DATA_SOURCE=v1\n",
    ),
    {
      MAI_API_BASE_URL: "http://127.0.0.1:18000",
      MAI_FRONTEND_DATA_SOURCE: "v1",
    },
  );
});

Deno.test("local GUI launcher upgrades an existing generated environment", () => {
  const resolved = resolveLocalGuiEnvironment({
    LOCAL_API_URL: "http://localhost:18000",
    LOCAL_RUNTIME_PROFILE: "local",
  });
  assertEquals(resolved.MAI_API_BASE_URL, "http://localhost:18000");
  assertEquals(resolved.MAI_FRONTEND_DATA_SOURCE, "v1");
  assertEquals(resolved.MAI_LOCAL_MVP_ENABLED, "true");
  assertEquals(resolved.MAI_LOCAL_SESSION_ID, "session_local-banker");
  assertEquals(resolved.MAI_LOCAL_DEAL_ID, "deal_serra-azul");
});
