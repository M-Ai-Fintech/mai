// src/cli/interface.ts
import { CLICommands } from "./commands.ts";
import { CLIChat } from "./chat.ts";

/**
 * Beautiful ASCII Banner and color styling
 */
function printBanner() {
  console.log("\x1b[36m%s\x1b[0m", `
  ============================================================
   __  __    _      __  __ _     _     _ _                       
  |  \\/  |  / \\    |  \\/  (_) __| | __| | |_____      ____ _ _ __ 
  | |\\/| | / _ \\   | |\\/| | |/ _\` |/ _\` | / _ \\ \\ /\\ / / _\` | '__|
  | |  | |/ ___ \\  | |  | | | (_| | (_| | |  __/\\ V  V / (_| | |   
  |_|  |_/_/   \\_\\ |_|  |_|_|\\__,_|\\__,_|_|\\___| \\_/\\_/ \\__,_|_|   
                                                                  
                     M&A LOW-TOUCH MIDDLEWARE (MVP)
  ============================================================`);
}

/**
 * Menu options
 */
function printMenu() {
  console.log("\nSelecione um motor computacional para executar:");
  console.log("  \x1b[33m[1]\x1b[0m Verificar Cadastro de CNPJ (KYB/Compliance)");
  console.log("  \x1b[33m[2]\x1b[0m Previsão de Risco e Insolvência (ONNX/Transformers)");
  console.log("  \x1b[33m[3]\x1b[0m Otimizar Portfólio de Aquisições (MILP via HiGHS WASM)");
  console.log("  \x1b[33m[4]\x1b[0m Otimizar Cláusulas do Term Sheet (Algoritmos Genéticos)");
  console.log("  \x1b[33m[5]\x1b[0m Compilar Term Sheet (Geração LaTeX & PDF)");
  console.log("  \x1b[33m[6]\x1b[0m Iniciar Chat com Agente M&A Broker (Conversacional RAG)");
  console.log("  \x1b[33m[7]\x1b[0m Sair");
  Deno.stdout.writeSync(new TextEncoder().encode("\nEscolha > "));
}

/**
 * Main command loop
 */
async function main() {
  const args = Deno.args;

  if (args.length > 0) {
    // Command line mode
    await handleCliArgs(args);
    return;
  }

  // Interactive menu mode
  printBanner();
  const decoder = new TextDecoder();
  const buffer = new Uint8Array(16);

  while (true) {
    printMenu();
    const bytesRead = Deno.stdin.readSync(buffer);
    if (bytesRead === null) break;

    const choice = decoder.decode(buffer.subarray(0, bytesRead)).trim();

    switch (choice) {
      case "1": {
        const cnpj = prompt("Informe o CNPJ da empresa (ex: 12345678000199):") || "12345678000199";
        await CLICommands.checkRegistry(cnpj);
        break;
      }
      case "2": {
        const name = prompt("Nome da Empresa Alvo:") || "Target Corp Ltda";
        const sector = prompt("Setor Econômico:") || "SaaS / Fintech";
        const ebitda = parseFloat(prompt("EBITDA anual ($):") || "4500000");
        const revenue = parseFloat(prompt("Receita anual ($):") || "15000000");
        const assets = parseFloat(prompt("Total de Ativos ($):") || "20000000");
        const liabilities = parseFloat(prompt("Total de Passivos ($):") || "12000000");
        const cashflow = parseFloat(prompt("Caixa Operacional ($):") || "3200000");
        const volatility = parseFloat(prompt("Volatilidade Histórica (0.0 a 1.0):") || "0.12");

        await CLICommands.analyzeRisk({
          name, sector, ebitda, revenue, assets, liabilities, cashflow, volatility
        });
        break;
      }
      case "3": {
        const budget = parseFloat(prompt("Orçamento Máximo disponível ($M):") || "90");
        const riskTolerance = parseFloat(prompt("Tolerância de Risco Máxima (0.0 a 1.0):") || "0.3");
        await CLICommands.optimizePortfolio(budget, riskTolerance);
        break;
      }
      case "4": {
        CLICommands.optimizeTermSheet();
        break;
      }
      case "5": {
        const buyer = prompt("Nome da Adquirente:") || "Alpha Investments S.A.";
        const seller = prompt("Nome da Vendedora:") || "Fundadores da Target Ltda";
        const target = prompt("Nome da Empresa Alvo:") || "Target Ltda";
        const valuation = parseFloat(prompt("Valuation de Referência ($):") || "12000000");
        const output = prompt("Caminho de saída para o PDF:") || "./term_sheets/term_sheet_composto.pdf";

        await CLICommands.generateDocument({ buyer, seller, target, valuation, output });
        break;
      }
      case "6": {
        const dealId = prompt("Informe o ID do Deal para RAG isolado:") || "deal_alpha";
        await CLIChat.startSession(dealId);
        break;
      }
      case "7":
        console.log("\nSaindo... Obrigado por usar o M&A Low-Touch Middleware.");
        Deno.exit(0);
        break;
      default:
        console.log("\n\x1b[31mOpção inválida. Digite um número de 1 a 7.\x1b[0m");
    }
  }
}

/**
 * Handles argument parsing if run directly via CLI commands
 */
async function handleCliArgs(args: string[]) {
  const cmd = args[0];
  switch (cmd) {
    case "kyb": {
      const cnpj = args[1] || "12345678000199";
      await CLICommands.checkRegistry(cnpj);
      break;
    }
    case "predict": {
      await CLICommands.analyzeRisk({
        name: "Target Corp",
        sector: "Fintech",
        ebitda: 4500000,
        revenue: 15000000,
        assets: 20000000,
        liabilities: 12000000,
        cashflow: 3200000,
        volatility: 0.12
      });
      break;
    }
    case "portfolio": {
      const budget = parseFloat(args[1] || "90");
      const risk = parseFloat(args[2] || "0.3");
      await CLICommands.optimizePortfolio(budget, risk);
      break;
    }
    case "negotiate": {
      CLICommands.optimizeTermSheet();
      break;
    }
    case "document": {
      await CLICommands.generateDocument({
        buyer: "Alpha Investments S.A.",
        seller: "Fundadores da Target Ltda",
        target: "Target Ltda",
        valuation: 12000000,
        output: "./term_sheets/term_sheet_composto.pdf"
      });
      break;
    }
    case "chat": {
      const dealId = args[1] || "deal_cli";
      await CLIChat.startSession(dealId);
      break;
    }
    default:
      console.log(`Comando desconhecido: ${cmd}`);
      console.log("Comandos disponíveis: kyb, predict, portfolio, negotiate, document, chat");
  }
}

if (import.meta.main) {
  main();
}
