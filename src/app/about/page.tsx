import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/layout/container";
import { COMPANY } from "@/lib/constants/company";
import { BentoCard } from "@/components/cards/bento-card";

export const metadata: Metadata = {
  title: "About Wenture India | Omniverse Technologies Private Limited",
  description:
    "Learn about Wenture India International — our mission, vision, and core positioning as an institutional business ecosystem.",
};

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen bg-surface selection:bg-primary-container selection:text-white">
      <Navbar />

      <main className="flex-grow">
        {/* Hero */}
        <section className="pt-8 sm:pt-14 md:pt-24 pb-10 sm:pb-16 bg-surface-pure border-b border-border-subtle">
          <Container>
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-high border border-border-subtle text-primary font-label-caps text-xs mb-3 sm:mb-4">
                Corporate Overview
              </div>
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-on-surface mb-3 sm:mb-4 tracking-tight">
                About Wenture India
              </h1>
              <p className="text-lg sm:text-2xl text-secondary font-medium mb-3 sm:mb-4">
                {COMPANY.tagline}
              </p>
              <p className="text-xs sm:text-base md:text-lg text-on-surface-variant leading-relaxed">
                {COMPANY.corePositioning}
              </p>
            </div>
          </Container>
        </section>

        {/* Core Pillars */}
        <section className="py-10 sm:py-16 md:py-20 bg-surface">
          <Container>
            <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-14">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-on-surface mb-2 sm:mb-3">
                Our Institutional Focus
              </h2>
              <p className="text-xs sm:text-base text-on-surface-variant">
                Built to provide a secure, transparent, and structured environment for capital deployment and enterprise expansion.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-6">
              <BentoCard
                icon="hub"
                title="Connect"
                description="Creating direct, professional connections between visionary entrepreneurs, active investors, and business leaders across sectors."
              />

              <BentoCard
                icon="construction"
                title="Build"
                description="Providing clear opportunity presentation frameworks and educational resources to help businesses showcase their vision effectively."
              />

              <BentoCard
                icon="trending_up"
                title="Scale & Grow Together"
                description="Facilitating strategic alliances, franchise rollouts, and international export partnerships that foster long-term growth."
              />
            </div>
          </Container>
        </section>

        {/* Corporate Legal Information */}
        <section className="py-10 sm:py-16 md:py-20 bg-surface-container-low border-y border-border-subtle">
          <Container size="narrow">
            <div className="bg-surface-pure rounded-2xl p-4 sm:p-8 md:p-12 border border-border-subtle shadow-sm space-y-4 sm:space-y-6">
              <span className="font-label-caps text-xs text-primary uppercase tracking-wider font-semibold">
                Corporate Governance
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-on-surface">
                Omniverse Technologies Private Limited
              </h3>
              <p className="text-xs sm:text-base text-on-surface-variant leading-relaxed">
                Wenture India International operates under <strong>{COMPANY.legalEntity}</strong>, headquartered in New Delhi, India. The company is committed to upholding institutional integrity, data confidentiality, and regulatory compliance across all business networking and advisory activities.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 pt-3 sm:pt-4 border-t border-border-subtle text-xs sm:text-sm">
                <div>
                  <h4 className="font-label-caps text-[11px] sm:text-xs text-on-surface-variant uppercase mb-1">
                    Registered Office
                  </h4>
                  <p className="text-xs sm:text-sm text-on-surface">
                    {COMPANY.contact.address}
                  </p>
                </div>
                <div>
                  <h4 className="font-label-caps text-[11px] sm:text-xs text-on-surface-variant uppercase mb-1">
                    Official Inquiries
                  </h4>
                  <p className="text-xs sm:text-sm text-on-surface">
                    {COMPANY.contact.businessEmail}
                  </p>
                  <p className="text-xs sm:text-sm text-on-surface">
                    {COMPANY.contact.phone}
                  </p>
                  <p className="text-xs sm:text-sm text-on-surface">
                    {COMPANY.contact.secondaryPhone}
                  </p>
                </div>
              </div>

              <div className="pt-2 sm:pt-4 flex flex-wrap gap-2.5 sm:gap-4">
                <Link
                  href="/contact"
                  className="bg-primary-container text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-button-text text-xs sm:text-sm hover:bg-surface-tint text-center flex-1 sm:flex-initial"
                >
                  Contact Management
                </Link>
                <Link
                  href="/opportunities"
                  className="border border-border-subtle text-on-surface px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-button-text text-xs sm:text-sm hover:bg-surface text-center flex-1 sm:flex-initial"
                >
                  Explore Opportunities
                </Link>
              </div>
            </div>
          </Container>
        </section>
      </main>

      <Footer />
    </div>
  );
}
