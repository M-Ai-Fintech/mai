import { z } from "zod";

const BASE_URL = process.env.NEXT_PUBLIC_CORE_API_URL || "http://localhost:8000";

const idSchema = z.string().uuid();
const timestampSchema = z.string().datetime({ offset: true });
type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ]),
);
const jsonObjectSchema = z.record(z.string(), jsonValueSchema);

export const moneySchema = z.object({
  amountMinor: z.string().regex(/^\d+$/),
  currency: z.enum(["BRL", "USD", "EUR"]),
});

export const paginationMetaSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

export const fieldErrorsSchema = z.record(z.string(), z.array(z.string()));
export const errorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    fieldErrors: fieldErrorsSchema.optional(),
  }),
});

const dealTypeSchema = z.enum(["buy_side", "sell_side"]);
const dealStatusSchema = z.enum(["active", "archived", "completed"]);
const dealPhaseSchema = z.enum([
  "sourcing",
  "due_diligence",
  "negotiation",
  "closing",
]);

export const entityRoleSchema = z.enum([
  "buyer",
  "seller",
  "target",
  "institution",
]);
export const kybStatusSchema = z.enum(["pending", "in_review", "approved", "rejected"]);

export const dealTargetSchema = z.object({
  id: idSchema,
  legalName: z.string(),
  sector: z.string(),
  countryCode: z.string().length(2),
});

export const advisorSummarySchema = z.object({
  id: idSchema,
  displayName: z.string(),
  avatarUrl: z.string().url().nullable(),
});

export const valuationRangeSchema = z.object({
  min: moneySchema,
  max: moneySchema,
});

export const dealSummarySchema = z.object({
  id: idSchema,
  code: z.string(),
  title: z.string(),
  dealType: dealTypeSchema,
  status: dealStatusSchema,
  currentPhase: dealPhaseSchema,
  target: dealTargetSchema,
  valuationRange: valuationRangeSchema,
  leadAdvisor: advisorSummarySchema.nullable(),
  updatedAt: timestampSchema,
  version: z.number().int().positive(),
});

export const teamMemberSchema = z.object({
  id: idSchema,
  displayName: z.string(),
  email: z.string().email(),
  role: z.string(),
  firmName: z.string(),
  avatarUrl: z.string().url().nullable(),
  active: z.boolean(),
});

export const teamAssignmentSchema = z.object({
  id: idSchema,
  teamMember: teamMemberSchema,
  assignmentRole: z.string(),
  side: z.enum(["buyer", "seller", "target", "neutral"]),
  isLead: z.boolean(),
});

export const phaseHistoryEntrySchema = z.object({
  id: idSchema,
  fromPhase: dealPhaseSchema.nullable(),
  toPhase: dealPhaseSchema,
  comment: z.string().nullable(),
  changedAt: timestampSchema,
  changedBy: advisorSummarySchema.nullable(),
});

export const dealDetailSchema = dealSummarySchema.extend({
  phaseHistory: z.array(phaseHistoryEntrySchema),
  financialStructure: jsonObjectSchema.nullable(),
  teamAssignments: z.array(teamAssignmentSchema),
});

export const dealCreateSchema = z.object({
  code: z.string().min(1),
  title: z.string().min(1),
  dealType: dealTypeSchema,
  targetId: idSchema,
  valuationRange: valuationRangeSchema,
  leadAdvisorId: idSchema.nullable(),
  financialStructure: jsonObjectSchema.nullable(),
});

export const dealUpdateSchema = dealCreateSchema.partial().extend({
  version: z.number().int().positive(),
});

export const phaseTransitionSchema = z.object({
  toPhase: dealPhaseSchema,
  comment: z.string().trim().min(1),
  version: z.number().int().positive(),
});

export const entitySummarySchema = z.object({
  id: idSchema,
  legalName: z.string(),
  taxId: z.string(),
  sector: z.string(),
  countryCode: z.string().length(2),
  roles: z.array(entityRoleSchema).min(1),
  contactEmail: z.string().email(),
  kybStatus: kybStatusSchema,
  regulatoryClearanceRequired: z.boolean(),
  primaryAdvisorId: idSchema.nullable(),
  archivedAt: timestampSchema.nullable(),
  updatedAt: timestampSchema,
  version: z.number().int().positive(),
});

export const entityDetailSchema = entitySummarySchema.extend({
  createdAt: timestampSchema,
});
export const entityWriteSchema = z.object({
  legalName: z.string().trim().min(1),
  taxId: z.string().trim().min(1),
  sector: z.string().trim().min(1),
  countryCode: z.string().length(2),
  roles: z.array(entityRoleSchema).min(1),
  contactEmail: z.string().email(),
  kybStatus: kybStatusSchema,
  regulatoryClearanceRequired: z.boolean(),
  primaryAdvisorId: idSchema.nullable(),
});
export const entityUpdateSchema = entityWriteSchema.partial().extend({
  version: z.number().int().positive(),
});

export const assignmentWriteSchema = z.object({
  teamMemberId: idSchema,
  assignmentRole: z.string().trim().min(1),
  side: z.enum(["buyer", "seller", "target", "neutral"]),
  isLead: z.boolean(),
});
export const replaceAssignmentsSchema = z.object({
  version: z.number().int().positive(),
  assignments: z.array(assignmentWriteSchema),
});

export const chatAgentSchema = z.string().trim().min(1);

export const chatThreadSchema = z.object({
  id: idSchema,
  dealId: idSchema,
  title: z.string(),
  agentId: chatAgentSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const createChatThreadSchema = z.object({
  title: z.string().trim().min(1),
  agentId: chatAgentSchema,
});

export const citationSchema = z.object({
  id: idSchema,
  documentId: idSchema,
  label: z.string(),
  excerpt: z.string().nullable(),
  page: z.number().int().positive().nullable(),
});

const chatMessageBaseShape = {
  id: idSchema,
  threadId: idSchema,
  createdAt: timestampSchema,
};
export const chatMessageSchema = z.discriminatedUnion("role", [
  z.object({
    ...chatMessageBaseShape,
    role: z.literal("user"),
    content: z.string(),
    clientMessageId: idSchema,
  }),
  z.object({
    ...chatMessageBaseShape,
    role: z.literal("assistant"),
    content: z.string(),
    agentId: chatAgentSchema,
    citations: z.array(citationSchema),
  }),
  z.object({
    ...chatMessageBaseShape,
    role: z.literal("tool"),
    toolName: z.string(),
    status: z.enum(["started", "completed", "failed"]),
    content: jsonValueSchema,
  }),
  z.object({
    ...chatMessageBaseShape,
    role: z.literal("system"),
    content: z.string(),
  }),
]);

export const chatStreamRequestSchema = z.object({
  agentId: chatAgentSchema,
  message: z.string().trim().min(1),
  clientMessageId: idSchema,
});

const streamEventBaseSchema = z.object({
  eventId: idSchema,
  threadId: idSchema,
  messageId: idSchema,
});

export const chatStreamEventSchema = z.discriminatedUnion("event", [
  streamEventBaseSchema.extend({
    event: z.literal("message.accepted"),
    data: z.object({ clientMessageId: idSchema }),
  }),
  streamEventBaseSchema.extend({
    event: z.literal("response.delta"),
    data: z.object({ textDelta: z.string() }),
  }),
  streamEventBaseSchema.extend({
    event: z.literal("tool.started"),
    data: z.object({
      toolCallId: idSchema,
      toolName: z.string(),
      input: jsonObjectSchema,
    }),
  }),
  streamEventBaseSchema.extend({
    event: z.literal("tool.completed"),
    data: z.object({
      toolCallId: idSchema,
      toolName: z.string(),
      result: jsonValueSchema,
    }),
  }),
  streamEventBaseSchema.extend({
    event: z.literal("citation"),
    data: citationSchema,
  }),
  streamEventBaseSchema.extend({
    event: z.literal("response.completed"),
    data: z.object({ content: z.string(), citations: z.array(citationSchema) }),
  }),
  streamEventBaseSchema.extend({
    event: z.literal("response.failed"),
    data: z.object({ code: z.string(), message: z.string(), retryable: z.boolean() }),
  }),
]);

export const engineNameSchema = z.enum([
  "financial_risk",
  "portfolio_match",
  "negotiation",
]);
export const engineRunSchema = z.object({
  id: idSchema,
  dealId: idSchema,
  engine: engineNameSchema,
  status: z.enum(["queued", "running", "completed", "failed"]),
  result: jsonObjectSchema.nullable(),
  error: errorEnvelopeSchema.shape.error.nullable(),
  createdAt: timestampSchema,
  completedAt: timestampSchema.nullable(),
});
export const createEngineRunSchema = z.object({
  engine: engineNameSchema,
  input: jsonObjectSchema,
});

export const vdrDocumentSchema = z.object({
  id: idSchema,
  dealId: idSchema,
  name: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  createdAt: timestampSchema,
});

const generatedDocumentTypeSchema = z.enum([
  "due_diligence_report",
  "term_sheet",
  "closing_package",
]);
export const generatedDocumentSchema = z.object({
  id: idSchema,
  dealId: idSchema,
  documentType: generatedDocumentTypeSchema,
  sourceRunId: idSchema,
  fileName: z.string(),
  downloadUrl: z.string().url(),
  createdAt: timestampSchema,
});
export const createDocumentResourceSchema = z.object({
  documentType: generatedDocumentTypeSchema,
  sourceRunId: idSchema,
});

export const notificationSchema = z.object({
  id: idSchema,
  type: z.enum(["deal", "engine", "document", "system"]),
  title: z.string(),
  body: z.string(),
  dealId: idSchema.nullable(),
  createdAt: timestampSchema,
  readAt: timestampSchema.nullable(),
});

export const widgetSchema = z.object({
  instanceId: idSchema,
  type: z.enum(["kpi", "pipeline_table", "agent_entry", "risk_summary"]),
  grid: z.object({
    x: z.number().int().nonnegative(),
    y: z.number().int().nonnegative(),
    w: z.number().int().positive(),
    h: z.number().int().positive(),
  }),
  config: jsonObjectSchema,
});
export const dashboardLayoutSchema = z.object({
  slug: z.string(),
  version: z.number().int().nonnegative(),
  widgets: z.array(widgetSchema),
  updatedAt: timestampSchema,
});
export const dashboardLayoutWriteSchema = z.object({
  version: z.number().int().nonnegative(),
  widgets: z.array(widgetSchema),
});

export const kybSchema = z.object({ cnpj: z.string().trim().min(1) });
export const kybResponseSchema = z.object({
  cnpj: z.string(),
  legalName: z.string(),
  tradeName: z.string(),
  registrationStatus: z.string(),
  foundingDate: z.string(),
  shareCapital: z.number(),
  legalEntity: z.string(),
  shareholders: z.array(z.object({ name: z.string(), role: z.string() })),
  federalClearance: z.string(),
  laborClearance: z.string(),
  slaveLaborList: z.string(),
  ceis: z.string(),
  taxDebtsAmount: z.number(),
});

export const predictSchema = z.object({
  name: z.string(),
  sector: z.string(),
  ebitda: z.number(),
  revenue: z.number(),
  assets: z.number(),
  liabilities: z.number(),
  cashflow: z.number(),
  volatility: z.number(),
});
export const predictResponseSchema = z.object({
  companyName: z.string(),
  metrics: z.object({ insolvencyRisk: z.number(), zScore: z.string() }),
  embeddingsGenerated: z.boolean(),
  dcfRiskLabel: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  timestamp: timestampSchema,
});

export const portfolioSchema = z.object({
  budget: z.number(),
  riskTolerance: z.number(),
});
export const portfolioResponseSchema = z.object({
  optimization: z.object({
    status: z.string(),
    selectedTargetIds: z.array(z.string()),
  }),
  totalSynergy: z.number(),
  totalCost: z.number(),
  evaluatedProfiles: z.record(
    z.string(),
    z.object({ metrics: z.object({ insolvencyRisk: z.number() }) }),
  ),
});

export const negotiateSchema = z.object({
  valuationMin: z.number().optional(),
  valuationMax: z.number().optional(),
  preferences: z
    .object({
      cash: z.number(),
      equity: z.number(),
      earnOut: z.number(),
      escrow: z.number(),
    })
    .optional(),
  maxLeverage: z.number().optional(),
  minCoverage: z.number().optional(),
  geneticConfig: z
    .object({ populationSize: z.number(), generations: z.number() })
    .optional(),
});
export const negotiateResponseSchema = z.array(
  z.object({
    valuation: z.number(),
    cashPercentage: z.number(),
    equityPercentage: z.number(),
    earnOutPercentage: z.number(),
    escrowPercentage: z.number(),
    fitness: z.number(),
  }),
);

export const documentSchema = z.object({
  buyer: z.string(),
  seller: z.string(),
  target: z.string(),
  valuation: z.number(),
  output: z.string().optional(),
});
export const documentResponseSchema = z.object({
  status: z.literal("success"),
  file: z.string(),
});

const legacyDealSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  code: z.string(),
  targetValuation: z.coerce.number(),
  currency: z.string(),
  createdAt: z.string().optional(),
  status: z.string().nullable(),
  type: z.string().nullable(),
  strategy: z.string().nullable(),
  targetId: z.string().nullable().optional(),
  targetName: z.string().nullable().optional(),
  targetCnpj: z.string().nullable().optional(),
  targetSector: z.string().nullable().optional(),
  targetOriginCountry: z.string().nullable().optional(),
  currentPhase: z.string().nullable(),
  currentPhaseStatus: z.string().nullable(),
  currentPhaseStartedAt: z.string().nullable().optional(),
  currentPhaseComments: z.string().nullable().optional(),
});
const legacyDealDetailSchema = legacyDealSummarySchema
  .omit({
    targetId: true,
    targetName: true,
    targetCnpj: true,
    targetSector: true,
    targetOriginCountry: true,
    currentPhase: true,
    currentPhaseStatus: true,
    currentPhaseStartedAt: true,
    currentPhaseComments: true,
  })
  .extend({
    financial_structure: jsonObjectSchema.nullable(),
    business: jsonObjectSchema.nullable(),
    phase_history: z.array(jsonObjectSchema),
  });

const createEnvelopeSchema = <T extends z.ZodType>(schema: T) =>
  z.object({ data: schema });
const createPageSchema = <T extends z.ZodType>(schema: T) =>
  z.object({ data: z.array(schema), meta: paginationMetaSchema });

export type Money = z.infer<typeof moneySchema>;
export type DealSummary = z.infer<typeof dealSummarySchema>;
export type DealDetail = z.infer<typeof dealDetailSchema>;
export type DealCreate = z.infer<typeof dealCreateSchema>;
export type DealUpdate = z.infer<typeof dealUpdateSchema>;
export type PhaseTransition = z.infer<typeof phaseTransitionSchema>;
export type EntitySummary = z.infer<typeof entitySummarySchema>;
export type EntityDetail = z.infer<typeof entityDetailSchema>;
export type EntityWrite = z.infer<typeof entityWriteSchema>;
export type EntityUpdate = z.infer<typeof entityUpdateSchema>;
export type TeamMember = z.infer<typeof teamMemberSchema>;
export type TeamAssignment = z.infer<typeof teamAssignmentSchema>;
export type ChatThread = z.infer<typeof chatThreadSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ChatStreamRequest = z.infer<typeof chatStreamRequestSchema>;
export type ChatStreamEvent = z.infer<typeof chatStreamEventSchema>;
export type EngineRun = z.infer<typeof engineRunSchema>;
export type Notification = z.infer<typeof notificationSchema>;
export type DashboardLayout = z.infer<typeof dashboardLayoutSchema>;
export type Page<T> = { data: T[]; meta: z.infer<typeof paginationMetaSchema> };

export type APIErrorKind =
  | "validation"
  | "conflict"
  | "not_found"
  | "timeout"
  | "aborted"
  | "server"
  | "network"
  | "contract";

export class APIError extends Error {
  readonly status?: number;
  readonly code?: string;
  readonly kind: APIErrorKind;
  readonly fieldErrors?: Record<string, string[]>;

  constructor(
    message: string,
    options: {
      status?: number;
      code?: string;
      kind?: APIErrorKind;
      fieldErrors?: Record<string, string[]>;
      cause?: unknown;
    } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "APIError";
    this.status = options.status;
    this.code = options.code;
    this.kind = options.kind ?? kindForStatus(options.status);
    this.fieldErrors = options.fieldErrors;
  }
}

function kindForStatus(status?: number): APIErrorKind {
  if (status === 400 || status === 422) return "validation";
  if (status === 404) return "not_found";
  if (status === 409) return "conflict";
  if (status === 408) return "timeout";
  if (status !== undefined && status >= 500) return "server";
  return "network";
}

function sanitizeErrorMessage(message: string): string {
  return message.replace(/\/[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_.-]+)*\/mai\//g, "[INTERNAL_PATH]/");
}

function pathSegment(value: string): string {
  return encodeURIComponent(value);
}

function withQuery(path: string, query: object = {}): string {
  const url = new URL(path, BASE_URL);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

function requestSignal(external: AbortSignal | undefined, timeoutMs: number) {
  const controller = new AbortController();
  const abortFromExternal = () => controller.abort(external?.reason);
  if (external?.aborted) abortFromExternal();
  else external?.addEventListener("abort", abortFromExternal, { once: true });
  const timeoutId = setTimeout(
    () => controller.abort(new DOMException("Request timed out", "TimeoutError")),
    timeoutMs,
  );
  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timeoutId);
      external?.removeEventListener("abort", abortFromExternal);
    },
  };
}

async function apiErrorFromResponse(response: Response): Promise<APIError> {
  const raw = await response.text().catch(() => "");
  let parsed: unknown;
  try {
    parsed = raw ? JSON.parse(raw) : undefined;
  } catch {
    parsed = undefined;
  }
  const envelope = errorEnvelopeSchema.safeParse(parsed);
  if (envelope.success) {
    return new APIError(sanitizeErrorMessage(envelope.data.error.message), {
      status: response.status,
      code: envelope.data.error.code,
      fieldErrors: envelope.data.error.fieldErrors,
    });
  }
  const legacyMessage =
    typeof parsed === "object" && parsed !== null && "error" in parsed &&
      typeof parsed.error === "string"
      ? parsed.error
      : raw || response.statusText || "Request failed";
  return new APIError(sanitizeErrorMessage(legacyMessage), { status: response.status });
}

async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = options.method === undefined || options.method === "GET" ? 3 : 1,
  backoffMs = 500,
  timeoutMs = 10_000,
): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    const composed = requestSignal(options.signal ?? undefined, timeoutMs);
    try {
      const response = await fetch(url, { ...options, signal: composed.signal });
      if (!response.ok) throw await apiErrorFromResponse(response);
      return response;
    } catch (error) {
      if (error instanceof APIError) throw error;
      const abortedByCaller = options.signal?.aborted === true;
      const timedOut = composed.signal.aborted && !abortedByCaller;
      if (abortedByCaller) {
        throw new APIError("Request aborted", { kind: "aborted", cause: error });
      }
      if (attempt >= retries) {
        if (timedOut) {
          throw new APIError(`Timeout exceeded (${timeoutMs}ms)`, {
            status: 408,
            kind: "timeout",
            cause: error,
          });
        }
        const message = error instanceof Error ? error.message : "Network request failed";
        throw new APIError(sanitizeErrorMessage(message), { kind: "network", cause: error });
      }
      await new Promise((resolve) => setTimeout(resolve, backoffMs * 2 ** (attempt - 1)));
    } finally {
      composed.cleanup();
    }
  }
  throw new APIError("Max retries reached", { kind: "network" });
}

async function parseResponse<T>(response: Response, schema: z.ZodType<T>): Promise<T> {
  let payload: unknown;
  try {
    payload = await response.json();
  } catch (cause) {
    throw new APIError("API returned invalid JSON", { kind: "contract", cause });
  }
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new APIError(`API response contract mismatch: ${z.prettifyError(parsed.error)}`, {
      kind: "contract",
      cause: parsed.error,
    });
  }
  return parsed.data;
}

async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetchWithRetry(withQuery(path), options);
  return parseResponse(response, schema);
}

function jsonOptions(method: string, body: unknown, signal?: AbortSignal): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  };
}

export interface DealListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: string;
  status?: z.infer<typeof dealStatusSchema>;
  phase?: z.infer<typeof dealPhaseSchema>;
  assigneeId?: string;
}

export interface EntityListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: string;
  role?: z.infer<typeof entityRoleSchema>;
  sector?: string;
  countryCode?: string;
  kybStatus?: z.infer<typeof kybStatusSchema>;
}

export interface TeamMemberListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  role?: string;
}

export interface StreamChatOptions {
  signal?: AbortSignal;
  lastEventId?: string;
  onEvent: (event: ChatStreamEvent) => void;
}

async function consumeEventStream(
  response: Response,
  onEvent: (event: ChatStreamEvent) => void,
): Promise<void> {
  if (!response.body) {
    throw new APIError("Chat response has no stream body", { kind: "contract" });
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let eventName = "";
  let eventId = "";
  let dataLines: string[] = [];

  const dispatch = () => {
    if (dataLines.length === 0) return;
    let payload: unknown;
    try {
      payload = JSON.parse(dataLines.join("\n"));
    } catch (cause) {
      throw new APIError("Chat stream emitted invalid JSON", { kind: "contract", cause });
    }
    const objectPayload = typeof payload === "object" && payload !== null ? payload : {};
    const parsed = chatStreamEventSchema.safeParse({
      ...objectPayload,
      event: eventName || ("event" in objectPayload ? objectPayload.event : undefined),
      eventId: "eventId" in objectPayload ? objectPayload.eventId : eventId,
    });
    if (!parsed.success) {
      throw new APIError(`Chat event contract mismatch: ${z.prettifyError(parsed.error)}`, {
        kind: "contract",
        cause: parsed.error,
      });
    }
    onEvent(parsed.data);
    eventName = "";
    eventId = "";
    dataLines = [];
  };

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done }).replace(/\r\n/g, "\n");
    let newlineIndex = buffer.indexOf("\n");
    while (newlineIndex >= 0) {
      const line = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 1);
      if (line === "") dispatch();
      else if (!line.startsWith(":")) {
        const separator = line.indexOf(":");
        const field = separator < 0 ? line : line.slice(0, separator);
        const valuePart = separator < 0 ? "" : line.slice(separator + 1).replace(/^ /, "");
        if (field === "event") eventName = valuePart;
        else if (field === "id") eventId = valuePart;
        else if (field === "data") dataLines.push(valuePart);
      }
      newlineIndex = buffer.indexOf("\n");
    }
    if (done) {
      if (buffer) dataLines.push(buffer.startsWith("data:") ? buffer.slice(5).trimStart() : buffer);
      dispatch();
      return;
    }
  }
}

export const ApiClient = {
  async checkKyb(data: z.infer<typeof kybSchema>) {
    const body = kybSchema.parse(data);
    return request("/api/kyb", kybResponseSchema, jsonOptions("POST", body));
  },

  async predictRisk(data: z.infer<typeof predictSchema>) {
    const body = predictSchema.parse(data);
    return request("/api/predict", predictResponseSchema, jsonOptions("POST", body));
  },

  async optimizePortfolio(data: z.infer<typeof portfolioSchema>) {
    const body = portfolioSchema.parse(data);
    return request("/api/portfolio", portfolioResponseSchema, jsonOptions("POST", body));
  },

  async optimizeTermSheet(data: z.infer<typeof negotiateSchema> = {}) {
    const body = negotiateSchema.parse(data);
    return request("/api/negotiate", negotiateResponseSchema, jsonOptions("POST", body));
  },

  async generateDocument(data: z.infer<typeof documentSchema>) {
    const body = documentSchema.parse(data);
    return request("/api/document", documentResponseSchema, jsonOptions("POST", body));
  },

  async listDeals(query: DealListQuery = {}): Promise<Page<DealSummary>> {
    return request(withQuery("/api/deals", query), createPageSchema(dealSummarySchema));
  },

  async getDeals() {
    const response = await fetchWithRetry(withQuery("/api/deals"));
    const payload = await parseResponse(
      response,
      z.union([createPageSchema(dealSummarySchema), z.array(legacyDealSummarySchema)]),
    );
    return Array.isArray(payload) ? payload : payload.data;
  },

  async getDealById(id: string) {
    const response = await fetchWithRetry(withQuery(`/api/deals/${pathSegment(id)}`));
    const payload = await parseResponse(
      response,
      z.union([createEnvelopeSchema(dealDetailSchema), legacyDealDetailSchema]),
    );
    return "data" in payload ? payload.data : payload;
  },

  async getDealDetail(id: string): Promise<DealDetail> {
    const response = await request(
      `/api/deals/${pathSegment(id)}`,
      createEnvelopeSchema(dealDetailSchema),
    );
    return response.data;
  },

  async createDeal(data: DealCreate, signal?: AbortSignal): Promise<DealDetail> {
    const body = dealCreateSchema.parse(data);
    const response = await request(
      "/api/deals",
      createEnvelopeSchema(dealDetailSchema),
      jsonOptions("POST", body, signal),
    );
    return response.data;
  },

  async updateDeal(id: string, data: DealUpdate, signal?: AbortSignal): Promise<DealDetail> {
    const body = dealUpdateSchema.parse(data);
    const response = await request(
      `/api/deals/${pathSegment(id)}`,
      createEnvelopeSchema(dealDetailSchema),
      jsonOptions("PATCH", body, signal),
    );
    return response.data;
  },

  async archiveDeal(id: string, version?: number, signal?: AbortSignal): Promise<DealDetail> {
    const response = await request(
      withQuery(`/api/deals/${pathSegment(id)}`, { version }),
      createEnvelopeSchema(dealDetailSchema),
      { method: "DELETE", signal },
    );
    return response.data;
  },

  async transitionDealPhase(
    id: string,
    data: PhaseTransition,
    signal?: AbortSignal,
  ): Promise<DealDetail> {
    const body = phaseTransitionSchema.parse(data);
    const response = await request(
      `/api/deals/${pathSegment(id)}/phase-transitions`,
      createEnvelopeSchema(dealDetailSchema),
      jsonOptions("POST", body, signal),
    );
    return response.data;
  },

  async updateDealPhase(id: string, phaseId: string) {
    const response = await fetchWithRetry(withQuery(`/api/deals/${pathSegment(id)}/phase`), {
      ...jsonOptions("POST", {
        phaseName: phaseId,
        phaseId,
        statusName: "In Progress",
      }),
    });
    return parseResponse(response, jsonObjectSchema);
  },

  async listEntities(query: EntityListQuery = {}): Promise<Page<EntitySummary>> {
    return request(withQuery("/api/entities", query), createPageSchema(entitySummarySchema));
  },

  async getEntityById(id: string): Promise<z.infer<typeof entityDetailSchema>> {
    const response = await request(
      `/api/entities/${pathSegment(id)}`,
      createEnvelopeSchema(entityDetailSchema),
    );
    return response.data;
  },

  async createEntity(data: EntityWrite, signal?: AbortSignal) {
    const body = entityWriteSchema.parse(data);
    const response = await request(
      "/api/entities",
      createEnvelopeSchema(entityDetailSchema),
      jsonOptions("POST", body, signal),
    );
    return response.data;
  },

  async updateEntity(id: string, data: EntityUpdate, signal?: AbortSignal) {
    const body = entityUpdateSchema.parse(data);
    const response = await request(
      `/api/entities/${pathSegment(id)}`,
      createEnvelopeSchema(entityDetailSchema),
      jsonOptions("PATCH", body, signal),
    );
    return response.data;
  },

  async archiveEntity(id: string, version?: number, signal?: AbortSignal) {
    const response = await request(
      withQuery(`/api/entities/${pathSegment(id)}`, { version }),
      createEnvelopeSchema(entityDetailSchema),
      { method: "DELETE", signal },
    );
    return response.data;
  },

  async listTeamMembers(query: TeamMemberListQuery = {}): Promise<Page<TeamMember>> {
    return request(withQuery("/api/team-members", query), createPageSchema(teamMemberSchema));
  },

  async getDealTeamAssignments(dealId: string): Promise<TeamAssignment[]> {
    const response = await request(
      `/api/deals/${pathSegment(dealId)}/team-assignments`,
      createEnvelopeSchema(z.array(teamAssignmentSchema)),
    );
    return response.data;
  },

  async replaceDealTeamAssignments(
    dealId: string,
    data: z.infer<typeof replaceAssignmentsSchema>,
    signal?: AbortSignal,
  ): Promise<TeamAssignment[]> {
    const body = replaceAssignmentsSchema.parse(data);
    const response = await request(
      `/api/deals/${pathSegment(dealId)}/team-assignments`,
      createEnvelopeSchema(z.array(teamAssignmentSchema)),
      jsonOptions("PUT", body, signal),
    );
    return response.data;
  },

  async listChatThreads(dealId: string): Promise<ChatThread[]> {
    const response = await request(
      `/api/deals/${pathSegment(dealId)}/chat/threads`,
      createEnvelopeSchema(z.array(chatThreadSchema)),
    );
    return response.data;
  },

  async createChatThread(
    dealId: string,
    data: z.infer<typeof createChatThreadSchema>,
    signal?: AbortSignal,
  ): Promise<ChatThread> {
    const body = createChatThreadSchema.parse(data);
    const response = await request(
      `/api/deals/${pathSegment(dealId)}/chat/threads`,
      createEnvelopeSchema(chatThreadSchema),
      jsonOptions("POST", body, signal),
    );
    return response.data;
  },

  async listChatMessages(dealId: string, threadId: string, cursor?: string) {
    return request(
      withQuery(
        `/api/deals/${pathSegment(dealId)}/chat/threads/${pathSegment(threadId)}/messages`,
        { cursor },
      ),
      z.object({
        data: z.array(chatMessageSchema),
        meta: z.object({ nextCursor: z.string().nullable() }),
      }),
    );
  },

  async streamChat(
    dealId: string,
    threadId: string,
    data: ChatStreamRequest,
    options: StreamChatOptions,
  ): Promise<void> {
    const body = chatStreamRequestSchema.parse(data);
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (options.lastEventId) headers["Last-Event-ID"] = options.lastEventId;
    const composed = requestSignal(options.signal, 120_000);
    try {
      const response = await fetch(
        withQuery(
          `/api/deals/${pathSegment(dealId)}/chat/threads/${pathSegment(threadId)}/stream`,
        ),
        {
          method: "POST",
          headers,
          body: JSON.stringify(body),
          signal: composed.signal,
        },
      );
      if (!response.ok) throw await apiErrorFromResponse(response);
      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("text/event-stream")) {
        throw new APIError("Chat endpoint did not return an event stream", { kind: "contract" });
      }
      await consumeEventStream(response, options.onEvent);
    } catch (error) {
      if (error instanceof APIError) throw error;
      if (options.signal?.aborted) {
        throw new APIError("Request aborted", { kind: "aborted", cause: error });
      }
      if (composed.signal.aborted) {
        throw new APIError("Chat stream timed out", {
          status: 408,
          kind: "timeout",
          cause: error,
        });
      }
      throw new APIError(error instanceof Error ? error.message : "Chat stream failed", {
        kind: "network",
        cause: error,
      });
    } finally {
      composed.cleanup();
    }
  },

  chatStream(
    dealId: string,
    query: string,
    onMessage: (message: string) => void,
    onError: (error: APIError) => void,
  ) {
    const controller = new AbortController();
    void (async () => {
      try {
        const thread = await this.createChatThread(
          dealId,
          { title: query.slice(0, 80), agentId: "BrokerOrchestratorAgent" },
          controller.signal,
        );
        await this.streamChat(
          dealId,
          thread.id,
          {
            agentId: "BrokerOrchestratorAgent",
            message: query,
            clientMessageId: crypto.randomUUID(),
          },
          {
            signal: controller.signal,
            onEvent: (event) => {
              if (event.event === "response.delta") onMessage(event.data.textDelta);
              if (event.event === "response.failed") {
                onError(new APIError(event.data.message, { code: event.data.code, kind: "server" }));
              }
            },
          },
        );
      } catch (error) {
        if (error instanceof APIError && error.kind === "aborted") return;
        onError(
          error instanceof APIError
            ? error
            : new APIError(error instanceof Error ? error.message : "Chat stream failed", {
                cause: error,
              }),
        );
      }
    })();
    return () => controller.abort();
  },

  async runDealEngine(
    dealId: string,
    data: z.infer<typeof createEngineRunSchema>,
    signal?: AbortSignal,
  ): Promise<EngineRun> {
    const body = createEngineRunSchema.parse(data);
    const response = await request(
      `/api/deals/${pathSegment(dealId)}/engine-runs`,
      createEnvelopeSchema(engineRunSchema),
      jsonOptions("POST", body, signal),
    );
    return response.data;
  },

  async listDealEngineRuns(
    dealId: string,
    query: { engine?: z.infer<typeof engineNameSchema>; page?: number; pageSize?: number } = {},
  ): Promise<Page<EngineRun>> {
    return request(
      withQuery(`/api/deals/${pathSegment(dealId)}/engine-runs`, query),
      createPageSchema(engineRunSchema),
    );
  },

  async listVdrDocuments(
    dealId: string,
    query: { page?: number; pageSize?: number } = {},
  ): Promise<Page<z.infer<typeof vdrDocumentSchema>>> {
    return request(
      withQuery(`/api/deals/${pathSegment(dealId)}/vdr-documents`, query),
      createPageSchema(vdrDocumentSchema),
    );
  },

  async createDealDocument(
    dealId: string,
    data: z.infer<typeof createDocumentResourceSchema>,
    signal?: AbortSignal,
  ) {
    const body = createDocumentResourceSchema.parse(data);
    const response = await request(
      `/api/deals/${pathSegment(dealId)}/documents`,
      createEnvelopeSchema(generatedDocumentSchema),
      jsonOptions("POST", body, signal),
    );
    return response.data;
  },

  async listNotifications(query: { unreadOnly?: boolean; cursor?: string } = {}) {
    return request(
      withQuery("/api/notifications", query),
      z.object({
        data: z.array(notificationSchema),
        meta: z.object({ nextCursor: z.string().nullable() }),
        unreadCount: z.number().int().nonnegative(),
      }),
    );
  },

  async markNotificationRead(id: string, signal?: AbortSignal): Promise<Notification> {
    const response = await request(
      `/api/notifications/${pathSegment(id)}`,
      createEnvelopeSchema(notificationSchema),
      jsonOptions("PATCH", { read: true }, signal),
    );
    return response.data;
  },

  async getDashboardLayout(slug: string): Promise<DashboardLayout> {
    const response = await request(
      `/api/users/me/dashboard-layouts/${pathSegment(slug)}`,
      createEnvelopeSchema(dashboardLayoutSchema),
    );
    return response.data;
  },

  async saveDashboardLayout(
    slug: string,
    data: z.infer<typeof dashboardLayoutWriteSchema>,
    signal?: AbortSignal,
  ): Promise<DashboardLayout> {
    const body = dashboardLayoutWriteSchema.parse(data);
    const response = await request(
      `/api/users/me/dashboard-layouts/${pathSegment(slug)}`,
      createEnvelopeSchema(dashboardLayoutSchema),
      jsonOptions("PUT", body, signal),
    );
    return response.data;
  },

  async resetDashboardLayout(slug: string, signal?: AbortSignal): Promise<DashboardLayout> {
    const response = await request(
      `/api/users/me/dashboard-layouts/${pathSegment(slug)}`,
      createEnvelopeSchema(dashboardLayoutSchema),
      { method: "DELETE", signal },
    );
    return response.data;
  },
};
