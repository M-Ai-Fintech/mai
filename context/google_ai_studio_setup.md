# Configuração do Google AI Studio (Gemini)

Para que a suíte agêntica de M&A Low-Touch Middleware possa operar, é necessário configurar uma chave de API válida do **Google AI Studio**.

## Passo a Passo

1. **Acesse o Google AI Studio:**
   Navegue até [https://aistudio.google.com/app/api-keys](https://aistudio.google.com/app/api-keys). Você precisará de uma conta Google (idealmente a conta vinculada à infraestrutura na GCP ou workspace da empresa).

2. **Crie a Chave de API:**
   - Clique em "Create API key".
   - Selecione um projeto Google Cloud existente ou crie um novo.
   - Copie a chave recém-criada (uma string alfanumérica).

3. **Configuração do Ambiente Local (Deno/Node):**
   Crie um arquivo `.env` na raiz do projeto, baseando-se no `.env.example`, e adicione sua chave:
   
   ```env
   GEMINI_API_KEY="sua_chave_aqui"
   ```
   *Nota: O sistema também aceita a variável `GOOGLE_GENERATIVE_AI_API_KEY` para garantir máxima compatibilidade com a suite `@ai-sdk/google`.*

4. **Privacidade e Segurança:**
   A chave inserida em seu `.env` **nunca** será comitada, pois o arquivo encontra-se no `.gitignore`. Em produção, utilize Secrets Managers ou instâncias do Vertex AI que fornecem credenciais default.

5. **Dry-Run (Mock Mode):**
   Se por qualquer motivo o sistema inicializar sem estas chaves, o provedor de IA passará a operar em modo *Fallback / Dry-Run*. As requisições serão logadas e interceptadas para não quebrar a execução (útil para CI e testes offline).
