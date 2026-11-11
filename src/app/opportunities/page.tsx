"use client";

import React, { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { OpportunityCard } from "@/components/cards/opportunity-card";
import { OpportunityEnquiryModal } from "@/components/forms/opportunity-enquiry-modal";
import {
  INVESTMENT_RANGES,
  OPPORTUNITY_CATEGORIES,
  Opportunity,
  OpportunityCategory,
} from "@/lib/constants/opportunities";
import { SECTORS } from "@/lib/constants/sectors";
import { getPublishedListings, convertListingToOpportunity } from "@/lib/firebase/listings";
import { AnimatePresence, motion } from "framer-motion";

function OpportunitiesContent() {
  const searchParams = useSearchParams();
  const sectorParam = searchParams.get("sector");
  const categoryParam = searchParams.get("category");

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>(
    categoryParam || "All"
  );
  const [selectedSector, setSelectedSector] = useState<string>(
    sectorParam || "All Sectors"
  );
  const [selectedRange, setSelectedRange] = useState<string>("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] =
    useState<Opportunity | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [publishedListings, setPublishedListings] = useState<Opportunity[]>([]);
  const [sortBy, setSortBy] = useState<"newest" | "low-high" | "high-low" | "title">("newest");

  useEffect(() => {
    const loadPublished = async () => {
      setLoading(true);
      const res = await getPublishedListings();
      if (!res.error && res.listings) {
        const converted = res.listings
          .filter((item) => item.status === "published" && !item.isDeleted)
          .map((item) => convertListingToOpportunity(item));
        setPublishedListings(converted);
      }
      setLoading(false);
    };
    loadPublished();
  }, []);

  useEffect(() => {
    if (sectorParam) {
      setSelectedSector(sectorParam);
    }
  }, [sectorParam]);

  useEffect(() => {
    if (categoryParam) {
      setSelectedCategory(categoryParam);
    }
  }, [categoryParam]);

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("All");
    setSelectedSector("All Sectors");
    setSelectedRange("all");
    setSortBy("newest");
  };

  // Display only real published listings from Firestore
  const allOpportunities = publishedListings;

  // Dynamically calculate accurate counts for each category based on all active published opportunities
  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {
      All: allOpportunities.length,
    };
    OPPORTUNITY_CATEGORIES.forEach((cat) => {
      map[cat] = allOpportunities.filter(
        (o) => o.category.toLowerCase() === cat.toLowerCase()
      ).length;
    });
    return map;
  }, [allOpportunities]);

  // Filter opportunities
  const filteredOpps = useMemo(() => {
    const result = allOpportunities.filter((opp) => {
      // Search match
      if (
        searchQuery &&
        !opp.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !opp.shortDescription.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !opp.sector.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !opp.location.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }

      // Category match
      if (
        selectedCategory !== "All" &&
        selectedCategory.toLowerCase() !== "all" &&
        opp.category.toLowerCase() !== selectedCategory.toLowerCase()
      ) {
        return false;
      }

      // Sector match
      if (
        selectedSector !== "All Sectors" &&
        opp.sector.toLowerCase() !== selectedSector.toLowerCase()
      ) {
        return false;
      }

      // Investment Range match
      if (selectedRange !== "all") {
        if (opp.rangeCategory !== selectedRange) {
          return false;
        }
      }

      return true;
    });

    // Apply sorting
    if (sortBy === "low-high") {
      result.sort((a, b) => a.targetAmountNum - b.targetAmountNum);
    } else if (sortBy === "high-low") {
      result.sort((a, b) => b.targetAmountNum - a.targetAmountNum);
    } else if (sortBy === "title") {
      result.sort((a, b) => a.title.localeCompare(b.title));
    }

    return result;
  }, [allOpportunities, searchQuery, selectedCategory, selectedSector, selectedRange, sortBy]);

  const handleInterested = (opp: Opportunity) => {
    setSelectedOpportunity(opp);
    setModalOpen(true);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F6FAFF] selection:bg-[#00A6E8] selection:text-white">
      <Navbar />

      <main className="flex-grow">
        {/* ============================================================ */}
        {/* PAGE HEADER */}
        {/* ============================================================ */}
        <section className="bg-white border-b border-[#DCECF2] py-8 sm:py-12 md:py-16">
          <div className="w-full max-w-[1280px] mx-auto px-3.5 sm:px-6 lg:px-12">
            <div className="max-w-3xl">
              <span className="text-xs font-bold text-[#00A6E8] uppercase tracking-wider block mb-1 sm:mb-2">
                Opportunity Catalog
              </span>
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-[#0A192A] tracking-tight font-heading">
                Explore Business &amp; Investment Opportunities
              </h1>
              <p className="text-xs sm:text-sm md:text-base text-[#5F7180] mt-2 sm:mt-3 leading-relaxed">
                Discover active private businesses, seed startups, commercial franchises, authorized dealerships, and cross-border trade opportunities.
              </p>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* CONTROLS & FILTER BAR */}
        {/* ============================================================ */}
        <section className="sticky top-[60px] sm:top-[72px] z-30 bg-white/95 backdrop-blur-md border-b border-[#DCECF2] py-2.5 sm:py-4 shadow-xs">
          <div className="w-full max-w-[1280px] mx-auto px-3.5 sm:px-6 lg:px-12">
            {/* Category Tabs */}
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-2 sm:pb-3 mb-2 sm:mb-3 no-scrollbar">
              <button
                type="button"
                onClick={() => setSelectedCategory("All")}
                className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                  selectedCategory.toLowerCase() === "all"
                    ? "bg-[#00A6E8] text-white border-[#00A6E8] shadow-xs"
                    : "bg-[#F6FAFF] text-[#5F7180] border-[#DCECF2] hover:border-[#00A6E8] hover:text-[#0A192A]"
                }`}
              >
                All ({categoryCounts["All"] ?? allOpportunities.length})
              </button>
              {OPPORTUNITY_CATEGORIES.map((cat) => {
                const count = categoryCounts[cat] ?? 0;
                const isActive = selectedCategory.toLowerCase() === cat.toLowerCase();
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                      isActive
                        ? "bg-[#00A6E8] text-white border-[#00A6E8] shadow-sm"
                        : "bg-[#F6FAFF] text-[#5F7180] border-[#DCECF2] hover:border-[#00A6E8] hover:text-[#0A192A]"
                    }`}
                  >
                    {cat} ({count})
                  </button>
                );
              })}
            </div>

            {/* Unified Search & Dropdown Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Search input with magnifier icon */}
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5F7180] material-symbols-outlined text-[20px]">
                  search
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by company, sector, location, or keyword..."
                  className="w-full pl-10 pr-4 py-2.5 bg-[#F6FAFF] border border-[#DCECF2] rounded-xl text-sm text-[#0A192A] placeholder:text-[#5F7180] focus:outline-none focus:border-[#00A6E8] focus:bg-white transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                )}
              </div>

              {/* Sector Dropdown */}
              <div className="sm:w-56">
                <select
                  value={selectedSector}
                  onChange={(e) => setSelectedSector(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F6FAFF] border border-[#DCECF2] rounded-xl text-xs sm:text-sm font-semibold text-[#0A192A] focus:outline-none focus:border-[#00A6E8] focus:bg-white transition-colors cursor-pointer"
                >
                  <option value="All Sectors">All Sectors</option>
                  {SECTORS.map((sec) => (
                    <option key={sec.id} value={sec.name}>
                      {sec.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Expand Filters Toggle Button */}
              <button
                type="button"
                onClick={() => setFiltersOpen(!filtersOpen)}
                className={`px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
                  filtersOpen || selectedRange !== "all"
                    ? "bg-[#0A192A] text-white border-[#0A192A]"
                    : "bg-[#F6FAFF] text-[#0A192A] border-[#DCECF2] hover:border-[#00A6E8]"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">tune</span>
                <span>Filters</span>
                {selectedRange !== "all" && (
                  <span className="w-2 h-2 rounded-full bg-[#00A6E8]" />
                )}
              </button>
            </div>

            {/* Expandable Advanced Filters Panel */}
            <AnimatePresence>
              {filtersOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-4 mt-4 border-t border-[#DCECF2] grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    {/* Investment Range Pills */}
                    <div className="md:col-span-10">
                      <span className="block text-[11px] font-bold text-[#5F7180] uppercase tracking-wider mb-2">
                        Investment Range Filter
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {INVESTMENT_RANGES.map((range) => {
                          const isActive = selectedRange === range.id;
                          return (
                            <button
                              key={range.id}
                              type="button"
                              onClick={() => setSelectedRange(range.id)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                                isActive
                                  ? "bg-[#00658F] text-white border-[#00658F] shadow-sm"
                                  : "bg-white text-[#5F7180] border-[#DCECF2] hover:border-[#00A6E8] hover:text-[#0A192A]"
                              }`}
                            >
                              {range.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Reset Button */}
                    <div className="md:col-span-2 flex md:justify-end">
                      <button
                        type="button"
                        onClick={resetFilters}
                        className="text-xs font-bold text-[#00A6E8] hover:text-[#00658F] hover:underline"
                      >
                        Reset All Filters
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* ============================================================ */}
        {/* OPPORTUNITIES GRID */}
        {/* ============================================================ */}
        <section className="w-full py-6 sm:py-10 md:py-14">
          <div className="w-full max-w-[1280px] mx-auto px-3.5 sm:px-6 lg:px-12">
            {/* Active Filters Summary Header & Sorting Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 sm:mb-8 pb-3 border-b border-[#DCECF2] gap-3 sm:gap-4">
              <div className="text-xs sm:text-sm text-[#5F7180]">
                Showing <strong className="text-[#0A192A]">{filteredOpps.length}</strong> of{" "}
                <strong className="text-[#0A192A]">
                  {selectedCategory.toLowerCase() === "all"
                    ? allOpportunities.length
                    : (categoryCounts[selectedCategory] ??
                        allOpportunities.filter(
                          (o) => o.category.toLowerCase() === selectedCategory.toLowerCase()
                        ).length)}
                </strong>{" "}
                opportunities
                {selectedCategory.toLowerCase() !== "all" && ` in ${selectedCategory}`}
                {selectedSector !== "All Sectors" && ` • ${selectedSector}`}
              </div>

              <div className="flex items-center gap-3 sm:gap-4 flex-wrap sm:flex-nowrap">
                {/* Sort Dropdown */}
                <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-[#5F7180]">
                  <span className="font-semibold shrink-0">Sort:</span>
                  <select
                    value={sortBy}
                    onChange={(e) =>
                      setSortBy(e.target.value as "newest" | "low-high" | "high-low" | "title")
                    }
                    className="bg-white border border-[#DCECF2] rounded-lg px-2 sm:px-2.5 py-1 sm:py-1.5 text-xs text-[#0A192A] font-medium focus:outline-none focus:border-[#00A6E8] cursor-pointer"
                  >
                    <option value="newest">Newest First</option>
                    <option value="low-high">Investment: Low to High</option>
                    <option value="high-low">Investment: High to Low</option>
                    <option value="title">Title: A-Z</option>
                  </select>
                </div>

                {(searchQuery ||
                  selectedCategory !== "All" ||
                  selectedSector !== "All Sectors" ||
                  selectedRange !== "all") && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="text-xs font-bold text-[#00A6E8] hover:underline shrink-0"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>

            {/* Grid or Clean Empty States (2x2 on mobile, 3-col on desktop) */}
            {loading ? (
              <div className="py-24 text-center text-slate-400">
                <div className="w-9 h-9 border-3 border-[#00A6E8] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm font-semibold text-[#5F7180]">Loading published opportunities...</p>
              </div>
            ) : filteredOpps.length > 0 ? (
              <div className="grid grid-cols-1 min-[500px]:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-6 lg:gap-8">
                {filteredOpps.map((opp) => (
                  <OpportunityCard
                    key={opp.id}
                    opportunity={opp}
                    onInterested={handleInterested}
                  />
                ))}
              </div>
            ) : allOpportunities.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-[#DCECF2] p-8 max-w-lg mx-auto shadow-sm">
                <div className="w-14 h-14 rounded-full bg-[#EBF6FC] text-[#00A6E8] flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-[28px]">storefront</span>
                </div>
                <h3 className="text-xl font-bold text-[#0A192A] mb-2 font-heading">
                  No Approved Opportunities Yet
                </h3>
                <p className="text-sm text-[#5F7180] mb-6 leading-relaxed">
                  There are currently no published opportunities available in the directory. New verified business listings will appear here as they are reviewed and approved.
                </p>
                <Link
                  href="/profile/listings"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#00A6E8] hover:bg-[#0093CE] text-white font-bold text-xs rounded-xl transition-colors shadow-sm"
                >
                  <span className="material-symbols-outlined text-[16px]">add_circle</span>
                  <span>List Your Venture</span>
                </Link>
              </div>
            ) : (
              <div className="text-center py-20 bg-white rounded-3xl border border-[#DCECF2] p-8 max-w-lg mx-auto shadow-sm">
                <div className="w-14 h-14 rounded-full bg-[#EBF6FC] text-[#00A6E8] flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-[28px]">search_off</span>
                </div>
                <h3 className="text-xl font-bold text-[#0A192A] mb-2 font-heading">
                  No Matching Opportunities Found
                </h3>
                <p className="text-sm text-[#5F7180] mb-6 leading-relaxed">
                  Try adjusting your search terms, selecting a broader category, or resetting your investment range filter.
                </p>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="px-6 py-2.5 bg-[#00A6E8] hover:bg-[#0093CE] text-white font-bold text-xs rounded-xl transition-colors shadow-sm"
                >
                  Reset All Filters
                </button>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Enquiry Modal */}
      <OpportunityEnquiryModal
        opportunity={selectedOpportunity}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />

      <Footer />
    </div>
  );
}

export default function OpportunitiesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F6FAFF] text-sm text-[#5F7180]">
          Loading opportunities...
        </div>
      }
    >
      <OpportunitiesContent />
    </Suspense>
  );
}
