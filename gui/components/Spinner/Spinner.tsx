import React from "react";

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
  variant?: "orange" | "dark" | "cream";
}

const SPINNER_SIZE_CLASS = {
  sm: "w-4 h-4 border-2",
  md: "w-6 h-6 border-2",
  lg: "w-10 h-10 border-3",
} as const;

const SPINNER_VARIANT_CLASS = {
  orange: "border-signal-orange/20 border-t-signal-orange",
  dark: "border-ink-black/20 border-t-ink-black",
  cream: "border-canvas-cream/30 border-t-canvas-cream",
} as const;

export const Spinner: React.FC<SpinnerProps> = ({
  size = "md",
  variant = "orange",
  className = "",
  ...props
}) => {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`inline-block rounded-full animate-spin ${
        SPINNER_SIZE_CLASS[size]
      } ${SPINNER_VARIANT_CLASS[variant]} ${className}`}
      {...props}
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
};
