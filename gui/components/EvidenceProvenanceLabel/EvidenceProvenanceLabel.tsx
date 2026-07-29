import type { HTMLAttributes } from "react";
import { classNames } from "../internal/classNames";
import styles from "./EvidenceProvenanceLabel.module.css";
export type EvidenceProvenanceUse = "table" | "finding" | "financial-value" | "audit-summary";
export interface EvidenceProvenanceLabelProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> { use: EvidenceProvenanceUse; density?: "compact" | "standard"; children: string; }
/** Labels provenance without claiming independent verification. @example <EvidenceProvenanceLabel use="finding">Extracted source</EvidenceProvenanceLabel> */
export function EvidenceProvenanceLabel({ children, className, density = "standard", use: useCase, ...props }: EvidenceProvenanceLabelProps) { return <span className={classNames(styles.label, styles[density], styles[useCase], className)} {...props}>{children}</span>; }
