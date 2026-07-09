# Arquitetura M&A Low-Touch Middleware

## Fluxo End-to-End via Pub/Sub

O sistema utiliza um barramento Pub/Sub local (`LocalPubSubBus`) para orquestrar os agentes. Cada etapa do fluxo de M&A publica um evento que ativa o próximo agente:
1. **Sourcing** (`FLOW_START`) -> Produz `SOURCING_DONE`
2. **Due Diligence** (`SOURCING_DONE`) -> Produz `DD_DONE`
3. **Negotiation** (`DD_DONE`) -> Produz `NEGOTIATION_DONE`
4. **Closing** (`NEGOTIATION_DONE`) -> Produz `FLOW_END`

### Checkpoints

Todos os agentes registram pontos de controle (`flow_checkpoints`) no banco de dados através da classe `AgentFlowWrapper`, garantindo tolerância a falhas e recuperação de estado (replay) para entrega *at-least-once*.
