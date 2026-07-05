import { AppBootstrapper } from "./core/boot.ts";
import { main as cliMain } from "./cli/interface.ts";

async function bootAndRun() {
  await AppBootstrapper.bootstrap();
  await cliMain();
}

if (import.meta.main) {
  bootAndRun();
}
