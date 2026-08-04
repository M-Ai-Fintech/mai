import { assertChecksum, type Checksum } from "./model.ts";

export type ByteSource =
  | Uint8Array
  | AsyncIterable<Uint8Array>
  | ReadableStream<Uint8Array>;

export interface CollectedBytes {
  readonly bytes: Uint8Array;
  readonly byteLength: number;
  readonly checksum: Checksum;
}

export async function collectAndChecksum(
  source: ByteSource,
): Promise<CollectedBytes> {
  const chunks = await readChunks(source);
  const bytes = joinChunks(chunks);
  return {
    bytes,
    byteLength: bytes.byteLength,
    checksum: await checksumBytes(bytes),
  };
}

export async function checksumBytes(bytes: Uint8Array): Promise<Checksum> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    bytes.slice().buffer as ArrayBuffer,
  );
  const value = Array.from(new Uint8Array(digest), toHex).join("");
  const checksum = { algorithm: "sha256" as const, value };
  assertChecksum(checksum);
  return checksum;
}

export function checksumsEqual(left: Checksum, right: Checksum): boolean {
  return left.algorithm === right.algorithm && left.value === right.value;
}

async function readChunks(source: ByteSource): Promise<Uint8Array[]> {
  if (source instanceof Uint8Array) return [Uint8Array.from(source)];
  if (isReadableStream(source)) return await readStream(source);
  const chunks: Uint8Array[] = [];
  for await (const chunk of source) chunks.push(Uint8Array.from(chunk));
  return chunks;
}

async function readStream(
  source: ReadableStream<Uint8Array>,
): Promise<Uint8Array[]> {
  const reader = source.getReader();
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) return chunks;
      chunks.push(Uint8Array.from(next.value));
    }
  } finally {
    reader.releaseLock();
  }
}

function joinChunks(chunks: readonly Uint8Array[]): Uint8Array {
  const size = chunks.reduce((total, chunk) => total + chunk.byteLength, 0);
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

function isReadableStream(
  source: ByteSource,
): source is ReadableStream<Uint8Array> {
  return typeof ReadableStream !== "undefined" &&
    source instanceof ReadableStream;
}

function toHex(value: number): string {
  return value.toString(16).padStart(2, "0");
}
