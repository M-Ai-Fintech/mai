import React from "react";
import { Button } from "../Button/Button";
import { Icon } from "../Icon/Icon";

export interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  icon,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-12 bg-canvas-cream/50 border border-dashed border-dust-taupe rounded-lg my-4">
      <div className="w-12 h-12 rounded-full bg-lifted-cream border border-dust-taupe/60 flex items-center justify-center text-slate-gray mb-4 text-xl">
        {icon || <Icon name="fileText" size="lg" />}
      </div>
      <h3 className="text-base font-semibold text-ink-black tracking-tight">
        {title}
      </h3>
      <p className="text-xs text-slate-gray max-w-sm mt-1 mb-6">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
