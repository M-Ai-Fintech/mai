import React from "react";

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
  variant?: "orange" | "dark" | "cream";
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = "md",
  variant = "orange",
  className = "",
  ...props
}) => {
  const sizeStyles = {
    sm: "w-4 h-4 border-2",
    md: "w-6 h-6 border-2",
    lg: "w-10 h-10 border-3",
  };

  const variantStyles = {
    orange: "border-signal-orange/20 border-t-signal-orange",
    dark: "border-ink-black/20 border-t-ink-black",
    cream: "border-canvas-cream/30 border-t-canvas-cream",
  };

  return (
    <div
      role="status"
      aria-label="Loading"
      className={`inline-block rounded-full animate-spin ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
};
