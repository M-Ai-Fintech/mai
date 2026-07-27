export type MessageListener<TPayload> = (payload: TPayload) => void;

export interface MessageBus {
  subscribe<TPayload>(
    topic: string,
    callback: MessageListener<TPayload>,
  ): void;
  publish<TPayload>(topic: string, payload: TPayload): void;
  clear(topic?: string): void;
}
