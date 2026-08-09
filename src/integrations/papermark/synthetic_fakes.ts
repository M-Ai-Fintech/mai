import {
  type RuntimeSecret,
  type SecretReference,
  type SecretResolver,
} from "../contracts.ts";
import type {
  PapermarkSyntheticFetchCall,
  PapermarkSyntheticSecretCall,
  PapermarkSyntheticSecretScript,
} from "./authorization.ts";
import { type PapermarkFetch, type PapermarkTimer } from "./transport.ts";

/** @internal Closed-bundle secret fake; not a public provider dependency. */
export class SecretResolverFake implements SecretResolver {
  readonly calls: PapermarkSyntheticSecretCall[] = [];
  private readonly pending: Array<(secret: RuntimeSecret) => void> = [];

  constructor(
    private readonly script: Required<PapermarkSyntheticSecretScript>,
  ) {}

  resolve(
    reference: SecretReference,
    signal?: AbortSignal,
  ): Promise<RuntimeSecret> {
    this.calls.push(
      Object.freeze({ reference: Object.freeze({ ...reference }), signal }),
    );
    if (this.script.mode === "stalled") return new Promise(() => undefined);
    if (this.script.mode === "delayed") {
      return new Promise((resolve) => this.pending.push(resolve));
    }
    return Promise.resolve(this.script.value as RuntimeSecret);
  }

  release(): void {
    const pending = this.pending.splice(0);
    for (const resolve of pending) resolve(this.script.value as RuntimeSecret);
  }
}

/** @internal Closed-bundle fetch fake; it never delegates to global fetch. */
export class FetchFake {
  readonly calls: PapermarkSyntheticFetchCall[] = [];
  private readonly queue: Array<Response | Error>;

  constructor(queue: readonly (Response | Error)[]) {
    this.queue = [...queue];
  }

  readonly fetch: PapermarkFetch = (url, init) => {
    this.calls.push(Object.freeze({ url, init }));
    const scripted = this.queue.shift();
    if (scripted === undefined) {
      return Promise.reject(
        new Error("Synthetic response queue is exhausted."),
      );
    }
    if (scripted instanceof Error || scripted instanceof DOMException) {
      return Promise.reject(scripted);
    }
    return Promise.resolve(scripted);
  };
}

/** @internal Closed-bundle sleep fake that records retry delays. */
export class SleepFake {
  readonly delays: number[] = [];

  readonly sleep = (delayMs: number): Promise<void> => {
    this.delays.push(delayMs);
    return Promise.resolve();
  };
}

/** @internal Closed-bundle clock fake returning one defensive fixed time. */
export class ClockFake {
  calls = 0;
  private readonly fixedTime: number;

  constructor(value: Date) {
    this.fixedTime = value.getTime();
  }

  readonly now = (): Date => {
    this.calls += 1;
    return new Date(this.fixedTime);
  };
}

/** @internal Closed-bundle timer fake with explicit manual firing. */
export class TimerFake implements PapermarkTimer {
  readonly delays: number[] = [];
  private nextHandle = 1;
  private readonly callbacks = new Map<number, () => void>();

  setTimeout(callback: () => void, delayMs: number): number {
    this.delays.push(delayMs);
    const handle = this.nextHandle++;
    this.callbacks.set(handle, callback);
    return handle;
  }

  clearTimeout(handle: unknown): void {
    this.callbacks.delete(handle as number);
  }

  fire(): void {
    const next = this.callbacks.values().next();
    if (!next.done) next.value();
  }
}
