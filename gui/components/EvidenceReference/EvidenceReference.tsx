import type { HTMLAttributes } from "react";
import { classNames } from "../internal/classNames";
import styles from "./EvidenceReference.module.css";
type EvidenceMetadata = { source: string; location: string; documentVersion: string; freshness: string; action?: { href: string; label: string } };
export type AvailableEvidenceReferenceProps = { availability: "current" | "incomplete" | "superseded"; metadata: EvidenceMetadata };
export type RestrictedEvidenceReferenceProps = { availability: "restricted"; restrictionLabel: string };
export type UnavailableEvidenceReferenceProps = { availability: "unavailable"; unavailableLabel?: string };
export type EvidenceReferenceProps = (AvailableEvidenceReferenceProps | RestrictedEvidenceReferenceProps | UnavailableEvidenceReferenceProps) & Omit<HTMLAttributes<HTMLElement>, "children">;
/** Shows evidence metadata only when permission permits it. @example <EvidenceReference availability="restricted" restrictionLabel="Access required" /> */
export function EvidenceReference(props: EvidenceReferenceProps) { const { availability, className, ...attributes } = props; if (availability === "restricted") return <span className={classNames(styles.reference, styles.restricted, className)} {...attributes}>{props.restrictionLabel}</span>; if (availability === "unavailable") return <span className={classNames(styles.reference, styles.unavailable, className)} {...attributes}>{props.unavailableLabel ?? "Evidence unavailable"}</span>; const { metadata } = props; return <span className={classNames(styles.reference, styles[availability], className)} {...attributes}><span>{metadata.source}</span><span>{metadata.location}</span><span>{metadata.documentVersion}</span><span>{metadata.freshness}</span>{metadata.action && <a href={metadata.action.href}>{metadata.action.label}</a>}</span>; }
