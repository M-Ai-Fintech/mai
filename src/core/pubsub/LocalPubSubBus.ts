// src/core/pubsub/LocalPubSubBus.ts
import { MessageBus } from './MessageBus.ts';

/**
 * Barramento local de mensageria assíncrona (PubSub local) para comunicação entre agentes.
 * Implementa o padrão Singleton para evitar conexões e listeners duplicados.
 * Suporta replay e at-least-once guarantee.
 */
export class LocalPubSubBus implements MessageBus {
  private static instance: LocalPubSubBus;
  private listeners: Map<string, Array<(data: any) => void>> = new Map();
  private history: Map<string, any[]> = new Map();

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

    // Replay para garantir at-least-once
    if (this.history.has(topic)) {
      const historyData = this.history.get(topic)!;
      historyData.forEach((data) => {
        try {
          callback(data);
        } catch (err) {
          console.error('Erro ao disparar callback de replay para o tópico ' + topic + ':', err);
        }
      });
    }
  }

  public publish(topic: string, data: any): void {
    if (!this.history.has(topic)) {
      this.history.set(topic, []);
    }
    this.history.get(topic)!.push(data);

    const list = this.listeners.get(topic);
    if (list) {
      list.forEach((cb) => {
        try {
          cb(data);
        } catch (err) {
          console.error('Erro ao disparar callback para o tópico ' + topic + ':', err);
        }
      });
    }
  }

  public clear(topic?: string): void {
    if (topic) {
      this.listeners.delete(topic);
      this.history.delete(topic);
    } else {
      this.listeners.clear();
      this.history.clear();
    }
  }
}
