// src/core/pubsub/LocalPubSubBus.ts
export class LocalPubSubBus {
  private handlers: Map<string, Function[]> = new Map();

  subscribe(topic: string, handler: Function) {
    if (!this.handlers.has(topic)) {
      this.handlers.set(topic, []);
    }
    this.handlers.get(topic)!.push(handler);
  }

  publish(topic: string, data: any) {
    const topicHandlers = this.handlers.get(topic);
    if (topicHandlers) {
      topicHandlers.forEach(handler => handler(data));
    }
  }
}
