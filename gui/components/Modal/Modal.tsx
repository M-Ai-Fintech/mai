import React, { useEffect } from "react";
import { Button } from "../Button/Button";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = "md",
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeStyles = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
  };

  return (
    <div
      aria-modal="true"
      role="dialog"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-black/40 backdrop-blur-sm animate-fade-in text-left"
      onClick={onClose}
    >
      <div
        className={`w-full bg-white border border-ink-black/10 rounded-lg shadow-level-3 overflow-hidden transform transition-all text-left ${sizeStyles[size]}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start p-6 border-b border-dust-taupe/40 bg-canvas-cream/30">
          <div>
            <h3 className="text-xl font-medium text-ink-black tracking-tight">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-slate-gray mt-1">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar modal"
            className="text-slate-gray hover:text-ink-black text-xl leading-none cursor-pointer p-1 rounded hover:bg-dust-taupe/20 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[70vh] text-ink-black text-sm">
          {children}
        </div>

        {/* Footer */}
        {footer ? (
          <div className="p-4 px-6 border-t border-dust-taupe/40 bg-canvas-cream/20 flex justify-end gap-3">
            {footer}
          </div>
        ) : (
          <div className="p-4 px-6 border-t border-dust-taupe/40 bg-canvas-cream/20 flex justify-end gap-3">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Fechar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
