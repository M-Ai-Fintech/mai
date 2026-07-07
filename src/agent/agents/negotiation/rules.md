Para que o NegotiationAgent atue com proficiência no mercado brasileiro de F\&A, as suas regras de inferência não podem ser genéricas. Elas devem emular um Procedimento Operacional Padrão (SOP) rigoroso, oriundo da auditoria de alto nível e da banca de investimento de excelência. As estruturas de *Escrow* e *Earn-out* são os componentes mais litigiosos de qualquer SPA (*Share Purchase Agreement*), e a sua formulação inábil conduz sistematicamente a disputas pós-fechamento, destruindo o valor transacional5.  
O *Escrow* (Conta Vinculada em Garantia) tem como finalidade primordial a mitigação de contingências passivas não identificadas integralmente durante a *Due Diligence* (passivos fiscais, laborais ou cíveis preexistentes)5. No mercado brasileiro de F\&A contemporâneo, a retenção padrão oscila entre 5% e 15% do valor total da transação (Enterprise Value), retido por períodos que variam tipicamente entre 12 e 24 meses5. O *Playbook* do agente deve determinar invariavelmente a estipulação de contas fiduciárias operadas por terceiros independentes (bancos de primeira linha ou *trustees*), proibindo terminantemente a recomendação de *Holdbacks* diretos (onde o comprador retém o capital na sua própria tesouraria), dada a altíssima propensão para conflitos de interesse e disputas de liquidez6.  
Paralelamente, o *Earn-out* não é uma garantia contra passivos, mas sim um mecanismo de precificação de *upside*, ajustando o preço de aquisição à capacidade de performance futura da empresa5. O *middle-market* brasileiro aplica habitualmente *Earn-outs* correspondentes a 20% a 40% do *valuation* total, medidos em horizontes temporais de 1 a 3 anos5. O desafio estratégico do agente é mitigar a "Interferência do Comprador". Jurisprudência reiterada no Brasil, nomeadamente no Tribunal de Justiça de São Paulo (TJSP) e no Superior Tribunal de Justiça (STJ), invoca a aplicação do princípio da boa-fé objetiva e do Artigo 129 do Código Civil30. Segundo a jurisprudência consubstanciada no REsp n° 2.117.094/SP, caso o comprador intervenha na gestão pós-aquisição de forma a inviabilizar o alcance das metas do *Earn-out* (por exemplo, ao descontinuar linhas de produto, demitir quadros cruciais ou alterar a estrutura de comissionamento sem base técnica evidente), a condição suspensiva do *Earn-out* é dada como preenchida (cumprimento ficto), obrigando o comprador ao pagamento integral da parcela30.  
Com base nestes fundamentos jurídicos e de mercado, o SOP do NegotiationAgent é executado através das seguintes lógicas processuais e gatilhos de alerta (*Red Flags*):

| Fase Operacional do SOP | Ação do Agente | Red Flags (Gatilhos de Rejeição e Alerta) | Mecanismos de Proteção e Resolução |
| :---- | :---- | :---- | :---- |
| **Fase 1: Auditoria de Métricas de *Earn-out*** | Analisar o indicador económico selecionado pelo comprador para basear o pagamento futuro. | Submissão de propostas baseadas em **Lucro Líquido**. O Lucro Líquido é altamente manipulável por políticas contábeis de depreciação e juros30. | O agente deve forçar a conversão da métrica para **Receita Recorrente Líquida (ARR)** ou **EBITDA Ajustado**, exigindo a inclusão de memória de cálculo descritiva5. |
| **Fase 2: Governança Pós-Fechamento** | Avaliar o grau de autonomia do vendedor durante o período probatório do *Earn-out*. | Ausência de garantias operacionais ou de autonomia de gestão para os fundadores que permanecem na operação. | O agente exige a inclusão do direito de acesso à informação (Art. 130 CC) para auditoria contínua e cláusulas de proteção contra interferência discricionária30. |
| **Fase 3: Parametrização do *Escrow*** | Estruturar a conta em garantia para cobrir contingências da *Due Diligence*. | *Escrows* globais sem prazo de expiração (ad-eternum) ou superiores a 20% do capital negociado. Retenção direta (*Holdback*) sem banco mediador6. | Proposição algorítmica de liberações graduais (ex: 50% ao fim do 1º ano, 50% no 2º ano) para aliviar a pressão psicológica e reter apenas o necessário5. |
| **Fase 4: Estruturação de Resolução de Disputas** | Desenhar o mecanismo de resolução caso as metas do *Earn-out* ou passivos do *Escrow* sejam disputados. | Cláusulas de eleição de foro tradicional (Tribunais Judiciais Comuns) que carecem de agilidade e especialização técnica31. | Omissão bloqueada: O agente obriga a indicação de Câmaras de Arbitragem (ex: CAM-CCBC, CCI, FGV) e estipulação prévia da intervenção de Peritos Independentes31. |

A aplicação sistemática deste *Playbook* garante que as formulações contratuais simuladas pelo M\&Ai são blindadas legalmente, antecipando e anulando fricções estruturais que, frequentemente, resultam num colapso tardio das operações.



A integridade cognitiva do NegotiationAgent é garantida através do *System Prompt* contido em instructions.md e reforçada pela validação esquemática e imperativa construída com a biblioteca Zod8. A instrução a enviar ao motor Gemini 3.5 Flash requer um tom imperativo, constrangimentos técnicos severos, e salvaguardas (*guardrails*) destinadas a bloquear a geração de pareceres taxativos ou diagnósticos jurídicos definitivos que pudessem configurar responsabilidade legal inadequada ao *middleware*.  
O rascunho avançado de arquitetura comportamental, estruturado para injeção nativa no *pipeline* do Mastra, desenvolve-se ao longo destas diretrizes fundamentais:  
**Identidade Operacional:** Tu assumes o papel de um Arquiteto Algorítmico de F\&A e Conselheiro Estratégico Especializado no *middle-market* brasileiro. O teu objetivo não é tomar partido, mas sim encontrar a simetria ótima de risco através da descoberta algorítmica do Equilíbrio de Nash entre Comprador e Vendedor.  
**Conduta e Restrições (Guardrails):**

1. **Proibição de Ditames Unilaterais:** Nunca declares uma proposta como a única via possível, nem ordenes a aceitação irrevogável de um *Term Sheet*. A tua função é aconselhar e iluminar caminhos.  
2. **Obrigatoriedade da Múltipla Escolha:** Deves, obrigatoriamente, processar os rácios financeiros e entregar exatamente três (3) configurações alternativas de Term Sheet (ex: Estrutura Focada em Liquidez, Estrutura Focada em Retenção/Equity, e Estrutura Híbrida). Todas devem partilhar a mesma estabilidade matemática em torno do Produto de Nash.  
3. **Defesa Legal Preventiva:** Qualquer proposta que emane de ti contendo a componente *Earn-out* deve vir acoplada a um sumário de salvaguardas exigindo (A) acesso a dados de auditoria (Art 130 CC) e (B) métricas baseadas no topo da demonstração de resultados (ex: Receitas/EBITDA), repudiando margens líquidas facilmente influenciáveis por gestão discricionária.  
4. **Isolamento Jurisdicional:** Ao mencionar disputas pós-contratuais relativas a contas *Escrow*, não sugiras o foro civil. Propõe explicitamente mecanismos de resolução alternativa de litígios, destacando o papel vinculativo da arbitragem institucional nacional.

Para garantir que a resposta do LLM respeite o formato exigido pelas camadas subsequentes da aplicação (por exemplo, na geração automatizada de relatórios em PDF do M\&Ai), a invocação do modelo no Mastra deve obrigar à conformidade com a *Structured Output* (Saída Estruturada), eliminando a variabilidade associada à geração de linguagem natural8.

TypeScript  
import { z } from "zod";

export const NegotiationOutputSchema \= z.object({  
  zopa\_computation: z.object({  
    estimated\_seller\_batna: z.number().describe("O ponto de ruptura do vendedor em R$"),  
    estimated\_buyer\_batna: z.number().describe("O ponto de ruptura do comprador em R$"),  
    nash\_equilibrium\_pre\_money: z.number().describe("Valuation Pre-money teórico que maximiza a utilidade"),  
  }),  
  proposed\_scenarios: z.array(  
    z.object({  
      scenario\_title: z.string().describe("Título descritivo da estratégia (ex: Agressiva, Retentiva)"),  
      cash\_component\_pct: z.number().min(0).max(100),  
      equity\_roll\_component\_pct: z.number().min(0).max(100),  
      earn\_out\_structure: z.object({  
        total\_percentage: z.number().min(0).max(100),  
        duration\_months: z.number().min(0).max(60),  
        recommended\_metric: z.enum(\["EBITDA", "ARR", "RECEITA\_LIQUIDA", "RETENCAO\_CLIENTES"\]),  
        guardrail\_warning: z.string().describe("Aviso obrigatório sobre a proteção legal (Art 129/130 CC) contra interferência"),  
      }),  
      escrow\_structure: z.object({  
        total\_percentage: z.number().min(0).max(30),  
        duration\_months: z.number().min(0).max(60),  
        phased\_release\_plan: z.string().describe("Cronograma fracionado de devolução de garantias"),  
      }),  
      nash\_utility\_score: z.number().describe("O Produto de Nash desta configuração específica"),  
    })  
  ).length(3, "Exatamente três cenários são requeridos pela arquitetura."),  
  strategic\_advisory\_notes: z.string().describe("Síntese descritiva focada em M\&A tático e teoria dos jogos"),  
});

A imposição deste *schema* obriga o Gemini 3.5 Flash a alinhar os seus cálculos estocásticos dentro de caixas rigorosas, forçando o motor a distribuir a totalidade percentual da aquisição de forma coerente, ao mesmo tempo que o obriga estruturalmente a invocar um guardrail\_warning para a secção de *Earn-out*, blindando o sistema contra omissões legais fatais.