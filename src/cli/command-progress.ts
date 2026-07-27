export interface CommandProgress {
  start(): void;
  stop(): void;
}

class TerminalCommandProgress implements CommandProgress {
  private intervalId: ReturnType<typeof setInterval> | undefined;
  private frameIndex = 0;

  public constructor(private readonly message: string) {}

  public start(): void {
    if (!Deno.stdout.isTerminal()) {
      console.log(this.message);
      return;
    }
    this.renderFrame();
    this.intervalId = setInterval(() => this.renderFrame(), 80);
  }

  public stop(): void {
    if (this.intervalId === undefined) return;
    clearInterval(this.intervalId);
    this.intervalId = undefined;
    Deno.stdout.writeSync(new TextEncoder().encode("\r\x1b[2K"));
  }

  private renderFrame(): void {
    const frames = ["-", "\\", "|", "/"];
    const frame = frames[this.frameIndex++ % frames.length];
    Deno.stdout.writeSync(
      new TextEncoder().encode(`\r${frame} ${this.message}`),
    );
  }
}

export function createCommandProgress(message: string): CommandProgress {
  return new TerminalCommandProgress(message);
}
