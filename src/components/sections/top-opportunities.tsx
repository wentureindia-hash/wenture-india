"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  OPPORTUNITY_CATEGORIES,
  Opportunity,
  OpportunityCategory,
} from "@/lib/constants/opportunities";
import { OpportunityCard } from "@/components/cards/opportunity-card";
import { OpportunityEnquiryModal } from "@/components/forms/opportunity-enquiry-modal";
import { getPublishedListings, convertListingToOpportunity } from "@/lib/firebase/listings";

interface TopOpportunitiesProps {
  title?: string;
  subtitle?: string;
  limit?: number;
  initialCategory?: OpportunityCategory;
  showViewAll?: boolean;
}

export function TopOpportunities({
  title = "Top Opportunities",
  subtitle = "Discover curated business, investment, franchise and partnership opportunities.",
  limit = 6,
  initialCategory = "Investment",
  showViewAll = true,
}: TopOpportunitiesProps) {
  const [activeCategory, setActiveCategory] =
    useState<OpportunityCategory>(initialCategory);
  const [selectedOpportunity, setSelectedOpportunity] =
    useState<Opportunity | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [publishedOpps, setPublishedOpps] = useState<Opportunity[]>([]);

  useEffect(() => {
    async function load() {
      const res = await getPublishedListings();
      if (!res.error && res.listings && res.listings.length > 0) {
        setPublishedOpps(res.listings.map((l) => convertListingToOpportunity(l)));
      }
    }
    load();
  }, []);

  const combinedOpportunities = publishedOpps;

  const filteredOpportunities = combinedOpportunities
    .filter((opp) => opp.category.toLowerCase() === activeCategory.toLowerCase())
    .slice(0, limit);

  const handleInterested = (opp: Opportunity) => {
    setSelectedOpportunity(opp);
    setModalOpen(true);
  };

  return (
    <section className="w-full py-10 sm:py-16 md:py-20 bg-white border-b border-[#DCECF2]">
      <div className="w-full max-w-[1280px] mx-auto px-3.5 sm:px-6 lg:px-12">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 sm:mb-10 gap-3 sm:gap-4">
          <div>
            <span className="text-xs font-bold text-[#00A6E8] uppercase tracking-wider block mb-1">
              Curated Opportunities
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#0A192A] tracking-tight">
              {title}
            </h2>
            <p className="text-xs sm:text-sm md:text-base text-[#5F7180] mt-1.5 sm:mt-2 max-w-2xl">
              {subtitle}
            </p>
          </div>

          {showViewAll && (
            <Link
              href="/opportunities"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#00A6E8] hover:text-[#00658F] transition-colors shrink-0 group"
            >
              <span>Explore All Opportunities</span>
              <span className="material-symbols-outlined text-[16px] sm:text-[18px] group-hover:translate-x-1 transition-transform">
                arrow_forward
              </span>
            </Link>
          )}
        </div>

        {/* Category Navigation Tabs */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-3 mb-5 sm:mb-8 no-scrollbar scroll-smooth">
          {OPPORTUNITY_CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-200 border ${
                  isActive
                    ? "bg-[#00A6E8] text-white border-[#00A6E8] shadow-xs"
                    : "bg-[#F6FAFF] text-[#5F7180] border-[#DCECF2] hover:border-[#00A6E8] hover:text-[#0A192A]"
                }`}
              >
                Top {cat}
              </button>
            );
          })}
        </div>

        {/* Opportunity Cards Grid (2x2 on mobile, 3-col on desktop) */}
        {filteredOpportunities.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-6">
            {filteredOpportunities.map((opp) => (
              <OpportunityCard
                key={opp.id}
                opportunity={opp}
                onInterested={handleInterested}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 px-4 bg-[#F6FAFF] rounded-2xl border border-[#DCECF2]">
            <p className="text-sm font-medium text-[#5F7180] mb-3">
              No live opportunities currently listed under {activeCategory}.
            </p>
            <Link
              href="/profile/listings"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00A6E8] hover:text-[#00658F] transition-colors"
            >
              <span>List your opportunity in this category</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </Link>
          </div>
        )}

        {/* Modal */}
        <OpportunityEnquiryModal
          opportunity={selectedOpportunity}
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
        />
      </div>
    </section>
  );
}
