// src/agent/ai_provider.ts

/**
 * Utilitário de configuração e inicialização do provedor Gemini.
 * Valida as chaves de ambiente em ordem de prioridade.
 */
export class AIProvider {
  /**
   * Busca ativamente pela chave de API do Gemini/Google AI Studio.
   * Se nenhuma chave for encontrada, emite um aviso no console e 
   * retorna uma flag informando que está operando em fallback/dry-run.
   */
  public static getApiKey(): { key: string | null; isFallback: boolean } {
    const keysToTry = [
      "GEMINI_API_KEY",
      "GOOGLE_GENERATIVE_AI_API_KEY",
      "GOOGLE_API_KEY",
    ];

    for (const envVar of keysToTry) {
      const key = Deno.env.get(envVar);
      if (key && key.trim() !== "" && key.trim() !== "mock-key-for-dry-run") {
        return { key: key.trim(), isFallback: false };
      }
    }

    if (Deno.args[0] !== "completions") {
      // Nenhuma chave encontrada: emitir mensagem de aviso clara e amigável.
      console.warn("\n[AVISO] Nenhuma chave de API encontrada para o Google AI Studio/Gemini.");
      console.warn("Verifique se as variáveis GEMINI_API_KEY ou GOOGLE_GENERATIVE_AI_API_KEY estão definidas no seu ambiente ou no arquivo .env.");
      console.warn("O sistema operará em modo DRY-RUN/FALLBACK (mock) e nenhuma requisição real à API será efetuada.\n");
      console.warn("Para configurar sua chave, veja a documentação em: /context/google_ai_studio_setup.md ou /backlog/docs/google_ai_studio_setup.md\n");
    }

    return { key: null, isFallback: true };
  }
}
