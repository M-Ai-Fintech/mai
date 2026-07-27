import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "raised" | "dark" | "orange" | "portrait";
  padding?: "none" | "sm" | "md" | "lg";
  children: React.ReactNode;
}

const CARD_BASE_CLASS =
  "text-left transition-all duration-150 relative overflow-hidden";

const CARD_PADDING_CLASS = {
  none: "p-0",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
} as const;

const CARD_VARIANT_CLASS = {
  default:
    "bg-white text-ink-black rounded-lg border border-ink-black/10 shadow-level-1 hover:shadow-level-2",
  raised:
    "bg-lifted-cream text-ink-black rounded-lg border border-dust-taupe/40 shadow-level-1",
  dark: "bg-ink-black text-canvas-cream rounded-lg shadow-level-2",
  orange:
    "bg-signal-orange text-white rounded-lg shadow-level-2 [&_svg]:text-white [&_svg]:fill-current",
  portrait:
    "bg-white rounded-full border border-dust-taupe aspect-square flex items-center justify-center shadow-level-1",
} as const;

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (props, ref) => <CardElement cardProps={props} cardRef={ref} />,
);

Card.displayName = "Card";

function CardElement({
  cardProps,
  cardRef,
}: {
  cardProps: CardProps;
  cardRef: React.ForwardedRef<HTMLDivElement>;
}) {
  const view = cardView(cardProps);
  return (
    <div ref={cardRef} className={view.className} {...view.props}>
      {view.children}
    </div>
  );
}

function cardView({
  variant = "default",
  padding = "md",
  children,
  className = "",
  ...props
}: CardProps) {
  return {
    children,
    className: `${CARD_BASE_CLASS} ${CARD_PADDING_CLASS[padding]} ${
      CARD_VARIANT_CLASS[variant]
    } ${className}`,
    props,
  };
}
