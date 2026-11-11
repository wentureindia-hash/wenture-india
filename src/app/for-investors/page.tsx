"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/layout/container";
import { OpportunityCard } from "@/components/cards/opportunity-card";
import { OpportunityEnquiryModal } from "@/components/forms/opportunity-enquiry-modal";
import { JoinCta } from "@/components/ui/join-cta";
import { InvestorBottomCta } from "@/components/sections/investor-bottom-cta";
import { Opportunity } from "@/lib/constants/opportunities";
import { getPublishedListings, convertListingToOpportunity } from "@/lib/firebase/listings";

export default function ForInvestorsPage() {
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
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

  const featuredOpps = publishedOpps.slice(0, 3);

  const handleEnquire = (opp: Opportunity) => {
    setSelectedOpportunity(opp);
    setModalOpen(true);
  };


  return (
    <div className="flex flex-col min-h-screen bg-surface selection:bg-primary-container selection:text-white">
      <Navbar />

      <main className="flex-grow">
        {/* ============================================================ */}
        {/* HERO SECTION */}
        {/* ============================================================ */}
        <section className="relative pt-8 sm:pt-14 md:pt-24 pb-10 sm:pb-16 md:pb-20 px-3.5 sm:px-6 md:px-margin-desktop max-w-container-max mx-auto overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 lg:gap-gutter items-center">
            <div className="col-span-1 md:col-span-7 z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-high border border-border-subtle text-primary font-label-caps text-xs w-fit mb-4 sm:mb-6">
                Institutional Capital Gateway
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-on-surface mb-3 sm:mb-6 leading-tight tracking-tight font-heading">
                Discover Where <br />
                <span className="text-primary-container">Opportunity Is Growing.</span>
              </h1>

              <p className="text-xs sm:text-base md:text-lg text-on-surface-variant mb-5 sm:mb-8 max-w-2xl leading-relaxed">
                Access curated investment opportunities, connect with visionary entrepreneurs, and build a diversified portfolio in a transparent, professional ecosystem.
              </p>

              {/* Action Buttons: Join & Explore Opportunities */}
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-4 pt-1 sm:pt-2">
                <JoinCta
                  roleType="investor"
                  href="/signup/investor"
                  className="bg-primary-container text-white font-button-text text-xs sm:text-base rounded-xl px-5 sm:px-8 py-2.5 sm:py-4 hover:bg-surface-tint shadow-[0px_4px_15px_rgba(0,166,232,0.3)] transition-all"
                >
                  Join as Investor
                </JoinCta>

                <Link
                  href="/opportunities"
                  className="bg-white border border-[#DCECF2] hover:border-[#00A6E8] text-[#00658F] font-button-text text-xs sm:text-base rounded-xl px-4 sm:px-7 py-2.5 sm:py-4 hover:bg-[#F4FAFD] shadow-xs transition-all flex items-center gap-1.5 sm:gap-2"
                >
                  <span className="material-symbols-outlined text-[18px] sm:text-[20px] text-[#00A6E8]">
                    explore
                  </span>
                  <span>Explore Opportunities</span>
                </Link>
              </div>
            </div>

            {/* Right Side: Live Deal Card Graphic from Stitch */}
            <div className="col-span-1 md:col-span-5 relative mt-6 md:mt-0">
              <div className="bg-surface-pure border border-border-subtle rounded-2xl p-4 sm:p-6 shadow-[0_4px_25px_rgba(10,25,42,0.06)] relative z-10 md:rotate-2 hover:rotate-0 transition-transform duration-300">
                <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-surface-container-high flex items-center justify-center text-primary-container">
                      <span className="material-symbols-outlined text-[20px] sm:text-[24px]">trending_up</span>
                    </div>
                    <div>
                      <h3 className="font-button-text text-xs sm:text-base text-on-surface font-bold">
                        Live Opportunity
                      </h3>
                      <p className="font-label-caps text-[10px] sm:text-xs text-on-surface-variant">
                        Enterprise AI / FinTech
                      </p>
                    </div>
                  </div>
                  <span className="bg-primary-fixed text-on-primary-fixed font-label-caps text-[9px] sm:text-[10px] px-2 py-0.5 rounded">
                    Verified
                  </span>
                </div>

                <div className="space-y-2 sm:space-y-3 py-1 sm:py-2">
                  <div className="flex justify-between text-[11px] sm:text-xs font-body-md text-on-surface-variant">
                    <span>Target Capital</span>
                    <span className="font-bold text-on-surface">₹8.5M (Series A)</span>
                  </div>
                  <div className="w-full bg-border-subtle h-2 rounded-full overflow-hidden">
                    <div className="bg-primary-container h-full rounded-full" style={{ width: "80%" }} />
                  </div>
                  <div className="flex justify-between text-[10px] sm:text-[11px] font-label-caps text-on-surface-variant">
                    <span>80% Subscribed</span>
                    <span>5 Days Remaining</span>
                  </div>
                </div>

                <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-border-subtle flex justify-between items-center">
                  <div>
                    <p className="font-label-caps text-[9px] sm:text-[10px] text-on-surface-variant uppercase">
                      Min Ticket
                    </p>
                    <p className="font-headline-md text-xs sm:text-base text-on-surface font-bold">
                      ₹500K
                    </p>
                  </div>
                  <Link
                    href="/opportunities"
                    className="text-primary-container hover:text-primary font-button-text text-xs sm:text-sm flex items-center gap-1 font-semibold"
                  >
                    <span>View Details</span>
                    <span className="material-symbols-outlined text-[14px] sm:text-[16px]">arrow_forward</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* TOP OPPORTUNITIES SHOWCASE */}
        {/* ============================================================ */}
        <section className="bg-surface-pure py-10 sm:py-16 md:py-20 px-3.5 sm:px-6 md:px-margin-desktop border-t border-border-subtle">
          <div className="max-w-container-max mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 sm:mb-10 gap-3 sm:gap-4">
              <div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-on-surface mb-1.5 sm:mb-2 font-heading">
                  Featured Opportunities
                </h2>
                <p className="text-xs sm:text-base text-on-surface-variant">
                  A curated selection of high-growth ventures currently seeking institutional capital.
                </p>
              </div>
              <Link
                href="/opportunities"
                className="font-button-text text-xs sm:text-sm text-primary flex items-center gap-1 hover:text-surface-tint font-semibold transition-colors"
              >
                <span>View All Opportunities</span>
                <span className="material-symbols-outlined text-[16px] sm:text-[18px]">arrow_forward</span>
              </Link>
            </div>

            {featuredOpps.length > 0 ? (
              <div className="grid grid-cols-1 min-[500px]:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-6">
                {featuredOpps.map((opp) => (
                  <OpportunityCard
                    key={opp.id}
                    opportunity={opp}
                    featured
                    onEnquire={handleEnquire}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-[#F4FAFD] rounded-2xl border border-[#DCECF2] p-8">
                <span className="material-symbols-outlined text-[36px] text-slate-300 mb-2 block">
                  storefront
                </span>
                <p className="text-sm font-semibold text-[#0A192A] mb-1">
                  No Approved Opportunities Currently Listed
                </p>
                <p className="text-xs text-[#5F7180]">
                  New verified investment opportunities will be featured here as they are published.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* ============================================================ */}
        {/* PROMINENT CTA: GET LISTED AS AN INVESTOR */}
        {/* ============================================================ */}
        <section className="w-full py-8 sm:py-12 md:py-16 px-3.5 sm:px-6 md:px-margin-desktop bg-gradient-to-b from-[#F4FAFD] via-white to-[#F4FAFD] border-t border-b border-[#DCECF2]">
          <div className="max-w-container-max mx-auto">
            <div className="bg-gradient-to-br from-white to-[#F8FCFE] rounded-2xl md:rounded-3xl p-5 sm:p-8 md:p-12 border border-[#DCECF2] shadow-[0px_8px_30px_rgba(10,25,42,0.06)] flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 sm:gap-8 relative overflow-hidden">
              {/* Decorative subtle ambient circle */}
              <div className="absolute -right-16 -top-16 w-72 h-72 bg-[#00A6E8]/10 rounded-full blur-3xl pointer-events-none" />

              <div className="max-w-2xl relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EBF6FC] text-[#00658F] font-bold text-xs mb-2 sm:mb-3 border border-[#00A6E8]/20">
                  <span className="material-symbols-outlined text-[16px] text-[#00A6E8]">verified</span>
                  <span>Investor Discovery Program</span>
                </div>
                <h2 className="text-xl sm:text-2xl md:text-4xl font-extrabold text-[#0A192A] mb-2 sm:mb-3 font-heading tracking-tight">
                  Get Listed as an Investor
                </h2>
                <p className="text-xs sm:text-base md:text-lg text-[#5F7180] leading-relaxed">
                  Create your investor profile and let entrepreneurs discover your investment interests, expertise and experience.
                </p>
                <div className="mt-3 sm:mt-4 flex items-center gap-3 sm:gap-4 text-[11px] sm:text-xs font-semibold text-[#00658F] flex-wrap">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px] text-emerald-600">check_circle</span>
                    Admin verification
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px] text-emerald-600">check_circle</span>
                    Public directory
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px] text-emerald-600">check_circle</span>
                    Direct deal interest
                  </span>
                </div>
              </div>

              <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3.5 relative z-10 w-full lg:w-auto">
                <Link
                  href="/profile/investor"
                  className="inline-flex items-center justify-center gap-2 bg-[#00A6E8] hover:bg-[#0093CE] text-white font-bold text-xs sm:text-base px-5 sm:px-8 py-2.5 sm:py-4 rounded-xl shadow-[0px_4px_16px_rgba(0,166,232,0.35)] transition-all hover:-translate-y-0.5"
                >
                  <span className="material-symbols-outlined text-[18px] sm:text-[20px]">badge</span>
                  <span>Get Listed as an Investor</span>
                </Link>
                <Link
                  href="/investors"
                  className="inline-flex items-center justify-center gap-1.5 bg-white hover:bg-[#F4FAFD] text-[#0A192A] font-bold text-xs sm:text-sm px-4 sm:px-6 py-2.5 sm:py-4 rounded-xl border border-[#DCECF2] transition-colors"
                >
                  <span>Explore Directory</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* "MORE THAN CAPITAL. BUILD CONNECTIONS." SECTION */}
        {/* ============================================================ */}
        <section className="relative py-10 sm:py-16 md:py-24 px-3.5 sm:px-6 md:px-margin-desktop bg-gradient-to-b from-surface via-[#F7FBFD] to-surface border-b border-border-subtle overflow-hidden">
          {/* Subtle Grid with Fade on Top, Bottom, and Sides */}
          <div
            className="absolute inset-0 pointer-events-none opacity-35"
            style={{
              backgroundImage: `linear-gradient(to right, #DCECF2 1px, transparent 1px), linear-gradient(to bottom, #DCECF2 1px, transparent 1px)`,
              backgroundSize: "40px 40px",
              WebkitMaskImage:
                "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,1) 18%, rgba(0,0,0,1) 82%, transparent 100%)",
              maskImage:
                "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,1) 18%, rgba(0,0,0,1) 82%, transparent 100%)",
            }}
          />

          {/* Subtle Ambient Radial Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-72 bg-[#EEF9FD] rounded-full blur-3xl pointer-events-none -z-10 opacity-70" />

          <div className="max-w-container-max mx-auto relative z-10">
            {/* Centered Heading */}
            <div className="text-center max-w-3xl mx-auto mb-2 sm:mb-3">
              <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold text-on-surface tracking-tight leading-[1.15] font-heading">
                More Than Capital. <br />
                Build Connections.
              </h2>
            </div>

            {/* Connecting Vertical Line Indicator */}
            <div className="w-[1.5px] h-6 sm:h-9 bg-primary-container/40 mx-auto mb-6 sm:mb-10" />

            {/* 3 Working Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
              {/* Card 1: Discover Opportunities */}
              <div className="bg-surface-pure rounded-xl p-4 sm:p-6 md:p-8 border border-border-subtle shadow-[0px_4px_20px_rgba(10,25,42,0.04)] hover:shadow-[0px_8px_30px_rgba(10,25,42,0.08)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-start group">
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg bg-surface-container-high text-primary flex items-center justify-center mb-4 sm:mb-6 group-hover:bg-primary-container/10 transition-colors">
                  <span className="material-symbols-outlined text-[22px] sm:text-[28px]">
                    explore
                  </span>
                </div>
                <h3 className="text-base sm:text-xl md:text-2xl font-bold text-on-surface mb-2 sm:mb-3">
                  Discover Opportunities
                </h3>
                <p className="text-xs sm:text-sm md:text-[14.5px] text-on-surface-variant leading-relaxed">
                  Identify emerging ventures across a spectrum of dynamic industries before they hit the mainstream market.
                </p>
              </div>

              {/* Card 2: Explore Sectors */}
              <div className="bg-surface-pure rounded-xl p-4 sm:p-6 md:p-8 border border-border-subtle shadow-[0px_4px_20px_rgba(10,25,42,0.04)] hover:shadow-[0px_8px_30px_rgba(10,25,42,0.08)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-start group">
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg bg-surface-container-high text-primary flex items-center justify-center mb-4 sm:mb-6 group-hover:bg-primary-container/10 transition-colors">
                  <span className="material-symbols-outlined text-[22px] sm:text-[28px]">
                    category
                  </span>
                </div>
                <h3 className="text-base sm:text-xl md:text-2xl font-bold text-on-surface mb-2 sm:mb-3">
                  Explore Sectors
                </h3>
                <p className="text-xs sm:text-sm md:text-[14.5px] text-on-surface-variant leading-relaxed">
                  Navigate curated industry landscapes, from Deep Tech to Sustainable Energy, guided by data-driven insights.
                </p>
              </div>

              {/* Card 3: Connect */}
              <div className="bg-surface-pure rounded-xl p-4 sm:p-6 md:p-8 border border-border-subtle shadow-[0px_4px_20px_rgba(10,25,42,0.04)] hover:shadow-[0px_8px_30px_rgba(10,25,42,0.08)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-start group">
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg bg-surface-container-high text-primary flex items-center justify-center mb-4 sm:mb-6 group-hover:bg-primary-container/10 transition-colors">
                  <span className="material-symbols-outlined text-[22px] sm:text-[28px]">
                    handshake
                  </span>
                </div>
                <h3 className="text-base sm:text-xl md:text-2xl font-bold text-on-surface mb-2 sm:mb-3">
                  Connect
                </h3>
                <p className="text-xs sm:text-sm md:text-[14.5px] text-on-surface-variant leading-relaxed">
                  Engage directly with founders and build strategic partnerships that go beyond mere financial transactions.
                </p>
              </div>
            </div>
          </div>
        </section>



        {/* ============================================================ */}
        {/* DYNAMIC BOTTOM CTA */}
        {/* ============================================================ */}
        <InvestorBottomCta />
      </main>

      <OpportunityEnquiryModal
        opportunity={selectedOpportunity}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />

      <Footer />
    </div>
  );
}
