import { runChatSession } from "./chat-session.ts";

/**
 * Preserves the stable entry point for the interactive broker chat.
 *
 * @example await CLIChat.startSession("deal_alpha");
 */
export class CLIChat {
  public static startSession(dealId = "deal_default"): Promise<void> {
    return runChatSession(dealId);
  }
}
