// src/core/pubsub/LocalPubSubBus.ts

/**
 * Barramento local de mensageria assíncrona (PubSub local) para comunicação entre agentes.
 * Implementa o padrão Singleton para evitar conexões e listeners duplicados.
 */
export class LocalPubSubBus {
  private static instance: LocalPubSubBus;
  private listeners: Map<string, Array<(data: any) => void>> = new Map();

  private constructor() {}

  public static getInstance(): LocalPubSubBus {
    if (!LocalPubSubBus.instance) {
      LocalPubSubBus.instance = new LocalPubSubBus();
    }
    return LocalPubSubBus.instance;
  }

  public subscribe(topic: string, callback: (data: any) => void): void {
    if (!this.listeners.has(topic)) {
      this.listeners.set(topic, []);
    }
    this.listeners.get(topic)!.push(callback);
  }

  public publish(topic: string, data: any): void {
    const list = this.listeners.get(topic);
    if (list) {
      list.forEach((cb) => {
        try {
          cb(data);
        } catch (err) {
          console.error(`Erro ao disparar callback para o tópico ${topic}:`, err);
        }
      });
    }
  }

  public clear(topic?: string): void {
    if (topic) {
      this.listeners.delete(topic);
    } else {
      this.listeners.clear();
    }
  }
}
