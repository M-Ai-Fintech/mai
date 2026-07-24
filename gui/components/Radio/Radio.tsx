import React from "react";

export interface RadioProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  ({ label, className = "", disabled, ...props }, ref) => {
    return (
      <label className="inline-flex items-center gap-3 cursor-pointer select-none min-h-[44px]">
        <input
          type="radio"
          ref={ref}
          disabled={disabled}
          className={`w-5 h-5 border-dust-taupe text-signal-orange focus:ring-signal-orange focus:ring-2 accent-signal-orange cursor-pointer disabled:opacity-50 ${className}`}
          {...props}
        />
        {label && (
          <span className="text-sm font-medium text-ink-black">{label}</span>
        )}
      </label>
    );
  },
);

Radio.displayName = "Radio";
