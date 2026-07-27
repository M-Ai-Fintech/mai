import { assertEquals } from "@std/assert";
import { t } from "../../src/i18n/index.ts";

interface CliResult {
  code: number;
  stdout: string;
  stderr: string;
}

async function runCLI(args: string[]): Promise<CliResult> {
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
}

async function removeGeneratedFile(path: string): Promise<void> {
  try {
    await Deno.remove(path);
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) throw error;
  }
}

function assertSuccessful(result: CliResult): void {
  if (result.code !== 0) {
    console.log("TEST STDOUT:", result.stdout);
    console.log("TEST STDERR:", result.stderr);
  }
  assertEquals(result.code, 0);
}

function assertOutputIncludes(stdout: string, expected: string): void {
  assertEquals(stdout.includes(expected), true);
}

async function assertGeneratedTermSheetFiles(): Promise<void> {
  const pdfInfo = await Deno.stat("./term_sheets/term_sheet_composto.pdf");
  const texInfo = await Deno.stat("./term_sheets/term_sheet_composto.tex");
  assertEquals(pdfInfo.isFile, true);
  assertEquals(pdfInfo.size > 0, true);
  assertEquals(texInfo.isFile, true);
  assertEquals(texInfo.size > 0, true);
}

Deno.test("E2E CLI - kyb command executes successfully", async () => {
  const result = await runCLI(["kyb", "12345678000199"]);
  assertSuccessful(result);
  assertOutputIncludes(
    result.stdout,
    t("cli.headers.checkRegistry", undefined, "pt-BR").toUpperCase(),
  );
  assertOutputIncludes(
    result.stdout,
    t("cli.tables.kybFields.status", undefined, "pt-BR"),
  );
  assertOutputIncludes(
    result.stdout,
    t("cli.tables.kybFields.legalName", undefined, "pt-BR"),
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
  assertOutputIncludes(
    stdout,
    t("cli.headers.optimizeTermSheet", undefined, "pt-BR").toUpperCase(),
  );
  assertOutputIncludes(
    stdout,
    t("cli.messages.alt1Title", undefined, "pt-BR").trim(),
  );
  assertOutputIncludes(
    stdout,
    t("cli.messages.alt2Title", undefined, "pt-BR").trim(),
  );
  assertOutputIncludes(
    stdout,
    t("cli.messages.alt3Title", undefined, "pt-BR").trim(),
  );
});

Deno.test("E2E CLI - document command generates PDF and LaTeX", async () => {
  await removeGeneratedFile("./term_sheets/term_sheet_composto.pdf");
  await removeGeneratedFile("./term_sheets/term_sheet_composto.tex");

  const { code, stdout } = await runCLI(["document"]);
  assertEquals(code, 0);
  assertOutputIncludes(
    stdout,
    t("cli.headers.generateDocument", undefined, "pt-BR").toUpperCase(),
  );
  assertOutputIncludes(
    stdout,
    t("cli.messages.pdfCompiled", { path: "" }, "pt-BR").split("\x1b")[0],
  );
  await assertGeneratedTermSheetFiles();
});

Deno.test("E2E CLI - invalid command shows help/error", async () => {
  const { stderr } = await runCLI(["invalid_command_123"]);
  assertEquals(stderr.includes('Unknown command "invalid_command_123"'), true);
});
