import React from "react";
import { cn } from "@/lib/utils";
import { WentureEmblem } from "@/components/wenture-emblem";

interface BrandLogoProps {
  className?: string;
  showTagline?: boolean;
  showSubtitle?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  dark?: boolean;
  layout?: "horizontal" | "vertical";
}

export function BrandLogo({
  className,
  showTagline = false,
  showSubtitle = false,
  size = "md",
  dark = false,
  layout = "horizontal",
}: BrandLogoProps) {
  const emblemSize = {
    sm: 34,
    md: 44,
    lg: 60,
    xl: 84,
  }[size];

  const titleSize = {
    sm: "text-lg sm:text-xl",
    md: "text-xl sm:text-2xl",
    lg: "text-2xl sm:text-3xl",
    xl: "text-4xl sm:text-5xl",
  }[size];

  const taglineSize = {
    sm: "text-[7.5px] tracking-[0.18em]",
    md: "text-[9px] tracking-[0.22em]",
    lg: "text-[11px] tracking-[0.25em]",
    xl: "text-xs tracking-[0.28em]",
  }[size];

  const textColor = dark ? "text-white" : "text-[#0A192A]";

  return (
    <div
      className={cn(
        "select-none group inline-flex shrink-0",
        layout === "vertical"
          ? "flex-col items-center text-center gap-2"
          : "flex-row items-center gap-2 sm:gap-2.5 xl:gap-3",
        className
      )}
    >
      {/* Official Wenture India Emblem */}
      <div className="relative flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105">
        <WentureEmblem size={emblemSize} />
      </div>

      {/* Typography: Wenture + India with Tricolor Leaf Dot */}
      <div
        className={cn(
          "flex flex-col shrink-0",
          layout === "vertical" ? "items-center" : "items-start"
        )}
      >
        <div className={cn("flex items-baseline font-extrabold tracking-tight font-heading leading-none whitespace-nowrap", titleSize)}>
          <span className={textColor}>Wenture</span>
          <span className={cn("relative inline-flex items-baseline", textColor)}>
            {/* Custom styled 'I' and 'ndia' with tricolor leaf dot */}
            <span className="relative">
              I
            </span>
            <span>nd</span>
            {/* Lowercase 'i' with tricolor dot */}
            <span className="relative inline-block">
              {/* Tricolor Flame / Leaf as 'i' dot */}
              <span
                className="absolute -top-[5px] sm:-top-[6px] left-[1px] w-[5px] h-[6px] sm:w-[6px] sm:h-[7.5px] rounded-full rotate-45 pointer-events-none"
                style={{
                  background:
                    "linear-gradient(135deg, #F47920 0%, #FFFFFF 50%, #0B8043 100%)",
                  boxShadow: "0 0 2px rgba(0,0,0,0.15)",
                }}
              />
              i
            </span>
            <span>a</span>
          </span>
        </div>

        {/* Optional "India International" subtext */}
        {showSubtitle && (
          <span
            className={cn(
              "font-bold uppercase mt-1 leading-none text-[9px] tracking-[0.2em]",
              dark ? "text-slate-400" : "text-slate-500"
            )}
          >
            India International
          </span>
        )}

        {/* Official Tagline with Saffron, Silver & Green Dots */}
        {showTagline && (
          <div
            className={cn(
              "font-extrabold uppercase mt-1.5 leading-tight flex items-center flex-wrap gap-1 font-heading",
              taglineSize,
              dark ? "text-slate-300" : "text-[#0A192A]"
            )}
          >
            <span>CONNECT</span>
            <span className="w-1 h-1 rounded-full bg-[#F47920] inline-block" />
            <span>BUILD</span>
            <span className="w-1 h-1 rounded-full bg-slate-300 inline-block" />
            <span>SCALE</span>
            <span className="w-1 h-1 rounded-full bg-[#0B8043] inline-block" />
            <span>GROW TOGETHER</span>
            <span className="w-1 h-1 rounded-full bg-[#F47920] inline-block" />
          </div>
        )}
      </div>
    </div>
  );
}
