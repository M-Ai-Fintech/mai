// tests/e2e/cli.spec.ts
import { assertEquals } from "@std/assert";
import { t } from "../../src/i18n/index.ts";

const runCLI = async (args: string[]) => {
  const command = new Deno.Command(Deno.execPath(), {
    args: ["run", "--allow-all", "src/cli/interface.ts", ...args],
    stdin: "null",
    stdout: "piped",
    stderr: "piped",
  });
  const { code, stdout, stderr } = await command.output();
  return {
    code,
    stdout: new TextDecoder().decode(stdout),
    stderr: new TextDecoder().decode(stderr),
  };
};

Deno.test("E2E CLI - kyb command executes successfully", async () => {
  const { code, stdout, stderr } = await runCLI(["kyb", "12345678000199"]);
  if (code !== 0) {
    console.log("TEST STDOUT:", stdout);
    console.log("TEST STDERR:", stderr);
  }
  assertEquals(code, 0);
  assertEquals(
    stdout.includes(
      t("cli.headers.checkRegistry", undefined, "pt-BR").toUpperCase(),
    ),
    true,
  );
  assertEquals(
    stdout.includes(t("cli.tables.kybFields.status", undefined, "pt-BR")),
    true,
  );
  assertEquals(
    stdout.includes(t("cli.tables.kybFields.legalName", undefined, "pt-BR")),
    true,
  );
});

Deno.test("E2E CLI - predict command executes successfully", async () => {
  const { code, stdout } = await runCLI(["predict"]);
  assertEquals(code, 0);
  assertEquals(
    stdout.includes(
      t(
        "cli.headers.analyzeRisk",
        { name: "Target Corp Ltda" },
        "pt-BR",
      ).toUpperCase(),
    ),
    true,
  );
  assertEquals(
    stdout.includes(
      t("cli.messages.calculatedRiskMetrics", undefined, "pt-BR"),
    ),
    true,
  );
});

Deno.test("E2E CLI - portfolio command executes successfully", async () => {
  const { code, stdout } = await runCLI(["portfolio", "100", "0.4"]);
  assertEquals(code, 0);
  assertEquals(
    stdout.includes(
      t("cli.headers.optimizePortfolio", undefined, "pt-BR").toUpperCase(),
    ),
    true,
  );
});

Deno.test("E2E CLI - negotiate command executes successfully", async () => {
  const { code, stdout } = await runCLI(["negotiate"]);
  assertEquals(code, 0);
  assertEquals(
    stdout.includes(
      t("cli.headers.optimizeTermSheet", undefined, "pt-BR").toUpperCase(),
    ),
    true,
  );
  assertEquals(
    stdout.includes(t("cli.messages.alt1Title", undefined, "pt-BR").trim()),
    true,
  );
  assertEquals(
    stdout.includes(t("cli.messages.alt2Title", undefined, "pt-BR").trim()),
    true,
  );
  assertEquals(
    stdout.includes(t("cli.messages.alt3Title", undefined, "pt-BR").trim()),
    true,
  );
});

Deno.test("E2E CLI - document command generates PDF and LaTeX", async () => {
  // Ensure the target files don't exist before testing
  try {
    await Deno.remove("./term_sheets/term_sheet_composto.pdf");
  } catch {}
  try {
    await Deno.remove("./term_sheets/term_sheet_composto.tex");
  } catch {}

  const { code, stdout } = await runCLI(["document"]);
  assertEquals(code, 0);
  assertEquals(
    stdout.includes(
      t("cli.headers.generateDocument", undefined, "pt-BR").toUpperCase(),
    ),
    true,
  );
  assertEquals(
    stdout.includes(
      t("cli.messages.pdfCompiled", { path: "" }, "pt-BR").split("\x1b")[0],
    ),
    true,
  );

  // Assert files exist and are not empty
  const pdfInfo = await Deno.stat("./term_sheets/term_sheet_composto.pdf");
  const texInfo = await Deno.stat("./term_sheets/term_sheet_composto.tex");
  assertEquals(pdfInfo.isFile, true);
  assertEquals(pdfInfo.size > 0, true);
  assertEquals(texInfo.isFile, true);
  assertEquals(texInfo.size > 0, true);
});

Deno.test("E2E CLI - invalid command shows help/error", async () => {
  const { code, stderr } = await runCLI(["invalid_command_123"]);
  // Depending on commander config it might exit with 0 or 1
  assertEquals(stderr.includes('Unknown command "invalid_command_123"'), true);
});
