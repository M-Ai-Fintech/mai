import React, { useEffect } from "react";
import { Button } from "../Button/Button";
import { Icon } from "../Icon/Icon";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

const MODAL_SIZE_CLASS = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
} as const;

export const Modal: React.FC<ModalProps> = (props) => {
  useModalCloseEffects(props.isOpen, props.onClose);
  if (!props.isOpen) return null;
  return (
    <ModalOverlay onClose={props.onClose} title={props.title}>
      <ModalPanel size={props.size ?? "md"}>
        <ModalHeader {...props} />
        <ModalBody>{props.children}</ModalBody>
        <ModalFooter footer={props.footer} onClose={props.onClose} />
      </ModalPanel>
    </ModalOverlay>
  );
};

function useModalCloseEffects(isOpen: boolean, onClose: () => void): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    if (isOpen) bindOpenModal(handleKeyDown);
    return () => unbindOpenModal(handleKeyDown);
  }, [isOpen, onClose]);
}

function bindOpenModal(handleKeyDown: (event: KeyboardEvent) => void): void {
  document.body.style.overflow = "hidden";
  window.addEventListener("keydown", handleKeyDown);
}

function unbindOpenModal(handleKeyDown: (event: KeyboardEvent) => void): void {
  document.body.style.overflow = "unset";
  window.removeEventListener("keydown", handleKeyDown);
}

interface ModalOverlayProps {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
}

function ModalOverlay({ children, onClose, title }: ModalOverlayProps) {
  return (
    <div
      aria-modal="true"
      role="dialog"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-black/40 backdrop-blur-sm animate-fade-in text-left"
      onClick={onClose}
    >
      {children}
    </div>
  );
}

function ModalPanel({
  children,
  size,
}: {
  children: React.ReactNode;
  size: NonNullable<ModalProps["size"]>;
}) {
  return (
    <div
      className={`w-full bg-white border border-ink-black/10 rounded-lg shadow-level-3 overflow-hidden transform transition-all text-left ${
        MODAL_SIZE_CLASS[size]
      }`}
      onClick={(event) => event.stopPropagation()}
    >
      {children}
    </div>
  );
}

function ModalHeader({
  onClose,
  subtitle,
  title,
}: Pick<ModalProps, "onClose" | "subtitle" | "title">) {
  return (
    <div className="flex justify-between items-start p-6 border-b border-dust-taupe/40 bg-canvas-cream/30">
      <ModalTitle subtitle={subtitle} title={title} />
      <ModalCloseButton onClose={onClose} />
    </div>
  );
}

function ModalTitle(
  { subtitle, title }: Pick<ModalProps, "subtitle" | "title">,
) {
  return (
    <div>
      <h3 className="text-xl font-medium text-ink-black tracking-tight">
        {title}
      </h3>
      {subtitle && <p className="text-xs text-slate-gray mt-1">{subtitle}</p>}
    </div>
  );
}

function ModalCloseButton({ onClose }: Pick<ModalProps, "onClose">) {
  return (
    <button
      onClick={onClose}
      aria-label="Close modal"
      className="grid h-11 w-11 place-items-center rounded-full text-slate-gray hover:bg-dust-taupe/20 hover:text-ink-black transition-colors"
    >
      <Icon name="close" size="md" />
    </button>
  );
}

function ModalBody({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-6 overflow-y-auto max-h-[70vh] text-ink-black text-sm">
      {children}
    </div>
  );
}

function ModalFooter({
  footer,
  onClose,
}: Pick<ModalProps, "footer" | "onClose">) {
  return (
    <div className="p-4 px-6 border-t border-dust-taupe/40 bg-canvas-cream/20 flex justify-end gap-3">
      {footer || (
        <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
      )}
    </div>
  );
}
