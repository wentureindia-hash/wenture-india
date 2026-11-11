import React from "react";
import { Metadata } from "next";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/layout/container";
import { GuideCard } from "@/components/cards/guide-card";
import { GUIDES, GUIDES_HEADING } from "@/lib/constants/guides";

export const metadata: Metadata = {
  title: "Business & Investment Guides | Learn. Explore. Grow. | Wenture India",
  description:
    "Understand business opportunities, investment concepts, venture capital, angel funding, partnerships, and franchise growth models.",
};

export default function GuidesHubPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#F6FAFF] selection:bg-[#00A6E8] selection:text-white">
      <Navbar />

      <main className="flex-grow py-8 sm:py-12 md:py-20">
        <Container>
          <div className="max-w-3xl mx-auto text-center mb-6 sm:mb-14">
            <span className="text-xs font-bold text-[#00A6E8] uppercase tracking-wider block mb-1">
              Educational Hub
            </span>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-[#0A192A] tracking-tight font-heading mb-2 sm:mb-3">
              {GUIDES_HEADING.title}
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-[#5F7180] max-w-2xl mx-auto leading-relaxed">
              {GUIDES_HEADING.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 min-[500px]:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-6">
            {GUIDES.map((guide) => (
              <GuideCard key={guide.slug} guide={guide} />
            ))}
          </div>
        </Container>
      </main>

      <Footer />
    </div>
  );
}
