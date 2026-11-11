"use client";

import React, { useState } from "react";
import { Mail, Phone, MessageCircle, Copy, Check, ArrowUpRight } from "lucide-react";

interface ContactItem {
  id: string;
  title: string;
  value: string;
  href: string;
  icon: React.ElementType;
  actionText: string;
  badge: string;
  colorClass: string;
}

const contactChannels: ContactItem[] = [
  {
    id: "general-email",
    title: "General Inquiries",
    value: "wentureindia@gmail.com",
    href: "mailto:wentureindia@gmail.com",
    icon: Mail,
    actionText: "Send an Email",
    badge: "Primary Support",
    colorClass: "bg-sky-50 text-wenture-blue border-sky-200",
  },
  {
    id: "business-email",
    title: "Business & Partnerships",
    value: "info@wentureindia.com",
    href: "mailto:info@wentureindia.com",
    icon: Mail,
    actionText: "Send an Email",
    badge: "Official Desk",
    colorClass: "bg-blue-50 text-blue-600 border-blue-200",
  },
  {
    id: "phone",
    title: "Direct Phone Line",
    value: "+91 95407 21008",
    href: "tel:+919540721008",
    icon: Phone,
    actionText: "Call Direct",
    badge: "Direct Support",
    colorClass: "bg-indigo-50 text-indigo-600 border-indigo-200",
  },
  {
    id: "phone-secondary",
    title: "Direct Helpline",
    value: "+91 95997 93356",
    href: "tel:+919599793356",
    icon: Phone,
    actionText: "Call Direct",
    badge: "Direct Support",
    colorClass: "bg-teal-50 text-teal-700 border-teal-200",
  },
  {
    id: "whatsapp",
    title: "WhatsApp Business",
    value: "+91 98418 81008",
    href: "https://wa.me/919841881008",
    icon: MessageCircle,
    actionText: "Open WhatsApp",
    badge: "Fastest Response",
    colorClass: "bg-emerald-50 text-emerald-600 border-emerald-200",
  },
];

export function ContactSection() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  return (
    <section id="contact" className="py-16 sm:py-24 relative scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-wenture-cyanLight/70 border border-wenture-blue/20 text-xs font-bold uppercase tracking-wider text-wenture-navy">
            <span>Direct Channels</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-wenture-dark tracking-tight">
            Let&apos;s connect.
          </h2>
          <p className="text-base sm:text-lg text-slate-600">
            For enquiries, partnerships or business opportunities, get in touch with the Wenture India team.
          </p>
        </div>

        {/* 4 Contact Channels Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {contactChannels.map((item) => {
            const Icon = item.icon;
            const isCopied = copiedId === item.id;

            return (
              <div
                key={item.id}
                className="group relative flex flex-col justify-between p-6 rounded-2xl bg-white border border-slate-200/90 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1"
              >
                <div>
                  {/* Top Bar: Icon & Badge */}
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center border shadow-2xs transition-transform duration-300 group-hover:scale-105 ${item.colorClass}`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500 bg-slate-100/80 px-2.5 py-1 rounded-full border border-slate-200">
                      {item.badge}
                    </span>
                  </div>

                  {/* Channel Title */}
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    {item.title}
                  </h3>

                  {/* Value / Link text */}
                  <a
                    href={item.href}
                    target={item.href.startsWith("http") ? "_blank" : undefined}
                    rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="text-base sm:text-lg font-bold text-wenture-dark hover:text-wenture-blue transition-colors break-words block leading-snug"
                  >
                    {item.value}
                  </a>
                </div>

                {/* Bottom Action Buttons */}
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  <a
                    href={item.href}
                    target={item.href.startsWith("http") ? "_blank" : undefined}
                    rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-wenture-navy hover:text-wenture-blue transition-colors group-hover:translate-x-0.5"
                  >
                    <span>{item.actionText}</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>

                  {/* Copy Button */}
                  <button
                    onClick={() => handleCopy(item.id, item.value)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-wenture-dark hover:bg-slate-100 transition-all active:scale-90"
                    title={`Copy ${item.value}`}
                    aria-label={`Copy ${item.value}`}
                  >
                    {isCopied ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-semibold">
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied</span>
                      </span>
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
