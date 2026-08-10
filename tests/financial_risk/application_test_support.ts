import { FinancialRiskApplication } from "../../src/financial_risk/application.ts";
import type { FinancialRiskInferencePort } from "../../src/financial_risk/ports.ts";
import {
  InMemoryFinancialRiskRepository,
} from "../../src/financial_risk/repository.ts";
import {
  FakeFinancialRiskAuthorization,
  FakeFinancialRiskInference,
  RecordingFinancialRiskJobPort,
  RecordingReferenceVerifier,
  TEST_TIME,
} from "./support.ts";

export function applicationFor(
  authorization: FakeFinancialRiskAuthorization,
  references: RecordingReferenceVerifier,
  inference: FinancialRiskInferencePort = new FakeFinancialRiskInference(),
  repository = new InMemoryFinancialRiskRepository(),
  jobs?: RecordingFinancialRiskJobPort,
): FinancialRiskApplication {
  return new FinancialRiskApplication(
    authorization,
    references,
    inference,
    repository,
    { now: () => new Date(TEST_TIME) },
    jobs,
  );
}
