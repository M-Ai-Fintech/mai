import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "raised" | "dark" | "orange" | "portrait";
  padding?: "none" | "sm" | "md" | "lg";
  children: React.ReactNode;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = "default",
      padding = "md",
      children,
      className = "",
      ...props
    },
    ref,
  ) => {
    // Left-aligned content by default per user feedback & Dealroom.net benchmark
    let baseStyles =
      "text-left transition-all duration-150 relative overflow-hidden";

    // Padding scale
    const paddingStyles = {
      none: "p-0",
      sm: "p-4",
      md: "p-6",
      lg: "p-8",
    };

    // Radii and variant styles (Feedback applied: 8px small radius for general containers/cards, high contrast white)
    let variantStyles = "";

    switch (variant) {
      case "default":
        // High contrast white card (#FFFFFF) with 8px radius on Canvas Cream (#F3F0EE)
        variantStyles =
          "bg-white text-ink-black rounded-lg border border-ink-black/10 shadow-level-1 hover:shadow-level-2";
        break;
      case "raised":
        // Lifted cream surface for nested structured elements
        variantStyles =
          "bg-lifted-cream text-ink-black rounded-lg border border-dust-taupe/40 shadow-level-1";
        break;
      case "dark":
        // Ink Black dark surface (Footer or hero summary tiles)
        variantStyles =
          "bg-ink-black text-canvas-cream rounded-lg shadow-level-2";
        break;
      case "orange":
        // Signal Orange background — Icons & text inside MUST be white (#FFFFFF) per user feedback
        variantStyles =
          "bg-signal-orange text-white rounded-lg shadow-level-2 [&_svg]:text-white [&_svg]:fill-current";
        break;
      case "portrait":
        // Circular portrait exception (50% radius)
        variantStyles =
          "bg-white rounded-full border border-dust-taupe aspect-square flex items-center justify-center shadow-level-1";
        break;
    }

    return (
      <div
        ref={ref}
        className={`${baseStyles} ${
          paddingStyles[padding]
        } ${variantStyles} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  },
);

Card.displayName = "Card";
