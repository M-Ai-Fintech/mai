// src/core/business_logic/ma_flow.ts

export type MADealState =
  | "INITIATED"
  | "NDA_SIGNED"
  | "DUE_DILIGENCE_ACTIVE"
  | "VALUATION_COMPLETE"
  | "TERM_SHEET_NEGOTIATING"
  | "TERM_SHEET_APPROVED"
  | "COMPLETED";

export interface DealHistoryEntry {
  from: MADealState;
  to: MADealState;
  timestamp: string;
  notes: string;
  author: string;
}

export interface MADeal {
  id: string;
  buyerName: string;
  sellerName: string;
  targetName: string;
  currentState: MADealState;
  valuation: number;
  vdrDirectory: string;
  history: DealHistoryEntry[];
  complianceVerified: boolean;
}

export class MADealLifecycle {
  /**
   * Initializes a new M&A deal.
   */
  public static createDeal(
    buyerName: string,
    sellerName: string,
    targetName: string,
    initialValuation = 0
  ): MADeal {
    const dealId = `deal_${Math.random().toString(36).substring(2, 9)}`;
    const initialEntry: DealHistoryEntry = {
      from: "INITIATED",
      to: "INITIATED",
      timestamp: new Date().toISOString(),
      notes: "Deal created in the middleware.",
      author: "system",
    };

    return {
      id: dealId,
      buyerName,
      sellerName,
      targetName,
      currentState: "INITIATED",
      valuation: initialValuation,
      vdrDirectory: `./vdr_rooms/${dealId}`,
      history: [initialEntry],
      complianceVerified: false,
    };
  }

  /**
   * Transitions the deal state while validating lifecycle rules.
   */
  public static transitionTo(
    deal: MADeal,
    nextState: MADealState,
    author: string,
    notes = ""
  ): MADeal {
    const currentState = deal.currentState;
    
    // Validate transitions
    const isValid = this.validateTransition(currentState, nextState);
    if (!isValid) {
      throw new Error(`Invalid M&A deal transition: Cannot transition from ${currentState} to ${nextState}`);
    }

    const entry: DealHistoryEntry = {
      from: currentState,
      to: nextState,
      timestamp: new Date().toISOString(),
      notes,
      author,
    };

    deal.currentState = nextState;
    deal.history.push(entry);

    if (nextState === "DUE_DILIGENCE_ACTIVE") {
      // Compliance check flag starts as true, to be toggled by results
      deal.complianceVerified = true;
    }

    return deal;
  }

  /**
   * Enforces sequence compliance (e.g. cannot sign term sheet without NDA).
   */
  private static validateTransition(from: MADealState, to: MADealState): boolean {
    if (from === to) return true;

    switch (from) {
      case "INITIATED":
        return to === "NDA_SIGNED";
      case "NDA_SIGNED":
        return to === "DUE_DILIGENCE_ACTIVE";
      case "DUE_DILIGENCE_ACTIVE":
        return to === "VALUATION_COMPLETE";
      case "VALUATION_COMPLETE":
        return to === "TERM_SHEET_NEGOTIATING";
      case "TERM_SHEET_NEGOTIATING":
        return to === "TERM_SHEET_APPROVED";
      case "TERM_SHEET_APPROVED":
        return to === "COMPLETED" || to === "TERM_SHEET_NEGOTIATING"; // Can renegotiate
      case "COMPLETED":
        return false; // Terminal state
      default:
        return false;
    }
  }
}
