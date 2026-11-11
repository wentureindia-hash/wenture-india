"use client";

import React, { useState, useEffect, useRef, useTransition, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  MasterSearchCategory,
  MASTER_SEARCH_CATEGORIES,
  UnifiedSearchResult,
  getMasterSearchDataset,
  computeRelevanceScore,
} from "@/lib/search/master-search";
import { AnimatePresence, motion } from "framer-motion";

interface MasterSearchBarProps {
  className?: string;
  initialQuery?: string;
  initialCategory?: MasterSearchCategory;
  onSearchSubmit?: (query: string, category: MasterSearchCategory) => void;
  compactOnMobile?: boolean;
}

export function MasterSearchBar({
  className,
  initialQuery = "",
  initialCategory = "all",
  onSearchSubmit,
  compactOnMobile = false,
}: MasterSearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL query synch
  const paramQ = searchParams?.get("q") || "";
  const paramCat = (searchParams?.get("category") as MasterSearchCategory) || "all";

  const [queryText, setQueryText] = useState(initialQuery || paramQ);
  const [selectedCategory, setSelectedCategory] = useState<MasterSearchCategory>(
    initialCategory || paramCat || "all"
  );

  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [dataset, setDataset] = useState<UnifiedSearchResult[]>([]);
  const [datasetLoaded, setDatasetLoaded] = useState(false);
  const [isPending, startTransition] = useTransition();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const suggestionsRef = useRef<HTMLDivElement | null>(null);

  // Sync state if URL changes externally
  useEffect(() => {
    setQueryText(paramQ);
    setSelectedCategory(paramCat);
  }, [paramQ, paramCat]);

  // Pre-load or lazy-load dataset when user focuses on search bar
  const ensureDatasetLoaded = async () => {
    if (datasetLoaded) return;
    const res = await getMasterSearchDataset();
    if (res.data) {
      setDataset(res.data);
      setDatasetLoaded(true);
    }
  };

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setCategoryDropdownOpen(false);
        setSuggestionsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Compute live autocomplete suggestions (max 6-8)
  const suggestions = useMemo(() => {
    const q = queryText.trim().toLowerCase();
    if (!q || q.length < 2 || !datasetLoaded || dataset.length === 0) {
      return [];
    }

    const matches: { item: UnifiedSearchResult; score: number }[] = [];

    for (const item of dataset) {
      // Category filter check
      if (selectedCategory !== "all" && item.category !== selectedCategory) {
        continue;
      }

      const score = computeRelevanceScore(item, q);
      if (score > 0) {
        matches.push({ item, score });
      }
    }

    // Rank by relevance
    matches.sort((a, b) => b.score - a.score);

    return matches.slice(0, 7).map((m) => m.item);
  }, [queryText, selectedCategory, dataset, datasetLoaded]);

  // Execute Search
  const handleExecuteSearch = (
    overrideQuery?: string,
    overrideCategory?: MasterSearchCategory
  ) => {
    const q = (overrideQuery !== undefined ? overrideQuery : queryText).trim();
    const cat = overrideCategory || selectedCategory;

    setSuggestionsOpen(false);
    setCategoryDropdownOpen(false);

    if (onSearchSubmit) {
      onSearchSubmit(q, cat);
      return;
    }

    // Navigate to unified search results page
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (cat && cat !== "all") params.set("category", cat);

    const targetUrl = `/search${params.toString() ? `?${params.toString()}` : ""}`;
    startTransition(() => {
      router.push(targetUrl);
    });
  };

  // Keyboard navigation across suggestions
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!suggestionsOpen && suggestions.length > 0) {
        setSuggestionsOpen(true);
        setHighlightedIndex(0);
      } else {
        setHighlightedIndex((prev) => (prev < suggestions.length ? prev + 1 : 0));
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (suggestionsOpen && highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        const selected = suggestions[highlightedIndex];
        router.push(selected.detailUrl);
        setSuggestionsOpen(false);
      } else {
        handleExecuteSearch();
      }
    } else if (e.key === "Escape") {
      setSuggestionsOpen(false);
      setCategoryDropdownOpen(false);
    }
  };

  const activeCategoryConfig =
    MASTER_SEARCH_CATEGORIES.find((c) => c.id === selectedCategory) ||
    MASTER_SEARCH_CATEGORIES[0];

  // Highlight matching text helper
  const renderHighlighted = (text: string, queryStr: string) => {
    if (!queryStr || !queryStr.trim()) return text;
    const q = queryStr.trim();
    const regex = new RegExp(`(${q.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")})`, "gi");
    const parts = text.split(regex);

    return (
      <span>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <span key={i} className="text-[#00A6E8] font-extrabold bg-[#EBF6FC] px-0.5 rounded">
              {part}
            </span>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "w-full bg-[#F4FAFD]/95 backdrop-blur-md border-t border-[#DCECF2]/70 py-2 sm:py-2.5 px-3 sm:px-6 lg:px-8 relative z-30 transition-all",
        className
      )}
    >
      <div className="w-full max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-3">
        {/* Unified Search Bar Pill Container */}
        <div className="flex-1 min-w-0 bg-white border border-[#DCECF2] hover:border-[#00A6E8]/60 focus-within:border-[#00A6E8] rounded-xl sm:rounded-2xl shadow-[0_2px_12px_rgba(10,25,42,0.04)] focus-within:shadow-[0_4px_20px_rgba(0,166,232,0.12)] transition-all duration-200 flex items-center relative">
          {/* 1. Category Selector Dropdown Button */}
          <div className="relative shrink-0" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => {
                setCategoryDropdownOpen(!categoryDropdownOpen);
                setSuggestionsOpen(false);
                ensureDatasetLoaded();
              }}
              className="h-10 sm:h-11 px-2.5 sm:px-3.5 flex items-center gap-1 sm:gap-1.5 text-xs font-bold text-[#0A192A] hover:text-[#00658F] border-r border-[#DCECF2] hover:bg-[#F4FAFD] rounded-l-xl sm:rounded-l-2xl transition-colors cursor-pointer select-none"
              aria-expanded={categoryDropdownOpen}
              aria-label="Filter category"
            >
              <span className="material-symbols-outlined text-[16px] sm:text-[18px] text-[#00A6E8]">
                {activeCategoryConfig.icon}
              </span>
              <span className="truncate max-w-[70px] sm:max-w-[120px] md:max-w-none hidden xs:inline">
                {activeCategoryConfig.shortLabel}
              </span>
              <span className="material-symbols-outlined text-[14px] sm:text-[16px] text-slate-400 transition-transform">
                {categoryDropdownOpen ? "expand_less" : "expand_more"}
              </span>
            </button>

            {/* Category Dropdown Menu */}
            <AnimatePresence>
              {categoryDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 mt-1.5 w-64 sm:w-72 bg-white border border-[#DCECF2] rounded-2xl shadow-xl py-1.5 z-50 overflow-hidden"
                >
                  <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    Select Discovery Category
                  </div>
                  <div className="max-h-72 overflow-y-auto overscroll-contain py-1">
                    {MASTER_SEARCH_CATEGORIES.map((cat) => {
                      const isSelected = selectedCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            setSelectedCategory(cat.id);
                            setCategoryDropdownOpen(false);
                            inputRef.current?.focus();
                          }}
                          className={cn(
                            "w-full text-left px-3 py-2 flex items-center gap-2.5 text-xs transition-colors cursor-pointer",
                            isSelected
                              ? "bg-[#EBF6FC] text-[#00658F] font-bold"
                              : "text-[#0A192A] hover:bg-[#F4FAFD]"
                          )}
                        >
                          <span
                            className={cn(
                              "material-symbols-outlined text-[18px]",
                              isSelected ? "text-[#00A6E8]" : "text-[#5F7180]"
                            )}
                          >
                            {cat.icon}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="truncate font-medium">{cat.label}</div>
                          </div>
                          {isSelected && (
                            <span className="material-symbols-outlined text-[16px] text-[#00A6E8]">
                              check
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 2. Main Search Input Field */}
          <div className="flex-1 min-w-0 flex items-center px-2 sm:px-3">
            <span className="material-symbols-outlined text-[18px] sm:text-[20px] text-slate-400 mr-2 shrink-0">
              search
            </span>
            <input
              ref={inputRef}
              type="text"
              value={queryText}
              onChange={(e) => {
                setQueryText(e.target.value);
                setSuggestionsOpen(true);
                setHighlightedIndex(-1);
                ensureDatasetLoaded();
              }}
              onFocus={() => {
                ensureDatasetLoaded();
                if (queryText.trim().length >= 2) {
                  setSuggestionsOpen(true);
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search businesses, investors, startups, franchises, opportunities..."
              className="w-full bg-transparent text-xs sm:text-sm text-[#0A192A] placeholder:text-slate-400 focus:outline-none py-2"
              autoComplete="off"
              spellCheck="false"
            />
            {queryText && (
              <button
                type="button"
                onClick={() => {
                  setQueryText("");
                  inputRef.current?.focus();
                }}
                className="p-1 text-slate-400 hover:text-[#0A192A] transition-colors rounded-full"
                aria-label="Clear search"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>

          {/* 3. Primary Action Button */}
          <div className="pr-1 sm:pr-1.5 shrink-0">
            <button
              type="button"
              onClick={() => handleExecuteSearch()}
              className="h-8 sm:h-9 px-3 sm:px-5 rounded-lg sm:rounded-xl bg-[#00A6E8] hover:bg-[#0093CE] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs shadow-[#00A6E8]/25 hover:shadow transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px] sm:text-[18px]">search</span>
              <span className="hidden sm:inline">Search</span>
            </button>
          </div>

          {/* 4. Live Autocomplete Suggestions Overlay */}
          <AnimatePresence>
            {suggestionsOpen && queryText.trim().length >= 2 && (
              <motion.div
                ref={suggestionsRef}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-[#DCECF2] rounded-2xl shadow-2xl overflow-hidden z-50 max-h-[80vh] flex flex-col"
              >
                <div className="px-4 py-2 bg-[#F6FAFF] border-b border-[#DCECF2] flex items-center justify-between text-[11px] text-[#5F7180]">
                  <span>
                    Suggestions matching &ldquo;<strong className="text-[#0A192A]">{queryText}</strong>&rdquo;
                  </span>
                  <span>{suggestions.length} found</span>
                </div>

                <div className="overflow-y-auto overscroll-contain py-1 divide-y divide-slate-100">
                  {suggestions.length > 0 ? (
                    suggestions.map((item, idx) => {
                      const isHighlighted = highlightedIndex === idx;
                      return (
                        <Link
                          key={item.id}
                          href={item.detailUrl}
                          onClick={() => setSuggestionsOpen(false)}
                          className={cn(
                            "px-4 py-2.5 flex items-start gap-3 transition-colors group cursor-pointer",
                            isHighlighted ? "bg-[#F4FAFD]" : "hover:bg-[#F6FAFD]"
                          )}
                        >
                          <div className="w-8 h-8 rounded-lg bg-[#EBF6FC] text-[#00658F] flex items-center justify-center shrink-0 mt-0.5 border border-[#DCECF2]">
                            <span className="material-symbols-outlined text-[18px]">
                              {item.entityType === "investor" ? "badge" : "storefront"}
                            </span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap mb-0.5">
                              <span className="font-bold text-xs sm:text-sm text-[#0A192A] group-hover:text-[#00A6E8] transition-colors truncate">
                                {renderHighlighted(item.title, queryText)}
                              </span>
                              <span className="bg-[#EBF6FC] text-[#00658F] text-[9.5px] font-extrabold uppercase px-1.5 py-0.5 rounded border border-[#00A6E8]/20 shrink-0">
                                {item.categoryBadge}
                              </span>
                            </div>

                            <p className="text-[11px] text-[#5F7180] line-clamp-1 leading-snug">
                              {renderHighlighted(item.description, queryText)}
                            </p>

                            <div className="flex items-center gap-2 text-[10.5px] text-[#5F7180] mt-1 flex-wrap">
                              <span className="flex items-center gap-0.5">
                                <span className="material-symbols-outlined text-[12px] text-[#00A6E8]">
                                  location_on
                                </span>
                                {item.location}
                              </span>
                              <span>•</span>
                              <span>{item.sector}</span>
                              {item.investmentRange && (
                                <>
                                  <span>•</span>
                                  <span className="font-semibold text-[#00658F]">
                                    {item.investmentRange}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          <span className="material-symbols-outlined text-[16px] text-slate-300 group-hover:text-[#00A6E8] transition-colors shrink-0 self-center">
                            arrow_forward
                          </span>
                        </Link>
                      );
                    })
                  ) : (
                    <div className="px-4 py-6 text-center text-xs text-[#5F7180]">
                      <span className="material-symbols-outlined text-[28px] text-slate-300 mb-1 block">
                        search_off
                      </span>
                      No direct suggestions matching &ldquo;{queryText}&rdquo;.
                      <div className="mt-1 text-[11px] text-[#00A6E8]">
                        Press Enter to search the complete directory.
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer: View All Results */}
                <div className="p-2.5 bg-[#F6FAFF] border-t border-[#DCECF2] flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleExecuteSearch()}
                    className="w-full text-center py-2 px-3 rounded-xl bg-white border border-[#DCECF2] hover:border-[#00A6E8] hover:text-[#00658F] text-xs font-bold text-[#0A192A] transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <span>View all matching results</span>
                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
