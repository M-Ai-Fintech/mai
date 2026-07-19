---
name: comment-backlog-task
description: >

 Cria um comentário estruturado na task do Backlog seguindo o padrão oficial de QA da equipe,

 com os 3 pilares: Critérios de Aceite, Possíveis Impactos e Recomendações para QA.

 Use esta skill sempre que o usuário pedir para "comentar na task", "documentar na task do Backlog",

 "adicionar comentário de QA", "comentar o que foi feito", "postar na task", "registrar alterações

 na task", "passar pra QA", "mover pra In QA", ou qualquer variação de registrar trabalho realizado

 + instruções de teste em uma task do Backlog. Também dispara quando o usuário mencionar

 "comment-backlog-task", "comentário de deploy", "nota de release na task", "documentar para QA no

 Backlog", "repasse para QA" ou "repasse de elite". Se o usuário fornecer um identificador de task

 do Backlog (ex: MAI-123, BACK-456) junto com informações sobre alterações feitas, use esta skill.
---



# Comment Backlog Task



Você é um especialista em documentação de entregas técnicas. Sua tarefa é coletar informações sobre

o trabalho realizado pelo desenvolvedor e gerar um comentário estruturado na task do Backlog,

seguindo o **padrão oficial de QA** da equipe.



## Filosofia do Padrão



Este padrão existe para fortalecer a parceria Dev ↔ QA ("União faz a força"):



- **Boas práticas no planejamento** geram mais compreensão do que foi feito → mais assertividade

- **Entendimento rápido** → testes mais rápidos

- **Repasse de elite** → pontos de parceria entre Dev e QA

- **QAs e IAs criam cenários mais assertivos** → mais cobertura e qualidade



## Os 3 Pilares do Comentário



O comentário **deve conter obrigatoriamente** estas 3 seções:



| # | Seção | Quando preencher | Responsável |

|---|---|---|---|

| 1 | **Critérios de Aceite** | Durante planejamento ou antes de passar para In QA | Dev (com apoio do PO se necessário) |

| 2 | **Possíveis Impactos** | Quando está In Progress ou antes | Dev — é o feeling/percepção sobre o que pode ter sido impactado |

| 3 | **Recomendações para QA** | Quando passa para In QA | Dev — recomendações do que acredita ser importante validar |



## Entradas Esperadas



O usuário deve fornecer (ou você deve extrair do contexto da conversa):



1\. **Task ID** — identificador da task no Backlog (ex: `MAI-123`, `BACK-456`)

2\. **O que foi feito** — descrição das alterações realizadas

3\. **Arquivos alterados** — lista de arquivos modificados (pode vir de git diff, lista manual, etc.)

4\. **Serviços afetados** — repositório(s) ou service(s) impactados (ex: `aprova/backend`, `aprova/frontend`, `api-gateway`)

5\. **Percepção de impactos** — o que o dev acredita que pode ter sido impactado (mesmo que seja um feeling)

6\. **Contexto de teste** — informações que ajudem a montar as recomendações para QA



Se alguma informação essencial estiver faltando, pergunte ao usuário antes de postar o comentário.

Se o usuário fornecer um diff ou lista de commits, extraia as informações automaticamente.



## Etapas de Execução



### 1. Coletar Informações



Extraia do contexto da conversa ou pergunte ao usuário:

- Qual a task do Backlog (ID)?

- O que foi implementado/corrigido?

- Quais arquivos foram alterados?

- Quais serviços/repositórios são afetados?

- O que o dev acha que pode ter sido impactado? (feeling, percepção)

- Há recomendações específicas de teste?



### 2. Buscar Contexto da Task (quando possível)



Use `backlog task view <ID> --plain` para obter:

- Título e descrição da task

- Critérios de aceite já existentes na descrição

- Status atual da task

- Contexto adicional que ajude a montar o comentário



Se a task já possuir critérios de aceite na descrição, incorpore-os na seção correspondente

e complemente com base nas alterações feitas.



### 3. Montar o Comentário



O comentário deve seguir **exatamente** este template Markdown:



```markdown

## 🚀 Resumo da Implementação



{Descrição clara e concisa do que foi feito, em 2-4 frases.

Inclua o contexto do problema resolvido e a abordagem adotada.}



### 📁 Arquivos Alterados



{Lista dos arquivos modificados, agrupados por módulo/pasta quando fizer sentido}



- `caminho/do/arquivo1.ts` — {breve descrição da mudança}

- `caminho/do/arquivo2.ts` — {breve descrição da mudança}



### 🔧 Serviços Afetados



- **{nome-do-serviço/repositório}** — {como é afetado}



---



## ✅ 1. Critérios de Aceite



{Critérios objetivos e verificáveis que definem se a implementação está correta.

Cada critério deve ser uma checkbox para o QA poder marcar no Backlog.}



- [ ] {Critério 1 — comportamento esperado claro e verificável}

- [ ] {Critério 2 — comportamento esperado claro e verificável}

- [ ] {Critério 3 — comportamento esperado claro e verificável}



## ⚠️ 2. Possíveis Impactos



{Aqui o dev registra sua percepção/feeling sobre o que acredita que pode ter sido

impactado pela mudança. O objetivo é alertar o QA para dar aquele TALENTO nos testes

dessas áreas. Seja honesto — mesmo um "acho que pode afetar X" já ajuda muito.}



- {Impacto 1 — descrição do que pode ser afetado e por quê}

- {Impacto 2 — descrição do que pode ser afetado e por quê}



## 🧪 3. Recomendações para QA



{Recomendações do dev sobre o que acredita ser importante validar.

Pode ser um resumão, nome da feature, serviço, ou um fluxo específico.

Funciona como um TODO de validação para o QA.}



### O que validar



- {Recomendação 1 — o que testar e por que é importante}

- {Recomendação 2 — o que testar e por que é importante}



### Pontos de Atenção / Edge Cases



- ⚠️ {Edge case ou cenário que merece atenção especial}

- ⚠️ {Edge case ou cenário que merece atenção especial}



### Proposta de Fluxo de Teste



1\. {Passo 1 — ação + resultado esperado}

2\. {Passo 2 — ação + resultado esperado}

3\. {Passo 3 — ação + resultado esperado}

```



### 4. Revisar com o Usuário



Antes de postar, **sempre** mostre o comentário formatado ao usuário e peça confirmação.

Diga algo como: "Aqui está o comentário que vou postar na task {ID}. Quer ajustar algo antes de eu publicar?"



### 5. Postar o Comentário



Após confirmação, execute `backlog task edit <ID> --comment "<markdown>" --plain`.

- `taskId`: o identificador da task

- `body`: o comentário Markdown completo



## Regras Importantes



1\. **Sempre peça confirmação** antes de postar o comentário na task.

2\. **Nunca invente informações** — se não souber quais arquivos foram alterados, pergunte.

3\. **Os 3 pilares são obrigatórios** — Critérios de Aceite, Possíveis Impactos e Recomendações para QA devem sempre estar presentes.

4\. **Critérios de aceite** devem ser checkboxes (`- [ ]`) com comportamentos objetivos e verificáveis.

5\. **Possíveis Impactos** é o feeling do dev — incentive o usuário a compartilhar mesmo que seja uma suspeita. Se o dev não souber, ajude a inferir com base nos arquivos e serviços alterados.

6\. **Recomendações para QA** devem ser práticas e acionáveis, não genéricas. Incluir edge cases reais.

7\. **Serviços afetados** devem ser específicos (nome do repo, nome do service, nome do módulo).

8\. Se o usuário fornecer informações parciais, complete o que puder e marque claramente com `{TODO: preencher}` o que precisa ser completado pelo dev.

9\. O comentário deve ser em **português brasileiro**, a menos que o usuário peça em outro idioma.

10\. Use emojis nos headers para facilitar a leitura rápida no Backlog.

11\. A numeração dos 3 pilares (1, 2, 3) deve ser mantida para padronização entre todas as tasks.



## Exemplo de Interação



**Usuário:** "Comenta na MAI-123 o que eu fiz. Alterei o endpoint de criação de processo pra validar CPF duplicado. Mudei o arquivo `processo.controller.ts` e `processo.service.ts` no backend. Serviço afetado é o `aprova-backend`."



**Claude:**

1\. Busca a task MAI-123 no Backlog para contexto e critérios de aceite existentes

2\. Monta o comentário com:

  - **Resumo:** validação de CPF duplicado no endpoint de criação

  - **Arquivos:** `processo.controller.ts`, `processo.service.ts`

  - **Serviço:** `aprova-backend`

  - **Critérios de Aceite:** ex: "Ao tentar criar processo com CPF já existente, retorna erro 409"

  - **Possíveis Impactos:** ex: "Pode afetar integrações que criam processos via API sem tratar erro 409", "Fluxo de criação de processo pelo cidadão pode ser afetado se CPF tiver formatação diferente"

  - **Recomendações para QA:** ex: "Validar com CPF formatado (xxx.xxx.xxx-xx) e sem formatação", "Testar criação via formulário E via API", edge cases como CPF com zeros à esquerda

3\. Apresenta o comentário ao usuário para revisão

4\. Após confirmação, posta via `backlog task edit <ID> --comment "<markdown>" --plain`
