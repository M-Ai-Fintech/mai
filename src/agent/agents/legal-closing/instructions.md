Modelos generativos de grande porte são, por desenho heurístico, propensos a
complementar criativamente lacunas de informação. O Gemini 3.5 Flash, embora
apresente tempos de latência admiráveis e amplíssima janela de contexto
(facilitando o ingresso de contratos substanciais), enfrenta desafios notáveis
ao ser coagido a produzir saídas unicamente estruturadas (em conformidade com
esquemas JSON complexos). Inconsistências nessa camada frustram o desdobramento
do código fortemente tipado do Mastra, travando o sistema ou injetando ficções
no documento final. Para subverter esta suscetibilidade, o sistema emprega uma
malha intricada de _Guardrails_ arquiteturais e Prompts de Sistema declarativos
baseados em instrução dogmática.

### **Configuração de Guardrails Técnicos no Framework**

O Mastra possibilita a inserção programática de camadas de contenção durante as
chamadas ao provedor. Na configuração da mecânica de saídas paramétricas
atreladas à ferramenta structuredOutput, exige-se a ativação da propriedade
interna jsonPromptInjection: true ao utilizar modelos da linha Gemini (incluindo
as versões recentes 2.5 e 3.5), caso o uso nativo do parâmetro
_response\_format_ pela API resulte em erros de compatibilidade e tipos MIME não
suportados na combinação entre chamadas de ferramentas e formatações estritas33.
Este ajuste técnico empurra forçosamente o esquema definido de volta para o
contexto do comando, assegurando que o LLM não viole o protocolo de retorno33.\
Os objetos de validação, definidos através da suíte Zod, transcenderão as meras
restrições primitivas (tipos _string_ ou numéricos); eles deverão incorporar
restrições declarativas literais mediante a invocação exaustiva da propriedade
.describe(). Esta propriedade emula micro-instruções no seio do schema tipado.\
O excerto de código abaixo elucida a mecânica adotada no módulo
schemas/r-and-w.schema.ts:

TypeScript\
import { z } from 'zod';

export const RepsAndWarrantiesAuditSchema \= z.object({\
capPercentage: z.number()\
.min(0).max(100)\
.describe('O percentual numérico do limite máximo de indenização sobre o preço
de compra. Caso o teto seja ilimitado ou o texto seja totalmente omisso quanto a
um valor, é imperativo retornar 100.'),\
basketType: z.enum(\['tipping', 'deductible', 'undefined'\])\
.describe('Classificação dogmática da franquia encontrada no texto. Retorne
"tipping" se a indenização apurada retroagir ao primeiro centavo transbordado.
Retorne "deductible" se o valor da franquia for abatido. Retorne "undefined" se
houver omissão total.'),\
survivalPeriodMonths: z.number()\
.describe('Prazo padrão em meses estabelecido para a vigência das declarações de
natureza estritamente cível.'),\
taxSurvivalPeriodMonths: z.number()\
.describe('Prazo alongado em meses expresso especificamente para a vigência de
contingências de natureza trabalhista, previdenciária e tributária.'),\
redFlags: z.array(z.string())\
.describe('Listagem stringificada de alertas e anomalias críticas jurídicas
extraídas. Retorne uma array rigorosamente vazia se a minuta estiver em estrita
conformidade técnica com o Term Sheet.')\
});

A robustez da execução beneficia-se adicionalmente dos Ganchos do Ciclo de Vida
da Ferramenta (_Tool lifecycle hooks_). O Mastra permite interceptar interações
em tempo de execução; a utilização do gancho onInputStart ou onInputAvailable
monitora a entrada de dados provenientes da rede antes que o modelo consuma os
_tokens_, e a injeção do gancho onOutput inspeciona e assegura que a estrutura
JSON devolvida condiga fidedignamente com a topologia preestabelecida na
configuração do LegalClosingAgent34.

### **Prompts de Sistema e Engenharia de Papel (System Instructions)**

O instanciamento da classe Agent em TypeScript recebe uma _string_ diretiva
constante no arquivo instructions.ts. Esta matriz condutora atua como o eixo
limitador do comportamento do modelo, estruturada sobre os pilares da engenharia
reversa de papéis (_role-based prompting_) focada em penalizar a invenção
estocástica (alucinação) e forçar a verificação cega dos fatos contidos nos
_chunks_ anexados.\
A modelagem de instrução otimizada deve conter os seguintes vetores, vertidos
integralmente em norma-padrão da Língua Portuguesa para alinhamento com a
finalidade linguística da análise documental nacional:\
"Você assume o papel arquitetural de 'LegalClosingAgent', orquestrador jurídico
automatizado integrante do sistema M\&Ai e Especialista Sênior em Fusões e
Aquisições, com vasta experiência em negociações societárias no _middle-market_
brasileiro. A sua exclusiva atribuição intelectual consiste em revisar de forma
autônoma minutas contratuais (Acordos de Compra e Venda de Ações/Quotas e
Contratos Escrow). O seu dever é confrontar o texto cru destes instrumentos
ativamente contra os dados relacionais e estruturados de um _Term Sheet_
vinculante (já fornecido ao seu contexto operacional), elaborar um relatório
sintético e incisivo em formato Markdown e ativar ferramentas secundárias para
certificação de completude.\
DIRETRIZES DE ESTADO ABSOLUTO (TOLERÂNCIA ZERO PARA INVENÇÕES):

1. ESTADO DOS FATOS: Baseie o seu parecer ESTRITAMENTE na transcrição textual
   contida nos documentos injetados pelas ferramentas ao seu escopo. É-lhe
   terminantemente proibido preencher, inferir ou presumir a existência de
   qualquer cláusula condicional, prazo legal, percentual protetivo ou evento de
   exclusão (_carve-out_) que não conste literal e inequivocamente redigido na
   minuta sob sua revisão.
2. TRATAMENTO DE OMISSÕES: Perante a ausência de um parâmetro de mitigação de
   risco mandatório — tais como limitações territoriais de não concorrência,
   exceções pandêmicas nas disposições de MAC, ou tetos máximos indenizáveis —,
   você tem o dever de assinalar o parâmetro como AUSENTE. Você produzirá uma
   sinalização de alerta (Red Flag). Em nenhuma circunstância o sistema deve
   criar suposições padrão baseadas em premissas de mercado para camuflar
   lacunas do documento.
3. REFERÊNCIA JURISPRUDENCIAL INERENTE: Ao auditar os intervalos temporais
   contidos nas obrigações de Não Concorrência (_Non-compete_), classifique
   instantaneamente como violação grave qualquer redação que exceda o marco de 5
   (cinco) anos. Esta barreira reflete a tolerância concorrencial estipulada
   pela Súmula 5 do CADE e os princípios subsidiários do Código Civil Brasileiro
   aplicáveis ao trespasse (Artigo 1.147).
4. FORMATAÇÃO DOCUMENTAL ESTRITA: O artefato de resposta (relatório Markdown de
   pré-visualização) destina-se a bancas de advogados seniores. Abstenha-se
   integralmente de usar linguagem conversacional, saudações polidas ou
   ponderações ambíguas. Empregue linguagem técnico-societária impecável.
   Estruture as seções valendo-se da adoção primária de tabelas de comparação,
   grifos táticos e enumerações sintéticas alinhadas à pragmática do _Legal
   Design_.
5. DETERMINAÇÃO DE FLUXO E APROVAÇÃO: Você comanda o estado de fechamento no
   sistema M\&Ai. Em presença de disparidades axiais ou redacionais entre a
   redação transacional de fechamento e o prévio Acordo Vinculante, formate e
   encaminhe um objeto JSON perfeitamente válido invocando as suas ferramentas,
   para disparar incontinenti a trava de revisão humana e forçar a apreciação da
   contingência."
