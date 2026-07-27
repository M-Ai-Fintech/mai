import { MessageBus, MessageListener } from "./MessageBus.ts";

/**
 * Local asynchronous message bus for communication between agents.
 * Uses the Singleton pattern to avoid duplicate connections and listeners.
 * Supports replay and at-least-once delivery.
 */
export class LocalPubSubBus implements MessageBus {
  private static instance: LocalPubSubBus;
  private listeners = new Map<string, Set<MessageListener<unknown>>>();
  private history = new Map<string, unknown[]>();

  private constructor() {}

  public static getInstance(): LocalPubSubBus {
    if (!LocalPubSubBus.instance) {
      LocalPubSubBus.instance = new LocalPubSubBus();
    }
    return LocalPubSubBus.instance;
  }

  public subscribe<TPayload>(
    topic: string,
    callback: MessageListener<TPayload>,
  ): void {
    const listener = callback as MessageListener<unknown>;
    if (!this.listeners.has(topic)) {
      this.listeners.set(topic, new Set());
    }
    this.listeners.get(topic)?.add(listener);

    // Replay to guarantee at-least-once delivery.
    const history = this.history.get(topic) ?? [];
    history.forEach((payload) =>
      this.scheduleDelivery(topic, listener, payload)
    );
  }

  public publish<TPayload>(topic: string, payload: TPayload): void {
    if (!this.history.has(topic)) {
      this.history.set(topic, []);
    }
    this.history.get(topic)?.push(payload);

    const listeners = this.listeners.get(topic) ?? [];
    listeners.forEach((listener) =>
      this.scheduleDelivery(topic, listener, payload)
    );
  }

  public clear(topic?: string): void {
    if (topic) {
      const set = this.listeners.get(topic);
      set?.clear();
      this.listeners.delete(topic);

      const history = this.history.get(topic);
      if (history) history.length = 0;
      this.history.delete(topic);
      return;
    }

    this.listeners.forEach((listeners) => listeners.clear());
    this.listeners.clear();
    this.history.forEach((history) => history.length = 0);
    this.history.clear();
  }

  private scheduleDelivery(
    topic: string,
    listener: MessageListener<unknown>,
    payload: unknown,
  ): void {
    setTimeout(() => {
      try {
        listener(payload);
      } catch (error) {
        console.error(
          `Error invoking callback for topic "${topic}":`,
          error,
        );
      }
    }, 0);
  }
}
