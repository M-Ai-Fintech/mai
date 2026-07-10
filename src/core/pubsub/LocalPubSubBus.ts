// src/core/pubsub/LocalPubSubBus.ts
import { MessageBus } from './MessageBus.ts';

/**
 * Barramento local de mensageria assíncrona (PubSub local) para comunicação entre agentes.
 * Implementa o padrão Singleton para evitar conexões e listeners duplicados.
 * Suporta replay e at-least-once guarantee.
 */
export class LocalPubSubBus implements MessageBus {
  private static instance: LocalPubSubBus;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
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
      this.listeners.set(topic, new Set());
    }
    this.listeners.get(topic)!.add(callback);

    // Replay para garantir at-least-once
    if (this.history.has(topic)) {
      const historyData = this.history.get(topic)!;
      historyData.forEach((data) => {
        setTimeout(() => {
          try {
            callback(data);
          } catch (err) {
            console.error('Erro ao disparar callback de replay para o tópico ' + topic + ':', err);
          }
        }, 0);
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
        setTimeout(() => {
          try {
            cb(data);
          } catch (err) {
            console.error('Erro ao disparar callback para o tópico ' + topic + ':', err);
          }
        }, 0);
      });
    }
  }

  public clear(topic?: string): void {
    if (topic) {
      const set = this.listeners.get(topic);
      if (set) set.clear();
      this.listeners.delete(topic);
      
      const arr = this.history.get(topic);
      if (arr) arr.length = 0;
      this.history.delete(topic);
    } else {
      this.listeners.forEach(set => set.clear());
      this.listeners.clear();
      
      this.history.forEach(arr => arr.length = 0);
      this.history.clear();
    }
  }
}
