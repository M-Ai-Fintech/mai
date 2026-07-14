import React from "react";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circular" | "rectangular";
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = "text",
  width,
  height,
  className = "",
  style,
  ...props
}) => {
  let variantStyles = "bg-dust-taupe/40 animate-pulse";

  switch (variant) {
    case "text":
      variantStyles += " rounded h-4 w-full my-1";
      break;
    case "circular":
      variantStyles += " rounded-full";
      break;
    case "rectangular":
      variantStyles += " rounded-lg";
      break;
  }

  return (
    <div
      className={`${variantStyles} ${className}`}
      style={{
        width: width !== undefined ? width : undefined,
        height: height !== undefined ? height : undefined,
        ...style,
      }}
      {...props}
    />
  );
};
