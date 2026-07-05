# Core Architecture

## M&A Low-Touch Middleware

### 1. Inicialização (Bootstrap)
O ponto de entrada da aplicação é o arquivo `src/main.ts`. Durante o início da execução, a classe `AppBootstrapper` (em `src/core/boot.ts`) é responsável por orquestrar a carga sequencial e segura das dependências globais do sistema.

#### Dependências Injetadas:
- **LocalPubSubBus**: Barramento de eventos local assíncrono para permitir a comunicação desacoplada entre os agentes, a interface e o banco de dados.
- **DatabaseMemoryService**: Serviço responsável pela conexão e persistência de dados no PostgreSQL (armazenamento de User Preferences e Domain Knowledge). 
- **AIProvider**: Provedor de inteligência artificial (Gemini) responsável pela carga segura das chaves de API.

### 2. Tratamento de Exceções e Resiliência
O `AppBootstrapper` utiliza tratamento de exceções (try/catch) global para sua inicialização. Em particular, a conexão do banco de dados usa um modelo de "fallback":
Se o banco de dados (`DatabaseMemoryService.connect()`) falhar (por exemplo, container inativo ou erro de rede), a aplicação registrará um log amigável indicando a inatividade, porém **continuará a execução** (fallback mode).

### 3. Integração MCP e REST
A arquitetura prepara o terreno para interfaces REST e integração Model Context Protocol (MCP) que será construída no futuro. Através da centralização no `AppBootstrapper`, quaisquer rotas REST ou ferramentas MCP podem acessar `AppBootstrapper.db` ou `AppBootstrapper.pubsub` sem recriar conexões.

### 4. Pilares de Injeção de Dependência
As classes que necessitam de persistência de longo prazo no PostgreSQL não instanciam um novo `PostgresQueryAdapter`, mas sim utilizam a instância singleton definida durante a inicialização (ou instâncias gerenciadas em um contêiner IoC futuramente).
