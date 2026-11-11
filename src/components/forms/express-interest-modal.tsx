"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { InvestorProfile, submitInvestorEnquiry } from "@/lib/firebase/investors";
import { useAuth } from "@/lib/firebase/auth-context";
import { RoleSwitchModal } from "@/components/profile/role-switch-modal";

const interestSchema = z.object({
  name: z.string().min(2, "Please enter your name"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(8, "Please enter a valid contact number"),
  message: z.string().min(10, "Please describe your business proposition or venture"),
});

type InterestFormData = z.infer<typeof interestSchema>;

interface ExpressInterestModalProps {
  investor: InvestorProfile | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ExpressInterestModal({
  investor,
  isOpen,
  onClose,
}: ExpressInterestModalProps) {
  const { user, profile, roles, activeRole, isInvestor, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [roleSwitchModalOpen, setRoleSwitchModalOpen] = useState(false);

  const isOwnProfile = !!user && !!investor && (investor.userId === user.uid || investor.id === user.uid);
  const isDualRole = roles.includes("investor") && roles.includes("entrepreneur");
  const isBlockedInvestor = !isOwnProfile && (activeRole === "investor" || isInvestor);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InterestFormData>({
    resolver: zodResolver(interestSchema),
    defaultValues: {
      name: profile?.fullName || profile?.name || "",
      email: user?.email || "",
      phone: profile?.phone || "",
      message: "We are seeking strategic investment and would like to introduce our venture.",
    },
  });

  const onSubmit = async (data: InterestFormData) => {
    if (!investor) return;

    if (!user) {
      setErrorMsg("Authentication required. Please sign in with an Entrepreneur account to express interest.");
      return;
    }

    if (isOwnProfile) {
      setErrorMsg("You cannot submit an expression of interest to your own investor profile.");
      return;
    }

    const currentActiveRole = (profile?.activeRole || profile?.role || "").toString().toLowerCase().trim();
    const userRoles: string[] = (
      Array.isArray(profile?.roles) && profile.roles.length > 0
        ? profile.roles
        : profile?.role
        ? [profile.role]
        : []
    ).map((r) => r.toLowerCase().trim());

    if (!userRoles.includes("entrepreneur")) {
      setErrorMsg("Access restricted: Only users with the Entrepreneur role can express interest in investors. Investor-to-investor expressions of interest are not permitted.");
      return;
    }

    if (currentActiveRole !== "entrepreneur") {
      setErrorMsg("Please switch to Entrepreneur Mode to express interest. Expressions of interest cannot be submitted while operating in Investor Mode.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const res = await submitInvestorEnquiry({
      investorId: investor.id,
      investorName: investor.investorName,
      name: data.name.trim(),
      email: data.email.trim(),
      phone: data.phone.trim(),
      message: data.message.trim(),
    });

    setLoading(false);

    if (res.error) {
      setErrorMsg(res.error);
    } else {
      setSubmitted(true);
      reset();
    }
  };

  const handleClose = () => {
    setSubmitted(false);
    setErrorMsg(null);
    onClose();
  };

  if (!isOpen || !investor) return null;

  const whatsappUrl = `https://wa.me/919841881008?text=${encodeURIComponent(
    `Hello Wenture India Team, I would like to express interest in connecting with Investor: ${investor.investorName} (${investor.investorType} - ${investor.location}).`
  )}`;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 bg-[#0A192A]/60 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative bg-white rounded-2xl sm:rounded-3xl border border-[#DCECF2] shadow-2xl w-full max-w-xl overflow-hidden z-10 my-auto max-h-[calc(100vh-2rem)] sm:max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-[#DCECF2] bg-[#F4FAFD] flex items-center justify-between shrink-0">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#00658F] block">
                Expression of Interest
              </span>
              <h2 className="text-base sm:text-xl font-extrabold text-[#0A192A] font-heading">
                Connect with {investor.investorName}
              </h2>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 text-slate-400 hover:text-[#0A192A] rounded-lg hover:bg-white transition-colors shrink-0"
              aria-label="Close Modal"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Body */}
          <div className="p-4 sm:p-6 md:p-8 overflow-y-auto flex-1">
            {submitted ? (
              <div className="text-center py-6">
                <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-[32px]">check</span>
                </div>
                <h3 className="text-xl font-bold text-[#0A192A] mb-2 font-heading">
                  Interest Expressed Successfully
                </h3>
                <p className="text-xs sm:text-sm text-[#5F7180] leading-relaxed max-w-md mx-auto mb-6">
                  Your venture proposition has been recorded for{" "}
                  <strong>{investor.investorName}</strong>. Wenture India facilitates verified institutional introductions in accordance with investor criteria.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">chat</span>
                    <span>Chat on WhatsApp</span>
                  </a>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="w-full sm:w-auto px-5 py-2.5 bg-white border border-[#DCECF2] hover:bg-slate-50 text-[#0A192A] rounded-xl text-xs font-bold transition-colors"
                  >
                    Close Window
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {errorMsg && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">error</span>
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Authentication & Role-Based Warning Banners */}
                {!isAuthenticated ? (
                  <div className="p-4 bg-[#EBF6FC] border border-[#DCECF2] rounded-2xl space-y-2 mb-2">
                    <div className="flex items-center gap-2 text-[#00658F] font-bold text-xs">
                      <span className="material-symbols-outlined text-[18px]">lock</span>
                      <span>Sign In Required</span>
                    </div>
                    <p className="text-xs text-[#5F7180] leading-relaxed">
                      Only registered entrepreneurs can submit an expression of interest to investors. Please sign in or create an entrepreneur account to proceed.
                    </p>
                    <div className="pt-1">
                      <Link
                        href={`/login?redirect=/investors/${investor.id}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#00A6E8] hover:bg-[#0093CE] text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                      >
                        <span className="material-symbols-outlined text-[15px]">login</span>
                        <span>Sign In as Entrepreneur</span>
                      </Link>
                    </div>
                  </div>
                ) : isBlockedInvestor ? (
                  isDualRole ? (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-2 mb-2">
                      <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                        <span className="material-symbols-outlined text-[18px] text-amber-700">swap_horiz</span>
                        <span>Switch to Entrepreneur Mode to Express Interest</span>
                      </div>
                      <p className="text-xs text-amber-900/90 leading-relaxed">
                        You are currently in <strong>Investor Mode</strong>. Investors cannot express interest in other capital partners. To introduce your venture, please switch to <strong>Entrepreneur Mode</strong>.
                      </p>
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => setRoleSwitchModalOpen(true)}
                          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[15px]">rocket_launch</span>
                          <span>Switch to Entrepreneur Mode Now</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 mb-2">
                      <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                        <span className="material-symbols-outlined text-[18px] text-slate-600">block</span>
                        <span>Investor-to-Investor Expressions of Interest Disabled</span>
                      </div>
                      <p className="text-xs text-[#5F7180] leading-relaxed">
                        Expressing interest is reserved exclusively for entrepreneurs seeking capital. Accounts with only the Investor role cannot submit expressions of interest to other investors.
                      </p>
                      <p className="text-[11px] text-slate-500 pt-0.5">
                        Seeking capital for a venture? You can add the Entrepreneur role in your{" "}
                        <Link href="/profile" className="text-[#00A6E8] underline font-semibold">
                          Account Profile
                        </Link>.
                      </p>
                    </div>
                  )
                ) : null}

                {/* Pre-populated Investor Snapshot */}
                <div className="p-3.5 bg-[#F4FAFD] border border-[#DCECF2] rounded-xl flex items-center justify-between text-xs mb-2">
                  <div>
                    <span className="text-[#5F7180] block text-[10px] uppercase font-bold">Target Investor</span>
                    <span className="font-bold text-[#0A192A]">{investor.investorName} ({investor.investorType})</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[#5F7180] block text-[10px] uppercase font-bold">Range</span>
                    <span className="font-bold text-[#00658F]">{investor.investmentRange}</span>
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-xs font-bold text-[#0A192A] mb-1">
                    Your Full Name *
                  </label>
                  <input
                    type="text"
                    {...register("name")}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-3.5 py-2.5 bg-white border border-[#DCECF2] rounded-xl text-xs text-[#0A192A] focus:outline-none focus:border-[#00A6E8]"
                  />
                  {errors.name && (
                    <p className="text-[11px] text-rose-600 mt-1">{errors.name.message}</p>
                  )}
                </div>

                {/* Email & Phone Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#0A192A] mb-1">
                      Business Email *
                    </label>
                    <input
                      type="email"
                      {...register("email")}
                      placeholder="you@company.com"
                      className="w-full px-3.5 py-2.5 bg-white border border-[#DCECF2] rounded-xl text-xs text-[#0A192A] focus:outline-none focus:border-[#00A6E8]"
                    />
                    {errors.email && (
                      <p className="text-[11px] text-rose-600 mt-1">{errors.email.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#0A192A] mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      {...register("phone")}
                      placeholder="+91 98765 43210"
                      className="w-full px-3.5 py-2.5 bg-white border border-[#DCECF2] rounded-xl text-xs text-[#0A192A] focus:outline-none focus:border-[#00A6E8]"
                    />
                    {errors.phone && (
                      <p className="text-[11px] text-rose-600 mt-1">{errors.phone.message}</p>
                    )}
                  </div>
                </div>

                {/* Venture Proposition / Message */}
                <div>
                  <label className="block text-xs font-bold text-[#0A192A] mb-1">
                    Venture Proposition / Message *
                  </label>
                  <textarea
                    rows={4}
                    {...register("message")}
                    placeholder="Provide a brief summary of your company, sector, current traction, and funding requirements..."
                    className="w-full px-3.5 py-2.5 bg-white border border-[#DCECF2] rounded-xl text-xs text-[#0A192A] focus:outline-none focus:border-[#00A6E8] resize-none"
                  />
                  {errors.message && (
                    <p className="text-[11px] text-rose-600 mt-1">{errors.message.message}</p>
                  )}
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2.5 border border-[#DCECF2] hover:bg-slate-50 text-[#0A192A] text-xs font-bold rounded-xl transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={loading || isBlockedInvestor || !isAuthenticated}
                    className="px-6 py-2.5 bg-[#00A6E8] hover:bg-[#0093CE] text-white text-xs font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[16px]">send</span>
                        <span>Submit Expression of Interest</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>

      {/* Role Switch Modal for Dual-Role Users */}
      {roleSwitchModalOpen && (
        <RoleSwitchModal
          isOpen={roleSwitchModalOpen}
          targetRole="entrepreneur"
          onClose={() => setRoleSwitchModalOpen(false)}
          onSuccess={() => setRoleSwitchModalOpen(false)}
        />
      )}
    </AnimatePresence>
  );
}
