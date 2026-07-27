import React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "orange" | "dark" | "outline";
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const BADGE_BASE_CLASS =
  "inline-flex items-center text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider transition-all";

const BADGE_VARIANT_CLASS = {
  default: "bg-lifted-cream text-ink-black border border-dust-taupe/40",
  orange:
    "bg-signal-orange text-white border-none [&_svg]:text-white [&_svg]:fill-current",
  dark: "bg-ink-black text-canvas-cream border-none",
  outline: "bg-transparent text-ink-black border border-ink-black",
} as const;

export const Badge: React.FC<BadgeProps> = ({
  variant = "default",
  icon,
  children,
  className = "",
  ...props
}) => {
  return (
    <span
      className={`${BADGE_BASE_CLASS} ${
        BADGE_VARIANT_CLASS[variant]
      } ${className}`}
      {...props}
    >
      {icon && <BadgeIcon icon={icon} />}
      {children}
    </span>
  );
};

function BadgeIcon({ icon }: { icon: React.ReactNode }) {
  return <span className="mr-1.5 inline-flex">{icon}</span>;
}
