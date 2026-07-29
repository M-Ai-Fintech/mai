import { createElement, forwardRef, type HTMLAttributes } from "react";

import { classNames } from "../internal/classNames";

import styles from "./Surface.module.css";

export type SurfaceTone =
  | "canvas"
  | "lifted"
  | "analytical"
  | "inset"
  | "restricted"
  | "readOnly";

export interface SurfaceProps extends HTMLAttributes<HTMLElement> {
  as?: "article" | "div" | "section";
  tone?: SurfaceTone;
}

/**
 * Groups content on a semantic MAI surface without defining a product layout.
 *
 * @example <Surface tone="lifted">Review content</Surface>
 */
export const Surface = forwardRef<HTMLElement, SurfaceProps>(function Surface(
  { as: Element = "section", className, tone = "lifted", ...props },
  ref,
) {
  return createElement(Element, {
    ref,
    className: classNames(styles.surface, styles[tone], className),
    ...props,
  });
});
