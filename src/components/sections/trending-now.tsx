import React from "react";
import Link from "next/link";

interface TrendingItem {
  id: string;
  tag: string;
  title: string;
  subtitle: string;
  link: string;
  icon: string;
  badgeColor: string;
}

const TRENDING_ITEMS: TrendingItem[] = [
  {
    id: "trend-1",
    tag: "Verified Catalog",
    title: "Live Opportunities",
    subtitle: "Explore verified ventures, commercial expansions, and growth capital listings.",
    link: "/opportunities",
    icon: "verified",
    badgeColor: "bg-sky-100 text-sky-800",
  },
  {
    id: "trend-2",
    tag: "Popular Sector",
    title: "Food & Beverage Franchises",
    subtitle: "High consumer footfall QSR models, specialty cafes, and cloud kitchens expanding across India.",
    link: "/opportunities?sector=Food%20%26%20Beverage",
    icon: "restaurant",
    badgeColor: "bg-emerald-100 text-emerald-800",
  },
  {
    id: "trend-3",
    tag: "Featured Guide",
    title: "Guide to Business Franchise",
    subtitle: "Practical evaluation criteria for FOFO, FOCO, and Master franchise playbooks.",
    link: "/guides/business-franchise",
    icon: "menu_book",
    badgeColor: "bg-blue-100 text-blue-800",
  },
  {
    id: "trend-4",
    tag: "Investor Network",
    title: "Accredited Investor Directory",
    subtitle: "Connect directly with verified angel investors, family offices, and syndicate leaders.",
    link: "/investors",
    icon: "groups",
    badgeColor: "bg-purple-100 text-purple-800",
  },
];

export function TrendingNow() {
  return (
    <section className="w-full py-10 sm:py-16 md:py-20 bg-[#F6FAFF] border-b border-[#DCECF2]">
      <div className="w-full max-w-[1280px] mx-auto px-3.5 sm:px-6 lg:px-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-5 sm:mb-8">
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00A6E8] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-[#00A6E8]"></span>
              </span>
              <span className="text-[10px] sm:text-xs font-bold text-[#00A6E8] uppercase tracking-wider">
                Curated Highlights
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#0A192A] tracking-tight mt-0.5 sm:mt-1">
              Trending Now
            </h2>
          </div>

          <Link
            href="/opportunities"
            className="text-xs sm:text-sm font-bold text-[#00A6E8] hover:text-[#00658F] transition-colors"
          >
            Catalog →
          </Link>
        </div>

        {/* 4 Trending Cards (Responsive 1-col on tiny mobile, 2-col on standard mobile, 4-col on desktop) */}
        <div className="grid grid-cols-1 min-[360px]:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          {TRENDING_ITEMS.map((item) => (
            <Link
              key={item.id}
              href={item.link}
              className="bg-white border border-[#DCECF2] hover:border-[#00A6E8] p-3 sm:p-5 rounded-xl shadow-[0px_4px_16px_rgba(10,25,42,0.03)] hover:shadow-[0px_8px_24px_rgba(10,25,42,0.07)] hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between group h-full"
            >
              <div>
                <div className="flex items-center justify-between gap-1.5 mb-2 sm:mb-3">
                  <span
                    className={`text-[8.5px] sm:text-[10px] font-bold uppercase tracking-wider px-1.5 sm:px-2 py-0.5 rounded truncate max-w-[105px] sm:max-w-none ${item.badgeColor}`}
                  >
                    {item.tag}
                  </span>
                  <span className="material-symbols-outlined text-[15px] sm:text-[18px] text-[#5F7180] group-hover:text-[#00A6E8] transition-colors shrink-0">
                    {item.icon}
                  </span>
                </div>

                <h3 className="text-xs sm:text-base font-bold text-[#0A192A] mb-1 group-hover:text-[#00A6E8] transition-colors leading-snug line-clamp-2">
                  {item.title}
                </h3>

                <p className="text-[10px] sm:text-xs text-[#5F7180] leading-relaxed line-clamp-2">
                  {item.subtitle}
                </p>
              </div>

              <div className="flex items-center gap-1 text-[10px] sm:text-xs font-bold text-[#00A6E8] group-hover:text-[#00658F] transition-colors pt-2 sm:pt-3 border-t border-[#DCECF2]/60 mt-2 sm:mt-3">
                <span>Explore</span>
                <span className="material-symbols-outlined text-[13px] sm:text-[15px] group-hover:translate-x-0.5 transition-transform">
                  arrow_forward
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
