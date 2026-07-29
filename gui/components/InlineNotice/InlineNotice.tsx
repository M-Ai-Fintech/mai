"use client";
import { useState, type HTMLAttributes, type ReactNode } from "react";
import { classNames } from "../internal/classNames";
import { InternalIcon, type InternalIconName } from "../internal/icons";
import styles from "./InlineNotice.module.css";
export type InlineNoticeRole = "information" | "success" | "warning" | "critical" | "incomplete" | "restricted";
export interface InlineNoticeProps extends HTMLAttributes<HTMLElement> { role: InlineNoticeRole; title: string; children?: ReactNode; dismissLabel?: string; onDismiss?: () => void; }
const noticeIcons: Record<InlineNoticeRole, InternalIconName> = { information: "information", success: "check", warning: "warning", critical: "alert", incomplete: "warning", restricted: "lock" };
/** Communicates contextual feedback without asserting passive information. @example <InlineNotice role="warning" title="Review required" /> */
export function InlineNotice({ children, className, dismissLabel, onDismiss, role, title, ...props }: InlineNoticeProps) { const [visible, setVisible] = useState(true); if (!visible) return null; const dismiss = () => { setVisible(false); onDismiss?.(); }; return <section className={classNames(styles.notice, styles[role], className)} aria-live={role === "critical" ? "assertive" : undefined} {...props}><InternalIcon name={noticeIcons[role]} className={styles.icon} /><div><strong>{title}</strong>{children && <div>{children}</div>}</div>{dismissLabel && <button type="button" className={styles.dismiss} onClick={dismiss} aria-label={dismissLabel}>×</button>}</section>; }
