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