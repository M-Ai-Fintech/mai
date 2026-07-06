// tests/e2e/cli.spec.ts
import { assertEquals } from "@std/assert";

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
  assertEquals(stdout.toUpperCase().includes("VERIFICAÇÃO CADASTRAL DE KYB (SERPRO/RECEITA)"), true);
  assertEquals(stdout.includes("Situação"), true);
  assertEquals(stdout.includes("Razão Social"), true);
});

Deno.test("E2E CLI - predict command executes successfully", async () => {
  const { code, stdout } = await runCLI(["predict"]);
  assertEquals(code, 0);
  assertEquals(stdout.toUpperCase().includes("ANÁLISE PREDITIVA DE RISCO"), true);
  assertEquals(stdout.includes("Métricas de Risco Calculadas:"), true);
});

Deno.test("E2E CLI - portfolio command executes successfully", async () => {
  const { code, stdout } = await runCLI(["portfolio", "100", "0.4"]);
  assertEquals(code, 0);
  assertEquals(stdout.includes("OTIMIZAÇÃO DE PORTFÓLIO DE AQUISIÇÕES"), true);
  assertEquals(stdout.includes("Empresas Recomendadas para Aquisição"), true);
  assertEquals(stdout.includes("Beta Logística"), true);
});

Deno.test("E2E CLI - negotiate command executes successfully", async () => {
  const { code, stdout } = await runCLI(["negotiate"]);
  assertEquals(code, 0);
  assertEquals(stdout.includes("OTIMIZAÇÃO CONTRATUAL POR ALGORITMO GENÉTICO"), true);
  assertEquals(stdout.includes("Alternativa 1"), true);
  assertEquals(stdout.includes("Alternativa 2"), true);
  assertEquals(stdout.includes("Alternativa 3"), true);
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
  assertEquals(stdout.includes("GERAÇÃO DE DOCUMENTAÇÃO CONTRATUAL"), true);
  assertEquals(stdout.includes("PDF compilado e salvo em"), true);

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

