"use client";

import React, { useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { LegalModal } from "@/components/legal-modal";
import { ArrowUp, Mail, MessageCircle, Globe } from "lucide-react";

export function Footer() {
  const [legalModal, setLegalModal] = useState<"privacy" | "terms" | null>(null);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="bg-[#F4FAFD] text-[#0A192A] pt-16 pb-12 border-t border-[#DCECF2]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 pb-12 border-b border-[#DCECF2]">
          {/* Brand Info */}
          <div className="space-y-3 max-w-md">
            <BrandLogo size="md" dark={false} />
            <p className="text-sm text-[#5F7180] font-medium leading-relaxed">
              &ldquo;Connect. Build. Scale. Grow Together.&rdquo;
            </p>
            <p className="text-xs text-slate-500">
              A common online platform to connect entrepreneurs with investors, vision with capital, ideas with funds and giving wings to dreams.
            </p>
          </div>

          {/* Quick Links & Contact Shortcuts */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-slate-300">
            <a
              href="mailto:wentureindia@gmail.com"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 transition-colors"
            >
              <Mail className="w-3.5 h-3.5 text-wenture-blueLight" />
              <span>wentureindia@gmail.com</span>
            </a>
            <a
              href="https://wa.me/919841881008"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 transition-colors text-emerald-400 hover:text-emerald-300"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp Us</span>
            </a>
            <button
              onClick={scrollToTop}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-400 hover:text-white border border-slate-700/60 transition-colors"
              aria-label="Scroll back to top"
            >
              <ArrowUp className="w-3.5 h-3.5" />
              <span>Top</span>
            </button>
          </div>
        </div>

        {/* Bottom Copyright & Legal links */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Globe className="w-3.5 h-3.5 text-slate-400" />
            <span>Official Domain: <strong className="text-slate-300 font-semibold">wentureindia.com</strong></span>
          </div>

          <p className="text-center sm:text-left">
            &copy; 2026 Wenture India International. All rights reserved.
          </p>

          <div className="flex items-center gap-5">
            <button
              onClick={() => setLegalModal("privacy")}
              className="hover:text-slate-300 transition-colors underline-offset-4 hover:underline"
            >
              Privacy Policy
            </button>
            <span className="text-slate-700">&bull;</span>
            <button
              onClick={() => setLegalModal("terms")}
              className="hover:text-slate-300 transition-colors underline-offset-4 hover:underline"
            >
              Terms &amp; Conditions
            </button>
          </div>
        </div>
      </div>

      {/* Legal Information Modal */}
      {legalModal && (
        <LegalModal
          isOpen={!!legalModal}
          onClose={() => setLegalModal(null)}
          type={legalModal}
        />
      )}
    </footer>
  );
}
