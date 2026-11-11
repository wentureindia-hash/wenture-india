"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { InvestorCard } from "@/components/cards/investor-card";
import {
  InvestorProfile,
  getPublishedInvestors,
  INVESTOR_TYPES,
  INVESTMENT_STAGES,
  INVESTOR_RANGES,
} from "@/lib/firebase/investors";
import { SECTORS } from "@/lib/constants/sectors";
import { motion, AnimatePresence } from "framer-motion";

export default function FindInvestorsPage() {
  const [investors, setInvestors] = useState<InvestorProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedRange, setSelectedRange] = useState<string>("all");
  const [selectedSector, setSelectedSector] = useState<string>("all");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedStage, setSelectedStage] = useState<string>("all");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await getPublishedInvestors();
      if (!res.error) {
        setInvestors(res.investors);
      }
      setLoading(false);
    }
    load();
  }, []);

  // Compute unique locations from loaded investors
  const availableLocations = useMemo(() => {
    const set = new Set<string>();
    investors.forEach((i) => {
      if (i.location) set.add(i.location);
    });
    return Array.from(set).sort();
  }, [investors]);

  // Client-side filtering logic
  const filteredInvestors = useMemo(() => {
    return investors.filter((inv) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = inv.investorName?.toLowerCase().includes(q);
        const matchIntro = inv.shortIntroduction?.toLowerCase().includes(q);
        const matchExp = inv.experience?.toLowerCase().includes(q);
        const matchLoc = inv.location?.toLowerCase().includes(q);
        const matchSec = inv.preferredSectors?.some((s) => s.toLowerCase().includes(q));
        const matchExpArea = inv.areasOfExpertise?.some((e) => e.toLowerCase().includes(q));

        if (!matchName && !matchIntro && !matchExp && !matchLoc && !matchSec && !matchExpArea) {
          return false;
        }
      }

      // 2. Investor Type Filter
      if (selectedType !== "all" && inv.investorType !== selectedType) {
        return false;
      }

      // 3. Investment Range Filter
      if (selectedRange !== "all" && inv.investmentRange !== selectedRange) {
        return false;
      }

      // 4. Sector Filter
      if (selectedSector !== "all") {
        if (!inv.preferredSectors.some((s) => s.toLowerCase() === selectedSector.toLowerCase())) {
          return false;
        }
      }

      // 5. Location Filter
      if (selectedLocation !== "all" && inv.location !== selectedLocation) {
        return false;
      }

      // 6. Investment Stage Filter
      if (selectedStage !== "all" && inv.investmentStage !== selectedStage) {
        return false;
      }

      return true;
    });
  }, [
    investors,
    searchQuery,
    selectedType,
    selectedRange,
    selectedSector,
    selectedLocation,
    selectedStage,
  ]);

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedType("all");
    setSelectedRange("all");
    setSelectedSector("all");
    setSelectedLocation("all");
    setSelectedStage("all");
  };

  const hasActiveFilters =
    searchQuery ||
    selectedType !== "all" ||
    selectedRange !== "all" ||
    selectedSector !== "all" ||
    selectedLocation !== "all" ||
    selectedStage !== "all";

  return (
    <div className="flex flex-col min-h-screen bg-[#F6FAFF] selection:bg-[#00A6E8] selection:text-white">
      <Navbar />

      <main className="flex-grow">
        {/* Header Hero Banner */}
        <section className="bg-white border-b border-[#DCECF2] py-8 sm:py-12 md:py-16">
          <div className="w-full max-w-[1240px] mx-auto px-3.5 sm:px-8">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="max-w-3xl"
            >
              <span className="text-xs font-bold text-[#00A6E8] uppercase tracking-wider block mb-1 sm:mb-2">
                Capital &amp; Venture Directory
              </span>
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-[#0A192A] tracking-tight font-heading mb-2 sm:mb-4">
                Find Investors
              </h1>
              <p className="text-xs sm:text-base md:text-lg text-[#5F7180] leading-relaxed">
                Explore investors, capital partners and business-focused investment profiles across sectors.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Filter Bar & Content Section */}
        <section className="py-6 sm:py-10 md:py-12">
          <div className="w-full max-w-[1240px] mx-auto px-3.5 sm:px-8 space-y-6 sm:space-y-8">
            {/* Desktop Filters Card */}
            <div className="bg-white border border-[#DCECF2] rounded-2xl p-5 sm:p-6 shadow-sm">
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
                {/* Search Bar */}
                <div className="relative flex-1">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">
                    search
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by investor name, expertise, sector, or keywords..."
                    className="w-full pl-10 pr-4 py-2.5 bg-[#F4FAFD] border border-[#DCECF2] rounded-xl text-xs sm:text-sm text-[#0A192A] focus:outline-none focus:border-[#00A6E8]"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#0A192A]"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  )}
                </div>

                {/* Filter Trigger Button (Mobile) */}
                <div className="flex lg:hidden items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
                    className="px-4 py-2.5 bg-[#F4FAFD] border border-[#DCECF2] rounded-xl text-xs font-bold text-[#0A192A] flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[18px]">tune</span>
                    <span>Filters {hasActiveFilters && "•"}</span>
                  </button>

                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="text-xs font-bold text-rose-600 hover:underline"
                    >
                      Reset All
                    </button>
                  )}
                </div>

                {/* Quick Type Pills (Desktop) */}
                <div className="hidden lg:flex items-center gap-1.5 p-1 bg-[#F4FAFD] border border-[#DCECF2] rounded-xl overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setSelectedType("all")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                      selectedType === "all"
                        ? "bg-[#00A6E8] text-white shadow-sm"
                        : "text-[#5F7180] hover:text-[#0A192A]"
                    }`}
                  >
                    All Types
                  </button>
                  {INVESTOR_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setSelectedType(type)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                        selectedType === type
                          ? "bg-[#00A6E8] text-white shadow-sm"
                          : "text-[#5F7180] hover:text-[#0A192A]"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Advanced Dropdowns Row (Desktop) */}
              <div className="hidden lg:grid grid-cols-4 gap-4 pt-4 mt-4 border-t border-[#DCECF2]">
                {/* Investment Range */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-[#5F7180] tracking-wider mb-1">
                    Investment Range
                  </label>
                  <select
                    value={selectedRange}
                    onChange={(e) => setSelectedRange(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F4FAFD] border border-[#DCECF2] rounded-xl text-xs text-[#0A192A] focus:outline-none focus:border-[#00A6E8]"
                  >
                    <option value="all">All Investment Ranges</option>
                    {INVESTOR_RANGES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Preferred Sector */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-[#5F7180] tracking-wider mb-1">
                    Target Sector
                  </label>
                  <select
                    value={selectedSector}
                    onChange={(e) => setSelectedSector(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F4FAFD] border border-[#DCECF2] rounded-xl text-xs text-[#0A192A] focus:outline-none focus:border-[#00A6E8]"
                  >
                    <option value="all">All Sectors</option>
                    {SECTORS.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-[#5F7180] tracking-wider mb-1">
                    Location
                  </label>
                  <select
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F4FAFD] border border-[#DCECF2] rounded-xl text-xs text-[#0A192A] focus:outline-none focus:border-[#00A6E8]"
                  >
                    <option value="all">All Locations</option>
                    {availableLocations.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Investment Stage */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-[#5F7180] tracking-wider mb-1">
                    Investment Stage
                  </label>
                  <select
                    value={selectedStage}
                    onChange={(e) => setSelectedStage(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F4FAFD] border border-[#DCECF2] rounded-xl text-xs text-[#0A192A] focus:outline-none focus:border-[#00A6E8]"
                  >
                    <option value="all">All Stages</option>
                    {INVESTMENT_STAGES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Mobile Filter Drawer */}
              <AnimatePresence>
                {mobileFiltersOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="lg:hidden pt-4 mt-4 border-t border-[#DCECF2] space-y-4"
                  >
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-[#5F7180] tracking-wider mb-1">
                        Investor Type
                      </label>
                      <select
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
                        className="w-full px-3 py-2 bg-[#F4FAFD] border border-[#DCECF2] rounded-xl text-xs text-[#0A192A]"
                      >
                        <option value="all">All Types</option>
                        {INVESTOR_TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-[#5F7180] tracking-wider mb-1">
                        Investment Range
                      </label>
                      <select
                        value={selectedRange}
                        onChange={(e) => setSelectedRange(e.target.value)}
                        className="w-full px-3 py-2 bg-[#F4FAFD] border border-[#DCECF2] rounded-xl text-xs text-[#0A192A]"
                      >
                        <option value="all">All Ranges</option>
                        {INVESTOR_RANGES.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-[#5F7180] tracking-wider mb-1">
                        Target Sector
                      </label>
                      <select
                        value={selectedSector}
                        onChange={(e) => setSelectedSector(e.target.value)}
                        className="w-full px-3 py-2 bg-[#F4FAFD] border border-[#DCECF2] rounded-xl text-xs text-[#0A192A]"
                      >
                        <option value="all">All Sectors</option>
                        {SECTORS.map((s) => (
                          <option key={s.id} value={s.name}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-[#5F7180] tracking-wider mb-1">
                        Location
                      </label>
                      <select
                        value={selectedLocation}
                        onChange={(e) => setSelectedLocation(e.target.value)}
                        className="w-full px-3 py-2 bg-[#F4FAFD] border border-[#DCECF2] rounded-xl text-xs text-[#0A192A]"
                      >
                        <option value="all">All Locations</option>
                        {availableLocations.map((loc) => (
                          <option key={loc} value={loc}>{loc}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold uppercase text-[#5F7180] tracking-wider mb-1">
                        Investment Stage
                      </label>
                      <select
                        value={selectedStage}
                        onChange={(e) => setSelectedStage(e.target.value)}
                        className="w-full px-3 py-2 bg-[#F4FAFD] border border-[#DCECF2] rounded-xl text-xs text-[#0A192A]"
                      >
                        <option value="all">All Stages</option>
                        {INVESTMENT_STAGES.map((st) => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Results Count & Reset indicator */}
            <div className="flex items-center justify-between text-xs text-[#5F7180]">
              <p>
                Showing <strong>{filteredInvestors.length}</strong> published investor profiles
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="hidden lg:inline-block font-bold text-[#00A6E8] hover:underline"
                >
                  Reset all filters
                </button>
              )}
            </div>

            {/* Directory Grid */}
            {loading ? (
              <div className="py-24 text-center text-slate-400">
                <div className="w-8 h-8 border-3 border-[#00A6E8] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm font-semibold">Loading investor directory...</p>
              </div>
            ) : filteredInvestors.length === 0 ? (
              <div className="py-20 bg-white border border-[#DCECF2] rounded-2xl text-center p-8">
                <span className="material-symbols-outlined text-[48px] text-slate-300 mb-3">
                  person_search
                </span>
                <h3 className="text-lg font-bold text-[#0A192A] mb-1 font-heading">
                  No verified investors found
                </h3>
                <p className="text-xs sm:text-sm text-[#5F7180] max-w-md mx-auto mb-5">
                  We could not find any published investor profiles matching your selected criteria. Try adjusting your filters or search terms.
                </p>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="px-4 py-2 bg-[#00A6E8] hover:bg-[#0093CE] text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 min-[500px]:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-6">
                {filteredInvestors.map((inv) => (
                  <InvestorCard key={inv.id} investor={inv} />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
