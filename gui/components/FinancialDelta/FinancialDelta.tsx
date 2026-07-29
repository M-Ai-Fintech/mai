import type { HTMLAttributes } from "react";
import { classNames } from "../internal/classNames";
import styles from "./FinancialDelta.module.css";
export type FinancialDeltaDirection = "positive" | "negative" | "neutral" | "not-meaningful" | "unavailable";
export interface FinancialDeltaProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> { direction: FinancialDeltaDirection; children?: string; interpretation?: string; }
/** Presents direction separately from business interpretation. @example <FinancialDelta direction="positive" interpretation="Increase">+4.2%</FinancialDelta> */
export function FinancialDelta({ children, className, direction, interpretation, ...props }: FinancialDeltaProps) { const label = direction === "unavailable" ? "Unavailable" : direction === "not-meaningful" ? "Not meaningful" : children; return <span className={classNames(styles.delta, styles[direction], className)} {...props}><span>{label}</span>{interpretation && <span className={styles.interpretation}>{interpretation}</span>}</span>; }
