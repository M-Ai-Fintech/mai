---
id: doc-1
title: Arquitetura e Escopo dos Mocks
type: other
created_date: '2026-07-09 14:59'
updated_date: '2026-07-09 15:00'
---
# Arquitetura e Escopo dos Mocks (MVP)

Este documento descreve a arquitetura e a extensão do desmocking inicial aplicado no projeto M&Ai. Como a aplicação não possui inicialmente um Virtual Data Room (VDR) externo ou uma infraestrutura em nuvem integrada, foram desenhadas soluções locais para as fontes de dados primárias do sistema.

## 1. File System VDR (Data Room)

Para o componente VDR, a estratégia escolhida para desmockar a aplicação é baseada no sistema de arquivos local (`./vdr_rooms/{dealId}`).

- **ClientSiloedRAG:** Modificado para escanear de forma dinâmica o diretório relativo a um Deal (`./vdr_rooms/{dealId}`) ao ser inicializado. Ele lê arquivos `.txt` e `.md` físicos e vetoriza esse conteúdo. Caso a pasta não exista ou esteja vazia, há um graceful fallback automático para o mock pré-estabelecido.
- **VDRService:** Realiza de forma similar o scan na mesma pasta de testes local para identificar os arquivos (seus nomes, extensões e inferir o tipo do documento), permitindo testar fluxos de RAG e Due Diligence com novos documentos adicionados manualmente no repositório.

## 2. Banco de Dados KYB e Registry (DatabaseMemoryService)

A verificação do registro corporativo da empresa no SERPRO/Receita foi integrada a uma tabela local simulando o PostgreSQL (através do serviço `DatabaseMemoryService`).

- **KYB (Know Your Business):** O comando da CLI `checkRegistry` foi refatorado para utilizar a tool `verifyRegistryTool`, nativa do `actions.ts`.
- **DatabaseMemoryService:** Essa integração substituiu dados estáticos *inline* da CLI. Agora, o mock verifica dinamicamente as tabelas reais do banco (tabela `business`). Se houver dados correspondentes ao `cnpj` buscado, ele mescla a simulação de KYC sobre as informações reais do Postgres. Se não achar, ainda fornece o fallback estruturado.

## Conclusão
O modelo atual permite um ambiente de testes completo, substituindo mocks acoplados por simulações através do Postgres local (`memory_service`) e do sistema de arquivos do servidor, facilitando a transição para a infraestrutura real com Pub/Sub e repositórios em nuvem.
