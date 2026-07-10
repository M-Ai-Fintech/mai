# Padrão Singleton no Serviço de Banco de Dados (`DatabaseMemoryService`)
## Especificação Técnica de Persistência e Gerenciamento de Conexão

Este documento detalha o padrão de design adotado para o serviço de persistência relacional e de memória agêntica (`DatabaseMemoryService`), focado em garantir eficiência operacional sob concorrência e evitar vazamento de conexões no Deno.

---

## 1. O Problema das Múltiplas Instâncias de Conexão

Em sistemas agênticos assíncronos que rodam em paralelo (como os subagentes que atuam no VDR, KYB ou Closing), cada agente executa tarefas independentes de leitura e escrita. 
* Se cada agente instanciar uma nova classe do serviço de banco de dados (`new DatabaseMemoryService()`), o PostgreSQL rapidamente atingirá o limite máximo de conexões simultâneas (`max_connections`).
* Além de exaurir os recursos do servidor Postgres, múltiplas instâncias criam múltiplos pools de conexão concorrentes que geram lentidão, timeouts e vazamentos de memória e de descritores de rede no Deno.

---

## 2. A Solução: Padrão Singleton

Para resolver isso, a classe `DatabaseMemoryService` (`src/core/db/DatabaseMemoryService.ts`) foi remodelada utilizando o padrão de criação **Singleton**:

```typescript
export class DatabaseMemoryService {
  private static instance: DatabaseMemoryService | null = null;
  private client: Client | null = null;

  // Construtor privado impede instanciação externa direta via new
  private constructor() {
    // Inicializa parâmetros do pool/cliente de conexão
  }

  // Método público estático de controle de instância única
  public static getInstance(): DatabaseMemoryService {
    if (!DatabaseMemoryService.instance) {
      DatabaseMemoryService.instance = new DatabaseMemoryService();
    }
    return DatabaseMemoryService.instance;
  }
}
```

---

## 3. Aplicação nos Módulos e Agentes

Todos os pontos de entrada do sistema foram atualizados para consumir a instância única de banco:

1. **BrokerOrchestratorAgent (`src/agent/agents/broker-orchestrator/index.ts`):** Consome a instância única estática para carregar de forma transparente as preferências de contexto e preferências de usuário gravadas antes de despachar tarefas aos subagentes.
2. **VDR Mock (`src/agent/vdr_mock.ts`):** Utiliza o singleton para ler/escrever dados simulados de salas de VDR integrados com a persistência de domain knowledge.
3. **Servidor API Deno (`src/api/server.ts`):** Compartilha o mesmo pool e inicializa a conexão de forma proativa durante o bootstrap do servidor:
   ```typescript
   const repo = TransactionRepository.getRepoInstance();
   repo.connect();
   ```
4. **Repositório de Transações (`TransactionRepository`):** Herda e opera sobre a mesma instância compartilhada de banco de dados, garantindo que consultas em massa não gerem gargalos no Postgres.
