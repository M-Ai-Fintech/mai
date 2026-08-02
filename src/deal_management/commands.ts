import type { AggregateVersion, IdempotencyKey } from "../platform/api/v1.ts";
import type {
  DealCommandContext,
  DealConfidentiality,
  DealPartyReference,
  DealPartySide,
  DealRoleName,
  Money,
} from "./contracts.ts";
import type {
  AuthorityConstraintId,
  DealId,
  DealPartyId,
  DealRoleId,
  MandateId,
} from "./ids.ts";

export interface CommandBase {
  readonly context: DealCommandContext;
  readonly idempotencyKey: IdempotencyKey;
}

export interface CreateDealCommand extends CommandBase {
  readonly type: "create_deal";
  readonly dealId?: DealId;
  readonly name: string;
  readonly dealType: string;
  readonly confidentiality: DealConfidentiality;
  readonly currency: string;
}

export interface ConfigureDealCommand extends CommandBase {
  readonly type: "configure_deal";
  readonly dealId: DealId;
  readonly expectedVersion: AggregateVersion | number;
  readonly name?: string;
  readonly dealType?: string;
  readonly confidentiality?: DealConfidentiality;
}

export interface AddDealPartyCommand extends CommandBase {
  readonly type: "add_deal_party";
  readonly dealId: DealId;
  readonly expectedVersion: AggregateVersion | number;
  readonly partyId?: DealPartyId;
  readonly reference: DealPartyReference;
  readonly side: DealPartySide;
  readonly label: string;
}

export interface AssignDealRoleCommand extends CommandBase {
  readonly type: "assign_deal_role";
  readonly dealId: DealId;
  readonly expectedVersion: AggregateVersion | number;
  readonly roleId?: DealRoleId;
  readonly partyId: DealPartyId;
  readonly name: DealRoleName;
  readonly authorityLevel: number;
}

export interface SetMandateCommand extends CommandBase {
  readonly type: "set_mandate";
  readonly dealId: DealId;
  readonly expectedVersion: AggregateVersion | number;
  readonly mandateId?: MandateId;
  readonly transactionValueCeiling: Money;
  readonly authorityCeiling: number;
}

export interface SetAuthorityConstraintCommand extends CommandBase {
  readonly type: "set_authority_constraint";
  readonly dealId: DealId;
  readonly expectedVersion: AggregateVersion | number;
  readonly constraintId?: AuthorityConstraintId;
  readonly partyId?: DealPartyId;
  readonly roleId?: DealRoleId;
  readonly action: string;
  readonly amountCeiling?: Money;
  readonly authorityLevel: number;
  readonly humanOnly: boolean;
}

export type DealCommand =
  | CreateDealCommand
  | ConfigureDealCommand
  | AddDealPartyCommand
  | AssignDealRoleCommand
  | SetMandateCommand
  | SetAuthorityConstraintCommand;

export type DealMutationCommand = Exclude<DealCommand, CreateDealCommand>;

export function commandTarget(
  command: DealCommand,
  generatedId?: DealId,
): string {
  return command.type === "create_deal"
    ? generatedId ?? command.dealId ?? "new"
    : command.dealId;
}

export function commandName(command: DealCommand): string {
  return command.type;
}

export function commandPayload(
  command: DealCommand,
): Readonly<Record<string, unknown>> {
  const payload = { ...command } as Record<string, unknown>;
  delete payload.context;
  delete payload.idempotencyKey;
  return payload;
}
