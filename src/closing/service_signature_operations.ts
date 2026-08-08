import {
  acceptSignatureEvidence,
  completeSignaturePackage,
  createSignatureEvidence,
  createSignaturePackage,
} from "./signatures.ts";
import { CLOSING_RESOURCE, closingResource } from "./authorization.ts";
import type { ClosingCommandResult } from "./repository.ts";
import type { ClosingCommandInput } from "./service.ts";
import {
  replaceSignatureEvidence,
  replaceSignaturePackage,
} from "./service_support.ts";
import { ClosingServiceRuntime } from "./service_runtime.ts";

export class ClosingSignatureOperations extends ClosingServiceRuntime {
  recordSignatureEvidence(
    input: ClosingCommandInput,
    evidenceInput: Parameters<typeof createSignatureEvidence>[0],
  ): Promise<ClosingCommandResult> {
    const evidence = createSignatureEvidence(evidenceInput);
    return this.mutate(
      input,
      "closing_record_signature_evidence",
      { evidence },
      (workspace) => ({
        signatures: [...workspace.signatures, evidence],
      }),
      false,
      true,
      closingResource(
        CLOSING_RESOURCE.signatureEvidence,
        evidence.signatureEvidenceId,
      ),
    );
  }

  acceptSignatureEvidence(
    input: ClosingCommandInput,
    evidenceId: string,
  ): Promise<ClosingCommandResult> {
    return this.mutate(
      input,
      "closing_accept_signature_evidence",
      { evidenceId },
      (workspace) => ({
        signatures: replaceSignatureEvidence(
          workspace,
          evidenceId,
          (evidence) =>
            acceptSignatureEvidence(
              evidence,
              input.actor.id,
              this.dependencies.clock.now(),
            ),
        ),
      }),
      false,
      true,
      closingResource(CLOSING_RESOURCE.signatureEvidence, evidenceId),
    );
  }

  createSignaturePackage(
    input: ClosingCommandInput,
    packageInput: Parameters<typeof createSignaturePackage>[0],
  ): Promise<ClosingCommandResult> {
    const signaturePackage = createSignaturePackage(packageInput);
    return this.mutate(
      input,
      "closing_create_signature_package",
      { signaturePackage },
      (workspace) => ({
        signaturePackages: [...workspace.signaturePackages, signaturePackage],
      }),
      true,
      true,
      closingResource(
        CLOSING_RESOURCE.signaturePackage,
        signaturePackage.signaturePackageId,
      ),
    );
  }

  completeSignaturePackage(
    input: ClosingCommandInput,
    packageId: string,
  ): Promise<ClosingCommandResult> {
    return this.mutate(
      input,
      "closing_complete_signature_package",
      { packageId },
      (workspace) => ({
        signaturePackages: replaceSignaturePackage(
          workspace,
          packageId,
          (signaturePackage) =>
            completeSignaturePackage(
              signaturePackage,
              workspace.signatures,
              this.dependencies.clock.now(),
            ),
        ),
      }),
      true,
      true,
      closingResource(CLOSING_RESOURCE.signaturePackage, packageId),
    );
  }
}
