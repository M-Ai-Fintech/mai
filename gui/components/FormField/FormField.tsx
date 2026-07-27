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

export const FormField: React.FC<FormFieldProps> = (props) => {
  const ids = formFieldIds(props.id, useId());
  const child = formFieldChild(props.children, ids, props.hint, props.error);
  return (
    <div className={`w-full text-left space-y-1 ${props.className ?? ""}`}>
      {props.label && (
        <FormFieldLabel
          id={ids.id}
          label={props.label}
          required={props.required ?? false}
        />
      )}
      {child}
      {props.hint && !props.error && (
        <FormFieldHint hint={props.hint} id={ids.hintId} />
      )}
      {props.error && <FormFieldError error={props.error} id={ids.errorId} />}
    </div>
  );
};

function formFieldIds(providedId: string | undefined, generatedId: string) {
  const id = providedId || generatedId;
  return { errorId: `${id}-error`, hintId: `${id}-hint`, id };
}

function formFieldChild(
  children: React.ReactNode,
  ids: ReturnType<typeof formFieldIds>,
  hint: string | undefined,
  error: string | undefined,
) {
  if (!React.isValidElement<Record<string, unknown>>(children)) return children;
  return React.cloneElement(children, {
    id: ids.id,
    "aria-describedby": describedBy(ids, hint, error),
    "aria-invalid": !!error,
  });
}

function describedBy(
  ids: ReturnType<typeof formFieldIds>,
  hint: string | undefined,
  error: string | undefined,
) {
  return `${hint ? ids.hintId : ""} ${error ? ids.errorId : ""}`.trim() ||
    undefined;
}

function FormFieldLabel({
  id,
  label,
  required,
}: {
  id: string;
  label: string;
  required: boolean;
}) {
  return (
    <label
      htmlFor={id}
      className="block text-xs font-bold text-slate-gray uppercase tracking-wider"
    >
      {label} {required && <span className="text-signal-orange">*</span>}
    </label>
  );
}

function FormFieldHint({ hint, id }: { hint: string; id: string }) {
  return (
    <p id={id} className="text-xs text-slate-gray/80">
      {hint}
    </p>
  );
}

function FormFieldError({ error, id }: { error: string; id: string }) {
  return (
    <p id={id} className="text-xs font-semibold text-red-600">
      {error}
    </p>
  );
}
