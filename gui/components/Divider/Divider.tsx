import React from "react";

export interface DividerProps extends React.HTMLAttributes<HTMLHRElement> {
  variant?: "solid" | "dashed";
  spacing?: "sm" | "md" | "lg";
}

export const Divider: React.FC<DividerProps> = ({
  variant = "solid",
  spacing = "md",
  className = "",
  ...props
}) => {
  const spacingStyles = {
    sm: "my-2",
    md: "my-4",
    lg: "my-6",
  };

  const borderStyle = variant === "dashed" ? "border-dashed" : "border-solid";

  return (
    <hr
      className={`border-t border-dust-taupe/60 ${borderStyle} ${spacingStyles[spacing]} ${className}`}
      {...props}
    />
  );
};
