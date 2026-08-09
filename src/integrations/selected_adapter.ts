import type {
  CapabilitySnapshot,
  HealthSnapshot,
  IntegrationAdapter,
  ScopedDocumentPort,
} from "./contracts.ts";

/**
 * Captures a selected adapter's contract while retaining its real receiver.
 *
 * @example const selected = freezeSelectedAdapter(fixtureAdapter)
 */
export function freezeSelectedAdapter(
  adapter: IntegrationAdapter,
): IntegrationAdapter {
  const identity = captureIdentity(adapter);
  const discover = adapter.discoverCapabilities;
  const health = adapter.checkHealth;
  const documents = freezeDocumentOperations(adapter.documents);
  const stableReceiver = createStableReceiver(adapter, identity, documents);
  const discoverReceiver = isPrototypeMethod(adapter, discover)
    ? stableReceiver
    : adapter;
  const healthReceiver = isPrototypeMethod(adapter, health)
    ? stableReceiver
    : adapter;
  const discoverCapabilities = async (): Promise<CapabilitySnapshot> => {
    try {
      return stabilizeCapabilities(
        await discover.call(discoverReceiver),
        identity,
      );
    } catch (error) {
      if (!isPrivateReceiverError(error) || discoverReceiver === adapter) {
        throw error;
      }
      return stabilizeCapabilities(await discover.call(adapter), identity);
    }
  };
  const checkHealth = async (): Promise<HealthSnapshot> => {
    try {
      return stabilizeHealth(await health.call(healthReceiver), identity);
    } catch (error) {
      if (!isPrivateReceiverError(error) || healthReceiver === adapter) {
        throw error;
      }
      return stabilizeHealth(await health.call(adapter), identity);
    }
  };
  return Object.freeze({
    ...identity,
    documents,
    discoverCapabilities,
    checkHealth,
  });
}

function createStableReceiver(
  adapter: IntegrationAdapter,
  identity: SelectedIdentity,
  documents: ScopedDocumentPort,
): IntegrationAdapter {
  return new Proxy(adapter, {
    get(target, property, receiver) {
      if (property === "provider") return identity.provider;
      if (property === "environment") return identity.environment;
      if (property === "lifecycle") return identity.lifecycle;
      if (property === "scope") return identity.scope;
      if (property === "connectorAccountId") return identity.connectorAccountId;
      if (property === "providerResourceId") return identity.providerResourceId;
      if (property === "providerAccountId") return identity.providerAccountId;
      if (property === "providerTeamId") return identity.providerTeamId;
      if (property === "providerFolderId") return identity.providerFolderId;
      if (property === "documents") return documents;
      return Reflect.get(target, property, receiver);
    },
  });
}

function isPrototypeMethod(
  adapter: IntegrationAdapter,
  method: () => Promise<unknown>,
): boolean {
  let prototype = Object.getPrototypeOf(adapter);
  while (prototype !== null) {
    if (
      Object.prototype.hasOwnProperty.call(prototype, "discoverCapabilities") &&
      prototype.discoverCapabilities === method
    ) return true;
    if (
      Object.prototype.hasOwnProperty.call(prototype, "checkHealth") &&
      prototype.checkHealth === method
    ) return true;
    prototype = Object.getPrototypeOf(prototype);
  }
  return false;
}

function isPrivateReceiverError(error: unknown): boolean {
  return error instanceof TypeError && /private|brand/i.test(error.message);
}

function stabilizeCapabilities(
  snapshot: CapabilitySnapshot,
  identity: SelectedIdentity,
): CapabilitySnapshot {
  return Object.freeze({
    ...snapshot,
    provider: identity.provider,
    environment: identity.environment,
    lifecycle: identity.lifecycle,
    scope: identity.scope,
  });
}

function stabilizeHealth(
  snapshot: HealthSnapshot,
  identity: SelectedIdentity,
): HealthSnapshot {
  return Object.freeze({
    ...snapshot,
    provider: identity.provider,
    environment: identity.environment,
    lifecycle: identity.lifecycle,
    scope: identity.scope,
  });
}

interface SelectedIdentity {
  readonly provider: IntegrationAdapter["provider"];
  readonly environment: IntegrationAdapter["environment"];
  readonly lifecycle: IntegrationAdapter["lifecycle"];
  readonly scope: IntegrationAdapter["scope"];
  readonly connectorAccountId: string;
  readonly providerResourceId: string;
  readonly providerAccountId?: string;
  readonly providerTeamId?: string;
  readonly providerFolderId?: string;
}

function captureIdentity(adapter: IntegrationAdapter): SelectedIdentity {
  return Object.freeze({
    provider: adapter.provider,
    environment: adapter.environment,
    lifecycle: adapter.lifecycle,
    scope: Object.freeze({ ...adapter.scope }),
    connectorAccountId: adapter.connectorAccountId,
    providerResourceId: adapter.providerResourceId,
    ...(adapter.providerAccountId === undefined
      ? {}
      : { providerAccountId: adapter.providerAccountId }),
    ...(adapter.providerTeamId === undefined
      ? {}
      : { providerTeamId: adapter.providerTeamId }),
    ...(adapter.providerFolderId === undefined
      ? {}
      : { providerFolderId: adapter.providerFolderId }),
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
