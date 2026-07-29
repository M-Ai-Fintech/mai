export type TokenResolvedType = "COLOR" | "FLOAT";
export type SupportedMode = "Light / Standard";
export type BreakpointName = "mobile" | "tablet" | "desktop";

export interface TokenAlias {
  readonly id: string;
  readonly name: string | null;
}

export interface TokenModeValue {
  readonly source:
    | { readonly kind: "raw"; readonly value: unknown }
    | { readonly kind: "alias"; readonly target: TokenAlias };
  readonly resolvedValue: unknown;
  readonly aliasChain: readonly TokenAlias[];
}

export interface FigmaTokenVariable {
  readonly id: string;
  readonly name: string;
  readonly collectionName: string;
  readonly resolvedType: TokenResolvedType;
  readonly valuesByMode: Readonly<Record<string, TokenModeValue>>;
}

export interface FigmaTokenSource {
  readonly schemaVersion: string;
  readonly designSystemRelease: string;
  readonly figmaFileKey: string;
  readonly approvedVisualModes: readonly SupportedMode[];
  readonly variables: readonly FigmaTokenVariable[];
}
