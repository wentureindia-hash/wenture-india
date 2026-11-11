"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { JoinCta, RoleCtaGroup } from "@/components/ui/join-cta";
import { Container } from "@/components/layout/container";
import { NetworkMesh } from "@/components/visual/network-mesh";
import { TopOpportunities } from "@/components/sections/top-opportunities";
import { FeaturedShowcase } from "@/components/sections/featured-showcase";
import { GuidesSection } from "@/components/sections/guides-section";
import { ExploreSectors } from "@/components/sections/explore-sectors";
import { TrendingNow } from "@/components/sections/trending-now";
import { COMPANY } from "@/lib/constants/company";
import { motion } from "framer-motion";

export default function HomePage() {
  const [deletedNotice, setDeletedNotice] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("deleted") === "true") {
        setDeletedNotice(true);
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-surface selection:bg-primary-container selection:text-white">
      {deletedNotice && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-3 text-center text-sm font-bold text-emerald-800 flex items-center justify-center gap-2 transition-all">
          <span className="material-symbols-outlined text-[20px] text-emerald-600">
            check_circle
          </span>
          <span>Your Wenture India account has been deleted.</span>
          <button
            type="button"
            onClick={() => setDeletedNotice(false)}
            className="ml-3 text-emerald-700 hover:text-emerald-950 text-xs font-semibold underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Sticky Navigation */}
      <Navbar />

      <main className="flex-grow flex flex-col w-full overflow-hidden">
        {/* ============================================================ */}
        {/* 1. HERO SECTION (REDESIGNED) */}
        {/* ============================================================ */}
        <section className="relative pt-10 sm:pt-16 md:pt-20 lg:pt-24 pb-12 sm:pb-16 md:pb-24 overflow-hidden border-b border-[#DCECF2] bg-gradient-to-b from-[#F4FAFD] via-white to-[#F4FAFD]/40">
          {/* Ambient background glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none -z-10 overflow-hidden">
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] sm:w-[850px] h-[350px] sm:h-[450px] bg-gradient-to-b from-[#EBF6FB] to-transparent rounded-full blur-3xl opacity-70" />
            <div className="absolute top-1/3 -left-20 w-72 h-72 bg-[#00A6E8]/5 rounded-full blur-2xl" />
            <div className="absolute top-1/4 -right-20 w-72 h-72 bg-[#00658F]/5 rounded-full blur-2xl" />
          </div>

          <Container size="wide">
            <motion.div
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="flex flex-col items-center text-center max-w-4xl mx-auto"
            >
              {/* 1. Brand Badge */}
              <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full bg-white border border-[#DCECF2] text-[#00658F] font-bold text-[10px] sm:text-xs tracking-wider uppercase shadow-xs mb-5 sm:mb-7">
                <span className="w-2 h-2 rounded-full bg-[#00A6E8] animate-pulse shrink-0" />
                <span>WENTURE INDIA | BUSINESS ECOSYSTEM</span>
              </div>

              {/* 2. Main Headline */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold text-[#0A192A] mb-4 sm:mb-6 leading-[1.14] tracking-tight font-heading max-w-4xl">
                Connect. Build. Scale. <br />
                <span className="text-[#00A6E8]">Grow Together.</span>
              </h1>

              {/* 3. Main Description */}
              <p className="text-sm sm:text-base md:text-lg lg:text-xl text-[#5F7180] mb-6 sm:mb-8 max-w-2xl sm:max-w-3xl leading-relaxed font-normal">
                Wenture India is a platform that connects entrepreneurs, investors, and business opportunities, bringing vision, capital, and growth together.
              </p>

              {/* 4. Supporting Statement inside a subtle, refined container */}
              <div className="w-full max-w-2xl bg-white/95 border border-[#DCECF2] rounded-2xl sm:rounded-full px-4 sm:px-8 py-3 sm:py-3.5 shadow-[0_4px_20px_rgba(10,25,42,0.04)] backdrop-blur-sm mb-8 sm:mb-10">
                <p className="text-xs sm:text-sm md:text-[15px] font-semibold text-[#00658F] leading-snug">
                  Connecting vision with capital, businesses with opportunities, and people with the right partnerships.
                </p>
              </div>

              {/* 5. Primary Gateway CTAs */}
              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mb-8 sm:mb-12">
                <Link
                  href="/for-investors"
                  className="group bg-white border border-[#DCECF2] text-[#0A192A] hover:bg-[#00A6E8] hover:border-[#00A6E8] hover:text-white font-bold text-xs sm:text-sm md:text-base rounded-xl px-5 sm:px-7 py-2.5 sm:py-3.5 shadow-xs hover:shadow-[0px_4px_15px_rgba(0,166,232,0.25)] hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-1.5 sm:gap-2 cursor-pointer"
                >
                  <span>For Investors</span>
                  <span className="material-symbols-outlined text-[16px] sm:text-[18px] transition-transform duration-200 group-hover:translate-x-0.5">
                    arrow_forward
                  </span>
                </Link>

                <Link
                  href="/for-entrepreneurs"
                  className="group bg-white border border-[#DCECF2] text-[#0A192A] hover:bg-[#00A6E8] hover:border-[#00A6E8] hover:text-white font-bold text-xs sm:text-sm md:text-base rounded-xl px-5 sm:px-7 py-2.5 sm:py-3.5 shadow-xs hover:shadow-[0px_4px_15px_rgba(0,166,232,0.25)] hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-1.5 sm:gap-2 cursor-pointer"
                >
                  <span>For Entrepreneurs</span>
                  <span className="material-symbols-outlined text-[16px] sm:text-[18px] transition-transform duration-200 group-hover:translate-x-0.5">
                    arrow_forward
                  </span>
                </Link>

                <Link
                  href="/opportunities"
                  className="group bg-[#00658F] hover:bg-[#004D6D] text-white font-bold text-xs sm:text-sm md:text-base rounded-xl px-5 sm:px-7 py-2.5 sm:py-3.5 shadow-xs hover:shadow-[0px_4px_15px_rgba(0,101,143,0.3)] hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-1.5 sm:gap-2 cursor-pointer"
                >
                  <span>Explore Opportunities</span>
                  <span className="material-symbols-outlined text-[16px] sm:text-[18px] transition-transform duration-200 group-hover:translate-x-0.5">
                    explore
                  </span>
                </Link>
              </div>

              {/* 6. Subtle Trust Pillars / Ecosystem Highlights */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4 w-full max-w-3xl pt-2">
                <div className="bg-white/80 border border-[#DCECF2] rounded-xl p-2.5 sm:p-3 text-center shadow-2xs">
                  <span className="material-symbols-outlined text-[18px] sm:text-[20px] text-[#00A6E8] mb-1">
                    verified
                  </span>
                  <div className="text-[11px] sm:text-xs font-bold text-[#0A192A]">Verified Listings</div>
                  <div className="text-[9.5px] sm:text-[10.5px] text-[#5F7180]">Institutional Vetting</div>
                </div>
                <div className="bg-white/80 border border-[#DCECF2] rounded-xl p-2.5 sm:p-3 text-center shadow-2xs">
                  <span className="material-symbols-outlined text-[18px] sm:text-[20px] text-[#00A6E8] mb-1">
                    group
                  </span>
                  <div className="text-[11px] sm:text-xs font-bold text-[#0A192A]">Angel &amp; VC Network</div>
                  <div className="text-[9.5px] sm:text-[10.5px] text-[#5F7180]">Active Capital Partners</div>
                </div>
                <div className="bg-white/80 border border-[#DCECF2] rounded-xl p-2.5 sm:p-3 text-center shadow-2xs">
                  <span className="material-symbols-outlined text-[18px] sm:text-[20px] text-[#00A6E8] mb-1">
                    storefront
                  </span>
                  <div className="text-[11px] sm:text-xs font-bold text-[#0A192A]">Franchise &amp; Trade</div>
                  <div className="text-[9.5px] sm:text-[10.5px] text-[#5F7180]">Dealerships &amp; EXIM</div>
                </div>
                <div className="bg-white/80 border border-[#DCECF2] rounded-xl p-2.5 sm:p-3 text-center shadow-2xs">
                  <span className="material-symbols-outlined text-[18px] sm:text-[20px] text-[#00A6E8] mb-1">
                    public
                  </span>
                  <div className="text-[11px] sm:text-xs font-bold text-[#0A192A]">Pan-India Reach</div>
                  <div className="text-[9.5px] sm:text-[10.5px] text-[#5F7180]">Across All States</div>
                </div>
              </div>
            </motion.div>
          </Container>
        </section>

        {/* ============================================================ */}
        {/* 2. TOP OPPORTUNITIES (Investment, Business, Franchise, etc.) */}
        {/* ============================================================ */}
        <TopOpportunities
          title="Top Opportunities"
          subtitle="Explore curated business, investment, franchise, dealership, and international export opportunities."
          limit={6}
          showViewAll={true}
        />

        {/* ============================================================ */}
        {/* 4. FEATURED DIRECTORY SHOWCASE */}
        {/* ============================================================ */}
        <FeaturedShowcase />

        {/* ============================================================ */}
        {/* 5. BUSINESS & INVESTMENT GUIDES ("Learn. Explore. Grow.") */}
        {/* ============================================================ */}
        <GuidesSection />

        {/* ============================================================ */}
        {/* 6. EXPLORE BY SECTOR (13 Approved Sectors) */}
        {/* ============================================================ */}
        <ExploreSectors />

        {/* ============================================================ */}
        {/* 7. TRENDING NOW */}
        {/* ============================================================ */}
        <TrendingNow />

        {/* ============================================================ */}
        {/* 8. FINAL CALL TO ACTION */}
        {/* ============================================================ */}
        <section className="w-full py-10 sm:py-16 md:py-20 bg-gradient-to-b from-white to-[#F4FAFD]">
          <Container>
            <div className="bg-[#0A192A] rounded-2xl sm:rounded-3xl p-6 sm:p-12 lg:p-16 text-center text-white relative overflow-hidden shadow-2xl">
              {/* Subtle background glow */}
              <div className="absolute -top-24 -right-24 w-80 h-80 bg-[#00A6E8]/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-[#00A6E8]/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 max-w-2xl mx-auto">
                <span className="text-xs font-bold text-[#00A6E8] uppercase tracking-wider block mb-2">
                  Get Started Today
                </span>
                <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight mb-3 sm:mb-4 leading-tight font-heading">
                  Ready to Connect, Build &amp; Scale?
                </h2>
                <p className="text-xs sm:text-sm md:text-base text-slate-300 mb-6 sm:mb-8 leading-relaxed">
                  Join Wenture India International to explore active opportunities, discover vetted businesses, and connect with visionary entrepreneurs.
                </p>

                <RoleCtaGroup
                  className="flex flex-wrap justify-center gap-2.5 sm:gap-4"
                  investorClassName="bg-[#00A6E8] hover:bg-[#0093CE] text-white font-bold text-xs sm:text-base px-5 sm:px-8 py-2.5 sm:py-4 rounded-xl shadow-lg transition-all"
                  entrepreneurClassName="bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs sm:text-base px-5 sm:px-8 py-2.5 sm:py-4 rounded-xl backdrop-blur-sm transition-all"
                  exploreClassName="bg-[#00A6E8] hover:bg-[#0093CE] text-white font-bold text-xs sm:text-base px-5 sm:px-8 py-2.5 sm:py-4 rounded-xl shadow-lg transition-all"
                />
              </div>
            </div>
          </Container>
        </section>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
