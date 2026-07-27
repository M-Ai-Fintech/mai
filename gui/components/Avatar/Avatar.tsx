import Image from "next/image";
import React from "react";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: "sm" | "md" | "lg";
}

const AVATAR_SIZE_CLASS = {
  sm: "w-8 h-8 text-xs",
  md: "w-11 h-11 text-sm",
  lg: "w-14 h-14 text-base",
} as const;

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = "User Avatar",
  fallback = "US",
  size = "md",
  className = "",
  ...props
}) => {
  return (
    <AvatarFrame className={className} size={size} props={props}>
      {src
        ? <AvatarImage alt={alt} src={src} />
        : <AvatarFallback text={fallback} />}
    </AvatarFrame>
  );
};

function AvatarFrame({
  children,
  className,
  props,
  size,
}: {
  children: React.ReactNode;
  className: string;
  props: React.HTMLAttributes<HTMLDivElement>;
  size: NonNullable<AvatarProps["size"]>;
}) {
  return (
    <div
      className={avatarFrameClass(size, className)}
      {...props}
    >
      {children}
    </div>
  );
}

function avatarFrameClass(
  size: NonNullable<AvatarProps["size"]>,
  className: string,
) {
  return `relative inline-flex items-center justify-center rounded-full overflow-hidden border border-dust-taupe bg-lifted-cream font-bold text-ink-black select-none shrink-0 ${
    AVATAR_SIZE_CLASS[size]
  } ${className}`;
}

function AvatarImage({ alt, src }: { alt: string; src: string }) {
  return (
    <Image src={src} alt={alt} fill sizes="56px" className="object-cover" />
  );
}

function AvatarFallback({ text }: { text: string }) {
  return <span>{text.substring(0, 2).toUpperCase()}</span>;
}
