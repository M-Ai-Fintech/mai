import type { HTMLAttributes } from "react";
import { classNames } from "../internal/classNames";
import { InternalIcon, type InternalIconName } from "../internal/icons";
import styles from "./StatusIndicator.module.css";
export type StatusIndicatorRole =
  | "neutral"
  | "information"
  | "success"
  | "warning"
  | "critical"
  | "incomplete"
  | "restricted"
  | "stale"
  | "superseded";
export interface StatusIndicatorProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, "role"> {
  role: StatusIndicatorRole;
  size?: "compact" | "standard";
  children: string | readonly string[];
}
const iconByRole: Record<StatusIndicatorRole, InternalIconName> = {
  neutral: "minus",
  information: "information",
  success: "check",
  warning: "warning",
  critical: "alert",
  incomplete: "warning",
  restricted: "lock",
  stale: "warning",
  superseded: "minus",
};
/** Communicates a named status through accompanying text, icon, and semantic color. @example <StatusIndicator role="restricted">Restricted</StatusIndicator> */
export function StatusIndicator(
  { children, className, role, size = "standard", ...props }:
    StatusIndicatorProps,
) {
  return (
    <span
      className={classNames(
        styles.indicator,
        styles[role],
        styles[size],
        className,
      )}
      {...props}
    >
      <InternalIcon name={iconByRole[role]} className={styles.icon} />
      <span>{children}</span>
    </span>
  );
}
