"use client";

import React from "react";

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "privacy" | "terms";
}

export function LegalModal({ isOpen, onClose, type }: LegalModalProps) {
  if (!isOpen) return null;

  const isPrivacy = type === "privacy";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-[#0A192A]/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
    >
      <div
        className="relative w-full max-w-2xl max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-[#DCECF2] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[#DCECF2] bg-[#F6FAFF]">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-[#EBF6FC] text-[#00A6E8] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px]">
                {isPrivacy ? "shield" : "description"}
              </span>
            </span>
            <div>
              <h3 id="legal-modal-title" className="text-sm sm:text-base font-bold text-[#0A192A]">
                {isPrivacy ? "Privacy Policy (Preliminary Draft)" : "Terms of Service (Preliminary Draft)"}
              </h3>
              <p className="text-[10px] sm:text-[11px] text-[#5F7180]">
                Wenture India International
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#5F7180] hover:text-[#0A192A] hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Regulatory & Preliminary Notice */}
        <div className="px-5 sm:px-6 py-2.5 bg-amber-50 border-b border-amber-200 flex items-start gap-2 text-[11px] text-amber-900 leading-snug">
          <span className="material-symbols-outlined text-[16px] text-amber-600 shrink-0 mt-0.5">info</span>
          <span>
            <strong>PRELIMINARY DRAFT:</strong> This document is a preliminary operational draft subject to formal review and ratification by Wenture India International legal counsel before final commercial execution.
          </span>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-[#5F7180] leading-relaxed">
          {isPrivacy ? (
            <>
              <p className="font-semibold text-[#0A192A]">
                Wenture India International is dedicated to protecting the privacy of entrepreneurs, investors, and platform visitors.
              </p>
              
              <h4 className="text-xs sm:text-sm font-bold text-[#0A192A] pt-1">1. Information We Collect</h4>
              <p>
                We collect personal and professional information provided directly during registration, profile creation, and opportunity submissions. This includes contact details (names, verified email addresses, phone/WhatsApp numbers), professional investment preferences, company overview summaries, and voluntarily uploaded presentation documents.
              </p>

              <h4 className="text-xs sm:text-sm font-bold text-[#0A192A] pt-1">2. Confidential Pitch Decks & Document Security</h4>
              <p>
                Uploaded pitch decks and business documents are treated as confidential. In accordance with platform security protocols, documents uploaded to Wenture are accessible only to authenticated registered platform users and authorized administrative personnel for verification.
              </p>

              <h4 className="text-xs sm:text-sm font-bold text-[#0A192A] pt-1">3. Use of Information</h4>
              <p>
                Collected data is utilized strictly to:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm">
                <li>Facilitate direct business and investment introductions between verified parties.</li>
                <li>Verify listing authenticity and uphold platform community standards.</li>
                <li>Communicate platform status updates, inquiry notifications, and administrative alerts.</li>
              </ul>

              <h4 className="text-xs sm:text-sm font-bold text-[#0A192A] pt-1">4. No Data Selling</h4>
              <p>
                Wenture India International does not sell, lease, or broker user personal information or proprietary business information to third-party advertising or marketing services.
              </p>
            </>
          ) : (
            <>
              <p className="font-semibold text-[#0A192A]">
                Terms and Conditions Governing Use of the Wenture India Platform.
              </p>

              <h4 className="text-xs sm:text-sm font-bold text-[#0A192A] pt-1">1. Informational & Matchmaking Platform</h4>
              <p>
                Wenture India International operates as an introductory and business networking marketplace connecting entrepreneurs, business operators, and investors. Wenture is not a registered broker-dealer, investment advisor, or clearing house.
              </p>

              <h4 className="text-xs sm:text-sm font-bold text-[#0A192A] pt-1">2. No Guaranteed Returns or Financial Advice</h4>
              <p>
                No communication, listing, calculation, or material presented on Wenture constitutes financial, legal, tax, or investment advice. Wenture does not solicit securities, guarantee investment outcomes, or underwrite commercial ventures.
              </p>

              <h4 className="text-xs sm:text-sm font-bold text-[#0A192A] pt-1">3. User Responsibility & Due Diligence</h4>
              <p>
                Entrepreneurs and investors are solely responsible for conducting independent commercial, legal, and financial due diligence before entering into any transaction, binding agreement, or capital transfer.
              </p>

              <h4 className="text-xs sm:text-sm font-bold text-[#0A192A] pt-1">4. Intellectual Property & Listing Accuracy</h4>
              <p>
                Users warrant that all submitted listings, trademarks, and pitch materials represent truthful, accurate information and do not infringe third-party intellectual property rights.
              </p>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3 border-t border-[#DCECF2] bg-[#F6FAFF] flex items-center justify-between">
          <span className="text-[11px] text-[#5F7180]">
            Last updated: November 2026
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#0A192A] hover:bg-[#132c45] text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
}
