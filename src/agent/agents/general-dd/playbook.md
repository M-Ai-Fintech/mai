A responsabilidade primária do agente supervisor é sintetizar descobertas
multidisciplinares sem perder o contexto de gravidade que cada _red flag_
isolada carrega. Em avaliações de _investment banking_, um problema jurídico
menor pode se tornar catastrófico quando cruzado com fragilidades financeiras, e
a inteligência artificial deve replicar esta sensibilidade20.\
Para alcançar este grau de sofisticação, o GeneralDueDiligenceAgent deve operar
sob um _Standard Operating Procedure_ (SOP) pautado na matriz universal de risco
e em fluxos determinísticos.

### **Passo 1: Ingestão e Triagem Inicial (T+0)**

A operação é deflagrada por uma notificação _push_ do Pub/Sub informando a
disponibilidade de um novo pacote de dados do VDR10. O supervisor invoca o
primeiro _workflow_ do Mastra, configurado com passos sequenciais (.then()).
Este fluxo inicial realiza uma auditoria de completude. Caso demonstrações
financeiras históricas não sejam detectadas, o agente suspende o _workflow_ e
emite uma notificação para a inserção humana (_human-in-the-loop_), visto que
dados financeiros ausentes configuram um _deal-breaker_ primário12.

### **Passo 2: Delegação Paralela de Tarefas (T+1)**

Confirmada a integridade do VDR, o agente supervisor executa uma fan-out
arquitetural utilizando a capacidade de execução paralela do *framework*26. O
subagente financeiro é instruído a processar as contas contábeis para apurar o
_Quality of Earnings_ (QoE), normalizando o EBITDA ao expurgar receitas não
recorrentes e despesas de cunho pessoal dos sócios20. Simultaneamente, o
subagente jurídico é acionado para realizar a leitura profunda de litígios e
contratos, utilizando ferramentas MCP acopladas ao Hugging Face para tarefas
intensivas de Processamento de Linguagem Natural (NLP) na identificação de
cláusulas adversas.

### **Passo 3: Triangulação Transversal de Dados (T+2)**

Esta fase representa o apogeu da inteligência do sistema. O agente supervisor
recolhe os relatórios parciais e inicia a busca por riscos sistêmicos através do
cruzamento ativo de dados. O desafio arquitetural de sintetizar sem perder
gravidade é resolvido por meio da lógica de matriz combinada.\
Um exemplo prático deste cruzamento refere-se ao risco de concentração de
receita. No _middle-market_, o limite tático seguro de concentração em um único
cliente orbita em torno de 10%13. O supervisor cruza a matriz de faturamento
fornecida pelo subagente financeiro com a análise de resiliência contratual do
subagente jurídico. Se o cliente responsável por 15% da receita possuir um
contrato sem garantias mínimas de compra (_take-or-pay_) ou contiver uma
cláusula de _Change of Control_ que permita rescisão imediata após a aquisição,
o agente não relata duas observações separadas; ele funde os dados e classifica
a situação como uma vulnerabilidade operacional de alta severidade25.\
Outro vetor de análise transversal é o risco de "pejotização". Ao detectar uma
força de trabalho altamente apoiada em contratos de prestação de serviço (PJs),
o supervisor demanda que o subagente jurídico ateste o risco de caracterização
de vínculo empregatício. Constatado o risco, o supervisor determina que o
subagente financeiro recalcule o passivo potencial, provisionando verbas
rescisórias, férias, décimo terceiro e encargos sociais sobre toda a folha de
pagamentos informalizada22. O valor resultante é então deduzido do _Enterprise
Value_ na recomendação final do ajuste de preço.

### **Passo 4: Matriz de Classificação de Risco (Severidade vs. Probabilidade)**

Para garantir que a síntese de _red flags_ possua validade de mercado, o agente
deve plotar cada contingência em uma grade quantitativa que correlaciona
Probabilidade e Impacto27.\
A gravidade do risco não é tratada de forma fluida pelo LLM, mas alocada
rigidamente de acordo com as normas contábeis estabelecidas. Seguindo os
preceitos do Comitê de Pronunciamentos Contábeis (CPC 25), aplicável no
Brasil29:

1. **Riscos Remotos**: Contingências cuja materialização é altamente improvável.
   O agente deve registrar a ocorrência no relatório analítico para preservação
   do histórico, mas não sugere qualquer ajuste de _valuation_ ou menção
   destacada nos contratos de compra e venda.
2. **Riscos Possíveis**: Probabilidade intermediária de perda. A diretriz
   normativa determina que estes valores não devem transitar pelo balanço
   patrimonial como provisão. Contudo, o agente deve sintetizar estas
   informações para que os advogados redijam garantias específicas
   (_Representations and Warranties_) no _Share Purchase Agreement_ (SPA),
   recomendando, se o volume financeiro for substancial, a adoção de contas de
   retenção (_Escrow accounts_)20.
3. **Riscos Prováveis**: A probabilidade de condenação ou materialização do dano
   supera os 50%. Nestes casos, o agente assume uma postura intervencionista. A
   contingência deve ser compulsoriamente provisionada, impactando o EBITDA
   ajustado e, consequentemente, reduzindo o valor presente da transação de
   forma imediata30. Se a somatória dos riscos prováveis superar um percentual
   preestabelecido do valor do negócio, o sistema engatilha a recomendação de
   _No-Go_ imediato.

A padronização matemática e normativa destas classificações impede que o Gemini
3.5 Flash neutralize a linguagem, garantindo que "riscos catastróficos"
permaneçam visíveis e impulsionem ações concretivas27.
