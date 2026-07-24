import React from "react";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ hasError = false, className = "", disabled, ...props }, ref) => {
    const errorStyles = hasError
      ? "border-red-500 focus:ring-red-500"
      : "border-dust-taupe focus:ring-ink-black";

    return (
      <textarea
        ref={ref}
        disabled={disabled}
        className={`w-full bg-white border rounded-lg px-4 py-3 text-sm text-ink-black min-h-[100px] focus:outline-none focus:ring-2 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${errorStyles} ${className}`}
        {...props}
      />
    );
  },
);

Textarea.displayName = "Textarea";
