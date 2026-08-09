import {
  type CapabilitySnapshot,
  createCapabilitySnapshot,
  createHealthSnapshot,
  type DownloadDocumentRequest,
  type HealthSnapshot,
  INTEGRATION_CAPABILITIES,
  type IntegrationAdapter,
  type IntegrationByteSource,
  type IntegrationFailureCode,
  type IntegrationResult,
  type ListDocumentsRequest,
  type NormalizedIntegrationFailure,
  type ProviderDocumentPage,
  sameIntegrationScope,
  type ScopedDocumentPort,
  type SecretResolver,
} from "../contracts.ts";
import {
  createNormalizedIntegrationFailure,
  normalizeIntegrationFailure,
} from "../failures.ts";
import type { PapermarkAdapterConfig } from "./config.ts";
import {
  assertPapermarkCallAuthorization,
  type PapermarkCallAuthorization,
} from "./authorization.ts";
import { decodePapermarkPage } from "./codec.ts";
import {
  type PapermarkFetch,
  type PapermarkTimer,
  PapermarkTransport,
} from "./transport.ts";
import {
  createProviderCapabilities,
  createProviderMarker,
  type ProviderCapabilities,
  type ProviderMarker,
} from "../../documents/source.ts";
import {
  DocumentProviderFailure,
  type DocumentSourceProvider,
  type DownloadSourceDocumentRequest,
  type ListSourceDocumentsRequest,
  type SourceDocumentPage,
} from "../../documents/source_provider.ts";
import type { ByteSource } from "../../documents/checksum.ts";

export interface PapermarkAdapterDependencies {
  readonly secretResolver: SecretResolver;
  readonly fetch: PapermarkFetch;
  readonly sleep: (delayMs: number) => Promise<void>;
  readonly now?: () => Date;
  readonly timer?: PapermarkTimer;
  readonly authorization: PapermarkCallAuthorization;
}

/**
 * Implements the neutral integration adapter and the Documents provider port.
 *
 * @example new PapermarkAdapter(config, { secretResolver, fetch, sleep })
 */
export class PapermarkAdapter implements DocumentSourceProvider {
  readonly provider = sourceProviderMarker();
  readonly neutralAdapter: PapermarkIntegrationAdapter;
  readonly connectorAccountId: string;
  readonly providerWorkspaceId: string;

  constructor(
    config: PapermarkAdapterConfig,
    dependencies: PapermarkAdapterDependencies,
  ) {
    this.neutralAdapter = new PapermarkIntegrationAdapter(config, dependencies);
    this.connectorAccountId = this.neutralAdapter.connectorAccountId;
    this.providerWorkspaceId = this.neutralAdapter.providerWorkspaceId;
  }

  /**
   * Returns the only capability exposed by the Documents port.
   *
   * @example await provider.discoverCapabilities()
   */
  discoverCapabilities(): Promise<ProviderCapabilities> {
    return Promise.resolve(createProviderCapabilities({
      provider: this.provider,
      capabilities: ["list_documents"],
      discoveredAt: this.neutralAdapter.now(),
    }));
  }

  /**
   * Lists documents in the adapter's immutable Papermark folder binding.
   *
   * @example await provider.listDocuments({ providerWorkspaceId: "workspace-room" })
   */
  async listDocuments(
    request: ListSourceDocumentsRequest,
  ): Promise<SourceDocumentPage> {
    const result = await this.neutralAdapter.documents.listDocuments({
      scope: this.neutralAdapter.scope,
      providerWorkspaceId: request.providerWorkspaceId,
      cursor: request.cursor,
    });
    if (!result.ok) throw toDocumentProviderFailure(result.failure);
    return toSourceDocumentPage(result.value);
  }

  /**
   * Fails closed because the verified public Papermark contract has no binary endpoint.
   *
   * @example await provider.downloadDocument({ providerWorkspaceId: "workspace-room", providerDocumentId: "doc-1" })
   */
  async downloadDocument(
    request: DownloadSourceDocumentRequest,
  ): Promise<ByteSource> {
    const result = await this.neutralAdapter.documents.downloadDocument({
      scope: this.neutralAdapter.scope,
      providerWorkspaceId: request.providerWorkspaceId,
      providerDocumentId: request.providerDocumentId,
    });
    if (!result.ok) throw toDocumentProviderFailure(result.failure);
    return result.value;
  }
}

/**
 * Exposes Papermark through the provider-neutral health and capability contracts.
 *
 * @example await adapter.checkHealth()
 */
export class PapermarkIntegrationAdapter implements IntegrationAdapter {
  readonly provider = "papermark" as const;
  readonly environment: PapermarkAdapterConfig["configuration"]["environment"];
  readonly lifecycle: PapermarkAdapterConfig["configuration"]["lifecycle"];
  readonly scope: PapermarkAdapterConfig["binding"]["scope"];
  readonly connectorAccountId: string;
  readonly providerWorkspaceId: string;
  readonly documents: ScopedDocumentPort;
  readonly now: () => Date;
  private readonly config: PapermarkAdapterConfig;
  private readonly transport: PapermarkTransport;

  constructor(
    config: PapermarkAdapterConfig,
    dependencies: PapermarkAdapterDependencies,
  ) {
    this.config = config;
    this.environment = config.configuration.environment;
    this.lifecycle = config.configuration.lifecycle;
    this.scope = config.binding.scope;
    this.connectorAccountId = config.binding.connectorAccount.id;
    this.providerWorkspaceId = config.binding.providerWorkspaceId;
    assertPapermarkCallAuthorization(dependencies.authorization, config);
    this.now = dependencies.now ?? (() => new Date());
    this.transport = new PapermarkTransport(
      config,
      dependencies.secretResolver,
      {
        fetch: dependencies.fetch,
        sleep: dependencies.sleep,
        now: this.now,
        timer: dependencies.timer,
        authorization: dependencies.authorization,
      },
    );
    this.documents = {
      listDocuments: (request) => this.listDocuments(request),
      downloadDocument: (request) => this.downloadDocument(request),
    };
  }

  /**
   * Reports list support and explicit unavailable observations for other capabilities.
   *
   * @example const snapshot = await adapter.discoverCapabilities()
   */
  discoverCapabilities(): Promise<CapabilitySnapshot> {
    const observations = INTEGRATION_CAPABILITIES.map((capability) => ({
      capability,
      status: capability === "list_documents" || capability === "pagination"
        ? "supported" as const
        : "unavailable" as const,
      ...(capability === "list_documents" || capability === "pagination"
        ? {}
        : { reasonCode: "UNAVAILABLE" as const }),
    }));
    return Promise.resolve(createCapabilitySnapshot({
      provider: this.provider,
      environment: this.environment,
      lifecycle: this.lifecycle,
      configured: true,
      source: "implementation",
      scope: this.scope,
      requested: [...INTEGRATION_CAPABILITIES],
      observations,
      observedAt: this.now(),
    }));
  }

  /**
   * Probes the scoped list operation and returns local-development health only.
   *
   * @example const health = await adapter.checkHealth()
   */
  async checkHealth(): Promise<HealthSnapshot> {
    const result = await this.listDocuments({
      scope: this.scope,
      providerWorkspaceId: this.config.binding.providerWorkspaceId,
    });
    const checks = result.ok
      ? passedHealthChecks()
      : failedHealthChecks(result.failure.code);
    return createHealthSnapshot({
      provider: this.provider,
      environment: this.environment,
      lifecycle: this.lifecycle,
      configured: true,
      scope: this.scope,
      checks,
      observedAt: this.now(),
    });
  }

  private async listDocuments(
    request: ListDocumentsRequest,
  ): Promise<IntegrationResult<ProviderDocumentPage>> {
    const bindingFailure = this.validateBinding(
      request.scope,
      request.providerWorkspaceId,
      "list_documents",
    );
    if (bindingFailure !== undefined) {
      return { ok: false, failure: bindingFailure };
    }
    try {
      const payload = await this.transport.getDocumentsPage(request.cursor);
      return {
        ok: true,
        value: decodePapermarkPage(payload, this.config.binding.folderId),
      };
    } catch (error) {
      return {
        ok: false,
        failure: this.normalizeFailure("list_documents", error),
      };
    }
  }

  private downloadDocument(
    request: DownloadDocumentRequest,
  ): Promise<IntegrationResult<IntegrationByteSource>> {
    const bindingFailure = this.validateBinding(
      request.scope,
      request.providerWorkspaceId,
      "download_document",
    );
    if (bindingFailure !== undefined) {
      return Promise.resolve({ ok: false, failure: bindingFailure });
    }
    return Promise.resolve({
      ok: false,
      failure: createNormalizedIntegrationFailure({
        provider: this.provider,
        operation: "download_document",
        code: "UNAVAILABLE",
        occurredAt: this.now(),
      }),
    });
  }

  private validateBinding(
    scope: ListDocumentsRequest["scope"],
    providerWorkspaceId: string,
    operation: string,
  ): NormalizedIntegrationFailure | undefined {
    if (!sameIntegrationScope(scope, this.scope)) {
      return createNormalizedIntegrationFailure({
        provider: this.provider,
        operation,
        code: "INVALID_REQUEST",
        occurredAt: this.now(),
      });
    }
    if (providerWorkspaceId !== this.config.binding.providerWorkspaceId) {
      return createNormalizedIntegrationFailure({
        provider: this.provider,
        operation,
        code: "INVALID_REQUEST",
        occurredAt: this.now(),
      });
    }
    return undefined;
  }

  private normalizeFailure(
    operation: string,
    error: unknown,
  ): NormalizedIntegrationFailure {
    return normalizeIntegrationFailure({
      provider: this.provider,
      operation,
      error,
      occurredAt: this.now(),
    });
  }
}

function toSourceDocumentPage(page: ProviderDocumentPage): SourceDocumentPage {
  return {
    documents: page.documents.map((document) => ({
      providerDocumentId: document.providerDocumentId,
      name: document.name,
      mimeType: document.mimeType,
      ...(document.sizeBytes === undefined
        ? {}
        : { sizeBytes: document.sizeBytes }),
      ...(document.providerFolderId === undefined
        ? {}
        : { providerFolderId: document.providerFolderId }),
      ...(document.providerVersion === undefined
        ? {}
        : { providerVersion: document.providerVersion }),
    })),
    ...(page.nextCursor === undefined ? {} : { nextCursor: page.nextCursor }),
    ...(page.providerVersion === undefined
      ? {}
      : { providerVersion: page.providerVersion }),
  };
}

function toDocumentProviderFailure(
  failure: NormalizedIntegrationFailure,
): DocumentProviderFailure {
  return new DocumentProviderFailure({
    code: toDocumentFailureCode(failure.code),
    message: failure.message,
    retryable: failure.retryable,
  });
}

function toDocumentFailureCode(
  code: IntegrationFailureCode,
):
  | "AUTHENTICATION_FAILED"
  | "RATE_LIMITED"
  | "NOT_FOUND"
  | "INVALID_REQUEST"
  | "INVALID_PROVIDER_METADATA"
  | "UNAVAILABLE"
  | "UNKNOWN" {
  if (code === "AUTHENTICATION_FAILED") return "AUTHENTICATION_FAILED";
  if (code === "RATE_LIMITED") return "RATE_LIMITED";
  if (code === "NOT_FOUND") return "NOT_FOUND";
  if (code === "INVALID_REQUEST") return "INVALID_REQUEST";
  if (code === "MALFORMED_RESPONSE") return "INVALID_PROVIDER_METADATA";
  if (
    code === "TIMEOUT" ||
    code === "UNAVAILABLE" ||
    code === "RETRY_EXHAUSTED"
  ) return "UNAVAILABLE";
  if (code === "AUTHORIZATION_DENIED") return "UNKNOWN";
  return "UNKNOWN";
}

function passedHealthChecks(): readonly {
  name: string;
  state: "passed" | "unavailable";
}[] {
  return [
    { name: "configuration", state: "passed" },
    { name: "endpoint", state: "passed" },
    { name: "capabilities", state: "passed" },
    // A folder list proves reachability only; coordinator/provider identity
    // evidence is required before credentials or scope ownership can pass.
    { name: "credentials", state: "unavailable" as const },
    { name: "scope-isolation", state: "unavailable" as const },
  ];
}

function failedHealthChecks(
  code: IntegrationFailureCode,
): readonly { name: string; state: "passed" | "failed" | "unavailable" }[] {
  const state = code === "TIMEOUT" ||
      code === "UNAVAILABLE" ||
      code === "RATE_LIMITED" ||
      code === "RETRY_EXHAUSTED"
    ? "unavailable" as const
    : "failed" as const;
  return [
    { name: "configuration", state: "passed" },
    {
      name: "credentials",
      state: code === "AUTHENTICATION_FAILED" ? "failed" : "unavailable",
    },
    { name: "endpoint", state },
    { name: "capabilities", state },
    { name: "scope-isolation", state: "unavailable" },
  ];
}

function sourceProviderMarker(): ProviderMarker {
  return createProviderMarker("papermark");
}
