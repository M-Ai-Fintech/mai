import React from "react";

export interface CheckboxProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, className = "", disabled, ...props }, ref) => {
    return (
      <label className="inline-flex items-center gap-3 cursor-pointer select-none min-h-[44px]">
        <input
          type="checkbox"
          ref={ref}
          disabled={disabled}
          className={`w-5 h-5 rounded border-dust-taupe text-signal-orange focus:ring-signal-orange focus:ring-2 accent-signal-orange cursor-pointer disabled:opacity-50 ${className}`}
          {...props}
        />
        {label && (
          <span className="text-sm font-medium text-ink-black">{label}</span>
        )}
      </label>
    );
  },
);

Checkbox.displayName = "Checkbox";
