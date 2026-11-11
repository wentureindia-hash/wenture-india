"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Opportunity, formatWhatsAppNumber } from "@/lib/constants/opportunities";
import { OpportunityEnquiryModal } from "@/components/forms/opportunity-enquiry-modal";
import { useAuth } from "@/lib/firebase/auth-context";
import { COMPANY } from "@/lib/constants/company";
import { getListingPitchDeck } from "@/lib/firebase/listings";

interface OpportunityDetailViewProps {
  opportunity: Opportunity;
}

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80";

export function OpportunityDetailView({
  opportunity: opp,
}: OpportunityDetailViewProps) {
  const { user, isAuthenticated } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [imgSrc, setImgSrc] = useState(opp.imageUrl || DEFAULT_IMAGE);
  const [openingDeck, setOpeningDeck] = useState(false);
  const [deckErrorMessage, setDeckErrorMessage] = useState<string | null>(null);

  const handleOpenPitchDeck = async () => {
    if (opp.pitchDeckUrl) {
      window.open(opp.pitchDeckUrl, "_blank", "noopener,noreferrer");
      return;
    }
    setOpeningDeck(true);
    setDeckErrorMessage(null);
    try {
      const res = await getListingPitchDeck(opp.id);
      if (res.url) {
        window.open(res.url, "_blank", "noopener,noreferrer");
      } else {
        setDeckErrorMessage(res.error || "Pitch deck is currently unavailable.");
      }
    } catch {
      setDeckErrorMessage("Failed to open pitch deck. Please try again.");
    } finally {
      setOpeningDeck(false);
    }
  };

  const isOwner = Boolean(
    isAuthenticated &&
      user &&
      ((opp.ownerId && opp.ownerId !== "platform-admin" && opp.ownerId === user.uid) ||
        (opp.ownerEmail && user.email && opp.ownerEmail.trim().toLowerCase() === user.email.trim().toLowerCase()) ||
        (opp.contactEmail && user.email && opp.contactEmail.trim().toLowerCase() === user.email.trim().toLowerCase()))
  );

  // Extract this particular opportunity's contact phone number
  const oppPhone =
    opp.contactPhone ||
    opp.whatsappNumber ||
    opp.keyInformation?.find((k) => k.label.toLowerCase().includes("phone"))?.value ||
    "";

  const targetWaNumber = formatWhatsAppNumber(oppPhone, "919841881008");
  const displayPhone = oppPhone || COMPANY.contact.phone;

  const whatsappUrl = `https://wa.me/${targetWaNumber}?text=${encodeURIComponent(
    `Hello, I am interested in: ${opp.title} (${opp.category} - ${opp.sector}) listed on Wenture India. Please share further details.`
  )}`;

  return (
    <div className="w-full max-w-[1280px] mx-auto px-3.5 sm:px-8 lg:px-12 py-6 sm:py-12">
      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-medium text-[#5F7180] mb-4 sm:mb-6">
        <Link href="/opportunities" className="hover:text-[#00A6E8] transition-colors">
          Opportunities
        </Link>
        <span>/</span>
        <span className="text-[#00A6E8] font-bold">{opp.category}</span>
        <span>/</span>
        <span className="text-[#0A192A] font-semibold truncate max-w-[160px] sm:max-w-none">{opp.title}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-10">
        {/* ============================================================ */}
        {/* LEFT COLUMN: Opportunity Profile & Content */}
        {/* ============================================================ */}
        <div className="lg:col-span-8 space-y-6 sm:space-y-8">
          {/* Main Hero Header Card */}
          <div className="bg-white rounded-2xl p-4 sm:p-8 border border-[#DCECF2] shadow-sm">
            {/* Top Badges */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-3 sm:mb-4">
              <span className="bg-[#EBF6FC] text-[#00A6E8] font-bold text-[10px] sm:text-xs px-2.5 py-0.5 sm:px-3 sm:py-1 rounded">
                {opp.category}
              </span>
              <span className="bg-slate-100 text-[#5F7180] font-semibold text-[10px] sm:text-xs px-2.5 py-0.5 sm:px-3 sm:py-1 rounded">
                {opp.sector}
              </span>
              <span className="bg-emerald-50 text-emerald-700 font-extrabold text-[10px] sm:text-xs px-2.5 py-0.5 sm:px-3 sm:py-1 rounded border border-emerald-200 flex items-center gap-1 uppercase tracking-wider">
                <span className="material-symbols-outlined text-[13px] sm:text-[14px]">verified</span>
                Verified Listing
              </span>
              {opp.stageBadge && (
                <span className="bg-[#EBF6FC] text-[#00658F] font-bold text-[10px] sm:text-xs px-2.5 py-0.5 sm:px-3 sm:py-1 rounded border border-[#DCECF2]">
                  {opp.stageBadge}
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-3xl lg:text-4xl font-extrabold text-[#0A192A] tracking-tight font-heading mb-2 sm:mb-3">
              {opp.title}
            </h1>

            <p className="text-xs sm:text-base text-[#5F7180] leading-relaxed mb-4 sm:mb-6">
              {opp.shortDescription}
            </p>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 pt-4 sm:pt-6 border-t border-[#DCECF2]">
              <div>
                <span className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#5F7180]">
                  Location
                </span>
                <span className="text-xs sm:text-base font-bold text-[#0A192A] flex items-center gap-1 mt-0.5">
                  <span className="material-symbols-outlined text-[14px] sm:text-[16px] text-[#00A6E8]">
                    location_on
                  </span>
                  <span className="truncate">{opp.location}</span>
                </span>
              </div>

              <div>
                <span className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#5F7180]">
                  Investment Range
                </span>
                <span className="text-xs sm:text-base font-bold text-[#00658F] mt-0.5 block truncate">
                  {opp.investmentRange}
                </span>
              </div>

              <div className="min-[420px]:col-span-2 sm:col-span-1">
                <span className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#5F7180]">
                  Target Requirement
                </span>
                <span className="text-xs sm:text-base font-bold text-[#0A192A] mt-0.5 block truncate">
                  {opp.targetRaise}
                </span>
              </div>
            </div>
          </div>

          {/* Cover Media */}
          <div className="h-48 sm:h-80 md:h-96 w-full relative rounded-2xl overflow-hidden border border-[#DCECF2] bg-slate-100 shadow-sm">
            <Image
              src={imgSrc}
              alt={opp.title || "Opportunity"}
              fill
              unoptimized
              className="object-cover"
              onError={() => setImgSrc(DEFAULT_IMAGE)}
            />
          </div>

          {/* Overview & Narrative */}
          <div className="bg-white rounded-2xl p-4 sm:p-8 border border-[#DCECF2] shadow-sm space-y-4 sm:space-y-6">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-[#0A192A] mb-2 sm:mb-3 font-heading">
                Overview
              </h2>
              <p className="text-xs sm:text-base text-[#5F7180] leading-relaxed">
                {opp.overview}
              </p>
            </div>

            <div className="pt-3 sm:pt-4 border-t border-[#DCECF2]">
              <h2 className="text-lg sm:text-xl font-bold text-[#0A192A] mb-2 sm:mb-3 font-heading">
                Business Description
              </h2>
              <p className="text-xs sm:text-base text-[#5F7180] leading-relaxed">
                {opp.businessDescription}
              </p>
            </div>

            {/* Opportunity Details */}
            {opp.opportunityDetails && opp.opportunityDetails.length > 0 && (
              <div className="pt-4 border-t border-[#DCECF2]">
                <h2 className="text-xl font-bold text-[#0A192A] mb-3 font-heading">
                  Opportunity Highlights
                </h2>
                <ul className="space-y-2.5">
                  {opp.opportunityDetails.map((detail, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-sm text-[#5F7180]">
                      <span className="w-5 h-5 rounded-full bg-[#EBF6FC] text-[#00A6E8] flex items-center justify-center shrink-0 mt-0.5">
                        <span className="material-symbols-outlined text-[14px]">check</span>
                      </span>
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Pitch Deck Presentation (if uploaded or flagged) */}
            {(opp.hasPitchDeck || opp.pitchDeckUrl) && (
              <div className="pt-4 border-t border-[#DCECF2]">
                <h2 className="text-xl font-bold text-[#0A192A] mb-3 font-heading flex items-center gap-2">
                  <span className="material-symbols-outlined text-rose-500">picture_as_pdf</span>
                  <span>Pitch Deck & Presentation</span>
                </h2>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[24px]">description</span>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#0A192A]">
                        {opp.pitchDeckFileName || "Company Pitch Deck (PDF)"}
                      </h4>
                      <p className="text-[11px] text-[#5F7180]">
                        Official company overview presentation
                      </p>
                      {deckErrorMessage && (
                        <p className="text-[11px] text-rose-600 mt-1 font-medium">{deckErrorMessage}</p>
                      )}
                    </div>
                  </div>
                  {isAuthenticated ? (
                    <button
                      type="button"
                      onClick={handleOpenPitchDeck}
                      disabled={openingDeck}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {openingDeck ? "sync" : "download"}
                      </span>
                      <span>{openingDeck ? "Loading..." : "View Pitch Deck"}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setModalOpen(true)}
                      className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">lock</span>
                      <span>Sign in to View</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* RIGHT COLUMN: Key Information & Action Sidebar */}
        {/* ============================================================ */}
        <div className="lg:col-span-4 space-y-6">
          {/* Action Box */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#DCECF2] shadow-sm sticky top-28">
            <h3 className="text-lg font-bold text-[#0A192A] mb-2 font-heading">
              Express Interest
            </h3>
            <p className="text-xs sm:text-sm text-[#5F7180] mb-6 leading-relaxed">
              Connect directly with Wenture India to receive further information or discuss terms.
            </p>

            <div className="space-y-3">
              {isOwner ? (
                <>
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                    <span className="material-symbols-outlined text-[18px] text-amber-600 shrink-0 mt-0.5">info</span>
                    <div>
                      <strong className="block mb-0.5">This is your business listing</strong>
                      <span>Direct investor enquiries will appear in your business listings dashboard.</span>
                    </div>
                  </div>

                  <Link
                    href="/profile/listings"
                    className="w-full py-3.5 bg-[#00A6E8] hover:bg-[#0093CE] text-white font-bold text-sm rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">list_alt</span>
                    <span>Manage in My Listings</span>
                  </Link>

                  <Link
                    href="/contact"
                    className="w-full py-3 bg-[#F6FAFF] hover:bg-white border border-[#DCECF2] hover:border-[#00A6E8] text-[#0A192A] font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <span>Contact Wenture India Support</span>
                  </Link>
                </>
              ) : (
                <>
                  {/* Primary CTA */}
                  <button
                    type="button"
                    onClick={() => setModalOpen(true)}
                    className="w-full py-3.5 bg-[#00A6E8] hover:bg-[#0093CE] text-white font-bold text-sm rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
                  >
                    <span>I&apos;m Interested</span>
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </button>

                  {/* Secondary Contact CTA */}
                  <Link
                    href="/contact"
                    className="w-full py-3 bg-[#F6FAFF] hover:bg-white border border-[#DCECF2] hover:border-[#00A6E8] text-[#0A192A] font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <span>Contact Wenture India</span>
                  </Link>

                  {/* WhatsApp CTA */}
                  {isAuthenticated ? (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 shadow-xs"
                    >
                      <span className="material-symbols-outlined text-[18px]">chat</span>
                      <span>Chat on WhatsApp ({displayPhone})</span>
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setModalOpen(true)}
                      className="w-full py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 shadow-xs"
                    >
                      <span className="material-symbols-outlined text-[18px]">chat</span>
                      <span>Chat on WhatsApp</span>
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Key Information Table */}
            <div className="mt-8 pt-6 border-t border-[#DCECF2] space-y-3">
              <h4 className="text-xs font-bold text-[#0A192A] uppercase tracking-wider">
                Key Opportunity Details
              </h4>
              {opp.keyInformation
                .filter((info) => {
                  if (!isAuthenticated) {
                    const lower = info.label.toLowerCase();
                    if (lower.includes("phone") || lower.includes("email") || lower.includes("contact")) {
                      return false;
                    }
                  }
                  return true;
                })
                .map((info, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100">
                    <span className="text-[#5F7180]">{info.label}:</span>
                    <span className="font-semibold text-[#0A192A] text-right">{info.value}</span>
                  </div>
                ))}
            </div>

            {/* Direct Contact Info */}
            <div className="mt-6 pt-4 border-t border-[#DCECF2] text-xs text-[#5F7180] space-y-2">
              {isAuthenticated ? (
                <>
                  <p>
                    <strong>Direct Contact:</strong> {displayPhone}
                  </p>
                  {opp.contactEmail && (
                    <p>
                      <strong>Listing Email:</strong> {opp.contactEmail}
                    </p>
                  )}
                  <p>
                    <strong>Wenture India Desk:</strong> {COMPANY.contact.generalEmail}
                  </p>
                </>
              ) : (
                <>
                  <div className="p-3 bg-[#F4FAFD] border border-[#DCECF2] rounded-xl flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-[18px] text-[#00A6E8] shrink-0 mt-0.5">lock</span>
                    <div>
                      <p className="font-bold text-[#0A192A] text-xs">Direct Contact Protected</p>
                      <p className="text-[11px] text-[#5F7180] leading-snug mt-0.5">
                        Private contact details are reserved for verified users. Sign in and express interest to connect directly.
                      </p>
                    </div>
                  </div>
                  <p className="text-[11px] text-[#5F7180]">
                    <strong>Platform Desk:</strong> {COMPANY.contact.generalEmail}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Enquiry Modal */}
      <OpportunityEnquiryModal
        opportunity={opp}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
