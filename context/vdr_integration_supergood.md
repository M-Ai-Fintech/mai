# Integração com Virtual Data Rooms (VDR) & Proxy Supergood
## Especificação Técnica de Integrações

O diretório `src/core/vdr/` contém a abstração e os conectores reais para sistemas de Virtual Data Rooms (VDR), permitindo leitura de pastas, download de metadados e upload de documentos fiduciários necessários para Due Diligence.

---

## 1. Abstração Geral (Padrão "Supergood")

Em vez de criar dependências diretas de cada API proprietária de VDR na camada de agentes, o middleware adota uma interface abstrata comum: `VDRProvider`.

### Interface `VDRProvider` (`src/core/vdr/provider.ts`)
```typescript
export interface VDRProvider {
  listDocuments(folderId?: string): Promise<VDRDocument[]>;
  downloadDocument(documentId: string): Promise<Uint8Array>;
  getDocumentMetadata(documentId: string): Promise<VDRDocument>;
  uploadDocument(name: string, content: Uint8Array, folderId?: string): Promise<VDRDocument>;
}
```

Para garantir conformidade, segurança e monitoramento de tráfego, todas as requisições HTTP podem ser roteadas através de um proxy fiduciário chamado **Supergood**. A classe abstrata `BaseVDRProvider` implementa este comportamento de forma transparente:
```typescript
protected async fetchThroughProxy(targetUrl: string, init?: RequestInit): Promise<Response>
```
Se a configuração do Supergood (`apiKey`, `clientId`, `proxyUrl`) estiver presente, a requisição é desviada para a URL do proxy com o cabeçalho `x-supergood-target-url` apontando para o VDR de destino final.

---

## 2. Provedores Suportados

### A. Papermark (`src/core/vdr/papermark.ts`)
Adaptador para a API do Papermark. Permite sincronizar pastas de documentos e extrair metadados via chamadas seguras. O resolvedor mapeia o retorno da API do Papermark para o tipo interno `VDRDocument`.

### B. iDeals (`src/core/vdr/providers/ideals.ts`)
Conector corporativo para o iDeals VDR. Implementa as rotas específicas da API do iDeals para indexação de salas de dados e relatórios de auditoria, suportando paginação e download de volumes massivos de documentos.

### C. Intralinks (`src/core/vdr/providers/intralinks.ts`)
Conector fiduciário para o Intralinks. Desenhado especificamente para lidar com tokens de autorização de alta segurança, chaves RSA e criptografia ponta-a-ponta, comuns em fusões e aquisições de grandes corporações.

---

## 3. Fluxo de Execução com os Agentes

Quando o `GeneralDueDiligenceAgent` ou o `LegalDueDiligenceAgent` precisa analisar um documento no VDR:
1. Eles invocam a ferramenta registrada em `src/agent/actions.ts` (como `vdrStructuredAccessTool`).
2. A ferramenta lê as credenciais injetadas no ambiente, instancia o provedor correto (ex: `IntralinksProvider` via `Supergood`) e faz a requisição.
3. Os binários obtidos em formato `Uint8Array` são passados à camada de RAG do agente para extração de dados jurídicos ou balanços fiscais.
