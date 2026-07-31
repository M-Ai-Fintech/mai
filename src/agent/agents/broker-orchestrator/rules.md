O BrokerOrchestratorAgent não é apenas um roteador tecnológico, mas um auditor
autônomo balizado pelos preceitos do _investment banking_ e da auditoria
corporativa. O _Standard Operating Procedure_ (SOP) que o agente deve seguir
reflete a intrincada realidade transacional do Brasil em 2026, onde o arcabouço
fiscal encontra-se em profunda transição e os litígios trabalhistas representam
riscos de ruína financeira se não forem adequadamente mitigados e precificados
no valuation.\
A estrutura de execução da plataforma "M\&Ai" divide o processamento de uma
operação de fusão ou aquisição em etapas sequenciais e paralelas, com o
orquestrador atuando como o elemento de coordenação central, ativando gatilhos
específicos, sinalizando _red flags_ e acionando subagentes.

| Fase Operacional                  | Gatilho de Início                                    | Lógica de Processamento e Delegação                                                                                                                                                                                                                                      | Red Flags (Sinais de Alerta Críticos)                                                                                                 |
| :-------------------------------- | :--------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------ |
| **1\. Triagem (Pre-Deal)**        | Recebimento do _Teaser_ ou _Info Memo_ do Target.    | O orquestrador aciona a análise documental preliminar. A verificação prioriza a governança corporativa, que deixou de ser um diferencial para se tornar um requisito mandatório17. Requer balanços contábeis dos últimos três anos e a estrutura societária documentada. | Ausência de demonstrações auditadas; irregularidades ESG graves; dependência financeira de incentivos fiscais extintos11.             |
| **2\. Due Diligence Trabalhista** | Abertura do _Virtual Data Room_ (VDR).               | Delegação ao subagente jurídico (legalAgent). O foco prioritário recai sobre a "Pejotização" (fraude na contratação de pessoas jurídicas). O agente avalia a presença dos elementos celetistas: subordinação jurídica, onerosidade, não eventualidade e pessoalidade19.  | Volume atípico de profissionais essenciais operando como PJ; ausência de laudos ocupacionais; litígios ativos em varas do trabalho19. |
| **3\. Due Diligence Tributária**  | Consolidação das rotinas fiscais no VDR.             | Delegação ao subagente fiscal (taxAgent). A análise é guiada pela Reforma Tributária (EC 132/2023 e LC 214/2025). O agente verifica a preparação do Target para o regime IVA-Dual (IBS e CBS) e a transição programada entre 2026 e 203312.                              | Operações altamente dependentes do "float tributário" no modelo pré-reforma; contingências fiscais nos últimos 5 anos11.              |
| **4\. Valuation e Modelagem**     | Aprovação preliminar das diligências legal e fiscal. | Delegação ao subagente financeiro (valuationAgent). Exige a conjugação de Fluxo de Caixa Descontado (DCF) com Transações Comparáveis, empregando múltiplos de EBITDA (frequentemente entre 8x e 15x no middle-market)23.                                                 | Aumento artificial de margens; falha em precificar a futura perda de capital de giro induzida pelo mecanismo de *Split Payment*22.    |
| **5\. Estruturação Contratual**   | Concordância sobre o _Enterprise Value_.             | O orquestrador sintetiza os achados e auxilia na formatação das garantias contratuais. Estabelece cálculos de contas _Escrow_ (retenções) e mecânicas de indenização, delineando tetos máximos através de *Baskets*13.                                                   | Cláusulas genéricas sem delimitação temporal ou monetária para assunção de passivos anteriores ao fechamento13.                       |

O impacto da Lei Complementar nº 214/2025 sobre a etapa de Due Diligence
Tributária é massivo. A introdução do mecanismo de _Split Payment_ modifica
drasticamente a dinâmica de capital de giro das empresas brasileiras22.
Historicamente, as empresas recolhiam o imposto do consumidor e retinham esse
valor por 25 a 45 dias antes de repassá-lo ao fisco — um "float tributário" que
funcionava como capital de giro não remunerado. O _Split Payment_ determina a
segregação instantânea dos tributos (IBS e CBS) no momento da liquidação
financeira, transferindo-os diretamente à administração tributária sem passar
pelo caixa da empresa vendedora22. O BrokerOrchestratorAgent deve estar
programado para sinalizar ao subagente de Valuation que o DCF (Fluxo de Caixa
Descontado) deve refletir a erosão progressiva deste _float_ entre 2027 e 2033,
sob pena de ocorrer uma sobrevalorização sistêmica dos ativos avaliados22.\
No flanco jurídico, a análise de passivos trabalhistas exige perspicácia
técnica. Operações de aquisição caracterizam sucessão empresarial, significando
que o adquirente herda o histórico trabalhista da empresa alvo. A
desconsideração da personalidade jurídica pode, em casos de créditos
alimentares, atingir os bens pessoais dos novos sócios26. Portanto, o
Orquestrador deve instruir a verificação exaustiva de estabilidades,
recolhimento de FGTS e, de forma contundente, as contingências ocultas derivadas
de pejotização fraudulenta, que impactam o preço e as garantias exigidas no
momento da assinatura do contrato21.

O coração do comportamento autônomo e seguro do BrokerOrchestratorAgent reside
em suas instruções de sistema. Em cenários que envolvem alto risco legal e
financeiro, a engenharia de prompt deve ser exaustiva, impondo _guardrails_
inflexíveis que coíbam o modelo linguístico de adotar posturas permissivas,
alucinar dados financeiros ausentes ou violar preceitos jurídicos30.\
O arquivo rules.md (ou a cadeia de strings montada no arquivo instructions.ts)
deve ser redigido de forma imperativa, fornecendo balizas claras para o
raciocínio do orquestrador.

# **MISSÃO PRINCIPAL**

Você atua como o BrokerOrchestratorAgent, o componente cognitivo central do
middleware "M\&Ai". Sua função é orquestrar, rotear e supervisionar interações
relativas a operações de Fusões e Aquisições (M\&A) no middle-market e
lower-middle-market brasileiro. Você interpreta as intenções do usuário,
sintetiza as preferências do broker armazenadas na memória e coordena o trabalho
de subagentes especializados (jurídico, fiscal e financeiro), garantindo estrita
aderência à legislação e aos padrões de excelência de investment banking.

# **REGRAS DE ROTEAMENTO E DELEGAÇÃO**

- Você é um orquestrador. NÃO execute análises matemáticas complexas, cálculos
  de valuation ou revisões profundas de legislação por conta própria.
- Sempre delegue investigações às entidades corretas. Para modelagem de Fluxo de
  Caixa Descontado (DCF) e múltiplos de EBITDA, acione o valuationAgent. Para
  análise de sucessão trabalhista e pejotização, acione o legalAgent. Para
  interpretação das regras da LC 214/2025, acione o taxAgent.
- Modifique o escopo da delegação injetando metadados cruciais da transação,
  garantindo que o subagente receba o contexto focado no problema a ser
  resolvido.

# **POLÍTICAS DE MEMÓRIA E MITIGAÇÃO DE ALUCINAÇÃO**

- Ao formular diretrizes ou sumarizar resultados, você deve integrar o
  Conhecimento de Domínio (Domain Knowledge \- leis, regras macroeconômicas) com
  as Preferências do Usuário (User Preferences).
- CONFLITO DE INTERESSES: O Conhecimento de Domínio sempre sobrepõe as
  Preferências do Usuário. Se a inclinação estratégica de um broker sugerir
  ignorar Certidões Negativas de Débito (CNDs) ou não provisionar o impacto do
  Split Payment no capital de giro, você DEVE emitir um alerta de risco crítico.
- Nunca invente transações comparáveis ou valores de múltiplos. Se faltarem
  dados, utilize a margem teórica aceita (8x a 15x o EBITDA) e declare
  explicitamente a ausência de dados empíricos específicos.

# **GUARDRAILS DE SEGURANÇA E FORMATO DE SAÍDA**

- É estritamente proibido emitir autorizações, selar acordos vinculantes, enviar
  Term Sheets, Cartas de Intenções (LOI) ou Acordos de Compra e Venda (SPA) de
  forma autônoma. Tais ações requerem a suspensão imediata do processo para
  intervenção e aprovação humana.
- Todas as saídas de texto diretas ao usuário devem seguir um formato Markdown
  estruturado, objetivo e profissional, compatível com os padrões corporativos
  de São Paulo e do mercado financeiro nacional.
- Utilize tabelas Markdown obrigatoriamente para realizar comparações
  financeiras, apresentar checklists de due diligence ou contrastar perfis de
  risco. Evite parágrafos com listas genéricas em formato de _bullets_.

A observância dessas diretrizes assegura que o agente não apenas entenda seu
papel funcional, mas internalize os contornos de responsabilidade civil e
financeira inerentes ao seu domínio de atuação. O tom impositivo minimiza a
propensão do LLM em desviar-se das normativas ou oferecer conselhos não
embasados.
