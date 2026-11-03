"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { RoleSwitchModal } from "@/components/profile/role-switch-modal";
import { useAuth } from "@/lib/firebase/auth-context";
import {
  InvestorProfile,
  getPublishedInvestorById,
  normalizeInvestorWhatsAppPhone,
  getInvestorWhatsAppUrl,
} from "@/lib/firebase/investors";
import { motion } from "framer-motion";

export default function InvestorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const {
    user,
    activeRole,
    isInvestor,
    isEntrepreneur,
    hasRole,
    isAuthenticated,
    loading: authLoading,
  } = useAuth();
  const [investor, setInvestor] = useState<InvestorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roleSwitchModalOpen, setRoleSwitchModalOpen] = useState(false);

  const isOwnProfile =
    !!user &&
    !!investor &&
    (investor.userId === user.uid || investor.id === user.uid);
  const isDualRole = hasRole("investor") && hasRole("entrepreneur");
  const isOperatingAsEntrepreneur =
    (activeRole === "entrepreneur" || isEntrepreneur) && hasRole("entrepreneur");
  const isOperatingAsInvestor =
    !isOperatingAsEntrepreneur && (activeRole === "investor" || isInvestor);

  const waNumber = normalizeInvestorWhatsAppPhone(investor?.contactPhone);
  const whatsAppUrl = waNumber
    ? getInvestorWhatsAppUrl(investor?.contactPhone)
    : null;

  useEffect(() => {
    async function load() {
      if (!id) return;
      setLoading(true);
      const res = await getPublishedInvestorById(id);
      if (res.error || !res.investor) {
        setError(res.error || "Investor profile not found.");
      } else {
        setInvestor(res.investor);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-[#F6FAFF]">
        <Navbar />
        <main className="flex-grow flex items-center justify-center py-24">
          <div className="text-center">
            <div className="w-9 h-9 border-3 border-[#00A6E8] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-semibold text-[#5F7180]">Loading investor profile...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !investor) {
    return (
      <div className="flex flex-col min-h-screen bg-[#F6FAFF]">
        <Navbar />
        <main className="flex-grow flex items-center justify-center py-24 px-5">
          <div className="max-w-md w-full bg-white border border-[#DCECF2] rounded-2xl p-8 text-center shadow-sm">
            <span className="material-symbols-outlined text-[48px] text-slate-300 mb-3">
              person_off
            </span>
            <h2 className="text-xl font-bold text-[#0A192A] mb-2 font-heading">
              Profile Unavailable
            </h2>
            <p className="text-xs sm:text-sm text-[#5F7180] mb-6 leading-relaxed">
              {error || "The requested investor profile is either inactive or currently undergoing admin review."}
            </p>
            <Link
              href="/investors"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#00A6E8] hover:bg-[#0093CE] text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>Back to Investors Directory</span>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const initial = investor.investorName?.charAt(0).toUpperCase() || "I";

  return (
    <div className="flex flex-col min-h-screen bg-[#F6FAFF] selection:bg-[#00A6E8] selection:text-white">
      <Navbar />

      <main className="flex-grow py-6 sm:py-12">
        <div className="w-full max-w-[1140px] mx-auto px-3.5 sm:px-8">
          {/* Breadcrumb Navigation */}
          <nav className="mb-4 sm:mb-6 flex items-center gap-2 text-xs text-[#5F7180]">
            <Link href="/investors" className="hover:text-[#00A6E8] transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">arrow_back</span>
              <span>Investors Directory</span>
            </Link>
            <span>/</span>
            <span className="text-[#0A192A] font-semibold truncate">{investor.investorName}</span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Left 2 Columns: Main Profile Details */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              {/* Profile Header Card */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-white border border-[#DCECF2] rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-5 mb-4 sm:mb-6">
                  <div className="flex items-center gap-3 sm:gap-4">
                    {investor.profileImage ? (
                      <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl overflow-hidden relative border border-[#DCECF2] shrink-0 bg-slate-100">
                        <Image
                          src={investor.profileImage}
                          alt={investor.investorName}
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-[#EBF6FC] border border-[#DCECF2] text-[#00658F] font-extrabold text-xl sm:text-2xl flex items-center justify-center shrink-0">
                        {initial}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <h1 className="text-xl sm:text-3xl font-extrabold text-[#0A192A] font-heading">
                          {investor.investorName}
                        </h1>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="material-symbols-outlined text-[12px] sm:text-[13px]">verified</span>
                          Verified
                        </span>
                      </div>

                      <div className="flex items-center gap-2 sm:gap-3 text-[11px] sm:text-xs text-[#5F7180] mt-1 flex-wrap">
                        <span className="font-bold text-[#00658F]">{investor.investorType}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px] sm:text-[14px] text-[#00A6E8]">
                            location_on
                          </span>
                          {investor.location}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Introduction Section */}
                <div className="pt-4 sm:pt-6 border-t border-[#DCECF2]">
                  <h2 className="text-[11px] sm:text-xs font-bold text-[#00658F] uppercase tracking-wider mb-1.5 sm:mb-2">
                    Executive Introduction
                  </h2>
                  <p className="text-xs sm:text-base text-[#0A192A] leading-relaxed whitespace-pre-line">
                    {investor.shortIntroduction}
                  </p>
                </div>
              </motion.div>

              {/* Experience & Track Record */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="bg-white border border-[#DCECF2] rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-sm space-y-4 sm:space-y-6"
              >
                <div>
                  <h2 className="text-base sm:text-xl font-extrabold text-[#0A192A] font-heading mb-2 sm:mb-3">
                    Investment Experience &amp; Background
                  </h2>
                  <p className="text-xs sm:text-sm text-[#5F7180] leading-relaxed whitespace-pre-line">
                    {investor.experience || investor.shortIntroduction}
                  </p>
                </div>

                {/* Professional Background */}
                {investor.professionalBackground && (
                  <div className="pt-4 sm:pt-6 border-t border-[#DCECF2]">
                    <h3 className="text-xs font-bold text-[#00658F] uppercase tracking-wider mb-2">
                      Professional &amp; Leadership Background
                    </h3>
                    <p className="text-xs sm:text-sm text-[#5F7180] leading-relaxed whitespace-pre-line">
                      {investor.professionalBackground}
                    </p>
                  </div>
                )}

                {/* Previous Investments / Portfolio */}
                {investor.previousInvestments && (
                  <div className="pt-4 sm:pt-6 border-t border-[#DCECF2]">
                    <h3 className="text-xs font-bold text-[#00658F] uppercase tracking-wider mb-2">
                      Previous Investments &amp; Portfolio
                    </h3>
                    <p className="text-xs sm:text-sm text-[#5F7180] leading-relaxed whitespace-pre-line">
                      {investor.previousInvestments}
                    </p>
                  </div>
                )}

                {/* Areas of Expertise Tags */}
                <div className="pt-4 sm:pt-6 border-t border-[#DCECF2]">
                  <h3 className="text-xs font-bold text-[#00658F] uppercase tracking-wider mb-3">
                    Areas of Expertise &amp; Value Addition
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {investor.areasOfExpertise.map((area) => (
                      <span
                        key={area}
                        className="px-3 py-1 bg-[#F4FAFD] border border-[#DCECF2] text-[#0A192A] text-xs font-semibold rounded-lg"
                      >
                        {area}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Preferred Sectors Tags */}
                <div className="pt-4 sm:pt-6 border-t border-[#DCECF2]">
                  <h3 className="text-xs font-bold text-[#00658F] uppercase tracking-wider mb-3">
                    Target Industry Sectors
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {investor.preferredSectors.map((sec) => (
                      <span
                        key={sec}
                        className="px-3 py-1 bg-[#EBF6FC] border border-[#DCECF2] text-[#00658F] text-xs font-bold rounded-lg"
                      >
                        {sec}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Right Column: Key Criteria & CTA Card */}
            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.15 }}
                className="bg-white border border-[#DCECF2] rounded-2xl sm:rounded-3xl p-6 sm:p-7 shadow-sm sticky top-24 space-y-6"
              >
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#00658F] block mb-1">
                    Investment Criteria
                  </span>
                  <h2 className="text-xl font-bold text-[#0A192A] font-heading">
                    Deal Parameters
                  </h2>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-[#F4FAFD] border border-[#DCECF2] rounded-xl">
                    <span className="text-[#5F7180] block text-[10px] uppercase font-bold mb-0.5">
                      Investment Ticket Range
                    </span>
                    <span className="text-base font-extrabold text-[#00658F]">
                      {investor.investmentRange}
                    </span>
                  </div>

                  {investor.typicalInvestmentSize && (
                    <div className="p-3 bg-[#F4FAFD] border border-[#DCECF2] rounded-xl">
                      <span className="text-[#5F7180] block text-[10px] uppercase font-bold mb-0.5">
                        Typical Investment Size
                      </span>
                      <span className="text-sm font-bold text-[#0A192A]">
                        {investor.typicalInvestmentSize}
                      </span>
                    </div>
                  )}

                  <div className="p-3 bg-[#F4FAFD] border border-[#DCECF2] rounded-xl">
                    <span className="text-[#5F7180] block text-[10px] uppercase font-bold mb-0.5">
                      Preferred Stage
                    </span>
                    <span className="text-sm font-bold text-[#0A192A]">
                      {investor.investmentStage}
                    </span>
                  </div>

                  <div className="p-3 bg-[#F4FAFD] border border-[#DCECF2] rounded-xl">
                    <span className="text-[#5F7180] block text-[10px] uppercase font-bold mb-0.5">
                      Geographic Base
                    </span>
                    <span className="text-sm font-bold text-[#0A192A]">
                      {investor.location}
                    </span>
                  </div>

                  {investor.preferredLocations && investor.preferredLocations.length > 0 && (
                    <div className="p-3 bg-[#F4FAFD] border border-[#DCECF2] rounded-xl">
                      <span className="text-[#5F7180] block text-[10px] uppercase font-bold mb-0.5">
                        Target Locations / Regions
                      </span>
                      <span className="text-sm font-bold text-[#0A192A]">
                        {investor.preferredLocations.join(", ")}
                      </span>
                    </div>
                  )}
                </div>

                {/* Primary CTA: WhatsApp Direct Contact with Role-based Restrictions */}
                <div className="pt-2">
                  {authLoading ? (
                    <div className="w-full py-3.5 bg-slate-100 text-slate-400 font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 animate-pulse">
                      <span className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 border-t-slate-500 animate-spin" />
                      <span>Verifying account mode...</span>
                    </div>
                  ) : isOwnProfile ? (
                    <div className="p-4 bg-[#EBF6FC] border border-[#00A6E8]/30 rounded-2xl text-center space-y-2">
                      <div className="w-8 h-8 rounded-full bg-[#00A6E8]/10 text-[#00658F] flex items-center justify-center mx-auto">
                        <span className="material-symbols-outlined text-[18px]">badge</span>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-[#00658F] block">
                          Your Public Investor Profile
                        </span>
                        <p className="text-[11px] text-[#5F7180] mt-0.5">
                          You are viewing your own directory listing.
                        </p>
                      </div>
                      <Link
                        href="/profile/investor"
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#00A6E8] hover:bg-[#0093CE] text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
                      >
                        <span className="material-symbols-outlined text-[15px]">edit</span>
                        <span>Manage Your Profile</span>
                      </Link>
                    </div>
                  ) : !isAuthenticated ? (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => router.push(`/login?redirect=/investors/${id}`)}
                        className="w-full py-3.5 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">login</span>
                        <span>Sign In to Contact on WhatsApp</span>
                      </button>
                      <p className="text-[11px] text-[#5F7180] text-center mt-2 leading-tight">
                        Sign in with an Entrepreneur account to connect with this capital partner.
                      </p>
                    </div>
                  ) : isOperatingAsInvestor ? (
                    isDualRole ? (
                      /* Dual Role in Investor Mode: Gated with switch to Entrepreneur Mode */
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-2 text-center sm:text-left">
                        <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs">
                          <span className="material-symbols-outlined text-[17px] text-amber-700">swap_horiz</span>
                          <span>Switch to Entrepreneur Mode</span>
                        </div>
                        <p className="text-[11px] text-amber-900/90 leading-relaxed">
                          You are currently browsing in <strong>Investor Mode</strong>. Contacting other investors is reserved for entrepreneurs. To chat with this capital partner regarding a business opportunity, switch your active role to <strong>Entrepreneur Mode</strong>.
                        </p>
                        <button
                          type="button"
                          onClick={() => setRoleSwitchModalOpen(true)}
                          className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">rocket_launch</span>
                          <span>Switch to Entrepreneur Mode</span>
                        </button>
                      </div>
                    ) : (
                      /* Pure Investor: Disabled with clear restriction notice */
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-1.5">
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
                          <span className="material-symbols-outlined text-[18px]">block</span>
                        </div>
                        <span className="text-xs font-bold text-slate-800 block">
                          Investor-to-Investor Contact Restricted
                        </span>
                        <p className="text-[11px] text-[#5F7180] leading-snug">
                          Contacting capital partners on WhatsApp is reserved for entrepreneurs seeking investment. Investors cannot initiate inquiries with other investors.
                        </p>
                        <p className="text-[10px] text-slate-400 pt-1">
                          Seeking capital for a venture? You can add the Entrepreneur role in your{" "}
                          <Link href="/profile" className="text-[#00A6E8] underline font-semibold">
                            Account Profile
                          </Link>.
                        </p>
                      </div>
                    )
                  ) : isOperatingAsEntrepreneur ? (
                    whatsAppUrl ? (
                      /* Active Entrepreneur Mode with Verified WhatsApp Number */
                      <div className="space-y-2">
                        <a
                          href={whatsAppUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-3.5 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[20px]">chat</span>
                          <span>Chat on WhatsApp</span>
                        </a>
                        <p className="text-[11px] text-[#5F7180] text-center leading-tight">
                          Connect directly with {investor.investorName} on WhatsApp.
                        </p>
                      </div>
                    ) : (
                      /* Fallback when Investor has not provided a verified contact phone */
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-2">
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
                          <span className="material-symbols-outlined text-[18px]">chat_off</span>
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">
                            WhatsApp Contact Unavailable
                          </span>
                          <p className="text-[11px] text-[#5F7180] mt-0.5 leading-snug">
                            This investor has not provided a verified WhatsApp contact number.
                          </p>
                        </div>
                        {investor.contactEmail && (
                          <div className="pt-1">
                            <a
                              href={`mailto:${investor.contactEmail}?subject=${encodeURIComponent(
                                "Business Opportunity Enquiry — Wenture India"
                              )}`}
                              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-[#DCECF2] hover:border-[#00A6E8] text-[#00658F] text-xs font-bold rounded-xl transition-colors shadow-2xs"
                            >
                              <span className="material-symbols-outlined text-[15px] text-[#00A6E8]">mail</span>
                              <span>Contact via Email</span>
                            </a>
                          </div>
                        )}
                      </div>
                    )
                  ) : null}
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </main>

      {/* Role Switch Modal for Dual Role Users */}
      {roleSwitchModalOpen && (
        <RoleSwitchModal
          isOpen={roleSwitchModalOpen}
          targetRole="entrepreneur"
          targetPath={`/investors/${id}`}
          onClose={() => setRoleSwitchModalOpen(false)}
        />
      )}

      <Footer />
    </div>
  );
}
