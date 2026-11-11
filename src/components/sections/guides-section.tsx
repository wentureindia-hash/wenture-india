import React from "react";
import Link from "next/link";
import { GUIDES, GUIDES_HEADING } from "@/lib/constants/guides";

export function GuidesSection() {
  return (
    <section className="w-full py-10 sm:py-16 md:py-20 bg-white border-b border-[#DCECF2]">
      <div className="w-full max-w-[1280px] mx-auto px-3.5 sm:px-6 lg:px-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 sm:mb-12 gap-3 sm:gap-4">
          <div>
            <span className="text-xs font-bold text-[#00A6E8] uppercase tracking-wider block mb-1">
              Educational Resources
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#0A192A] tracking-tight">
              {GUIDES_HEADING.title}
            </h2>
            <p className="text-xs sm:text-sm md:text-base text-[#5F7180] mt-1.5 sm:mt-2 max-w-2xl">
              {GUIDES_HEADING.subtitle}
            </p>
          </div>

          <Link
            href="/guides"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#00A6E8] hover:text-[#00658F] transition-colors shrink-0 group"
          >
            <span>View All Guides</span>
            <span className="material-symbols-outlined text-[16px] sm:text-[18px] group-hover:translate-x-1 transition-transform">
              arrow_forward
            </span>
          </Link>
        </div>

        {/* 5 Guide Cards in Responsive Grid (1-col on small mobile, 2-col on mid-mobile/tablet, 3-col on desktop) */}
        <div className="grid grid-cols-1 min-[500px]:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-6">
          {GUIDES.map((guide, idx) => (
            <article
              key={guide.slug}
              className={`bg-[#F6FAFF] border border-[#DCECF2] hover:border-[#00A6E8] p-3 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl transition-all duration-300 flex flex-col justify-between group hover:shadow-[0px_8px_30px_rgba(10,25,42,0.06)] hover:-translate-y-1 h-full ${
                idx === 0 ? "col-span-2 sm:col-span-1 md:col-span-2 lg:col-span-1" : ""
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1.5 mb-2 sm:mb-4">
                  <span className="bg-[#EBF6FC] text-[#00A6E8] font-bold text-[9px] sm:text-[11px] px-1.5 sm:px-2.5 py-0.5 rounded truncate max-w-[100px] sm:max-w-none">
                    {guide.category}
                  </span>
                  <span className="text-[9px] sm:text-xs text-[#5F7180] flex items-center gap-0.5 sm:gap-1 font-medium shrink-0">
                    <span className="material-symbols-outlined text-[11px] sm:text-[14px]">
                      schedule
                    </span>
                    {guide.readTime}
                  </span>
                </div>

                <h3 className="text-xs sm:text-base md:text-lg font-bold text-[#0A192A] mb-1 sm:mb-2 group-hover:text-[#00A6E8] transition-colors leading-snug line-clamp-2">
                  <Link href={`/guides/${guide.slug}`}>{guide.title}</Link>
                </h3>

                <p className="text-[10px] sm:text-xs md:text-sm text-[#5F7180] mb-2.5 sm:mb-6 line-clamp-2 leading-relaxed">
                  {guide.shortDescription}
                </p>
              </div>

              <div className="pt-2 sm:pt-4 border-t border-[#DCECF2] flex items-center justify-between">
                <Link
                  href={`/guides/${guide.slug}`}
                  className="inline-flex items-center gap-1 text-[10px] sm:text-xs md:text-sm font-bold text-[#00A6E8] group-hover:text-[#00658F] transition-colors"
                >
                  <span>Read Guide</span>
                  <span className="material-symbols-outlined text-[13px] sm:text-[16px] group-hover:translate-x-1 transition-transform">
                    arrow_forward
                  </span>
                </Link>
                <span className="material-symbols-outlined text-[16px] sm:text-[20px] text-slate-300 group-hover:text-[#00A6E8] transition-colors">
                  menu_book
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
