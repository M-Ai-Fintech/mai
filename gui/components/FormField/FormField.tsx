import React, { useId } from "react";

export interface FormFieldProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
  id?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  hint,
  required = false,
  children,
  className = "",
  id: providedId,
}) => {
  const generatedId = useId();
  const id = providedId || generatedId;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  const childWithProps = React.isValidElement(children)
    ? React.cloneElement(children as React.ReactElement, {
        id,
        "aria-describedby": `${hint ? hintId : ""} ${error ? errorId : ""}`.trim() || undefined,
        "aria-invalid": !!error,
      })
    : children;

  return (
    <div className={`w-full text-left space-y-1 ${className}`}>
      {label && (
        <label htmlFor={id} className="block text-xs font-bold text-slate-gray uppercase tracking-wider">
          {label} {required && <span className="text-signal-orange">*</span>}
        </label>
      )}
      {childWithProps}
      {hint && !error && (
        <p id={hintId} className="text-xs text-slate-gray/80">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs font-semibold text-red-600">
          {error}
        </p>
      )}
    </div>
  );
};
