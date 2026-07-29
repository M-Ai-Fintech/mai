"use client";
import { forwardRef, type ReactNode, type SelectHTMLAttributes } from "react";
import { classNames } from "../internal/classNames";
import { InternalIcon } from "../internal/icons";
import styles from "./Select.module.css";
export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "readOnly"> { placeholder?: string; children: ReactNode; readOnly?: boolean; }
/** Selects one value with native select semantics; no speculative combobox behavior. @example <Select aria-label="Stage"><option>Review</option></Select> */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ children, className, placeholder, readOnly = false, ...props }, ref) { const invalid = props["aria-invalid"] === true; return <span className={classNames(styles.shell, invalid && styles.invalid, props.disabled && styles.disabled, readOnly && styles.readOnly, className)}><select ref={ref} aria-readonly={readOnly || undefined} className={styles.select} {...props}>{placeholder ? <option value="" disabled>{placeholder}</option> : null}{children}</select><InternalIcon name="chevron-down" className={styles.icon} /></span>; });
