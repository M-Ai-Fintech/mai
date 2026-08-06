export type WorkManagementRoute =
  | {
    readonly kind: "workstreams";
    readonly id?: string;
    readonly command?: "transition";
  }
  | {
    readonly kind: "tasks";
    readonly id?: string;
    readonly command?: "transition";
  }
  | {
    readonly kind: "approval_requests";
    readonly id?: string;
    readonly command?: ApprovalCommand;
  };

export type ApprovalCommand =
  | "open"
  | "approve"
  | "reject"
  | "withdraw"
  | "invalidate"
  | "expire";
