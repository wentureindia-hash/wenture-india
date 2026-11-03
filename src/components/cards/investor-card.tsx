import React from "react";
import Link from "next/link";
import Image from "next/image";
import { InvestorProfile } from "@/lib/firebase/investors";

interface InvestorCardProps {
  investor: InvestorProfile;
}

export function InvestorCard({ investor }: InvestorCardProps) {
  // Investor type color badge styling
  let typeBadgeStyle = "bg-[#EBF6FC] text-[#00658F] border-[#DCECF2]";
  if (investor.investorType === "VC") {
    typeBadgeStyle = "bg-purple-50 text-purple-800 border-purple-200";
  } else if (investor.investorType === "Angel Investor") {
    typeBadgeStyle = "bg-emerald-50 text-emerald-800 border-emerald-200";
  } else if (investor.investorType === "Corporate") {
    typeBadgeStyle = "bg-amber-50 text-amber-800 border-amber-200";
  } else if (investor.investorType === "Financier") {
    typeBadgeStyle = "bg-blue-50 text-blue-800 border-blue-200";
  }

  const initial = investor.investorName?.charAt(0).toUpperCase() || "I";

  return (
    <article className="bg-white border border-[#DCECF2] hover:border-[#00A6E8]/60 rounded-xl sm:rounded-2xl p-3 sm:p-5 md:p-6 shadow-[0px_4px_20px_rgba(10,25,42,0.03)] hover:shadow-[0px_8px_30px_rgba(10,25,42,0.08)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group relative h-full">
      <div className="space-y-2 sm:space-y-3.5">
        {/* Top Row: Avatar + Name & Location + Verification Status */}
        <div className="flex items-start justify-between gap-1.5 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            {investor.profileImage ? (
              <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl overflow-hidden relative border border-[#DCECF2] shrink-0 bg-slate-100">
                <Image
                  src={investor.profileImage}
                  alt={investor.investorName}
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-[#EBF6FC] border border-[#DCECF2] text-[#00658F] font-extrabold text-xs sm:text-base flex items-center justify-center shrink-0">
                {initial}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h3 className="text-xs sm:text-sm md:text-base font-bold text-[#0A192A] group-hover:text-[#00A6E8] transition-colors truncate leading-tight">
                <Link href={`/investors/${investor.id}`} className="hover:underline">
                  {investor.investorName}
                </Link>
              </h3>
              <span className="text-[9px] sm:text-xs text-[#5F7180] flex items-center gap-0.5 sm:gap-1 font-medium truncate mt-0.5 sm:mt-1">
                <span className="material-symbols-outlined text-[11px] sm:text-[14px] text-[#00A6E8] shrink-0">
                  location_on
                </span>
                <span className="truncate">{investor.location || "India"}</span>
              </span>
            </div>
          </div>

          {/* Verified Status Badge */}
          <div className="shrink-0 pt-0.5">
            <span className="px-1.5 sm:px-2 py-0.5 rounded text-[8.5px] sm:text-[10px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center gap-0.5 sm:gap-1">
              <span className="material-symbols-outlined text-[10px] sm:text-[12px] text-emerald-600">verified</span>
              <span className="hidden min-[360px]:inline">Verified</span>
            </span>
          </div>
        </div>

        {/* Investor Type Tag + Stage Badge */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
          <span
            className={`px-1.5 sm:px-2.5 py-0.5 rounded-md text-[9px] sm:text-[11px] font-bold tracking-wide border ${typeBadgeStyle} truncate max-w-[100px] sm:max-w-none`}
          >
            {investor.investorType}
          </span>
          {investor.investmentStage && (
            <span className="px-1.5 sm:px-2.5 py-0.5 rounded-md text-[9px] sm:text-[11px] font-medium bg-[#F4FAFD] border border-[#DCECF2] text-[#5F7180] hidden min-[360px]:inline-block truncate max-w-[90px] sm:max-w-none">
              {investor.investmentStage}
            </span>
          )}
        </div>

        {/* Short Introduction */}
        <p className="text-[10px] sm:text-xs md:text-sm text-[#5F7180] line-clamp-2 min-h-[28px] sm:min-h-[38px] leading-relaxed break-words">
          {investor.shortIntroduction || "Verified investor actively reviewing high-growth business opportunities."}
        </p>

        {/* Target Sectors */}
        <div>
          <span className="block text-[8.5px] sm:text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">
            Target Sectors
          </span>
          <div className="flex flex-wrap gap-1 min-h-[22px] sm:min-h-[26px]">
            {investor.preferredSectors && investor.preferredSectors.length > 0 ? (
              <>
                {investor.preferredSectors.slice(0, 2).map((sec) => (
                  <span
                    key={sec}
                    className="bg-[#F4FAFD] border border-[#DCECF2] text-[#0A192A] text-[9px] sm:text-[11px] font-semibold px-1.5 sm:px-2 py-0.5 rounded-md truncate max-w-[70px] sm:max-w-none"
                  >
                    {sec}
                  </span>
                ))}
                {investor.preferredSectors.length > 2 && (
                  <span className="bg-slate-50 text-slate-400 text-[8.5px] sm:text-[10px] font-bold px-1 sm:px-1.5 py-0.5 rounded-md self-center">
                    +{investor.preferredSectors.length - 2}
                  </span>
                )}
              </>
            ) : (
              <span className="text-[9px] sm:text-[11px] text-slate-400 italic">Multi-Sector</span>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row: Investment Range & View Profile CTA */}
      <div className="pt-2.5 sm:pt-3.5 mt-2.5 sm:mt-4 border-t border-[#DCECF2] flex items-center justify-between gap-1.5 sm:gap-3">
        <div className="min-w-0">
          <span className="block text-[8.5px] sm:text-[10px] text-[#5F7180] uppercase tracking-wider font-semibold truncate">
            Range
          </span>
          <span className="text-[10px] sm:text-xs md:text-sm font-bold text-[#00658F] truncate block">
            {investor.investmentRange || "Flexible"}
          </span>
        </div>

        <Link
          href={`/investors/${investor.id}`}
          className="inline-flex items-center gap-0.5 sm:gap-1 text-[10px] sm:text-xs font-bold text-[#00A6E8] group-hover:text-[#0089C2] hover:underline shrink-0"
        >
          <span>Profile</span>
          <span className="material-symbols-outlined text-[13px] sm:text-[16px] transition-transform group-hover:translate-x-0.5">
            arrow_forward
          </span>
        </Link>
      </div>
    </article>
  );
}
