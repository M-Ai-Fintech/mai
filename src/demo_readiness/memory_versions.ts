import type { ExistingVersionLookup } from "../documents/upload.ts";
import type { DocumentVersion } from "../documents/version.ts";

export class MemoryDocumentVersions implements ExistingVersionLookup {
  private readonly versions: DocumentVersion[] = [];

  findExisting(input: Parameters<ExistingVersionLookup["findExisting"]>[0]) {
    return Promise.resolve(
      this.versions.find((version) =>
        version.source.sourceId === input.source.sourceId &&
        version.checksum.value === input.checksum.value
      ),
    );
  }

  append(version: DocumentVersion): Promise<void> {
    this.versions.push(version);
    return Promise.resolve();
  }

  all(): readonly DocumentVersion[] {
    return Object.freeze([...this.versions]);
  }
}
