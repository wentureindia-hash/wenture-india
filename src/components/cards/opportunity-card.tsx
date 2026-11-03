"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Opportunity } from "@/lib/constants/opportunities";
import { useAuth } from "@/lib/firebase/auth-context";

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80";

interface OpportunityCardProps {
  opportunity: Opportunity;
  featured?: boolean;
  onInterested?: (opportunity: Opportunity) => void;
  onEnquire?: (opportunity: Opportunity) => void;
}

export function OpportunityCard({
  opportunity,
  onInterested,
  onEnquire,
}: OpportunityCardProps) {
  const { user, isAuthenticated } = useAuth();
  const [imgSrc, setImgSrc] = useState(opportunity.imageUrl || DEFAULT_IMAGE);

  const isOwner = Boolean(
    isAuthenticated &&
      user &&
      ((opportunity.ownerId && opportunity.ownerId !== "platform-admin" && opportunity.ownerId === user.uid) ||
        (opportunity.ownerEmail && user.email && opportunity.ownerEmail.trim().toLowerCase() === user.email.trim().toLowerCase()) ||
        (opportunity.contactEmail && user.email && opportunity.contactEmail.trim().toLowerCase() === user.email.trim().toLowerCase()))
  );

  const handleInterestClick = () => {
    if (isOwner) return;
    if (onInterested) onInterested(opportunity);
    else if (onEnquire) onEnquire(opportunity);
  };
  return (
    <article className="bg-white border border-[#DCECF2] hover:border-[#00A6E8]/60 rounded-xl sm:rounded-2xl overflow-hidden shadow-[0px_4px_20px_rgba(10,25,42,0.04)] hover:shadow-[0px_8px_30px_rgba(10,25,42,0.08)] hover:-translate-y-1 transition-all duration-300 flex flex-col group relative h-full">
      {/* Top Cover Image with Stage Badge */}
      <div className="h-28 sm:h-40 md:h-48 w-full relative overflow-hidden bg-slate-100 shrink-0">
        <Image
          src={imgSrc}
          alt={opportunity.title || "Opportunity"}
          fill
          unoptimized
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          onError={() => setImgSrc(DEFAULT_IMAGE)}
        />

        {/* Stage or Category Badge in Top-Right */}
        <div className="absolute top-1.5 sm:top-3 right-1.5 sm:right-3 z-10 flex items-center gap-1 flex-wrap justify-end">
          <span className="bg-emerald-600/95 backdrop-blur-sm text-white font-extrabold text-[8.5px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded shadow-xs flex items-center gap-0.5 sm:gap-1 tracking-wide uppercase">
            <span className="material-symbols-outlined text-[10px] sm:text-[12px]">verified</span>
            Verified
          </span>
          {opportunity.stageBadge && (
            <span className="bg-white/95 backdrop-blur-sm text-[#00658F] font-bold text-[8.5px] sm:text-[11px] px-1.5 sm:px-2.5 py-0.5 rounded shadow-xs border border-slate-100 tracking-wide hidden min-[360px]:inline-block">
              {opportunity.stageBadge}
            </span>
          )}
        </div>
      </div>

      {/* Card Content */}
      <div className="p-2.5 sm:p-4 md:p-6 flex-1 flex flex-col justify-between">
        <div>
          {/* Metadata Row: Category/Sector Pill & Location */}
          <div className="flex items-center justify-between gap-1 sm:gap-2 mb-1.5 sm:mb-3">
            <div className="flex items-center gap-1 sm:gap-2 flex-wrap min-w-0">
              <span className="bg-[#EBF6FC] text-[#00A6E8] font-bold text-[9px] sm:text-[11px] px-1.5 sm:px-2.5 py-0.5 rounded truncate max-w-[85px] sm:max-w-none">
                {opportunity.category}
              </span>
              <span className="bg-slate-100 text-[#5F7180] font-medium text-[9px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 rounded hidden min-[380px]:inline-block truncate max-w-[80px] sm:max-w-none">
                {opportunity.sector}
              </span>
            </div>
            <span className="text-[9px] sm:text-xs text-[#5F7180] flex items-center gap-0.5 sm:gap-1 font-medium shrink-0 truncate max-w-[70px] sm:max-w-none">
              <span className="material-symbols-outlined text-[11px] sm:text-[14px] text-[#00A6E8] shrink-0">
                location_on
              </span>
              <span className="truncate">{opportunity.location}</span>
            </span>
          </div>

          {/* Title */}
          <h3 className="text-xs sm:text-base md:text-lg font-bold text-[#0A192A] mb-1 sm:mb-2 group-hover:text-[#00A6E8] transition-colors leading-snug line-clamp-2">
            <Link href={`/opportunities/${opportunity.slug}`}>
              {opportunity.title}
            </Link>
          </h3>

          {/* Short Description */}
          <p className="text-[10px] sm:text-xs md:text-sm text-[#5F7180] mb-2.5 sm:mb-4 line-clamp-2 leading-relaxed break-words">
            {opportunity.shortDescription}
          </p>
        </div>

        <div>
          {/* Investment Requirement Row */}
          <div className="pt-2 sm:pt-3 pb-2.5 sm:pb-4 border-t border-[#DCECF2] flex items-center justify-between gap-1">
            <div className="min-w-0">
              <span className="block text-[8.5px] sm:text-[10px] text-[#5F7180] uppercase tracking-wider font-semibold truncate">
                Investment
              </span>
              <span className="text-[11px] sm:text-sm md:text-base font-bold text-[#0A192A] truncate block">
                {opportunity.investmentRange}
              </span>
            </div>

            <div className="text-right min-w-0">
              <span className="block text-[8.5px] sm:text-[10px] text-[#5F7180] uppercase tracking-wider font-semibold truncate">
                Target
              </span>
              <span className="text-[10px] sm:text-xs sm:text-sm font-semibold text-[#00658F] truncate block">
                {opportunity.targetRaise}
              </span>
            </div>
          </div>

          {/* Primary & Secondary Action Buttons */}
          <div className="flex flex-col min-[380px]:grid min-[380px]:grid-cols-2 gap-1 sm:gap-2 pt-1">
            <Link
              href={`/opportunities/${opportunity.slug}`}
              className="w-full text-center bg-white border border-[#DCECF2] hover:border-[#00A6E8] text-[#0A192A] font-bold text-[10px] sm:text-xs py-1.5 sm:py-2.5 rounded-lg transition-colors flex items-center justify-center gap-0.5 sm:gap-1"
            >
              <span>View</span>
            </Link>

            {isOwner ? (
              <Link
                href="/profile/listings"
                className="w-full text-center bg-[#0A192A] hover:bg-[#00A6E8] text-white font-bold text-[10px] sm:text-xs py-1.5 sm:py-2.5 rounded-lg transition-colors flex items-center justify-center gap-0.5 sm:gap-1 shadow-xs"
              >
                <span>My Listing</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={handleInterestClick}
                className="w-full text-center bg-[#00A6E8] hover:bg-[#0093CE] text-white font-bold text-[10px] sm:text-xs py-1.5 sm:py-2.5 rounded-lg transition-colors flex items-center justify-center gap-0.5 sm:gap-1 shadow-xs whitespace-nowrap"
              >
                <span>Interested</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
