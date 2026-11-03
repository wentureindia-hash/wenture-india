"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Opportunity } from "@/lib/constants/opportunities";
import { getPublishedListings, convertListingToOpportunity } from "@/lib/firebase/listings";

export default function AdminOpportunitiesPage() {
  const [publishedListings, setPublishedListings] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);

  const loadData = async () => {
    setLoading(true);
    const res = await getPublishedListings();
    if (!res.error && res.listings) {
      const converted = res.listings.map((item) => convertListingToOpportunity(item));
      setPublishedListings(converted);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const allOpportunities = publishedListings;

  const filtered = useMemo(() => {
    return allOpportunities.filter((item) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.sector.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.location.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allOpportunities, searchQuery]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-[#00A6E8] uppercase tracking-wider block mb-1">
            Dealflow Catalog
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0A192A] tracking-tight font-heading">
            Opportunity Catalog
          </h1>
          <p className="text-xs sm:text-sm text-[#5F7180] mt-1">
            Browse and manage live approved listings in the public opportunity directory.
          </p>
        </div>

        <Link
          href="/opportunities"
          target="_blank"
          className="px-4 py-2 bg-white border border-[#DCECF2] hover:bg-slate-50 text-[#0A192A] text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 self-stretch sm:self-auto shadow-sm"
        >
          <span>View Public Opportunities</span>
          <span className="material-symbols-outlined text-[16px] text-[#00A6E8]">open_in_new</span>
        </Link>
      </div>

      {/* Filter and Search */}
      <div className="bg-white border border-[#DCECF2] rounded-2xl p-3.5 sm:p-5 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
        <div className="text-xs font-bold text-[#0A192A]">
          Total Live Deals: <span className="text-[#00A6E8]">{allOpportunities.length}</span> Published Listings
        </div>

        <div className="relative w-full sm:w-72">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search opportunities..."
            className="w-full pl-9 pr-4 py-2 bg-[#F4FAFD] border border-[#DCECF2] rounded-xl text-xs text-[#0A192A] focus:outline-none focus:border-[#00A6E8]"
          />
        </div>
      </div>

      {/* Opportunities Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {filtered.map((opp) => (
          <div
            key={opp.id}
            className="bg-white border border-[#DCECF2] rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-[#EBF6FC] text-[#00658F] border border-[#DCECF2]">
                  {opp.category}
                </span>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Live
                </span>
              </div>
              <h3 className="text-base font-bold text-[#0A192A] mb-1 font-heading line-clamp-1">{opp.title}</h3>
              <p className="text-xs text-[#5F7180] line-clamp-2 mb-4 leading-relaxed">{opp.shortDescription}</p>

              <div className="text-[11px] space-y-1 text-[#5F7180] pt-3 border-t border-slate-100 mb-4">
                <div className="flex justify-between">
                  <span>Sector:</span>
                  <strong className="text-[#0A192A]">{opp.sector}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Location:</span>
                  <strong className="text-[#0A192A]">{opp.location}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Investment:</span>
                  <strong className="text-[#0A192A]">{opp.investmentRange}</strong>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#DCECF2]">
              <Link
                href={`/opportunities/${opp.slug}`}
                target="_blank"
                className="text-xs font-bold text-[#00A6E8] hover:underline flex items-center gap-1"
              >
                <span>View Public Detail</span>
                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
