import React from "react";

export interface ToastProps {
  title: string;
  message?: string;
  variant?: "info" | "success" | "warning" | "error";
  onClose?: () => void;
}

const TOAST_VARIANT_CLASS = {
  info: "bg-ink-black text-white border-dust-taupe/40",
  success: "bg-ink-black text-white border-emerald-500",
  warning: "bg-signal-orange text-white border-signal-orange",
  error: "bg-red-700 text-white border-red-800",
} as const;

export const Toast: React.FC<ToastProps> = ({
  title,
  message,
  variant = "info",
  onClose,
}) => {
  return (
    <div
      role="alert"
      className={`inline-flex items-start gap-4 p-4 rounded-lg border shadow-level-3 max-w-sm text-left animate-slide-in ${
        TOAST_VARIANT_CLASS[variant]
      }`}
    >
      <ToastBody message={message} title={title} />
      {onClose && <ToastCloseButton onClose={onClose} />}
    </div>
  );
};

function ToastBody({ message, title }: Pick<ToastProps, "message" | "title">) {
  return (
    <div className="flex-1">
      <h4 className="text-xs font-bold uppercase tracking-wider">{title}</h4>
      {message && <p className="text-xs opacity-90 mt-1">{message}</p>}
    </div>
  );
}

function ToastCloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      onClick={onClose}
      className="text-white/80 hover:text-white text-base leading-none cursor-pointer p-0.5"
      aria-label="Close notification"
    >
      x
    </button>
  );
}
