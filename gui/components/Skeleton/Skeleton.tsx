import React from "react";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circular" | "rectangular";
  width?: string | number;
  height?: string | number;
}

const SKELETON_VARIANT_CLASS = {
  text: "bg-dust-taupe/40 animate-pulse rounded h-4 w-full my-1",
  circular: "bg-dust-taupe/40 animate-pulse rounded-full",
  rectangular: "bg-dust-taupe/40 animate-pulse rounded-lg",
} as const;

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = "text",
  width,
  height,
  className = "",
  style,
  ...props
}) => {
  return (
    <div
      className={`${SKELETON_VARIANT_CLASS[variant]} ${className}`}
      style={skeletonStyle(width, height, style)}
      {...props}
    />
  );
};

function skeletonStyle(
  width: SkeletonProps["width"],
  height: SkeletonProps["height"],
  style: SkeletonProps["style"],
) {
  return {
    width: width !== undefined ? width : undefined,
    height: height !== undefined ? height : undefined,
    ...style,
  };
}
