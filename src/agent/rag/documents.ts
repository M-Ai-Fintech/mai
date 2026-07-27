import { VDRProvider } from "../../core/vdr/provider.ts";
import { IDealsVDRProvider } from "../../core/vdr/providers/ideals.ts";
import { IntralinksVDRProvider } from "../../core/vdr/providers/intralinks.ts";
import { describeError } from "../../shared/errors.ts";

export interface RagDocument {
  name: string;
  contentSummary: string;
}

type VdrType = "local" | "ideals" | "intralinks";

export async function loadRagDocuments(
  source: string,
  type: VdrType,
): Promise<RagDocument[]> {
  try {
    const documents = type === "local"
      ? await loadLocalDocuments(source)
      : await loadProviderDocuments(source, createProvider(type));
    return documents.length > 0 ? documents : fallbackDocuments();
  } catch (error: unknown) {
    console.warn(
      `[RAG Silo] Error reading from "${source}" (${type}); expected an accessible VDR source. Using fallback data:`,
      describeError(error),
    );
    return fallbackDocuments();
  }
}

async function loadLocalDocuments(source: string): Promise<RagDocument[]> {
  const documents: RagDocument[] = [];
  for await (const entry of Deno.readDir(source)) {
    if (!entry.isFile || !isTextDocument(entry.name)) continue;
    documents.push({
      name: entry.name,
      contentSummary: await Deno.readTextFile(`${source}/${entry.name}`),
    });
  }
  return documents;
}

function isTextDocument(name: string): boolean {
  return name.endsWith(".txt") || name.endsWith(".md");
}

async function loadProviderDocuments(
  source: string,
  provider: VDRProvider,
): Promise<RagDocument[]> {
  const metadata = await provider.listDocuments(source);
  return await Promise.all(
    metadata.map((document) => downloadDocument(provider, document)),
  );
}

async function downloadDocument(
  provider: VDRProvider,
  document: { id: string; name: string },
): Promise<RagDocument> {
  try {
    const content = new TextDecoder().decode(
      await provider.downloadDocument(document.id),
    );
    return {
      name: document.name,
      contentSummary: content || `Content of file ${document.name} is empty.`,
    };
  } catch (error: unknown) {
    throw new Error(
      `Failed to download VDR document "${document.name}" (${document.id}); expected readable document bytes: ${
        describeError(error)
      }`,
    );
  }
}

function createProvider(type: Exclude<VdrType, "local">): VDRProvider {
  const config = {
    apiKey: Deno.env.get("SUPERGOOD_API_KEY") || "mock-supergood-key",
    clientId: Deno.env.get("SUPERGOOD_CLIENT_ID"),
    proxyUrl: Deno.env.get("SUPERGOOD_PROXY_URL") || undefined,
  };
  return type === "ideals"
    ? new IDealsVDRProvider(config)
    : new IntralinksVDRProvider(config);
}

function fallbackDocuments(): RagDocument[] {
  return FALLBACK_DOCUMENTS.map((document) => ({ ...document }));
}

const FALLBACK_DOCUMENTS: readonly RagDocument[] = [
  {
    name: "Income_Statement_Target_2025.txt",
    contentSummary:
      "Consolidated Income Statement (DRE). EBITDA: 4500000. Revenue: 15000000. Total Assets: 20000000. Total Liabilities: 12000000. Operating Cash: 3200000. Historical Volatility: 0.12.",
  },
  {
    name: "Bylaws_Registered.txt",
    contentSummary:
      "Bylaws filed with the Board of Trade. Includes Change of Control clause determining unanimous approval of the administrative council for hostile acquisitions.",
  },
  {
    name: "Payroll_C_Level.txt",
    contentSummary:
      "Salary and performance bonus details for the Executive board (CEO, CFO, CTO) with 12-month golden parachute clauses.",
  },
  {
    name: "Shareholders_Agreement_Target.txt",
    contentSummary:
      "Shareholders agreement contract establishing 100% tag-along rights and Right of First Refusal.",
  },
];
