# M&Ai Web GUI — MVP_6

Interface oficial do M&Ai em Next.js 16, React 19 e Tailwind CSS v4. O produto
usa o sistema Mastercard Editorial do projeto Stitch `1310231555884111730` e
reutiliza a biblioteca local de componentes, sem criar uma linguagem visual por
rota.

## Rotas implementadas

| Rota | Função |
| --- | --- |
| `/` | Pipeline em Board, com filtros, criação e estados de loading/empty/error |
| `/deals` | Tabela paginada do mesmo pipeline |
| `/deals/[id]` | Detalhe, edição, archive e transição de fase do deal |
| `/entities` | CRUD reutilizável por role: buyer, seller, target e institution |
| `/entities/[id]` | Detalhe, edição versionada e archive da entidade |
| `/clients` | Redirect de compatibilidade para `/entities` |
| `/deals/[id]/chat` | Workspace agêntico com histórico, SSE, reconexão, citações e engines |
| `/dashboard/custom` | Layout de widgets com add, reorder, resize, remove, reset e save |

As rotas legadas `/deals/[id]/engines`, `/generative-ui` e `/settings` ainda
existem no App Router, mas não fazem parte das quatro famílias verificadas no
gate visual do MVP_6.

## Design e Stitch

Fontes de verdade do protótipo:

- [Contrato de componentes](docs/stitch-component-version-contract.md)
- [Prompt mestre único](docs/stitch-master-prototype-prompt.md)
- [Mapa de rotas, estados e contratos](docs/prototype-state-map.md)
- [Matriz de capacidade do backend](docs/backend-capability-matrix.md)

O prompt referencia exatamente 23 showcases aprovados e quatro famílias de
tela. A geração Stitch permanece parcial: oito telas representativas foram
geradas, com alturas entre 2048 e 2144px, em vez de todas as variações exatas de
2560×1440. A GUI local não depende dessas telas parciais em runtime.

## Integração com a API

`lib/api-client.ts` contém os contratos tipados e valida as respostas com Zod.
O rewrite `beforeFiles` de `next.config.ts` encaminha `/api/*` para:

```env
MAI_API_BASE_URL=http://127.0.0.1:8000
```

O valor acima é o padrão e pode ser omitido no desenvolvimento local. Não use
`NEXT_PUBLIC_CORE_API_URL`: o proxy é resolvido no servidor Next.js.

O adaptador MVP_6 da API é mock-backed e mantém dados em memória. Reiniciar o
processo Deno restaura os dados iniciais. Autenticação e autorização não fazem
parte deste milestone. Sem `GEMINI_API_KEY`, a camada agêntica opera em modo
DRY-RUN/FALLBACK.

## Executar

Em um terminal, na raiz do repositório:

```bash
deno task api:start
```

Em outro terminal:

```bash
cd gui
npm install
npm run dev
```

Acesse `http://localhost:3000`.

## Verificação

O gate canônico do repositório é executado a partir da raiz:

```bash
deno task verify
```

Ele inclui os testes unitários da GUI, o build de produção do Next.js, a
validação e o build do Storybook, e os testes de interação. Para executar um
check isolado da GUI:

```bash
cd gui
npm run test:unit
npm run validate:storybook-docs
npm run test-storybook -- --run
npm run build
```

Testes de contrato da API:

```bash
deno test --allow-env --allow-read --allow-write --allow-net \
  tests/api/contracts.spec.ts \
  tests/api/mvp_store.spec.ts \
  tests/api/mvp_routes.spec.ts
```

O Storybook continua disponível em `http://localhost:6006` com
`npm run storybook`. Antes de publicar alterações em componentes, execute
`npm run validate:storybook-docs`; o check garante que cada página MDX referencia
explicitamente seu arquivo `.stories.tsx`, requisito do indexador do Storybook 10.
Os testes de interação usam o addon Vitest: `npm run test-storybook -- --run`.
O lint completo também varre rotas e artefatos legados; para o gate MVP_6, use o
escopo dos arquivos alterados até que a dívida técnica legada seja tratada
separadamente.
