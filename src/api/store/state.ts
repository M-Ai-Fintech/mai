import { DashboardLayout, Notification, TeamMember } from "../contracts.ts";
import {
  DealState,
  Entity,
  StoredChatMessage,
  StoredChatThread,
  StoredEngineRun,
  Dossier,
} from "./types.ts";

export class MvpStoreState {
  private sequence = 100;
  private clockTick = 0;

  readonly entities = new Map<string, Entity>();
  readonly teamMembers = new Map<string, TeamMember>();
  readonly deals = new Map<string, DealState>();
  readonly threads = new Map<string, StoredChatThread>();
  readonly messages = new Map<string, StoredChatMessage[]>();
  readonly engineRuns = new Map<string, StoredEngineRun[]>();
  readonly notifications = new Map<string, Notification>();
  readonly layouts = new Map<string, DashboardLayout>();
  readonly dossiers = new Map<string, Dossier>();

  now(): string {
    const timestamp = new Date(Date.UTC(2026, 6, 19, 12, 0, this.clockTick));
    this.clockTick += 1;
    return timestamp.toISOString();
  }

  id(): string {
    const tail = (this.sequence++).toString(16).padStart(12, "0");
    return `00000000-0000-4000-8000-${tail}`;
  }
}
