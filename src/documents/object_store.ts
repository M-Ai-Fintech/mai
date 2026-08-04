import type { ObjectReference } from "./model.ts";
import { createObjectReference, type DocumentScope } from "./model.ts";
import type { ObjectReferenceId } from "./ids.ts";
import {
  type ByteSource,
  checksumsEqual,
  collectAndChecksum,
} from "./checksum.ts";

export interface UploadNegotiationRequest {
  readonly scope: DocumentScope;
  readonly objectReferenceId: ObjectReferenceId;
  readonly objectKey: string;
  readonly storageVersion: string;
  readonly mediaType: string;
  readonly requestedAt: Date;
}

export interface UploadSession {
  readonly uploadId: string;
  readonly scope: DocumentScope;
  readonly objectReferenceId: ObjectReferenceId;
  readonly objectKey: string;
  readonly storageVersion: string;
  readonly mediaType: string;
}

export interface StoreObjectRequest {
  readonly session: UploadSession;
  readonly content: ByteSource;
  readonly checksum: { readonly algorithm: "sha256"; readonly value: string };
  readonly createdAt: Date;
}

export interface ObjectStore {
  negotiateUpload(request: UploadNegotiationRequest): Promise<UploadSession>;
  storeObject(request: StoreObjectRequest): Promise<ObjectReference>;
  retainObject(reference: ObjectReference): Promise<void>;
  readObject(reference: ObjectReference): Promise<ByteSource>;
}

export class FakeObjectStore implements ObjectStore {
  private readonly values = new Map<
    string,
    { readonly reference: ObjectReference; readonly bytes: Uint8Array }
  >();
  private retainedCount = 0;

  get retainedObjectCount(): number {
    return this.retainedCount;
  }

  negotiateUpload(request: UploadNegotiationRequest): Promise<UploadSession> {
    assertText(request.objectKey, "Object upload key", 1024);
    assertText(request.storageVersion, "Object upload storage version", 255);
    assertDate(request.requestedAt, "Object upload requested timestamp");
    return Promise.resolve({
      uploadId: `upload:${request.objectReferenceId}`,
      scope: Object.freeze({ ...request.scope }),
      objectReferenceId: request.objectReferenceId,
      objectKey: request.objectKey,
      storageVersion: request.storageVersion,
      mediaType: request.mediaType,
    });
  }

  async storeObject(request: StoreObjectRequest): Promise<ObjectReference> {
    const collected = await collectAndChecksum(request.content);
    if (!checksumsEqual(collected.checksum, request.checksum)) {
      throw new Error(
        `Object upload checksum "${collected.checksum.value}" did not match expected "${request.checksum.value}".`,
      );
    }
    const reference = createObjectReference({
      objectReferenceId: request.session.objectReferenceId,
      scope: request.session.scope,
      objectKey: request.session.objectKey,
      storageVersion: request.session.storageVersion,
      checksum: collected.checksum,
      byteLength: collected.byteLength,
      mediaType: request.session.mediaType,
      createdAt: request.createdAt,
    });
    const alreadyStored = this.values.has(request.session.uploadId);
    this.values.set(request.session.uploadId, {
      reference,
      bytes: collected.bytes,
    });
    if (!alreadyStored) this.retainedCount += 1;
    return reference;
  }

  retainObject(reference: ObjectReference): Promise<void> {
    if (!this.valuesHasReference(reference)) {
      throw new Error(
        `Object reference "${reference.objectReferenceId}" was not retained; expected an existing stored object.`,
      );
    }
    this.retainedCount += 1;
    return Promise.resolve();
  }

  readObject(reference: ObjectReference): Promise<ByteSource> {
    const value = [...this.values.values()].find(({ reference: stored }) =>
      stored.objectReferenceId === reference.objectReferenceId
    );
    if (value === undefined) {
      return Promise.reject(
        new Error(
          `Object reference "${reference.objectReferenceId}" was not found; expected a retained object.`,
        ),
      );
    }
    return Promise.resolve(Uint8Array.from(value.bytes));
  }

  private valuesHasReference(reference: ObjectReference): boolean {
    return [...this.values.values()].some(({ reference: stored }) =>
      stored.objectReferenceId === reference.objectReferenceId
    );
  }
}

function assertText(value: string, label: string, maximum: number): void {
  if (typeof value === "string" && value.trim() && value.length <= maximum) {
    return;
  }
  throw new Error(
    `${label} "${value}" is invalid; expected 1-${maximum} characters.`,
  );
}

function assertDate(value: Date, label: string): void {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return;
  throw new Error(
    `${label} "${String(value)}" is invalid; expected a valid Date.`,
  );
}
