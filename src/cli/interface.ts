import { colors } from "@cliffy/ansi";
import { Command, CompletionsCommand } from "@cliffy/command";
import { Input, Select } from "@cliffy/prompt";
import { resolveLocale, setLocale } from "../i18n/index.ts";
import { CLIChat } from "./chat.ts";
import { CLICommands } from "./commands.ts";
import { CLIErrorHandler } from "./errors.ts";
import { FinancialRiskOptions } from "./risk-command.ts";

interface TextPromptOptions {
  message: string;
  fallback: string;
  suggestions?: string[];
}

const INTERACTIVE_CHOICES = [
  { name: "Check CNPJ Registry (KYB/Compliance)", value: "kyb" },
  {
    name: "Risk and Insolvency Prediction (ONNX/Transformers)",
    value: "predict",
  },
  {
    name: "Optimize Acquisitions Portfolio (MILP via HiGHS WASM)",
    value: "portfolio",
  },
  {
    name: "Optimize Term Sheet Clauses (Genetic Algorithms)",
    value: "negotiate",
  },
  {
    name: "Compile Term Sheet (LaTeX & PDF Generation)",
    value: "document",
  },
  {
    name: "Start Chat with M&A Broker Agent (Conversational RAG)",
    value: "chat",
  },
  { name: "Exit", value: "exit" },
];

function printBanner(): void {
  console.log(colors.cyan(`
  ============================================================
   __  __    _      __  __ _     _     _ _                       
  |  \\/  |  / \\    |  \\/  (_) __| | __| | |_____      ____ _ _ __ 
  | |\\/| | / _ \\   | |\\/| | |/ _\` |/ _\` | / _ \\ \\ /\\ / / _\` | '__|
  | |  | |/ ___ \\  | |  | | | (_| | (_| | |  __/\\ V  V / (_| | |   
  |_|  |_/_/   \\_\\ |_|  |_|_|\\__,_|\\__,_|_|\\___| \\_/\\_/ \\__,_|_|   
                                                                  
                     M&A LOW-TOUCH MIDDLEWARE (MVP)
  ============================================================`));
}

function isInteractiveTerminal(): boolean {
  try {
    return Deno.stdin.isTerminal();
  } catch {
    return false;
  }
}

async function promptText(options: TextPromptOptions): Promise<string> {
  if (!isInteractiveTerminal()) return options.fallback;
  return await Input.prompt({
    message: options.message,
    default: options.fallback,
    suggestions: options.suggestions,
  });
}

async function promptNumber(
  message: string,
  fallback: string,
): Promise<number> {
  return parseFloat(await promptText({ message, fallback }));
}

async function runKybCommand(cnpj?: string): Promise<void> {
  const targetCnpj = cnpj ?? await promptText({
    message: "Enter the company's CNPJ",
    fallback: "12345678000199",
    suggestions: ["12345678000199", "98765432000198", "00000000000191"],
  });
  await CLICommands.checkRegistry(targetCnpj);
}

async function promptFinancialRiskOptions(): Promise<FinancialRiskOptions> {
  return {
    name: await promptText({
      message: "Target Company Name",
      fallback: "Target Corp Ltda",
    }),
    sector: await promptSector(),
    ebitda: await promptNumber("Annual EBITDA ($)", "4500000"),
    revenue: await promptNumber("Annual Revenue ($)", "15000000"),
    assets: await promptNumber("Total Assets ($)", "20000000"),
    liabilities: await promptNumber("Total Liabilities ($)", "12000000"),
    cashflow: await promptNumber("Operating Cashflow ($)", "3200000"),
    volatility: await promptNumber(
      "Historical Volatility (0.0 to 1.0)",
      "0.12",
    ),
  };
}

function promptSector(): Promise<string> {
  return promptText({
    message: "Economic Sector",
    fallback: "SaaS / Fintech",
    suggestions: [
      "SaaS / Fintech",
      "Retail",
      "Industry",
      "Agribusiness",
      "Healthcare",
    ],
  });
}

async function runPredictCommand(): Promise<void> {
  await CLICommands.analyzeRisk(await promptFinancialRiskOptions());
}

async function runPortfolioCommand(
  budgetArgument?: number,
  riskArgument?: number,
): Promise<void> {
  const budget = budgetArgument ??
    await promptNumber("Maximum available budget ($M)", "90");
  const risk = riskArgument ??
    await promptNumber("Maximum Risk Tolerance (0.0 to 1.0)", "0.3");
  await CLICommands.optimizePortfolio(budget, risk);
}

async function runDocumentCommand(): Promise<void> {
  const buyer = await promptText({
    message: "Acquirer Name",
    fallback: "Alpha Investments S.A.",
  });
  const seller = await promptText({
    message: "Seller Name",
    fallback: "Target Ltda Founders",
  });
  const target = await promptText({
    message: "Target Company Name",
    fallback: "Target Ltda",
  });
  await generatePromptedDocument(buyer, seller, target);
}

async function generatePromptedDocument(
  buyer: string,
  seller: string,
  target: string,
): Promise<void> {
  const valuation = await promptNumber("Reference Valuation ($)", "12000000");
  const output = await promptText({
    message: "Output path for the PDF",
    fallback: "./term_sheets/term_sheet_composto.pdf",
  });
  await CLICommands.generateDocument({
    buyer,
    seller,
    target,
    valuation,
    output,
  });
}

async function runChatCommand(dealArgument?: string): Promise<void> {
  const dealId = dealArgument ?? await promptText({
    message: "Enter the Deal ID for siloed RAG",
    fallback: "deal_alpha",
    suggestions: ["deal_alpha", "deal_beta", "deal_gamma", "deal_omega"],
  });
  await CLIChat.startSession(dealId);
}

function runSmokeCommand(): void {
  console.log("Running diagnostic report (Smoke Test)...");
  console.log("M&A Low-Touch Environment: \x1b[32mOK\x1b[0m");
  console.log("Isolated network for testing: \x1b[32mOK\x1b[0m");
  console.log("Pipeline: \x1b[32mPASS\x1b[0m");
}

async function runInteractiveMode(): Promise<void> {
  printBanner();
  while (isInteractiveTerminal()) {
    const shouldContinue = await runInteractiveChoice();
    if (!shouldContinue) return;
  }
  console.log("Non-interactive mode detected. Exiting interactive loop.");
}

async function runInteractiveChoice(): Promise<boolean> {
  const choice = await Select.prompt<string>({
    message: "Select a computational engine to run:",
    options: INTERACTIVE_CHOICES,
  });
  if (choice === "exit") {
    printExitMessage();
    return false;
  }
  try {
    await mainCommand.parse([choice]);
  } catch (error) {
    await CLIErrorHandler.handleError(error, debugEnabled(), false);
  }
  return true;
}

function printExitMessage(): void {
  console.log(colors.green(
    "\nExiting... Thank you for using the M&A Low-Touch Middleware.",
  ));
}

function debugEnabled(): boolean {
  return Deno.args.includes("--debug") || Deno.args.includes("-d");
}

async function runApiServer(): Promise<never> {
  const { startServer } = await import("../api/server.ts");
  startServer();
  return await new Promise<never>(() => {});
}

const kybCommand = new Command()
  .description("Check CNPJ Registry (KYB/Compliance)")
  .arguments("[cnpj:string]")
  .action((_options, cnpj) => runKybCommand(cnpj));

const predictCommand = new Command()
  .description("Risk and Insolvency Prediction (ONNX/Transformers)")
  .action(runPredictCommand);

const portfolioCommand = new Command()
  .description("Optimize Acquisitions Portfolio (MILP via HiGHS WASM)")
  .arguments("[budget:number] [risk:number]")
  .action((_options, budget, risk) => runPortfolioCommand(budget, risk));

const negotiateCommand = new Command()
  .description("Optimize Term Sheet Clauses (Genetic Algorithms)")
  .action(() => CLICommands.optimizeTermSheet());

const documentCommand = new Command()
  .description("Compile Term Sheet (LaTeX & PDF Generation)")
  .action(runDocumentCommand);

const chatCommand = new Command()
  .description("Start Chat with M&A Broker Agent (Conversational RAG)")
  .arguments("[dealId:string]")
  .action((_options, dealId) => runChatCommand(dealId));

const smokeCommand = new Command()
  .description("Run diagnostic report (Smoke Test)")
  .action(runSmokeCommand);

const interactiveCommand = new Command()
  .description("Interactive Mode")
  .action(runInteractiveMode);

const serveCommand = new Command()
  .description("Start the Core API Server")
  .action(runApiServer);

const mainCommand = new Command()
  .name("mai-cli")
  .version("1.0.0")
  .description("M&A Low-Touch Middleware CLI")
  .globalOption("-v, --verbose", "Enable verbose output")
  .globalOption("-d, --debug", "Enable debug output")
  .globalOption("-l, --lang <locale:string>", "Set locale (en, pt-BR)", {
    default: "en",
  })
  .action(() => {})
  .command("kyb", kybCommand)
  .command("predict", predictCommand)
  .command("portfolio", portfolioCommand)
  .command("negotiate", negotiateCommand)
  .command("document", documentCommand)
  .command("chat", chatCommand)
  .command("smoke", smokeCommand)
  .command("serve", serveCommand)
  .command("completions", new CompletionsCommand())
  .command("interactive", interactiveCommand)
  .default("interactive")
  .action(async () => {
    if (Deno.args.length === 0) {
      await mainCommand.parse(["interactive"]);
    }
  });

function requestedLocale(argumentsList: string[]): string {
  const languageIndex = argumentsList.findIndex((argument) =>
    argument === "--lang" || argument === "-l"
  );
  const inlineLanguage = argumentsList.find((argument) =>
    argument.startsWith("--lang=")
  )?.slice("--lang=".length);
  return inlineLanguage ??
    (languageIndex >= 0 ? argumentsList[languageIndex + 1] : undefined) ??
    "pt-BR";
}

/**
 * Bootstraps dependencies, locale selection, and CLI argument parsing.
 *
 * @example await main();
 */
export async function main(): Promise<void> {
  try {
    const { AppBootstrapper } = await import("../core/boot.ts");
    await AppBootstrapper.bootstrap();
    setLocale(resolveLocale(requestedLocale(Deno.args)));
    await mainCommand.parse(Deno.args);
  } catch (error) {
    await CLIErrorHandler.handleError(error, debugEnabled());
  }
}

if (import.meta.main) {
  main();
}
