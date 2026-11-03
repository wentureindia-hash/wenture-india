"use client";

import React, { useState } from "react";
import Link from "next/link";
import { COMPANY } from "@/lib/constants/company";
import { BrandLogo } from "@/components/brand-logo";
import { LegalModal } from "@/components/legal-modal";

export function Footer() {
  const [legalModal, setLegalModal] = useState<"privacy" | "terms" | null>(null);

  return (
    <footer className="bg-on-surface text-surface mt-auto border-t border-secondary/20">
      <div className="w-full max-w-container-max mx-auto px-3.5 sm:px-6 md:px-margin-desktop py-12 sm:py-16 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-gutter">
          {/* Brand Column */}
          <div className="md:col-span-4 flex flex-col justify-between">
            <div>
              <BrandLogo size="lg" dark showTagline={true} className="mb-4" />
              <p className="font-body-md text-sm text-surface-variant max-w-sm mt-3 leading-relaxed">
                {COMPANY.corePositioning}
              </p>
            </div>
            
            <div className="mt-8 pt-4 border-t border-white/10">
              <p className="font-label-caps text-[11px] text-surface-variant uppercase tracking-wider">
                {COMPANY.legalEntity}
              </p>
              <p className="font-label-caps text-[11px] text-surface-variant/80 uppercase tracking-wider mt-1">
                {COMPANY.copyright}
              </p>
            </div>
          </div>

          {/* Links Columns */}
          <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-8">
            {/* Navigation */}
            <div className="flex flex-col gap-3">
              <h4 className="font-button-text text-sm text-surface uppercase tracking-wider mb-2 font-semibold">
                Platform
              </h4>
              <Link href="/" className="font-body-md text-sm text-surface-variant hover:text-primary-container transition-colors duration-200">
                Discover
              </Link>
              <Link href="/for-entrepreneurs" className="font-body-md text-sm text-surface-variant hover:text-primary-container transition-colors duration-200">
                For Entrepreneurs
              </Link>
              <Link href="/for-investors" className="font-body-md text-sm text-surface-variant hover:text-primary-container transition-colors duration-200">
                For Investors
              </Link>
              <Link href="/investors" className="font-body-md text-sm text-surface-variant hover:text-primary-container transition-colors duration-200">
                Find Investors
              </Link>
              <Link href="/opportunities" className="font-body-md text-sm text-surface-variant hover:text-primary-container transition-colors duration-200">
                Opportunities
              </Link>
              <Link href="/how-it-works" className="font-body-md text-sm text-surface-variant hover:text-primary-container transition-colors duration-200">
                How It Works
              </Link>
              <Link href="/guides" className="font-body-md text-sm text-surface-variant hover:text-primary-container transition-colors duration-200">
                Investment Guides
              </Link>
              <Link href="/about" className="font-body-md text-sm text-surface-variant hover:text-primary-container transition-colors duration-200">
                About Wenture India
              </Link>
            </div>

            {/* Contact Information */}
            <div className="flex flex-col gap-3">
              <h4 className="font-button-text text-sm text-surface uppercase tracking-wider mb-2 font-semibold">
                Contact
              </h4>
              <a
                href={COMPANY.contact.phoneHref}
                className="font-body-md text-sm text-surface-variant hover:text-primary-container transition-colors duration-200 flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">call</span>
                {COMPANY.contact.phone}
              </a>
              <a
                href={COMPANY.contact.whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="font-body-md text-sm text-surface-variant hover:text-primary-container transition-colors duration-200 flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">chat</span>
                WhatsApp: {COMPANY.contact.whatsapp}
              </a>
              <a
                href={`mailto:${COMPANY.contact.businessEmail}`}
                className="font-body-md text-sm text-surface-variant hover:text-primary-container transition-colors duration-200 flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">mail</span>
                {COMPANY.contact.businessEmail}
              </a>
              <a
                href={`mailto:${COMPANY.contact.generalEmail}`}
                className="font-body-md text-sm text-surface-variant hover:text-primary-container transition-colors duration-200 flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">alternate_email</span>
                {COMPANY.contact.generalEmail}
              </a>
              <p className="font-body-md text-sm text-surface-variant flex items-start gap-1.5 pt-1">
                <span className="material-symbols-outlined text-[16px] shrink-0 mt-0.5">location_on</span>
                {COMPANY.contact.address}
              </p>
            </div>

            {/* Legal */}
            <div className="flex flex-col gap-3">
              <h4 className="font-button-text text-sm text-surface uppercase tracking-wider mb-2 font-semibold">
                Legal & Access
              </h4>
              <Link href="/login" className="font-body-md text-sm text-surface-variant hover:text-primary-container transition-colors duration-200">
                Portal Login
              </Link>
              <Link href="/signup" className="font-body-md text-sm text-surface-variant hover:text-primary-container transition-colors duration-200">
                Register Profile
              </Link>
              <button
                type="button"
                onClick={() => setLegalModal("privacy")}
                className="font-body-md text-sm text-surface-variant hover:text-primary-container transition-colors duration-200 text-left cursor-pointer"
              >
                Privacy Policy
              </button>
              <button
                type="button"
                onClick={() => setLegalModal("terms")}
                className="font-body-md text-sm text-surface-variant hover:text-primary-container transition-colors duration-200 text-left cursor-pointer"
              >
                Terms of Service
              </button>
              <Link href="/contact" className="font-body-md text-sm text-surface-variant hover:text-primary-container transition-colors duration-200">
                Direct Inquiry
              </Link>
              <span className="font-body-md text-xs text-surface-variant/70 pt-3 leading-relaxed">
                Institutional investment matching platform. All trademarks and brand names belong to their respective owners.
              </span>
            </div>
          </div>
        </div>
      </div>

      {legalModal && (
        <LegalModal
          isOpen={Boolean(legalModal)}
          onClose={() => setLegalModal(null)}
          type={legalModal}
        />
      )}
    </footer>
  );
}
