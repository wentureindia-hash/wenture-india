"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { OpportunityCard } from "@/components/cards/opportunity-card";
import { InvestorCard } from "@/components/cards/investor-card";
import { OpportunityEnquiryModal } from "@/components/forms/opportunity-enquiry-modal";
import {
  MasterSearchCategory,
  MASTER_SEARCH_CATEGORIES,
  UnifiedSearchResult,
  getMasterSearchDataset,
  filterAndRankSearchResults,
} from "@/lib/search/master-search";
import { INVESTMENT_RANGES, Opportunity } from "@/lib/constants/opportunities";
import { SECTORS } from "@/lib/constants/sectors";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

const ITEMS_PER_PAGE = 12;

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL query params
  const initialQuery = searchParams.get("q") || "";
  const initialCategory = (searchParams.get("category") as MasterSearchCategory) || "all";
  const initialSector = searchParams.get("sector") || "all";
  const initialLocation = searchParams.get("location") || "all";
  const initialRange = searchParams.get("range") || "all";
  const initialSort = (searchParams.get("sort") as "relevance" | "newest" | "title" | "range-low-high" | "range-high-low") || "relevance";

  // Filter & Search states
  const [query, setQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState<MasterSearchCategory>(initialCategory);
  const [selectedSector, setSelectedSector] = useState(initialSector);
  const [selectedLocation, setSelectedLocation] = useState(initialLocation);
  const [selectedRange, setSelectedRange] = useState(initialRange);
  const [sortBy, setSortBy] = useState<"relevance" | "newest" | "title" | "range-low-high" | "range-high-low">(initialSort);

  // UI state
  const [dataset, setDataset] = useState<UnifiedSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  // Enquiry modal state
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [enquiryModalOpen, setEnquiryModalOpen] = useState(false);

  // Fetch verified search dataset
  useEffect(() => {
    async function fetchSearchData() {
      setLoading(true);
      const res = await getMasterSearchDataset();
      if (res.data) {
        setDataset(res.data);
      }
      setLoading(false);
    }
    fetchSearchData();
  }, []);

  // Sync state if URL query changes
  useEffect(() => {
    const q = searchParams.get("q") || "";
    const cat = (searchParams.get("category") as MasterSearchCategory) || "all";
    const sec = searchParams.get("sector") || "all";
    const loc = searchParams.get("location") || "all";
    const rng = searchParams.get("range") || "all";
    const srt = (searchParams.get("sort") as "relevance" | "newest" | "title" | "range-low-high" | "range-high-low") || "relevance";

    setQuery(q);
    setSelectedCategory(cat);
    setSelectedSector(sec);
    setSelectedLocation(loc);
    setSelectedRange(rng);
    setSortBy(srt);
    setVisibleCount(ITEMS_PER_PAGE);
  }, [searchParams]);

  // Update URL helper
  const updateUrlParams = (newParams: {
    q?: string;
    category?: MasterSearchCategory;
    sector?: string;
    location?: string;
    range?: string;
    sort?: string;
  }) => {
    const current = new URLSearchParams(searchParams.toString());

    if (newParams.q !== undefined) {
      if (newParams.q) current.set("q", newParams.q);
      else current.delete("q");
    }
    if (newParams.category !== undefined) {
      if (newParams.category && newParams.category !== "all") current.set("category", newParams.category);
      else current.delete("category");
    }
    if (newParams.sector !== undefined) {
      if (newParams.sector && newParams.sector !== "all") current.set("sector", newParams.sector);
      else current.delete("sector");
    }
    if (newParams.location !== undefined) {
      if (newParams.location && newParams.location !== "all") current.set("location", newParams.location);
      else current.delete("location");
    }
    if (newParams.range !== undefined) {
      if (newParams.range && newParams.range !== "all") current.set("range", newParams.range);
      else current.delete("range");
    }
    if (newParams.sort !== undefined) {
      if (newParams.sort && newParams.sort !== "relevance") current.set("sort", newParams.sort);
      else current.delete("sort");
    }

    const qs = current.toString();
    router.replace(`/search${qs ? `?${qs}` : ""}`, { scroll: false });
  };

  // Compute unique locations for filter dropdown
  const uniqueLocations = useMemo(() => {
    const locSet = new Set<string>();
    dataset.forEach((item) => {
      if (item.location && item.location !== "India") {
        // Strip state/country if comma-separated
        const parts = item.location.split(",");
        const primary = parts[0]?.trim();
        if (primary && primary.length > 1) {
          locSet.add(primary);
        }
      }
    });
    return Array.from(locSet).sort();
  }, [dataset]);

  // Compute dynamic category counts based on current search query
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0 };
    MASTER_SEARCH_CATEGORIES.forEach((cat) => {
      counts[cat.id] = 0;
    });

    dataset.forEach((item) => {
      // Query match check
      let matchesQuery = true;
      if (query.trim()) {
        const qLower = query.toLowerCase().trim();
        const textToMatch = [
          item.title,
          item.sector,
          item.location,
          item.description,
          ...item.tags,
        ]
          .join(" ")
          .toLowerCase();
        matchesQuery = textToMatch.includes(qLower);
      }

      if (matchesQuery) {
        counts.all = (counts.all || 0) + 1;
        if (item.category && counts[item.category] !== undefined) {
          counts[item.category] = (counts[item.category] || 0) + 1;
        }
      }
    });

    return counts;
  }, [dataset, query]);

  // Execute unified filtering and ranking
  const filteredResults = useMemo(() => {
    return filterAndRankSearchResults(dataset, {
      query,
      category: selectedCategory,
      sector: selectedSector,
      location: selectedLocation,
      investmentRange: selectedRange,
      sortBy,
    });
  }, [dataset, query, selectedCategory, selectedSector, selectedLocation, selectedRange, sortBy]);

  // Pagination slice
  const paginatedResults = useMemo(() => {
    return filteredResults.slice(0, visibleCount);
  }, [filteredResults, visibleCount]);

  const hasMore = visibleCount < filteredResults.length;

  // Active category config
  const activeCategoryMeta = useMemo(() => {
    return (
      MASTER_SEARCH_CATEGORIES.find((c) => c.id === selectedCategory) ||
      MASTER_SEARCH_CATEGORIES[0]
    );
  }, [selectedCategory]);

  const handleInterested = (opp: Opportunity) => {
    setSelectedOpportunity(opp);
    setEnquiryModalOpen(true);
  };

  const resetAllFilters = () => {
    setQuery("");
    setSelectedCategory("all");
    setSelectedSector("all");
    setSelectedLocation("all");
    setSelectedRange("all");
    setSortBy("relevance");
    router.replace("/search", { scroll: false });
  };

  const isFiltered =
    selectedCategory !== "all" ||
    selectedSector !== "all" ||
    selectedLocation !== "all" ||
    selectedRange !== "all" ||
    query.trim() !== "";

  return (
    <div className="min-h-screen bg-[#F4FAFD] flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 w-full max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-5 sm:py-8">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="mb-4">
          <ol className="flex items-center gap-1.5 text-xs text-[#5F7180]">
            <li>
              <Link href="/" className="hover:text-[#00A6E8] transition-colors">
                Home
              </Link>
            </li>
            <li>
              <span className="material-symbols-outlined text-[13px] text-slate-400">
                chevron_right
              </span>
            </li>
            <li className="font-semibold text-[#0A192A] truncate">Global Search</li>
            {query && (
              <>
                <li>
                  <span className="material-symbols-outlined text-[13px] text-slate-400">
                    chevron_right
                  </span>
                </li>
                <li className="text-[#00658F] font-bold truncate max-w-[150px] sm:max-w-[250px]">
                  &ldquo;{query}&rdquo;
                </li>
              </>
            )}
          </ol>
        </nav>

        {/* Page Header / Search Summary Banner */}
        <div className="bg-white border border-[#DCECF2] rounded-2xl p-4 sm:p-6 mb-6 shadow-[0px_4px_20px_rgba(10,25,42,0.03)] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="bg-[#EBF6FC] text-[#00658F] border border-[#DCECF2] text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">
                  {activeCategoryMeta.icon}
                </span>
                {activeCategoryMeta.label}
              </span>
              <span className="text-xs text-[#5F7180]">
                {loading ? "Searching..." : `${filteredResults.length} matching result${filteredResults.length === 1 ? "" : "s"}`}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#0A192A] font-heading tracking-tight">
              {query ? (
                <>
                  Search results for <span className="text-[#00658F]">&ldquo;{query}&rdquo;</span>
                </>
              ) : (
                "Discover All Businesses & Opportunities"
              )}
            </h1>
            <p className="text-xs sm:text-sm text-[#5F7180] mt-1 max-w-2xl">
              Explore verified ventures, angel investors, franchises, startups, and cross-border trade listings across India.
            </p>
          </div>

          {/* Quick Sort Dropdown + Mobile Filter Trigger */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Mobile Filter Button */}
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="lg:hidden flex items-center gap-1.5 px-3 py-2 bg-[#F4FAFD] border border-[#DCECF2] rounded-xl text-xs font-bold text-[#0A192A] hover:bg-white transition-colors"
            >
              <span className="material-symbols-outlined text-[16px] text-[#00A6E8]">
                tune
              </span>
              <span>Filters</span>
              {isFiltered && (
                <span className="w-2 h-2 rounded-full bg-[#00A6E8]" />
              )}
            </button>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 bg-[#F4FAFD] border border-[#DCECF2] rounded-xl px-2.5 py-1.5">
              <span className="material-symbols-outlined text-[16px] text-slate-400">
                sort
              </span>
              <label htmlFor="search-sort-select" className="sr-only">
                Sort results by
              </label>
              <select
                id="search-sort-select"
                value={sortBy}
                onChange={(e) => {
                  const s = e.target.value as "relevance" | "newest" | "title" | "range-low-high" | "range-high-low";
                  setSortBy(s);
                  updateUrlParams({ sort: s });
                }}
                className="bg-transparent text-xs font-bold text-[#0A192A] focus:outline-none cursor-pointer pr-1"
              >
                <option value="relevance">Most Relevant</option>
                <option value="newest">Newest First</option>
                <option value="range-low-high">Investment: Low to High</option>
                <option value="range-high-low">Investment: High to Low</option>
                <option value="title">Title: A to Z</option>
              </select>
            </div>
          </div>
        </div>

        {/* 8 Master Categories Tab Bar */}
        <div className="mb-6 -mx-3.5 sm:mx-0 px-3.5 sm:px-0 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-2 pb-1 min-w-max">
            {MASTER_SEARCH_CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              const count = categoryCounts[cat.id] || 0;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    updateUrlParams({ category: cat.id });
                  }}
                  className={cn(
                    "px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap",
                    isSelected
                      ? "bg-[#00658F] text-white shadow-xs"
                      : "bg-white border border-[#DCECF2] text-[#5F7180] hover:text-[#0A192A] hover:bg-[#F4FAFD]"
                  )}
                >
                  <span
                    className={cn(
                      "material-symbols-outlined text-[16px]",
                      isSelected ? "text-white" : "text-[#00A6E8]"
                    )}
                  >
                    {cat.icon}
                  </span>
                  <span>{cat.label}</span>
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-0.5",
                      isSelected
                        ? "bg-white/20 text-white"
                        : "bg-slate-100 text-slate-600"
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content Layout: Sidebar + Results Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Desktop Left Filter Sidebar */}
          <aside className="hidden lg:block lg:col-span-1 bg-white border border-[#DCECF2] rounded-2xl p-5 shadow-[0px_4px_20px_rgba(10,25,42,0.03)] space-y-5 sticky top-36">
            <div className="flex items-center justify-between border-b border-[#DCECF2] pb-3">
              <h2 className="text-sm font-extrabold text-[#0A192A] uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-[#00A6E8]">
                  tune
                </span>
                <span>Filters</span>
              </h2>
              {isFiltered && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="text-xs text-[#00658F] hover:text-[#004D6D] font-bold cursor-pointer"
                >
                  Reset All
                </button>
              )}
            </div>

            {/* Filter 1: Industry / Sector */}
            <div className="space-y-1.5">
              <label htmlFor="desktop-filter-sector" className="text-xs font-bold text-[#0A192A] block">
                Industry &amp; Sector
              </label>
              <select
                id="desktop-filter-sector"
                value={selectedSector}
                onChange={(e) => {
                  setSelectedSector(e.target.value);
                  updateUrlParams({ sector: e.target.value });
                }}
                className="w-full text-xs bg-[#F4FAFD] border border-[#DCECF2] rounded-xl px-3 py-2 text-[#0A192A] font-semibold focus:outline-none focus:border-[#00A6E8]"
              >
                <option value="all">All Sectors &amp; Industries</option>
                {SECTORS.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter 2: Location */}
            <div className="space-y-1.5">
              <label htmlFor="desktop-filter-location" className="text-xs font-bold text-[#0A192A] block">
                Location
              </label>
              <select
                id="desktop-filter-location"
                value={selectedLocation}
                onChange={(e) => {
                  setSelectedLocation(e.target.value);
                  updateUrlParams({ location: e.target.value });
                }}
                className="w-full text-xs bg-[#F4FAFD] border border-[#DCECF2] rounded-xl px-3 py-2 text-[#0A192A] font-semibold focus:outline-none focus:border-[#00A6E8]"
              >
                <option value="all">All Locations (Pan-India)</option>
                {uniqueLocations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter 3: Investment Range */}
            <div className="space-y-1.5">
              <label htmlFor="desktop-filter-range" className="text-xs font-bold text-[#0A192A] block">
                Investment Range
              </label>
              <select
                id="desktop-filter-range"
                value={selectedRange}
                onChange={(e) => {
                  setSelectedRange(e.target.value);
                  updateUrlParams({ range: e.target.value });
                }}
                className="w-full text-xs bg-[#F4FAFD] border border-[#DCECF2] rounded-xl px-3 py-2 text-[#0A192A] font-semibold focus:outline-none focus:border-[#00A6E8]"
              >
                {INVESTMENT_RANGES.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Platform Guarantee Banner */}
            <div className="bg-[#EBF6FC]/60 border border-[#DCECF2] rounded-xl p-3 text-xs text-[#00658F] space-y-1">
              <div className="font-extrabold flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-emerald-600">
                  verified
                </span>
                <span>Verified Profiles</span>
              </div>
              <p className="text-[11px] text-[#5F7180] leading-snug">
                Every business listing and investor profile undergoes verification before appearing in search results.
              </p>
            </div>
          </aside>

          {/* Right Main Results Section */}
          <div className="lg:col-span-3 space-y-6">
            {/* Loading Skeletons */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="bg-white border border-[#DCECF2] rounded-2xl p-4 space-y-3 animate-pulse shadow-xs"
                  >
                    <div className="h-36 bg-slate-200 rounded-xl" />
                    <div className="h-4 bg-slate-200 rounded w-3/4" />
                    <div className="h-3 bg-slate-200 rounded w-1/2" />
                    <div className="h-8 bg-slate-100 rounded-lg" />
                  </div>
                ))}
              </div>
            ) : filteredResults.length > 0 ? (
              <>
                {/* Results Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
                  {paginatedResults.map((item) => {
                    // 1. If it has rawOpportunity attached, render OpportunityCard
                    if (item.entityType === "opportunity" && item.rawOpportunity) {
                      return (
                        <div key={item.id} className="h-full flex flex-col">
                          <OpportunityCard
                            opportunity={item.rawOpportunity}
                            onInterested={handleInterested}
                          />
                        </div>
                      );
                    }

                    // 2. If it has rawInvestor attached, render InvestorCard
                    if (item.entityType === "investor" && item.rawInvestor) {
                      return (
                        <div key={item.id} className="h-full flex flex-col">
                          <InvestorCard investor={item.rawInvestor} />
                        </div>
                      );
                    }

                    // 3. Fallback generic card
                    return (
                      <article
                        key={item.id}
                        className="bg-white border border-[#DCECF2] hover:border-[#00A6E8]/60 rounded-2xl p-5 shadow-[0px_4px_20px_rgba(10,25,42,0.03)] hover:shadow-[0px_8px_30px_rgba(10,25,42,0.08)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="bg-[#EBF6FC] text-[#00658F] text-[10px] font-extrabold uppercase px-2 py-0.5 rounded">
                              {item.categoryBadge}
                            </span>
                            <span className="text-[11px] text-[#5F7180] flex items-center gap-0.5">
                              <span className="material-symbols-outlined text-[13px] text-[#00A6E8]">
                                location_on
                              </span>
                              {item.location}
                            </span>
                          </div>
                          <h3 className="text-base font-bold text-[#0A192A] hover:text-[#00A6E8] transition-colors leading-tight">
                            <Link href={item.detailUrl}>{item.title}</Link>
                          </h3>
                          <p className="text-xs text-[#5F7180] line-clamp-2 leading-relaxed">
                            {item.description}
                          </p>
                        </div>
                        <div className="pt-4 mt-3 border-t border-[#DCECF2] flex items-center justify-between">
                          <span className="text-xs font-bold text-[#00658F]">
                            {item.investmentRange}
                          </span>
                          <Link
                            href={item.detailUrl}
                            className="text-xs font-bold text-white bg-[#00A6E8] hover:bg-[#0093CE] px-3 py-1.5 rounded-lg transition-colors"
                          >
                            View
                          </Link>
                        </div>
                      </article>
                    );
                  })}
                </div>

                {/* Load More Button */}
                {hasMore && (
                  <div className="text-center pt-4 pb-2">
                    <button
                      type="button"
                      onClick={() => setVisibleCount((prev) => prev + ITEMS_PER_PAGE)}
                      className="px-6 py-2.5 bg-white border border-[#DCECF2] hover:border-[#00A6E8] text-[#0A192A] hover:text-[#00658F] font-bold text-xs rounded-xl shadow-xs transition-colors inline-flex items-center gap-2 cursor-pointer"
                    >
                      <span>
                        Load More Results ({paginatedResults.length} of {filteredResults.length})
                      </span>
                      <span className="material-symbols-outlined text-[16px]">
                        expand_more
                      </span>
                    </button>
                  </div>
                )}
              </>
            ) : (
              /* Empty Results State */
              <div className="text-center py-16 sm:py-20 bg-white rounded-3xl border border-[#DCECF2] p-6 sm:p-10 max-w-xl mx-auto shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-[#EBF6FC] text-[#00A6E8] flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-[32px]">
                    search_off
                  </span>
                </div>
                <h2 className="text-xl font-bold text-[#0A192A] mb-2 font-heading">
                  No matching results found
                </h2>
                <p className="text-xs sm:text-sm text-[#5F7180] mb-6 leading-relaxed max-w-md mx-auto">
                  {query
                    ? `We couldn't find any listings matching "${query}" with the current filters.`
                    : "There are currently no listings matching the selected filters."}
                </p>

                {/* Helpful Search Tips */}
                <div className="bg-[#F4FAFD] border border-[#DCECF2] rounded-xl p-4 text-left text-xs text-[#5F7180] space-y-1.5 mb-6 max-w-md mx-auto">
                  <div className="font-bold text-[#0A192A] flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px] text-[#00A6E8]">
                      lightbulb
                    </span>
                    <span>Search Recommendations:</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-[11.5px]">
                    <li>Check your search term for typos or misspellings.</li>
                    <li>Try broader keywords like &ldquo;Tech&rdquo;, &ldquo;Cafe&rdquo;, or &ldquo;Mumbai&rdquo;.</li>
                    <li>Switch the category tab to &ldquo;All&rdquo; to expand the search.</li>
                    <li>Reset filters to explore all available verified ventures.</li>
                  </ul>
                </div>

                <div className="flex items-center justify-center gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={resetAllFilters}
                    className="px-5 py-2.5 bg-[#00658F] hover:bg-[#004D6D] text-white font-bold text-xs rounded-xl transition-colors shadow-xs cursor-pointer"
                  >
                    Reset All Filters
                  </button>
                  <Link
                    href="/profile/listings"
                    className="px-5 py-2.5 bg-white border border-[#DCECF2] hover:border-[#00A6E8] text-[#0A192A] font-bold text-xs rounded-xl transition-colors shadow-xs"
                  >
                    List Your Venture
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Mobile Filters Slide-Over Drawer */}
      <AnimatePresence>
        {mobileDrawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileDrawerOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            />

            {/* Slide Sheet */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              className="relative ml-auto w-full max-w-xs sm:max-w-sm bg-white h-full shadow-2xl p-5 flex flex-col justify-between overflow-y-auto z-10"
            >
              <div className="space-y-5">
                <div className="flex items-center justify-between border-b border-[#DCECF2] pb-3">
                  <div className="font-bold text-sm text-[#0A192A] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px] text-[#00A6E8]">
                      tune
                    </span>
                    <span>Search Filters</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileDrawerOpen(false)}
                    className="p-1 text-slate-400 hover:text-[#0A192A] rounded-lg"
                    aria-label="Close filters drawer"
                  >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                </div>

                {/* Mobile Filter 1: Sector */}
                <div className="space-y-1.5">
                  <label htmlFor="mobile-filter-sector" className="text-xs font-bold text-[#0A192A] block">
                    Industry &amp; Sector
                  </label>
                  <select
                    id="mobile-filter-sector"
                    value={selectedSector}
                    onChange={(e) => {
                      setSelectedSector(e.target.value);
                      updateUrlParams({ sector: e.target.value });
                    }}
                    className="w-full text-xs bg-[#F4FAFD] border border-[#DCECF2] rounded-xl px-3 py-2.5 text-[#0A192A] font-semibold focus:outline-none"
                  >
                    <option value="all">All Sectors &amp; Industries</option>
                    {SECTORS.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Mobile Filter 2: Location */}
                <div className="space-y-1.5">
                  <label htmlFor="mobile-filter-location" className="text-xs font-bold text-[#0A192A] block">
                    Location
                  </label>
                  <select
                    id="mobile-filter-location"
                    value={selectedLocation}
                    onChange={(e) => {
                      setSelectedLocation(e.target.value);
                      updateUrlParams({ location: e.target.value });
                    }}
                    className="w-full text-xs bg-[#F4FAFD] border border-[#DCECF2] rounded-xl px-3 py-2.5 text-[#0A192A] font-semibold focus:outline-none"
                  >
                    <option value="all">All Locations (Pan-India)</option>
                    {uniqueLocations.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Mobile Filter 3: Range */}
                <div className="space-y-1.5">
                  <label htmlFor="mobile-filter-range" className="text-xs font-bold text-[#0A192A] block">
                    Investment Range
                  </label>
                  <select
                    id="mobile-filter-range"
                    value={selectedRange}
                    onChange={(e) => {
                      setSelectedRange(e.target.value);
                      updateUrlParams({ range: e.target.value });
                    }}
                    className="w-full text-xs bg-[#F4FAFD] border border-[#DCECF2] rounded-xl px-3 py-2.5 text-[#0A192A] font-semibold focus:outline-none"
                  >
                    {INVESTMENT_RANGES.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Drawer Bottom Actions */}
              <div className="pt-6 border-t border-[#DCECF2] space-y-2">
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="w-full py-2.5 bg-[#00658F] text-white font-bold text-xs rounded-xl shadow-xs"
                >
                  Apply &amp; View Results ({filteredResults.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetAllFilters();
                    setMobileDrawerOpen(false);
                  }}
                  className="w-full py-2 bg-[#F4FAFD] border border-[#DCECF2] text-[#5F7180] font-semibold text-xs rounded-xl"
                >
                  Reset All Filters
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Enquiry Modal */}
      <OpportunityEnquiryModal
        opportunity={selectedOpportunity}
        isOpen={enquiryModalOpen}
        onClose={() => setEnquiryModalOpen(false)}
      />

      <Footer />
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F4FAFD] flex items-center justify-center">
          <div className="w-10 h-10 border-3 border-[#00A6E8] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}

