# Estrutura Modular de Agentes e Playbooks de M&A

Este documento serve como guia de referência técnica para a arquitetura agêntica modularizada da plataforma **M&Ai**, detalhando a responsabilidade de cada agente, sua estrutura de arquivos e as regras de negócio integradas a partir das pesquisas aprofundadas (Deep Research).

---

## 1. Topologia Modular de Pastas

Cada agente foi extraído de definições monolíticas de arquivo único para um diretório autocontido dentro de `src/agent/agents/`:

```
src/agent/agents/[agent-folder]/
├── index.ts                  # Definição principal do Agent via Mastra + AI SDK
├── instructions.md           # Prompt de sistema (System Instructions) focado no domínio
├── playbook.md               # Roteiro de Procedimento Operacional Padrão (SOP)
├── rules.md                  # Guardrails estáticos e diretrizes de conformidade
├── schemas/                  # Validadores Zod para inputs, outputs e estados
│   ├── input.ts
│   └── output.ts
├── fonts/                    # Conhecimento estático de domínio (RAG local)
└── tools/
    └── index.ts              # Adaptação e re-exportação de tools globais
```

### Justificativa de Design
* **Isolamento de Contexto:** Cada agente possui seu próprio subdiretório de conhecimento (`/fonts`) e validação de dados (`/schemas`), garantindo que não haja vazamento de contexto ou contaminação de memória.
* **Saídas Estruturadas (Structured Outputs):** Reduz a alucinação de dados ao impor validadores Zod tipados em todas as chamadas de API do Gemini 3.5 Flash.
* **Human-in-the-Loop (HITL):** Processos vinculantes ou que envolvem lances financeiros disparam o método `.suspend()` do Mastra para aguardar intervenção manual de um executivo antes de gerar binários físicos (PDF).

---

## 2. Mapa dos 8 Agentes Modularizados

### 1. BrokerOrchestratorAgent (`broker-orchestrator/`)
* **Papel:** Ponto de acesso central e gateway cognitivo.
* **Modelo:** Gemini 3.5 Flash.
* **Ferramenta:** `databaseMemoryServiceTool`.
* **Playbook:** Roteamento semântico de baixa latência (<4ms) para desviar intenções simples de LLM usando similaridade de cossenos. Intercepta correções do broker e separa no banco de dados a memória de preferências do usuário (*User Preferences*) do conhecimento universal (*Domain Knowledge*).

### 2. SourcingAndKYBAgent (`sourcing-kyb/`)
* **Papel:** Qualificação e compliance de contrapartes.
* **Modelo:** Gemini 3.5 Flash.
* **Ferramentas:** `verifyRegistryTool`, `mcpDatabaseTool`, `geminiGoogleSearchTool`.
* **Playbook:** 3 fases de investigação: Cadastral (SERPRO/Receita), OSINT (JusBrasil, Portal da Transparência CEIS/CNEP), e Análise Cultural/Pessoa-Chave (dependência de fundador, estilo de negociação).

### 3. GeneralDueDiligenceAgent (`general-dd/`)
* **Papel:** Supervisor principal de auditoria.
* **Modelo:** Gemini 3.5 Flash.
* **Ferramentas:** `googleCloudPubSubTool`, `mcpDatabaseTool`, `databaseMemoryServiceTool`.
* **Playbook:** Recebe dados do VDR e paraleliza (fan-out) tarefas para os subagentes financeiro e jurídico. Consolida relatórios sob a matriz de risco CPC 25 (Provável, Possível, Remota) e emite recomendação de GO/NO-GO.

### 4. FinancialRiskAgent (`financial-risk/`)
* **Papel:** Subagente de auditoria contábil e risco.
* **Modelo:** Gemini 3.5 Flash.
* **Ferramentas:** `huggingFaceMcpTool`, `analyzeCompanyRisksTool`.
* **Playbook:** Normalização do EBITDA do middle-market (pró-labore de sócios, despesas pessoais, pejotização CLT). Reconstituição de dívida líquida sob IFRS 16/CPC 06 (R2). Execução de modelos de insolvência: Kanitz (FI < -3), Elizabetsky (Z < 0.5) e Altman Z2.

### 5. LegalDueDiligenceAgent (`legal-dd/`)
* **Papel:** Subagente de auditoria jurídica de contratos.
* **Modelo:** Gemini 3.5 Flash.
* **Ferramentas:** `googleCloudPubSubTool`, `mcpDatabaseTool`, `databaseMemoryServiceTool`.
* **Playbook:** Varredura em busca de cláusulas de Change of Control (CoC), direitos societários (Tag/Drag-along), conformidade com LGPD e auditoria de 10 armadilhas societárias de LTDAs familiares.

### 6. DealMatchingAgent (`deal-matching/`)
* **Papel:** Matching de portfólio e valuation em faixas.
* **Modelo:** Gemini 3.5 Flash.
* **Ferramentas:** `optimizePortfolioTool`, `mcpDatabaseTool`.
* **Playbook:** Otimização de portfólio via Mixed Integer Linear Programming (MILP). Elaboração de valuation triplo (Floor, Mid, Ceiling) com desconto de iliquidez e prêmio de controle. Detecção de gatilhos concorrenciais CADE (Lei 12.529/11).

### 7. NegotiationAgent (`negotiation/`)
* **Papel:** Conselheiro estratégico de negociação.
* **Modelo:** Gemini 3.5 Flash.
* **Ferramentas:** `optimizeTermSheetTool`, `databaseMemoryServiceTool`.
* **Playbook:** Análise ZOPA/BATNA. Geração de exatamente 3 cenários equilibrados (Cash-Heavy, Balanced, Equity-centric) baseados em Teoria dos Jogos (Equilíbrio de Nash) e fricção contratual. Proteção sob earn-outs e escrows (Art. 129/130 CC).

### 8. LegalClosingAgent (`legal-closing/`)
* **Papel:** Emissão e fechamento de contratos jurídicos (Term Sheet/SPA).
* **Modelo:** Gemini 3.5 Flash.
* **Ferramentas:** `generatePdfTermSheetTool`, `databaseMemoryServiceTool`.
* **Playbook:** Visualização em Markdown no terminal -> Human-in-the-Loop (.suspend()/.resume()) -> Geração de PDF via `pdf-lib`. Validação estrita de Reps & Warranties (caps 15-30%, baskets 0.5-2%, sobrevivência 5 anos tributária) e Non-Compete (CADE Súmula 5 - max 5 anos).

---

## 3. Contexto Legal e Financeiro Brasileiro Integrado

Os prompts e base de dados locais de RAG (`/fonts`) foram enriquecidos com conceitos cruciais do ambiente regulatório e econômico brasileiro:

1. **Reforma Tributária (EC 132/23 e LC 214/25):** 
   O mecanismo de *Split Payment* elimina o float tributário histórico do fluxo de caixa das empresas. Os agentes de Due Diligence e Valuation são instruídos a recalcular o DCF reduzindo a projeção de capital de giro à medida que a transição avança.
2. **Direito Societário (Lei das S.A. 6.404/76 e Código Civil):**
   Verificação de acordos verbais em LTDAs familiares, regras de dissolução de sociedade (Apuração de Haveres Art. 606 CPC), e direitos de retirada e preferências.
3. **Legislação Trabalhista (CLT e Pejotização):**
   Rigorosa identificação de passivos trabalhistas ocultos através de auditoria do volume de prestadores PJ com características de relação CLT (Habitualidade, Pessoalidade, Subordinação, Onerosidade).
4. **Resolução de Conflitos (CAM-CCBC):**
   Inclusão mandatória de arbitragem em câmaras reconhecidas para a resolução de disputas contratuais envolvendo o pagamento futuro de Earn-out ou liberação de retenções em contas Escrow.
