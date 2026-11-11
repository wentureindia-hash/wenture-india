"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { FeaturedItem } from "@/lib/constants/featured";
import { getPublishedListings, convertListingToOpportunity } from "@/lib/firebase/listings";

type FeaturedTab = "businesses" | "startups" | "franchises" | "dealerships" | "exim";

const TAB_CONFIG: { id: FeaturedTab; label: string; categoryMatch: string[] }[] = [
  { id: "businesses", label: "Featured Businesses", categoryMatch: ["business"] },
  { id: "startups", label: "Featured Startups", categoryMatch: ["investment"] },
  { id: "franchises", label: "Featured Franchise", categoryMatch: ["franchise"] },
  { id: "dealerships", label: "Featured Dealerships", categoryMatch: ["dealership"] },
  { id: "exim", label: "Featured EXIM", categoryMatch: ["exim", "international"] },
];

export function FeaturedShowcase() {
  const [itemsByTab, setItemsByTab] = useState<Record<FeaturedTab, FeaturedItem[]>>({
    businesses: [],
    startups: [],
    franchises: [],
    dealerships: [],
    exim: [],
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FeaturedTab>("businesses");

  useEffect(() => {
    async function load() {
      try {
        const res = await getPublishedListings();
        if (!res.error && res.listings && res.listings.length > 0) {
          const published = res.listings.map((l) => convertListingToOpportunity(l));
          
          const grouped: Record<FeaturedTab, FeaturedItem[]> = {
            businesses: [],
            startups: [],
            franchises: [],
            dealerships: [],
            exim: [],
          };

          published.forEach((opp) => {
            const catLower = (opp.category || "").toLowerCase();
            const featuredItem: FeaturedItem = {
              id: opp.id,
              name: opp.title,
              category: `Featured ${opp.category}` as FeaturedItem["category"],
              type: opp.type || opp.category,
              sector: opp.sector,
              location: opp.location,
              investmentRange: opp.investmentRange,
              shortDescription: opp.shortDescription,
              opportunityType: opp.type || opp.category,
              slug: opp.slug,
              imageUrl: opp.imageUrl || "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80",
              tag: opp.stageBadge || opp.sector,
            };

            for (const cfg of TAB_CONFIG) {
              if (cfg.categoryMatch.includes(catLower)) {
                grouped[cfg.id].push(featuredItem);
                break;
              }
            }
          });

          setItemsByTab(grouped);

          // Find first tab with items if current default has none
          const firstNonEmpty = TAB_CONFIG.find((t) => grouped[t.id].length > 0);
          if (firstNonEmpty) {
            setActiveTab(firstNonEmpty.id);
          }
        }
      } catch (err) {
        console.error("Failed to load featured listings:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const totalCount = useMemo(() => {
    return Object.values(itemsByTab).reduce((sum, list) => sum + list.length, 0);
  }, [itemsByTab]);

  // If loading is done and there are no published listings at all, don't show empty/dummy showcase
  if (!loading && totalCount === 0) {
    return null;
  }

  const activeItems: FeaturedItem[] = itemsByTab[activeTab] || [];

  return (
    <section className="w-full py-10 sm:py-16 md:py-20 bg-[#F6FAFF] border-b border-[#DCECF2]">
      <div className="w-full max-w-[1280px] mx-auto px-3.5 sm:px-6 lg:px-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-5 sm:mb-8 gap-3 sm:gap-4">
          <div>
            <span className="text-xs font-bold text-[#00A6E8] uppercase tracking-wider block mb-1">
              Curated Showcase
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#0A192A] tracking-tight">
              Featured Directory
            </h2>
            <p className="text-xs sm:text-sm md:text-base text-[#5F7180] mt-1.5 sm:mt-2 max-w-2xl">
              Explore established enterprises, innovative startups, franchise brands, authorized dealerships, and export partners.
            </p>
          </div>

          <Link
            href="/opportunities"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#00A6E8] hover:text-[#00658F] transition-colors shrink-0 group"
          >
            <span>View All Listings</span>
            <span className="material-symbols-outlined text-[16px] sm:text-[18px] group-hover:translate-x-1 transition-transform">
              arrow_forward
            </span>
          </Link>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-3 mb-5 sm:mb-8 no-scrollbar scroll-smooth">
          {TAB_CONFIG.map((tab) => {
            const count = itemsByTab[tab.id]?.length || 0;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-200 border ${
                  isActive
                    ? "bg-[#0A192A] text-white border-[#0A192A] shadow-xs"
                    : "bg-white text-[#5F7180] border-[#DCECF2] hover:border-[#00A6E8] hover:text-[#0A192A]"
                }`}
              >
                {tab.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Cards Grid (Responsive 1-col on small mobile, 2-col on mid-mobile/tablet, 3-col on desktop) */}
        {activeItems.length > 0 ? (
          <div className="grid grid-cols-1 min-[500px]:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-6">
            {activeItems.map((item) => (
              <article
                key={item.id}
                className="bg-white border border-[#DCECF2] hover:border-[#00A6E8]/60 rounded-xl sm:rounded-2xl overflow-hidden shadow-[0px_4px_20px_rgba(10,25,42,0.04)] hover:shadow-[0px_8px_30px_rgba(10,25,42,0.08)] hover:-translate-y-1 transition-all duration-300 flex flex-col group relative h-full"
              >
                {/* Image */}
                <div className="h-28 sm:h-40 md:h-48 w-full relative overflow-hidden bg-slate-100 shrink-0">
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    fill
                    unoptimized
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />

                  {item.tag && (
                    <div className="absolute top-1.5 sm:top-3 right-1.5 sm:right-3 z-10">
                      <span className="bg-white/95 backdrop-blur-sm text-[#00658F] font-bold text-[8.5px] sm:text-[11px] px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded shadow-xs border border-slate-100 tracking-wide hidden min-[360px]:inline-block">
                        {item.tag}
                      </span>
                    </div>
                  )}
                </div>

                {/* Body */}
                <div className="p-2.5 sm:p-4 md:p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-1 sm:gap-2 mb-1.5 sm:mb-3">
                      <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                        <span className="bg-[#EBF6FC] text-[#00A6E8] font-bold text-[9px] sm:text-[11px] px-1.5 sm:px-2.5 py-0.5 rounded truncate max-w-[85px] sm:max-w-none">
                          {item.category}
                        </span>
                        <span className="bg-slate-100 text-[#5F7180] font-medium text-[9px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 rounded hidden min-[380px]:inline-block truncate max-w-[80px] sm:max-w-none">
                          {item.sector}
                        </span>
                      </div>
                      <span className="text-[9px] sm:text-xs text-[#5F7180] flex items-center gap-0.5 sm:gap-1 font-medium shrink-0 truncate max-w-[70px] sm:max-w-none">
                        <span className="material-symbols-outlined text-[11px] sm:text-[14px] text-[#00A6E8] shrink-0">
                          location_on
                        </span>
                        <span className="truncate">{item.location}</span>
                      </span>
                    </div>

                    <h3 className="text-xs sm:text-base font-bold text-[#0A192A] mb-1 sm:mb-2 group-hover:text-[#00A6E8] transition-colors leading-snug line-clamp-2">
                      {item.name}
                    </h3>

                    <p className="text-[10px] sm:text-xs md:text-sm text-[#5F7180] mb-2.5 sm:mb-4 line-clamp-2 leading-relaxed break-words">
                      {item.shortDescription}
                    </p>
                  </div>

                  <div>
                    <div className="pt-2 sm:pt-3 pb-2.5 sm:pb-4 border-t border-[#DCECF2] flex items-center justify-between text-xs gap-1">
                      <div className="min-w-0">
                        <span className="block text-[8.5px] sm:text-[10px] text-[#5F7180] uppercase tracking-wider font-semibold truncate">
                          Investment
                        </span>
                        <span className="font-bold text-[10px] sm:text-xs md:text-sm text-[#0A192A] truncate block">
                          {item.investmentRange}
                        </span>
                      </div>
                      <div className="text-right min-w-0">
                        <span className="block text-[8.5px] sm:text-[10px] text-[#5F7180] uppercase tracking-wider font-semibold truncate">
                          Type
                        </span>
                        <span className="font-semibold text-[10px] sm:text-xs md:text-sm text-[#00658F] truncate block">
                          {item.opportunityType}
                        </span>
                      </div>
                    </div>

                    <Link
                      href={`/opportunities${item.slug ? `/${item.slug}` : ""}`}
                      className="w-full text-center bg-[#F6FAFF] border border-[#DCECF2] hover:border-[#00A6E8] hover:bg-white text-[#0A192A] hover:text-[#00A6E8] font-bold text-[10px] sm:text-xs py-1.5 sm:py-2.5 rounded-lg transition-colors flex items-center justify-center gap-1"
                    >
                      <span>Details</span>
                      <span className="material-symbols-outlined text-[13px] sm:text-[16px]">arrow_forward</span>
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 px-4 bg-white rounded-2xl border border-[#DCECF2]">
            <p className="text-sm font-medium text-[#5F7180] mb-3">
              No published listings currently found in this category.
            </p>
            <Link
              href="/profile/listings"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00A6E8] hover:text-[#00658F] transition-colors"
            >
              <span>Submit a venture for this category</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
