"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { InvestorCard } from "@/components/cards/investor-card";
import { InvestorProfile, getPublishedInvestors } from "@/lib/firebase/investors";
import { Container } from "@/components/layout/container";

interface ActiveInvestorsShowcaseProps {
  title?: string;
  subtitle?: string;
  limit?: number;
}

export function ActiveInvestorsShowcase({
  title = "Active Investors & Capital Partners",
  subtitle = "Discover verified angel investors, venture capital funds, and institutional financiers actively seeking high-growth opportunities across technology, healthcare, manufacturing, and consumer sectors.",
  limit = 3,
}: ActiveInvestorsShowcaseProps) {
  const [investors, setInvestors] = useState<InvestorProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await getPublishedInvestors();
      if (!res.error && res.investors) {
        setInvestors(res.investors);
      }
      setLoading(false);
    }
    load();
  }, []);

  const displayInvestors = investors.slice(0, limit);

  return (
    <section className="w-full py-10 sm:py-16 md:py-20 bg-gradient-to-b from-[#F4FAFD]/60 to-white border-y border-[#DCECF2]">
      <Container>
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 sm:mb-10 gap-3 sm:gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EBF6FC] border border-[#DCECF2] text-[#00658F] font-bold text-xs mb-2 sm:mb-3 shadow-xs">
              <span className="material-symbols-outlined text-[15px] sm:text-[16px] text-[#00A6E8]">
                verified
              </span>
              <span>Verified Capital Directory</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#0A192A] tracking-tight font-heading">
              {title}
            </h2>
            <p className="text-xs sm:text-sm md:text-base text-[#5F7180] mt-1.5 sm:mt-2 max-w-2xl leading-relaxed">
              {subtitle}
            </p>
          </div>

          <Link
            href="/investors"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#00A6E8] hover:text-[#00658F] transition-colors shrink-0 group"
          >
            <span>Explore More Investors</span>
            <span className="material-symbols-outlined text-[16px] sm:text-[18px] group-hover:translate-x-1 transition-transform">
              arrow_forward
            </span>
          </Link>
        </div>

        {/* Loading Skeletons */}
        {loading ? (
          <div className="grid grid-cols-1 min-[500px]:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-6">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="bg-white border border-[#DCECF2] rounded-xl sm:rounded-2xl p-3.5 sm:p-6 animate-pulse space-y-3 shadow-xs"
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-slate-200 shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3 sm:h-4 bg-slate-200 rounded w-3/4" />
                    <div className="h-2.5 sm:h-3 bg-slate-200 rounded w-1/2" />
                  </div>
                </div>
                <div className="h-8 sm:h-12 bg-slate-200 rounded w-full" />
                <div className="flex gap-1.5">
                  <div className="h-4 sm:h-6 bg-slate-200 rounded w-12 sm:w-16" />
                  <div className="h-4 sm:h-6 bg-slate-200 rounded w-14 sm:w-20" />
                </div>
                <div className="pt-2 sm:pt-4 border-t border-slate-100 flex justify-between">
                  <div className="h-3 sm:h-4 bg-slate-200 rounded w-16 sm:w-24" />
                  <div className="h-3 sm:h-4 bg-slate-200 rounded w-12 sm:w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : displayInvestors.length > 0 ? (
          /* Real Investor Cards Grid (Responsive 1-col on small mobile, 2-col on mid-mobile/tablet, 3-col on desktop) */
          <div className="grid grid-cols-1 min-[500px]:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-6">
            {displayInvestors.map((investor) => (
              <InvestorCard key={investor.id} investor={investor} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-2xl border border-[#DCECF2] p-8 max-w-md mx-auto">
            <span className="material-symbols-outlined text-[36px] text-slate-300 mb-2 block">
              person_search
            </span>
            <p className="text-sm font-bold text-[#0A192A] mb-1">
              No Approved Investors Listed Yet
            </p>
            <p className="text-xs text-[#5F7180] mb-4">
              Verified investor profiles will appear here as they are reviewed and approved.
            </p>
            <Link
              href="/profile/investor"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00A6E8] hover:underline"
            >
              <span>Get listed as an investor</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </Link>
          </div>
        )}

        {/* Bottom Centered "Explore More Investors" CTA Button */}
        <div className="mt-8 sm:mt-12 text-center">
          <Link
            href="/investors"
            className="inline-flex items-center justify-center gap-2 bg-[#00A6E8] hover:bg-[#0093CE] text-white font-bold text-xs sm:text-base px-6 sm:px-8 py-3 sm:py-4 rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
          >
            <span className="material-symbols-outlined text-[18px] sm:text-[20px]">groups</span>
            <span>Explore More Investors</span>
            <span className="material-symbols-outlined text-[16px] sm:text-[18px]">arrow_forward</span>
          </Link>
        </div>
      </Container>
    </section>
  );
}
