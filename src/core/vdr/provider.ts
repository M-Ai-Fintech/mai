import { VDRDocument, SupergoodConfig } from "./types.ts";

/**
 * Interface genérica para provedores de Virtual Data Room (VDR).
 */
export interface VDRProvider {
  /**
   * Lista os documentos de um folder específico, ou da raiz se não informado.
   */
  listDocuments(folderId?: string): Promise<VDRDocument[]>;

  /**
   * Faz o download do conteúdo de um documento em formato Uint8Array.
   */
  downloadDocument(documentId: string): Promise<Uint8Array>;

  /**
   * Retorna os metadados de um documento.
   */
  getDocumentMetadata(documentId: string): Promise<VDRDocument>;

  /**
   * Faz o upload de um novo documento.
   */
  uploadDocument(name: string, content: Uint8Array, folderId?: string): Promise<VDRDocument>;
}

/**
 * Classe base que implementa a injeção do proxy Supergood para chamadas de VDR.
 */
export abstract class BaseVDRProvider implements VDRProvider {
  protected supergoodConfig?: SupergoodConfig;

  /**
   * @param config Configurações do proxy Supergood. Se omitidas, as chamadas podem ser feitas localmente ou diretamente.
   */
  constructor(config?: SupergoodConfig) {
    this.supergoodConfig = config;
  }

  /**
   * Método utilitário para formatar a URL e injetar cabeçalhos do Supergood na requisição (`fetch`).
   * Roteia através da proxy do Supergood quando habilitado.
   * 
   * @param targetUrl A URL final no provedor de VDR de destino.
   * @param init Parâmetros adicionais da requisição (método, body, headers).
   */
  protected async fetchThroughProxy(targetUrl: string, init?: RequestInit): Promise<Response> {
    let url = targetUrl;
    const headers = new Headers(init?.headers);

    if (this.supergoodConfig) {
      if (this.supergoodConfig.proxyUrl) {
        // Envia para o proxy do supergood em vez do target URL, repassando o destino em um header customizado
        url = this.supergoodConfig.proxyUrl;
        headers.set("x-supergood-target-url", targetUrl);
      }

      if (this.supergoodConfig.apiKey) {
        headers.set("x-supergood-api-key", this.supergoodConfig.apiKey);
      }

      if (this.supergoodConfig.clientId) {
        headers.set("x-supergood-client-id", this.supergoodConfig.clientId);
      }
    }

    const response = await fetch(url, { ...init, headers });
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status} from VDR proxy/provider: ${response.statusText}`);
    }

    return response;
  }

  abstract listDocuments(folderId?: string): Promise<VDRDocument[]>;
  abstract downloadDocument(documentId: string): Promise<Uint8Array>;
  abstract getDocumentMetadata(documentId: string): Promise<VDRDocument>;
  abstract uploadDocument(name: string, content: Uint8Array, folderId?: string): Promise<VDRDocument>;
}
