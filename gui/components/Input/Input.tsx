import React from "react";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: "default" | "pill" | "select";
  icon?: React.ReactNode;
  hasError?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      variant = "default",
      icon,
      hasError = false,
      className = "",
      disabled,
      ...props
    },
    ref,
  ) => {
    let baseStyles =
      "w-full text-sm text-ink-black transition-all duration-150 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed";

    const errorStyles = hasError
      ? "border-red-500 focus:ring-red-500"
      : "border-dust-taupe focus:ring-ink-black";

    let variantStyles = "";

    switch (variant) {
      case "default":
        // 8px small radius for high density forms Dealroom style
        variantStyles =
          `bg-white border rounded-lg px-4 py-2.5 min-h-[44px] ${errorStyles}`;
        break;
      case "pill":
        // 999px pill radius for search bars
        variantStyles =
          `bg-canvas-cream border rounded-full px-5 py-2.5 min-h-[44px] ${errorStyles}`;
        break;
    }

    return (
      <div className="relative w-full text-left">
        {icon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-gray inline-flex">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          className={`${baseStyles} ${variantStyles} ${
            icon ? "pl-10" : ""
          } ${className}`}
          disabled={disabled}
          {...props}
        />
      </div>
    );
  },
);

Input.displayName = "Input";
