import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "consent" | "satellite" | "icon";
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      icon,
      children,
      className = "",
      disabled,
      ...props
    },
    ref
  ) => {
    // Base styles: left-aligned content by default, focus ring for accessibility (WCAG 2.1 AA)
    let baseStyles =
      "inline-flex items-center justify-center font-sans font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ink-black disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer";

    // Size variations
    const sizeStyles = {
      sm: "text-xs px-3 py-1.5 min-h-[44px]",
      md: "text-sm px-5 py-2 min-h-[44px]", // >=44px touch target (WCAG)
      lg: "text-base px-6 py-3 min-h-[48px]",
    };

    // Variant styles following Mastercard + Dealroom.net benchmark
    let variantStyles = "";

    switch (variant) {
      case "primary":
        // Ink Pill (20px radius) with warm cream text
        variantStyles =
          "bg-ink-black text-canvas-cream border border-ink-black rounded-[20px] hover:bg-charcoal active:scale-95";
        break;
      case "secondary":
        // Outlined Pill (20px radius) with crisp ink outline
        variantStyles =
          "bg-white text-ink-black border border-ink-black rounded-[20px] hover:bg-soft-bone active:scale-95";
        break;
      case "consent":
        // Signal Orange (24px radius) for compliance actions — white text/icon enforced
        variantStyles =
          "bg-signal-orange text-white border-none rounded-[24px] hover:brightness-110 active:scale-95 font-semibold";
        break;
      case "satellite":
        // Satellite CTA (Circular 50%) — docked micro-button
        baseStyles =
          "inline-flex items-center justify-center rounded-full bg-white text-ink-black border border-dust-taupe shadow-level-1 hover:shadow-level-2 transition-transform active:scale-90 min-w-[48px] min-h-[48px]";
        break;
      case "icon":
        baseStyles =
          "inline-flex items-center justify-center rounded-full bg-transparent hover:bg-lifted-cream text-ink-black min-w-[44px] min-h-[44px]";
        break;
    }

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variant !== "satellite" && variant !== "icon" ? sizeStyles[size] : ""} ${variantStyles} ${className}`}
        disabled={disabled}
        {...props}
      >
        {icon && <span className={children ? "mr-2 inline-flex" : "inline-flex"}>{icon}</span>}
        {children && <span>{children}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";
