"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { SECTORS } from "@/lib/constants/sectors";
import { Opportunity } from "@/lib/constants/opportunities";
import { getPublishedListings, convertListingToOpportunity } from "@/lib/firebase/listings";

function matchesSector(oppSector: string, sectorName: string): boolean {
  if (!oppSector || !sectorName) return false;
  const s1 = oppSector.trim().toLowerCase();
  const s2 = sectorName.trim().toLowerCase();
  if (s1 === s2) return true;

  // Domain / alias matching
  if (
    s2 === "food & beverage" &&
    (s1 === "food & beverages" ||
      s1.includes("food") ||
      s1.includes("beverage") ||
      s1.includes("restaurant") ||
      s1.includes("cafe"))
  )
    return true;
  if (
    s2 === "ev & mobility" &&
    (s1.includes("ev") ||
      s1.includes("mobility") ||
      s1.includes("cleantech") ||
      s1.includes("electric"))
  )
    return true;
  if (s2 === "agriculture" && (s1.includes("agri") || s1.includes("farming"))) return true;
  if (
    s2 === "technology" &&
    (s1.includes("tech") || s1.includes("software") || s1.includes("saas") || s1.includes("it"))
  )
    return true;
  if (
    s2 === "healthcare" &&
    (s1.includes("health") ||
      s1.includes("pharma") ||
      s1.includes("medical") ||
      s1.includes("clinic") ||
      s1.includes("diagnostic"))
  )
    return true;
  if (
    s2 === "real estate" &&
    (s1.includes("real estate") || s1.includes("property") || s1.includes("commercial space"))
  )
    return true;
  if (
    s2 === "manufacturing" &&
    (s1.includes("manufactur") ||
      s1.includes("industrial") ||
      s1.includes("cnc") ||
      s1.includes("machining"))
  )
    return true;
  if (
    s2 === "retail" &&
    (s1.includes("retail") || s1.includes("store") || s1.includes("consumer brand"))
  )
    return true;
  if (
    s2 === "education" &&
    (s1.includes("educat") ||
      s1.includes("edtech") ||
      s1.includes("school") ||
      s1.includes("academy"))
  )
    return true;
  if (
    s2 === "fashion" &&
    (s1.includes("fashion") || s1.includes("apparel") || s1.includes("clothing"))
  )
    return true;
  if (
    s2 === "travel & hospitality" &&
    (s1.includes("travel") ||
      s1.includes("hospitality") ||
      s1.includes("hotel") ||
      s1.includes("tourism"))
  )
    return true;
  if (
    s2 === "business services" &&
    (s1.includes("business service") || s1.includes("consulting") || s1.includes("staffing"))
  )
    return true;
  if (
    s2 === "exim" &&
    (s1.includes("exim") || s1.includes("export") || s1.includes("import") || s1.includes("trade"))
  )
    return true;

  return s1.includes(s2) || s2.includes(s1);
}

export function ExploreSectors() {
  const [publishedOpps, setPublishedOpps] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await getPublishedListings();
        if (!res.error && res.listings && res.listings.length > 0) {
          setPublishedOpps(res.listings.map((l) => convertListingToOpportunity(l)));
        }
      } catch (err) {
        console.error("Failed to load listings for sectors:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Use strictly live published listings from Firestore
  const allOpportunities = publishedOpps;

  // Compute real count per sector and filter out sectors with 0 opportunities
  const activeSectorsWithCounts = useMemo(() => {
    return SECTORS.map((sector) => {
      const matchingCount = allOpportunities.filter((opp) =>
        matchesSector(opp.sector, sector.name)
      ).length;
      return {
        ...sector,
        realCount: matchingCount,
      };
    }).filter((sector) => sector.realCount > 0); // Strictly hide sectors with 0 opportunities
  }, [allOpportunities]);

  // If loading finished and no active sectors with opportunities exist, hide the section
  if (!loading && activeSectorsWithCounts.length === 0) {
    return null;
  }

  return (
    <section className="w-full py-10 sm:py-16 md:py-20 bg-white border-b border-[#DCECF2]">
      <div className="w-full max-w-[1280px] mx-auto px-3.5 sm:px-6 lg:px-12">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-12">
          <span className="text-xs font-bold text-[#00A6E8] uppercase tracking-wider block mb-1">
            Sector Exploration
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#0A192A] tracking-tight">
            Explore by Sector
          </h2>
          <p className="text-xs sm:text-sm md:text-base text-[#5F7180] mt-1.5 sm:mt-2">
            Discover opportunities across high-growth industries, traditional businesses, and specialized trade verticals.
          </p>
        </div>

        {/* Sectors Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-2.5 sm:gap-4 md:gap-6">
          {activeSectorsWithCounts.map((sector) => (
            <Link
              key={sector.id}
              href={`/opportunities?sector=${encodeURIComponent(sector.name)}`}
              className="bg-[#F6FAFF] border border-[#DCECF2] hover:border-[#00A6E8] hover:bg-white p-3 sm:p-5 rounded-xl transition-all duration-200 group flex flex-col justify-between hover:shadow-[0px_4px_16px_rgba(10,25,42,0.06)]"
            >
              <div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-white border border-[#DCECF2] text-[#00A6E8] flex items-center justify-center mb-2 sm:mb-3 group-hover:scale-105 group-hover:bg-[#00A6E8] group-hover:text-white transition-all">
                  <span className="material-symbols-outlined text-[18px] sm:text-[22px]">
                    {sector.icon}
                  </span>
                </div>
                <h3 className="font-bold text-xs sm:text-base text-[#0A192A] group-hover:text-[#00A6E8] transition-colors mb-0.5 sm:mb-1 line-clamp-1">
                  {sector.name}
                </h3>
                <p className="text-[10px] sm:text-xs text-[#5F7180] line-clamp-2 leading-relaxed">
                  {sector.description}
                </p>
              </div>

              <div className="mt-3 sm:mt-4 pt-2 sm:pt-3 border-t border-[#DCECF2]/60 flex items-center justify-between text-[10px] sm:text-[11px] text-[#5F7180]">
                <span className="font-semibold text-[#0A192A] truncate">
                  {sector.realCount} {sector.realCount === 1 ? "Opportunity" : "Opps"}
                </span>
                <span className="material-symbols-outlined text-[14px] sm:text-[16px] text-[#00A6E8] group-hover:translate-x-1 transition-transform">
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
