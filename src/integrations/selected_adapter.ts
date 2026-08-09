import type { IntegrationAdapter, ScopedDocumentPort } from "./contracts.ts";

/**
 * Captures the selected fixture adapter's contract at selection time.
 *
 * @example const selected = freezeSelectedAdapter(fixtureAdapter)
 */
export function freezeSelectedAdapter(
  adapter: IntegrationAdapter,
): IntegrationAdapter {
  const identity = captureIdentity(adapter);
  const documents = freezeDocumentOperations(adapter.documents);
  const stableReceiver = createStableReceiver(adapter, identity, documents);
  const discoverCapabilities = adapter.discoverCapabilities.bind(
    stableReceiver,
  );
  const checkHealth = adapter.checkHealth.bind(stableReceiver);
  return Object.freeze({
    ...identity,
    documents,
    discoverCapabilities,
    checkHealth,
  });
}

interface SelectedIdentity {
  readonly provider: IntegrationAdapter["provider"];
  readonly environment: IntegrationAdapter["environment"];
  readonly lifecycle: IntegrationAdapter["lifecycle"];
  readonly scope: IntegrationAdapter["scope"];
  readonly connectorAccountId: string;
  readonly providerWorkspaceId: string;
}

function captureIdentity(adapter: IntegrationAdapter): SelectedIdentity {
  return Object.freeze({
    provider: adapter.provider,
    environment: adapter.environment,
    lifecycle: adapter.lifecycle,
    scope: Object.freeze({ ...adapter.scope }),
    connectorAccountId: adapter.connectorAccountId,
    providerWorkspaceId: adapter.providerWorkspaceId,
  });
}

function freezeDocumentOperations(
  documents: ScopedDocumentPort,
): ScopedDocumentPort {
  return Object.freeze({
    listDocuments: documents.listDocuments.bind(documents),
    downloadDocument: documents.downloadDocument.bind(documents),
  });
}

function createStableReceiver(
  adapter: IntegrationAdapter,
  identity: SelectedIdentity,
  documents: ScopedDocumentPort,
): IntegrationAdapter {
  const receiver = Object.create(
    Object.getPrototypeOf(adapter),
  ) as IntegrationAdapter;
  copyInternalProperties(adapter, receiver);
  Object.defineProperties(receiver, {
    provider: stableProperty(identity.provider),
    environment: stableProperty(identity.environment),
    lifecycle: stableProperty(identity.lifecycle),
    scope: stableProperty(identity.scope),
    connectorAccountId: stableProperty(identity.connectorAccountId),
    providerWorkspaceId: stableProperty(identity.providerWorkspaceId),
    documents: stableProperty(documents),
  });
  return Object.freeze(receiver);
}

function copyInternalProperties(
  adapter: IntegrationAdapter,
  receiver: IntegrationAdapter,
): void {
  const identityKeys = new Set([
    "provider",
    "environment",
    "lifecycle",
    "scope",
    "connectorAccountId",
    "providerWorkspaceId",
    "documents",
  ]);
  for (const key of Reflect.ownKeys(adapter)) {
    if (typeof key === "string" && identityKeys.has(key)) continue;
    const descriptor = Object.getOwnPropertyDescriptor(adapter, key);
    if (descriptor !== undefined) {
      Object.defineProperty(receiver, key, descriptor);
    }
  }
}

function stableProperty(value: unknown): PropertyDescriptor {
  return {
    configurable: false,
    enumerable: true,
    value,
    writable: false,
  };
}
