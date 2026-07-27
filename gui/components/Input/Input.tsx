import React from "react";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: "default" | "pill" | "select";
  icon?: React.ReactNode;
  hasError?: boolean;
}

const INPUT_BASE_CLASS =
  "w-full text-sm text-ink-black transition-all duration-150 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed";

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (props, ref) => <InputElement inputProps={props} inputRef={ref} />,
);

Input.displayName = "Input";

function InputElement({
  inputProps,
  inputRef,
}: {
  inputProps: InputProps;
  inputRef: React.ForwardedRef<HTMLInputElement>;
}) {
  const view = inputView(inputProps);
  return (
    <div className="relative w-full text-left">
      {view.icon && <InputIcon icon={view.icon} />}
      <input
        ref={inputRef}
        className={view.className}
        disabled={view.disabled}
        {...view.props}
      />
    </div>
  );
}

function inputView({
  variant = "default",
  icon,
  hasError = false,
  className = "",
  disabled,
  ...props
}: InputProps) {
  return {
    className: inputClassName(variant, hasError, !!icon, className),
    disabled,
    icon,
    props,
  };
}

function inputClassName(
  variant: NonNullable<InputProps["variant"]>,
  hasError: boolean,
  hasIcon: boolean,
  className: string,
) {
  return `${INPUT_BASE_CLASS} ${inputVariantClass(variant, hasError)} ${
    hasIcon ? "pl-10" : ""
  } ${className}`;
}

function inputVariantClass(
  variant: NonNullable<InputProps["variant"]>,
  hasError: boolean,
) {
  const errorClass = hasError
    ? "border-red-500 focus:ring-red-500"
    : "border-dust-taupe focus:ring-ink-black";
  if (variant === "pill") {
    return `bg-canvas-cream border rounded-full px-5 py-2.5 min-h-[44px] ${errorClass}`;
  }
  return `bg-white border rounded-lg px-4 py-2.5 min-h-[44px] ${errorClass}`;
}

function InputIcon({ icon }: { icon: React.ReactNode }) {
  return (
    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-gray inline-flex">
      {icon}
    </span>
  );
}
