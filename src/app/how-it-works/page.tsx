import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/layout/container";
import { NetworkMesh } from "@/components/visual/network-mesh";
import { HowItWorksGatewayCards } from "@/components/ui/join-cta";
import { COMPANY } from "@/lib/constants/company";

export const metadata: Metadata = {
  title: "How It Works | The Wenture India Journey | Wenture India",
  description:
    "Discover how Wenture India connects entrepreneurs and investors through a simple 6-step journey: discover, review, express interest, and connect.",
};

export default function HowItWorksPage() {
  const steps = [
    {
      num: 1,
      title: "Create Your Profile",
      desc: "Join Wenture India and introduce yourself or your business.",
    },
    {
      num: 2,
      title: "Discover Opportunities",
      desc: "Explore relevant businesses and opportunities.",
    },
    {
      num: 3,
      title: "Explore Businesses",
      desc: "Discover businesses, startups and opportunities across sectors.",
    },
    {
      num: 4,
      title: "Review Information",
      desc: "Explore the available information about an opportunity.",
    },
    {
      num: 5,
      title: "Express Interest",
      desc: "Submit an enquiry or express interest.",
    },
    {
      num: 6,
      title: "Connect",
      desc: "Connect with the relevant entrepreneur, investor or business.",
      active: true,
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#F6FAFF] selection:bg-[#00A6E8] selection:text-white">
      <Navbar />

      <main className="flex-grow">
        {/* ============================================================ */}
        {/* HERO SECTION */}
        {/* ============================================================ */}
        <section className="pt-8 sm:pt-14 md:pt-24 pb-10 sm:pb-16 bg-white border-b border-[#DCECF2]">
          <Container>
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F6FAFF] border border-[#DCECF2] text-[#00658F] font-semibold text-xs mb-3 sm:mb-4">
                Architecture of Connectivity
              </div>
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-[#0A192A] mb-3 sm:mb-4 tracking-tight font-heading">
                The Wenture India Journey
              </h1>
              <p className="text-xs sm:text-base text-[#5F7180] leading-relaxed max-w-2xl mx-auto">
                {COMPANY.corePositioning}
              </p>
            </div>

            <div className="mt-6 sm:mt-10 max-w-xl mx-auto bg-[#F6FAFF] rounded-2xl p-4 sm:p-6 border border-[#DCECF2] shadow-sm">
              <div className="h-44 sm:h-56 w-full flex items-center justify-center">
                <NetworkMesh variant="hero" />
              </div>
            </div>
          </Container>
        </section>

        {/* ============================================================ */}
        {/* 6-STEP WENTURE INDIA JOURNEY */}
        {/* ============================================================ */}
        <section className="w-full max-w-[1280px] mx-auto px-3.5 sm:px-8 lg:px-12 py-10 sm:py-16 md:py-24">
          <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-16">
            <span className="text-[11px] sm:text-xs font-bold text-[#00A6E8] uppercase tracking-wider block mb-1">
              Step-By-Step Process
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-[#0A192A] tracking-tight">
              How Wenture India Works
            </h2>
            <p className="text-xs sm:text-base text-[#5F7180] mt-1.5 sm:mt-2">
              Discover opportunities, explore businesses and build meaningful connections.
            </p>
          </div>

          <div className="relative">
            {/* Desktop Connecting Line */}
            <div className="hidden md:block absolute top-8 left-12 right-12 h-0.5 bg-[#DCECF2] z-0" />

            <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-6 relative z-10">
              {steps.map((step) => (
                <div key={step.num} className="flex flex-col items-center text-center bg-white sm:bg-transparent p-3.5 sm:p-0 rounded-xl sm:rounded-none border sm:border-0 border-[#DCECF2] shadow-sm sm:shadow-none">
                  <div
                    className={`w-11 h-11 sm:w-16 sm:h-16 rounded-full flex items-center justify-center font-bold text-sm sm:text-lg relative z-10 transition-transform hover:scale-105 shadow-sm ${
                      step.active
                        ? "bg-[#00A6E8] text-white border-2 border-[#00A6E8]"
                        : "bg-white text-[#0A192A] border-2 border-[#DCECF2]"
                    }`}
                  >
                    {step.num}
                  </div>
                  <h4
                    className={`text-xs sm:text-base mt-2.5 sm:mt-4 mb-1 font-bold line-clamp-1 sm:line-clamp-none ${
                      step.active ? "text-[#00A6E8]" : "text-[#0A192A]"
                    }`}
                  >
                    {step.title}
                  </h4>
                  <p className="text-[11px] sm:text-xs text-[#5F7180] leading-relaxed line-clamp-2 sm:line-clamp-none">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Role-Aware Dynamic Gateways */}
          <HowItWorksGatewayCards />
        </section>
      </main>

      <Footer />
    </div>
  );
}
