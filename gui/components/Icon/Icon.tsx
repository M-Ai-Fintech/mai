import React from "react";

export type IconName =
  | "search"
  | "filter"
  | "chevronDown"
  | "chevronRight"
  | "chevronUp"
  | "check"
  | "close"
  | "alert"
  | "info"
  | "user"
  | "settings"
  | "lock"
  | "fileText"
  | "arrowRight"
  | "globe"
  | "flagBR"
  | "flagES"
  | "flagUS";

export interface IconProps extends React.SVGAttributes<SVGElement> {
  name: IconName;
  size?: "sm" | "md" | "lg" | "xl" | number;
  color?: string;
}

export const Icon: React.FC<IconProps> = ({
  name,
  size = "md",
  color = "currentColor",
  className = "",
  ...props
}) => {
  const sizeMap = {
    sm: 16,
    md: 20,
    lg: 24,
    xl: 32,
  };

  const dimension = typeof size === "number" ? size : sizeMap[size] || 20;

  const renderIconContent = () => {
    switch (name) {
      case "search":
        return (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        );
      case "filter":
        return (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
          />
        );
      case "chevronDown":
        return (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        );
      case "chevronRight":
        return (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        );
      case "chevronUp":
        return (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 15l7-7 7 7"
          />
        );
      case "check":
        return (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        );
      case "close":
        return (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        );
      case "alert":
        return (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        );
      case "info":
        return (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        );
      case "user":
        return (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        );
      case "settings":
        return (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
        );
      case "lock":
        return (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        );
      case "fileText":
        return (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        );
      case "arrowRight":
        return (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M14 5l7 7m0 0l-7 7m7-7H3"
          />
        );
      case "globe":
        return (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
          />
        );
      case "flagBR":
        return (
          <g fill="none">
            <rect width="24" height="24" rx="4" fill="#009B3A" />
            <polygon points="12,4 21,12 12,20 3,12" fill="#FEDF00" />
            <circle cx="12" cy="12" r="4.5" fill="#002776" />
          </g>
        );
      case "flagES":
        return (
          <g fill="none">
            <rect width="24" height="24" rx="4" fill="#AA151B" />
            <rect y="6" width="24" height="12" fill="#F1BF00" />
          </g>
        );
      case "flagUS":
        return (
          <g fill="none">
            <rect width="24" height="24" rx="4" fill="#B22234" />
            <rect y="4" width="24" height="3" fill="#FFFFFF" />
            <rect y="10" width="24" height="3" fill="#FFFFFF" />
            <rect y="16" width="24" height="3" fill="#FFFFFF" />
            <rect width="11" height="11" fill="#3C3B6E" />
          </g>
        );
      default:
        return null;
    }
  };

  const isFlag = name.startsWith("flag");

  return (
    <svg
      width={dimension}
      height={dimension}
      viewBox="0 0 24 24"
      fill={isFlag ? "none" : "none"}
      stroke={isFlag ? "none" : color}
      className={`inline-block shrink-0 transition-transform ${className}`}
      {...props}
    >
      {renderIconContent()}
    </svg>
  );
};
