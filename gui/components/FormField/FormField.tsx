import React from "react";

export interface FormFieldProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  hint,
  required = false,
  children,
  className = "",
}) => {
  return (
    <div className={`w-full text-left space-y-1 ${className}`}>
      {label && (
        <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider">
          {label} {required && <span className="text-signal-orange">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-xs text-slate-gray/80">{hint}</p>}
      {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
    </div>
  );
};
