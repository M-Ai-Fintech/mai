---
name: config-bug-closure
description: >
  Gate de fechamento para bugs Aprova cuja causa raiz é config Mongo (template
  em `types`, `process.config`, formulário/formly, despacho, tramite). Aplica
  classificação de profundidade, checklist de 5 camadas (instância, template,
  outras instâncias, runtime, origem), roda auditoria proativa via query Mongo,
  e cria sub-tasks Backlog pros gaps que ficam deferidos. Devolve bloco markdown
  estruturado pronto pra colar no comentário Backlog de fechamento + gate
  PASS/FAIL pro caller. Trigger: "/config-bug-closure", "fecha bug de config",
  "checklist de config", "audita anti-pattern em config", "antes de fechar
  bug de template/types/formly/expressionProperties"; OU invocado por
  `/solve-mai` na etapa 4 quando o caminho envolve config Mongo, e gate
  obrigatório na etapa 13. Não fecha a task — só prepara o material. Caller
  decide o estado final. Default caveman.
---

# Config Bug Closure

Gate de fechamento para bugs cuja causa raiz é config Mongo. Não trata fix de
runtime — pra isso o caller (geralmente `/solve-mai`) já fez o trabalho. Esta
skill garante que o fix **vai além da instância reportada** quando o pattern é
sistêmico.

Razão de existir: MAI-1185 foi fechado patcheando 2 processos. O template não
foi tocado, o engine não foi defendido, a origem não foi bloqueada → MAI-1431
reincidiu 3 semanas depois com 4 processos novos buggados. Sem checklist
explícito + auditoria proativa, fix raso é o default natural.

Default output style: **caveman**.

## Quando invocar

- Caller `/solve-mai` decidiu na etapa 4 que o caminho envolve:
  - **Script manual** em `backend/scripts/` patcheando dados em Mongo
  - **Config no Admin** (form-builder, etc.)
  - **Código tocando engine que interpreta config** (formly, despacho,
    tramite, expressionProperties, schema do Formly)
- Antes de marcar uma task Done/In QA cuja causa raiz é config Mongo, sem
  ter passado pelo `/solve-mai`
- Suspeita de bug recorrente (mesma classe de erro já fechada em MAI
  anterior — sinal forte de fechamento prévio raso)

## Inputs

1. **Task ID** (`MAI-XXXX`). Required.
2. **Anti-pattern em 1 frase** + `file:line` do engine/código onde se manifesta.
   Exemplo: `expressionProperties auto-referencial 'model|||X: ... model.X'`
   em `aprova-frontend/.../process-formly2.component.ts:660`.
3. **Query Mongo de auditoria** (opcional). Se não passada, a skill tenta
   gerar a partir do anti-pattern e pede confirmação ao usuário antes de
   executar.
4. **`MONGODB_URL`** acessível (read-only). Se ausente, marcar auditoria
   como pendente no checklist.

## Flow

### 1. Classificar profundidade

Pedir ao caller (ou inferir) qual linha da tabela aplica:

| Tipo do bug | Onde fixar |
|---|---|
| **Dado errado específico** (typo, valor obsoleto, ID inválido) | Só instância |
| **Pattern reproduzível** em outras configs | Engine + instância + template + auditoria + origem |
| **Uso intencional do framework** | Documentar e parar |

**Output da etapa:** classificação + 1 frase de justificativa.

- "uso intencional" → pula pra etapa 4 com nota pra documentação. Gate PASS.
- "dado específico" → pula pra etapa 4 com checklist mínimo (1 item:
  instância patcheada). Gate PASS quando confirmado.
- "pattern reproduzível" → continuar pra etapa 2. Sem auditoria → gate FAIL.

### 2. Auditoria proativa

Rodar a query Mongo (read-only). Não rodar sem confirmação se a query for
custosa (full collection scan) — perguntar antes.

Capturar:
- Total de matches
- Breakdown por collection / cidade / template (`groupBy` quando relevante)
- Listar até 10 `_id`s mais relevantes (ou todos se ≤ 10)

Se erro de conexão / sem `MONGODB_URL` → registrar como `[ ]` no checklist
com nota "auditoria pendente — MONGODB_URL inacessível", **gate FAIL** até
ser executada.

Pra cada match encontrado, decidir junto com o caller:
- **Coberto pelo PR atual** (incluído no escopo do script/fix)
- **Sub-task criada** (deferido, com ID Backlog)
- **Aceito-com-justificativa** (1 linha explicando por que fica como está)

### 3. Checklist das 5 camadas

Pra "pattern reproduzível", obrigatório preencher cada linha:

```
[ ] Instância reportada patcheada (PR # ou script path)
[ ] Template/molde de onde a instância nasceu patcheado
    (PR # ou: N/A porque <razão>)
[ ] Outras instâncias auditadas via query
    (N total → X cobertas no PR / Y sub-tasks / Z aceitas com justificativa)
[ ] Runtime/engine trata input quebrado defensivamente
    (PR # ou: task MAI-NNNN criada)
[ ] Bloqueio na origem (form-builder, API, validation, ou processo)
    (PR # ou: task MAI-MMMM criada)
```

Cada item:
- `[x] feito-no-PR <breve descrição + ref>` — quando coberto
- `[~] N/A — <razão de 1 linha>` — quando não aplica
- `[ ] sub-task MAI-NNNN` — quando deferido (criar via
  `backlog task create --parent <ID> "<título>" --description "<contexto>" --plain`
  original; body herda anti-pattern + file:line + contexto)

Itens com `[ ]` sem sub-task criada nem N/A justificado → gate FAIL.

### 4. Output estruturado

Retorna pro caller (ou imprime ao usuário se invocado manualmente):

```markdown
## 🔍 Config Bug Closure — Gate

**Classificação:** <Pattern reproduzível | Dado específico | Uso intencional>
**Anti-pattern:** <1 frase + file:line>

### Auditoria proativa
- Query: `<query reduzida ou referência>`
- Matches: N total (collection X: M, collection Y: K)
- Top instâncias: <até 10 _ids>

### Checklist das 5 camadas
- [x] Instância reportada: <PR # ou script>
- [x] Template: <PR # ou script>
- [~] Outras instâncias: N coberto / M sub-task / K aceito-com-justificativa
- [x] Runtime/engine: <PR #>
- [ ] Origem (form-builder/API): sub-task MAI-NNNN criada

### Sub-tasks criadas (follow-up tracking)
- MAI-NNNN: <título sugerido>
- MAI-MMMM: <título sugerido>

**Gate:** **PASS** | **FAIL** (motivo: <itens em aberto>)
```

## Output (caller-side)

Quando invocado de dentro de `/solve-mai`:
- Bloco markdown vai pro QA comment (etapa 12) sob seção
  "🔍 Config Bug Closure"
- IDs de sub-tasks criadas viram bullets na seção "Follow-ups" do mesmo
  comment
- Se gate = FAIL, `/solve-mai` para na etapa 13 sem mover pra In QA até
  resolver os itens pendentes

Quando invocado manualmente:
- Imprime o bloco completo
- Pergunta se o usuário quer postar como comentário Backlog via
  `backlog task edit <ID> --comment "<markdown>" --plain`

## Regras

1. **Não fecha a task.** Só monta o bloco e cria sub-tasks. Caller decide
   o estado final.
2. **Auditoria é obrigatória** quando classificação é "pattern reproduzível".
   Sem ela → gate FAIL automático.
3. **Sub-tasks herdam contexto:** anti-pattern + file:line + link pra task
   parent com `--parent <ID>`.
4. **Não inventa cidade, processo ou data** nas sub-tasks — só usa o que
   veio do input ou da auditoria. Faltou contexto → pede.
5. **Caveman default** — bloco gerado é compacto, sem prosa redundante.
6. **Gate é binário** — PASS ou FAIL. Sem "PASS com observações".

## Exemplos de invocação

```
/config-bug-closure MAI-1431
```

```
Antes de fechar a MAI-1431, roda /config-bug-closure
```

Invocação a partir de `/solve-mai` (sugestão de payload):
```
Use `$config-bug-closure` with `MAI-1431 — anti-pattern: expressionProperties auto-ref 'model|||X: ... model.X' em aprova-frontend/.../process-formly2.component.ts:660; query auditoria fornecida`.
```

## Anti-exemplos

- **Bug de runtime puro** (race condition, memory leak, query lenta) — não
  aplica. Use a closure normal do `/solve-mai`.
- **Bug de UI/CSS** (layout, ícone, tipografia) — não envolve config Mongo.
  Skip.
- **Task já está In QA / Done** — gate é pré-fechamento, não pós.
- **Fix puramente local** (1 arquivo, 1 cidade, 1 processo, sem template
  envolvido) — overkill. Caller pode pular.

---

## Patterns de query de auditoria (referência)

Templates comuns. Ajustar regex/filter pro caso específico.

### Auto-referência em expressionProperties (MAI-1185, MAI-1431)

```js
// Templates com qualquer "model|||X": "... model.X" no else-branch
db.types.find({
  $expr: {
    $regexMatch: {
      input: { $convert: { input: "$config", to: "string", onError: "" } },
      regex: /"model\|\|\|[a-zA-Z_]+":\s*"[^"]*:\s*model\.[a-zA-Z_]+"/
    }
  }
}, { _id: 1, name: 1, cityId: 1 });

// Equivalente em `process` para instâncias já criadas
db.process.find({
  $expr: { $regexMatch: { /* mesma regex */ } }
}, { _id: 1, processNumber: 1, city_id: 1 });
```

### Adicionar novos patterns aqui conforme aparecerem

Cada classe nova de bug sistêmico vira sub-seção com query padrão.
Critério de inclusão: pelo menos 1 incidente reportado + risco de
reincidência cross-cidade.
