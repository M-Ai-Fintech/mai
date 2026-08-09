import { BaseVDRProvider } from "./provider.ts";
import type { VDRDocument } from "./types.ts";

/**
 * @deprecated Use the governed MAI-61 integration composition boundary.
 *
 * The empty shape is intentional: legacy API keys, endpoints, and proxy
 * settings must not be accepted by this migration shim.
 */
export interface PapermarkConfig {
  readonly legacyOptions?: never;
}

/**
 * Retired compatibility seam for the former unrestricted Papermark adapter.
 *
 * @example await new PapermarkAdapter().listDocuments()
 */
export class PapermarkAdapter extends BaseVDRProvider {
  constructor(_config?: PapermarkConfig) {
    super();
    if (_config !== undefined && Object.keys(_config).length > 0) {
      throw retiredOperation("constructor");
    }
  }

  listDocuments(_folderId?: string): Promise<VDRDocument[]> {
    return Promise.reject(retiredOperation("listDocuments"));
  }

  downloadDocument(_documentId: string): Promise<Uint8Array> {
    return Promise.reject(retiredOperation("downloadDocument"));
  }

  getDocumentMetadata(_documentId: string): Promise<VDRDocument> {
    return Promise.reject(retiredOperation("getDocumentMetadata"));
  }

  uploadDocument(
    _name: string,
    _content: Uint8Array,
    _folderId?: string,
  ): Promise<VDRDocument> {
    return Promise.reject(retiredOperation("uploadDocument"));
  }

  downloadBatch(_dealId: string, _dataRoomId: string): Promise<void> {
    return Promise.reject(retiredOperation("downloadBatch"));
  }
}

function retiredOperation(operation: string): Error {
  return new Error(
    `Legacy Papermark adapter operation "${operation}" is retired; expected governed MAI-61 selection with RequestContext, scoped authorization, secret reference, and provider data-room binding.`,
  );
}
