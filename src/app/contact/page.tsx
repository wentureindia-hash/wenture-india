import React from "react";
import { Metadata } from "next";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/layout/container";
import { ContactForm } from "@/components/forms/contact-form";
import { COMPANY } from "@/lib/constants/company";

export const metadata: Metadata = {
  title: "Contact Us | Wenture India International",
  description:
    "Get in touch with the Wenture India International team. Phone, email, WhatsApp, and office address in New Delhi, India.",
};

export default function ContactPage() {
  return (
    <div className="flex flex-col min-h-screen bg-surface selection:bg-primary-container selection:text-white">
      <Navbar />

      <main className="flex-grow py-8 sm:py-14 md:py-20">
        <Container>
          <div className="max-w-3xl mx-auto text-center mb-8 sm:mb-12">
            <span className="font-label-caps text-xs text-primary uppercase tracking-wider">
              Get In Touch
            </span>
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-on-surface mt-1 mb-3 sm:mb-4 tracking-tight">
              Connect With Our Team
            </h1>
            <p className="text-xs sm:text-base md:text-lg text-on-surface-variant max-w-xl mx-auto leading-relaxed">
              Have questions about listed opportunities, submitting your business, or partnership enquiries? We are here to assist.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-10">
            {/* Left Column: Direct Channels & Information */}
            <div className="lg:col-span-5 space-y-4 sm:space-y-6">
              <div className="bg-surface-pure rounded-2xl p-4 sm:p-8 border border-border-subtle shadow-sm space-y-4 sm:space-y-6">
                <h3 className="text-lg sm:text-xl font-bold text-on-surface">
                  Direct Communication Channels
                </h3>

                <div className="space-y-3 sm:space-y-4">
                  {/* Direct Phone */}
                  <a
                    href={COMPANY.contact.phoneHref}
                    className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border border-border-subtle hover:border-primary-container/60 hover:bg-surface transition-all group"
                  >
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-surface-container-high text-primary-container flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <span className="material-symbols-outlined text-[20px] sm:text-[22px]">call</span>
                    </div>
                    <div>
                      <p className="font-label-caps text-[10px] sm:text-[11px] text-on-surface-variant uppercase font-semibold">
                        Direct Phone
                      </p>
                      <p className="font-button-text text-xs sm:text-sm text-on-surface group-hover:text-primary-container">
                        {COMPANY.contact.phone}
                      </p>
                      <p className="text-[11px] sm:text-xs text-on-surface-variant mt-0.5">
                        Mon – Sat, 9:30 AM – 6:30 PM IST
                      </p>
                    </div>
                  </a>

                  {/* Secondary Direct Phone */}
                  <a
                    href={COMPANY.contact.secondaryPhoneHref}
                    className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border border-border-subtle hover:border-primary-container/60 hover:bg-surface transition-all group"
                  >
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-surface-container-high text-primary-container flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <span className="material-symbols-outlined text-[20px] sm:text-[22px]">call</span>
                    </div>
                    <div>
                      <p className="font-label-caps text-[10px] sm:text-[11px] text-on-surface-variant uppercase font-semibold">
                        Direct Helpline
                      </p>
                      <p className="font-button-text text-xs sm:text-sm text-on-surface group-hover:text-primary-container">
                        {COMPANY.contact.secondaryPhone}
                      </p>
                      <p className="text-[11px] sm:text-xs text-on-surface-variant mt-0.5">
                        Mon – Sat, 9:30 AM – 6:30 PM IST
                      </p>
                    </div>
                  </a>

                  {/* WhatsApp */}
                  <a
                    href={COMPANY.contact.whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border border-border-subtle hover:border-primary-container/60 hover:bg-surface transition-all group"
                  >
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-surface-container-high text-primary-container flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <span className="material-symbols-outlined text-[20px] sm:text-[22px]">chat</span>
                    </div>
                    <div>
                      <p className="font-label-caps text-[10px] sm:text-[11px] text-on-surface-variant uppercase font-semibold">
                        WhatsApp Business
                      </p>
                      <p className="font-button-text text-xs sm:text-sm text-on-surface group-hover:text-primary-container">
                        {COMPANY.contact.whatsapp}
                      </p>
                      <p className="text-[11px] sm:text-xs text-on-surface-variant mt-0.5">
                        Instant messaging & document inquiries
                      </p>
                    </div>
                  </a>

                  {/* Business Email */}
                  <a
                    href={`mailto:${COMPANY.contact.businessEmail}`}
                    className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border border-border-subtle hover:border-primary-container/60 hover:bg-surface transition-all group min-w-0"
                  >
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-surface-container-high text-primary-container flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <span className="material-symbols-outlined text-[20px] sm:text-[22px]">mail</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-label-caps text-[10px] sm:text-[11px] text-on-surface-variant uppercase font-semibold">
                        Business Inquiries
                      </p>
                      <p className="font-button-text text-xs sm:text-sm text-on-surface group-hover:text-primary-container break-all sm:break-normal">
                        {COMPANY.contact.businessEmail}
                      </p>
                    </div>
                  </a>

                  {/* General Email */}
                  <a
                    href={`mailto:${COMPANY.contact.generalEmail}`}
                    className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border border-border-subtle hover:border-primary-container/60 hover:bg-surface transition-all group min-w-0"
                  >
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-surface-container-high text-primary-container flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <span className="material-symbols-outlined text-[20px] sm:text-[22px]">alternate_email</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-label-caps text-[10px] sm:text-[11px] text-on-surface-variant uppercase font-semibold">
                        General Desk
                      </p>
                      <p className="font-button-text text-xs sm:text-sm text-on-surface group-hover:text-primary-container break-all sm:break-normal">
                        {COMPANY.contact.generalEmail}
                      </p>
                    </div>
                  </a>
                </div>
              </div>

              {/* Office Location Box */}
              <div className="bg-surface-pure rounded-2xl p-4 sm:p-6 border border-border-subtle shadow-sm flex items-start gap-3 sm:gap-4">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-surface-container-high text-primary-container flex items-center justify-center shrink-0 mt-1">
                  <span className="material-symbols-outlined text-[20px] sm:text-[22px]">location_on</span>
                </div>
                <div>
                  <h4 className="font-button-text text-xs sm:text-sm text-on-surface font-bold">
                    Corporate Headquarters
                  </h4>
                  <p className="font-body-md text-xs sm:text-sm text-on-surface-variant mt-1 leading-relaxed">
                    {COMPANY.legalEntity} <br />
                    {COMPANY.contact.address}
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Form */}
            <div className="lg:col-span-7">
              <div className="bg-surface-pure rounded-2xl p-4 sm:p-8 md:p-10 border border-border-subtle shadow-sm">
                <h3 className="text-lg sm:text-2xl font-bold text-on-surface mb-1.5 sm:mb-2">
                  Send Us a Direct Message
                </h3>
                <p className="text-xs sm:text-sm text-on-surface-variant mb-6 sm:mb-8 leading-relaxed">
                  Please fill out the form below and our institutional advisory team will review and respond promptly.
                </p>
                <ContactForm />
              </div>
            </div>
          </div>
        </Container>
      </main>

      <Footer />
    </div>
  );
}
