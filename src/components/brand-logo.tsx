import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export interface BrandLogoProps {
  className?: string;
  showTagline?: boolean;
  showSubtitle?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  dark?: boolean;
  layout?: "horizontal" | "vertical";
  priority?: boolean;
}

export function BrandLogo({
  className,
  size = "md",
  dark = false,
  priority = true,
}: BrandLogoProps) {
  // Intrinsic dimensions: 651 x 383 (aspect ratio 1.6997:1)
  // Explicit proportional heights so the logo is crisp, clear, never compressed, and fully in HD.
  const sizeClasses = {
    sm: "h-9 sm:h-10",
    md: "h-11 sm:h-12 lg:h-[52px]",
    lg: "h-16 sm:h-20 lg:h-24",
    xl: "h-24 sm:h-28 lg:h-32",
  }[size];

  const logoSrc = dark ? "/wenture-logo-white.png" : "/wenture-logo.png";

  return (
    <div
      className={cn(
        "select-none inline-flex items-center justify-center shrink-0 transition-opacity duration-200 group-hover:opacity-90",
        className
      )}
    >
      <Image
        src={logoSrc}
        alt="Wenture India - Connect. Build. Scale. Grow Together."
        width={651}
        height={383}
        priority={priority}
        unoptimized
        className={cn(
          "w-auto object-contain max-h-full",
          sizeClasses
        )}
        style={{
          aspectRatio: "651 / 383",
          imageRendering: "auto",
        }}
      />
    </div>
  );
}
