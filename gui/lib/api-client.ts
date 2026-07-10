import { z } from "zod";

const BASE_URL = process.env.NEXT_PUBLIC_CORE_API_URL || "http://localhost:8000";

export const kybSchema = z.object({
  cnpj: z.string()
});
export const kybResponseSchema = z.any();

export const predictSchema = z.object({
  name: z.string(),
  sector: z.string(),
  ebitda: z.number(),
  revenue: z.number(),
  assets: z.number(),
  liabilities: z.number(),
  cashflow: z.number(),
  volatility: z.number()
});

export const portfolioSchema = z.object({
  budget: z.number(),
  riskTolerance: z.number()
});

export const negotiateSchema = z.object({}); // No args for simple demo

export const documentSchema = z.object({
  buyer: z.string(),
  seller: z.string(),
  target: z.string(),
  valuation: z.number(),
  output: z.string().optional()
});

class APIError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "APIError";
    this.status = status;
  }
}

/**
 * Sanitizes errors to remove absolute paths or internals
 */
function sanitizeErrorMessage(msg: string): string {
  return msg.replace(/\/[a-zA-Z0-9_\-\/]+\/mai\//g, "[INTERNAL_PATH]/");
}

/**
 * Fetch wrapper with timeout and exponential retry
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = 3,
  backoffMs = 500,
  timeoutMs = 10000
): Promise<Response> {
  let attempt = 0;
  
  while (attempt < retries) {
    attempt++;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(id);
      
      if (!res.ok) {
        const text = await res.text().catch(() => "Unknown error");
        throw new APIError(sanitizeErrorMessage(text), res.status);
      }
      return res;
    } catch (err: any) {
      clearTimeout(id);
      if (err.name === 'AbortError') {
        if (attempt >= retries) throw new APIError(`Timeout exceeded (${timeoutMs}ms)`, 408);
      } else if (err instanceof APIError) {
        throw err; // don't retry 4xx/5xx for now, let caller handle
      } else {
        if (attempt >= retries) throw new APIError(sanitizeErrorMessage(err.message));
      }
      // wait before next attempt
      await new Promise(r => setTimeout(r, backoffMs * Math.pow(2, attempt - 1)));
    }
  }
  throw new APIError("Max retries reached");
}

export const ApiClient = {
  async checkKyb(data: z.infer<typeof kybSchema>) {
    const validated = kybSchema.parse(data);
    const res = await fetchWithRetry(`${BASE_URL}/api/kyb`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validated)
    });
    return res.json();
  },

  async predictRisk(data: z.infer<typeof predictSchema>) {
    const validated = predictSchema.parse(data);
    const res = await fetchWithRetry(`${BASE_URL}/api/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validated)
    });
    return res.json();
  },

  async optimizePortfolio(data: z.infer<typeof portfolioSchema>) {
    const validated = portfolioSchema.parse(data);
    const res = await fetchWithRetry(`${BASE_URL}/api/portfolio`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validated)
    });
    return res.json();
  },

  async optimizeTermSheet(data: z.infer<typeof negotiateSchema> = {}) {
    const res = await fetchWithRetry(`${BASE_URL}/api/negotiate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async generateDocument(data: z.infer<typeof documentSchema>) {
    const validated = documentSchema.parse(data);
    const res = await fetchWithRetry(`${BASE_URL}/api/document`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validated)
    });
    return res.json();
  },

  // Streaming/SSE for chat
  chatStream(dealId: string, query: string, onMessage: (msg: string) => void, onError: (err: any) => void) {
    try {
      const url = new URL(`${BASE_URL}/api/chat`);
      url.searchParams.append("dealId", dealId);
      url.searchParams.append("query", query);
      
      const eventSource = new EventSource(url.toString());
      
      eventSource.onmessage = (event) => {
        onMessage(event.data);
      };
      
      eventSource.onerror = (error) => {
        onError(error);
        eventSource.close();
      };
      
      return () => eventSource.close();
    } catch (e: any) {
      onError(new APIError(sanitizeErrorMessage(e.message || "SSE Error")));
      return () => {};
    }
  }
};
