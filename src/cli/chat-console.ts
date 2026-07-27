export class ChatConsole {
  private readonly decoder = new TextDecoder();
  private readonly encoder = new TextEncoder();
  private readonly buffer = new Uint8Array(1024);

  public write(message: string): void {
    Deno.stdout.writeSync(this.encoder.encode(message));
  }

  public readLine(): string | null {
    const bytesRead = Deno.stdin.readSync(this.buffer);
    if (bytesRead === null) return null;
    return this.decoder.decode(this.buffer.subarray(0, bytesRead)).trim();
  }

  public ask(question: string): string {
    this.write(question);
    return this.readLine() ?? "";
  }
}
