import React from "react";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: "sm" | "md" | "lg";
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = "User Avatar",
  fallback = "US",
  size = "md",
  className = "",
  ...props
}) => {
  const sizeStyles = {
    sm: "w-8 h-8 text-xs",
    md: "w-11 h-11 text-sm", // 44px WCAG minimum touch target size
    lg: "w-14 h-14 text-base",
  };

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full overflow-hidden border border-dust-taupe bg-lifted-cream font-bold text-ink-black select-none shrink-0 ${
        sizeStyles[size]
      } ${className}`}
      {...props}
    >
      {src
        ? <img src={src} alt={alt} className="w-full h-full object-cover" />
        : <span>{fallback.substring(0, 2).toUpperCase()}</span>}
    </div>
  );
};
