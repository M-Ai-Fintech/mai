// src/core/pubsub/MessageBus.ts

export interface MessageBus {
  subscribe(topic: string, callback: (data: any) => void): void;
  publish(topic: string, data: any): void;
  clear(topic?: string): void;
}
