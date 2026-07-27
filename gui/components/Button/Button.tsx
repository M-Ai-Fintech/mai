import React from "react";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "consent" | "satellite" | "icon";
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

const BUTTON_BASE_CLASS =
  "inline-flex items-center justify-center font-sans font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ink-black disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer";

const BUTTON_SIZE_CLASS = {
  sm: "text-xs px-3 py-1.5 min-h-[44px]",
  md: "text-sm px-5 py-2 min-h-[44px]",
  lg: "text-base px-6 py-3 min-h-[48px]",
} as const;

const BUTTON_VARIANT_CLASS = {
  primary:
    "bg-ink-black text-canvas-cream border border-ink-black rounded-[20px] hover:bg-charcoal active:scale-95",
  secondary:
    "bg-white text-ink-black border border-ink-black rounded-[20px] hover:bg-soft-bone active:scale-95",
  consent:
    "bg-signal-orange text-white border-none rounded-[24px] hover:brightness-110 active:scale-95 font-semibold",
  satellite:
    "inline-flex items-center justify-center rounded-full bg-white text-ink-black border border-dust-taupe shadow-level-1 hover:shadow-level-2 transition-transform active:scale-90 min-w-[48px] min-h-[48px]",
  icon:
    "inline-flex items-center justify-center rounded-full bg-transparent hover:bg-lifted-cream text-ink-black min-w-[44px] min-h-[44px]",
} as const;

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (props, ref) => <ButtonElement buttonProps={props} buttonRef={ref} />,
);

Button.displayName = "Button";

function ButtonElement({
  buttonProps,
  buttonRef,
}: {
  buttonProps: ButtonProps;
  buttonRef: React.ForwardedRef<HTMLButtonElement>;
}) {
  const view = buttonView(buttonProps);
  return (
    <button
      ref={buttonRef}
      className={view.className}
      disabled={view.disabled}
      {...view.props}
    >
      <ButtonContent icon={view.icon}>{view.children}</ButtonContent>
    </button>
  );
}

function buttonView({
  variant = "primary",
  size = "md",
  icon,
  children,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  return {
    children,
    className: buttonClassName(variant, size, className),
    disabled,
    icon,
    props,
  };
}

function buttonClassName(
  variant: NonNullable<ButtonProps["variant"]>,
  size: NonNullable<ButtonProps["size"]>,
  className: string,
) {
  const base = variant === "satellite" || variant === "icon"
    ? ""
    : BUTTON_BASE_CLASS;
  const sizeClass = variant === "satellite" || variant === "icon"
    ? ""
    : BUTTON_SIZE_CLASS[size];
  return `${base} ${sizeClass} ${BUTTON_VARIANT_CLASS[variant]} ${className}`;
}

function ButtonContent({
  children,
  icon,
}: {
  children?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <>
      {icon && (
        <span className={children ? "mr-2 inline-flex" : "inline-flex"}>
          {icon}
        </span>
      )}
      {children && <span>{children}</span>}
    </>
  );
}
