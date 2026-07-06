import { AppBootstrapper } from "./core/boot.ts";
import { main as cliMain } from "./cli/interface.ts";
import { CLIErrorHandler } from "./cli/errors.ts";

async function bootAndRun() {
  try {
    if (Deno.args[0] !== "completions") {
      await AppBootstrapper.bootstrap();
    }
    await cliMain();
  } catch (error) {
    const isDebug = Deno.args.includes("--debug") || Deno.args.includes("-d");
    await CLIErrorHandler.handleError(error, isDebug);
  }
}

if (import.meta.main) {
  bootAndRun();
}
