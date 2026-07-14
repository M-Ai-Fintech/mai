import React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "orange" | "dark" | "outline";
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = "default",
  icon,
  children,
  className = "",
  ...props
}) => {
  const baseStyles =
    "inline-flex items-center text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider transition-all";

  let variantStyles = "";

  switch (variant) {
    case "default":
      variantStyles = "bg-lifted-cream text-ink-black border border-dust-taupe/40";
      break;
    case "orange":
      // Signal Orange badge — icon & text must be pure white (#FFFFFF) per user feedback
      variantStyles = "bg-signal-orange text-white border-none [&_svg]:text-white [&_svg]:fill-current";
      break;
    case "dark":
      variantStyles = "bg-ink-black text-canvas-cream border-none";
      break;
    case "outline":
      variantStyles = "bg-transparent text-ink-black border border-ink-black";
      break;
  }

  return (
    <span className={`${baseStyles} ${variantStyles} ${className}`} {...props}>
      {icon && <span className="mr-1.5 inline-flex">{icon}</span>}
      {children}
    </span>
  );
};
