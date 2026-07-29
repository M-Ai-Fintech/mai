import { forwardRef, type HTMLAttributes } from "react";
import { classNames } from "../internal/classNames";
import styles from "./Divider.module.css";

export interface DividerProps extends HTMLAttributes<HTMLHRElement> {
  orientation?: "horizontal" | "vertical";
  emphasis?: "decorative" | "strong";
}

/**
 * Separates related content with a decorative or strong semantic rule.
 *
 * @example <Divider emphasis="strong" />
 */
export const Divider = forwardRef<HTMLHRElement, DividerProps>(
  function Divider(
    {
      className,
      emphasis = "decorative",
      orientation = "horizontal",
      ...props
    },
    ref,
  ) {
    return (
      <hr
        ref={ref}
        aria-orientation={orientation}
        className={classNames(
          styles.divider,
          styles[orientation],
          styles[emphasis],
          className,
        )}
        {...props}
      />
    );
  },
);
