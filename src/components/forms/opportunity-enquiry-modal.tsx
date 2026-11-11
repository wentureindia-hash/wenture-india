"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Opportunity, formatWhatsAppNumber } from "@/lib/constants/opportunities";
import { submitOpportunityEnquiry } from "@/lib/firebase/firestore";
import { useAuth } from "@/lib/firebase/auth-context";
import { doc, getDoc, getDocs, collection, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { AnimatePresence, motion } from "framer-motion";
import { COMPANY } from "@/lib/constants/company";

const enquiryFormSchema = z.object({
  name: z.string().min(2, "Please enter your name"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(8, "Please enter a valid phone number"),
  role: z.enum(["Investor", "Entrepreneur"]),
  message: z.string().min(5, "Please enter a brief message or question"),
});

type EnquiryFormData = z.infer<typeof enquiryFormSchema>;

interface OpportunityEnquiryModalProps {
  opportunity: Opportunity | null;
  isOpen: boolean;
  onClose: () => void;
}

export function OpportunityEnquiryModal({
  opportunity,
  isOpen,
  onClose,
}: OpportunityEnquiryModalProps) {
  const { user, profile, role: authRole, isEntrepreneur, isInvestor, isAuthenticated } = useAuth();

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Automatically determine the role for single-role accounts
  const autoRole: "Investor" | "Entrepreneur" =
    isInvestor
      ? "Investor"
      : isEntrepreneur
      ? "Entrepreneur"
      : authRole === "entrepreneur"
      ? "Entrepreneur"
      : "Investor";

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<EnquiryFormData>({
    resolver: zodResolver(enquiryFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      role: autoRole,
      message: "I am interested in learning more about this opportunity.",
    },
  });

  const watchRole = watch("role");

  const userUid = user?.uid;
  const userFullName = profile?.fullName || profile?.name || user?.displayName || "";
  const userEmail = user?.email || profile?.email || "";
  const userPhone = profile?.phone || "";

  const isOwner = Boolean(
    isAuthenticated &&
      user &&
      opportunity &&
      ((opportunity.ownerId && opportunity.ownerId !== "platform-admin" && opportunity.ownerId === user.uid) ||
        (opportunity.ownerEmail && user.email && opportunity.ownerEmail.trim().toLowerCase() === user.email.trim().toLowerCase()) ||
        (opportunity.contactEmail && user.email && opportunity.contactEmail.trim().toLowerCase() === user.email.trim().toLowerCase()))
  );

  // Synchronize authenticated user data and role into form whenever modal opens or auth state changes
  useEffect(() => {
    if (isOpen && userUid) {
      reset({
        name: userFullName,
        email: userEmail,
        phone: userPhone,
        role: autoRole,
        message: "I am interested in learning more about this opportunity.",
      });
    }
  }, [isOpen, userUid, userFullName, userEmail, userPhone, autoRole, reset]);

  const onSubmit = async (data: EnquiryFormData) => {
    if (!opportunity) return;
    setLoading(true);
    setErrorMsg(null);

    const effectiveRole = autoRole;
    const userFullName = profile?.fullName || profile?.name || user?.displayName || data.name;
    const userEmail = user?.email || profile?.email || data.email;

    // 1. Resolve true opportunity owner UID (ensuring it is taken from the published listing, NEVER the sender UID)
    let ownerId = opportunity.ownerId || "";
    let ownerName = opportunity.ownerName || "";
    let ownerEmail = opportunity.ownerEmail || opportunity.contactEmail || "";

    // If ownerId is missing or "platform-admin" or "unknown", do a deep resolution across Firestore collections
    if (!ownerId || ownerId === "platform-admin" || ownerId === "unknown") {
      try {
        // A. Direct doc lookup by opportunity.id in "listings"
        if (opportunity.id) {
          const listingDocRef = doc(db, "listings", opportunity.id);
          const listingSnap = await getDoc(listingDocRef);
          if (listingSnap.exists()) {
            const lData = listingSnap.data();
            ownerId = (lData.ownerId || lData.userId || lData.createdBy || lData.authorId || lData.uid || "") as string;
            ownerName = (lData.ownerName || lData.userName || lData.fullName || ownerName) as string;
            ownerEmail = (lData.ownerEmail || lData.contactEmail || lData.email || ownerEmail) as string;
          }
        }

        // B. Search listings by exact title if ownerId still not found
        if ((!ownerId || ownerId === "platform-admin" || ownerId === "unknown") && opportunity.title) {
          const titleQ = query(collection(db, "listings"), where("title", "==", opportunity.title.trim()));
          const titleSnap = await getDocs(titleQ);
          titleSnap.forEach((d) => {
            if (!ownerId || ownerId === "platform-admin" || ownerId === "unknown") {
              const lData = d.data();
              ownerId = (lData.ownerId || lData.userId || lData.createdBy || lData.authorId || lData.uid || "") as string;
              ownerName = (lData.ownerName || lData.userName || lData.fullName || ownerName) as string;
              ownerEmail = (lData.ownerEmail || lData.contactEmail || lData.email || ownerEmail) as string;
            }
          });
        }

        // C. Fallback: check "opportunities" collection if listing was stored there
        if ((!ownerId || ownerId === "platform-admin" || ownerId === "unknown") && opportunity.id) {
          try {
            const oppSnap = await getDoc(doc(db, "opportunities", opportunity.id));
            if (oppSnap.exists()) {
              const oData = oppSnap.data();
              ownerId = (oData.ownerId || oData.userId || oData.createdBy || oData.authorId || oData.uid || "") as string;
              ownerName = (oData.ownerName || oData.userName || oData.fullName || ownerName) as string;
              ownerEmail = (oData.ownerEmail || oData.contactEmail || oData.email || ownerEmail) as string;
            }
          } catch {}
        }

        // D. If ownerId is still missing, but we have ownerEmail, lookup user profile by email to get real UID
        if ((!ownerId || ownerId === "platform-admin" || ownerId === "unknown") && ownerEmail) {
          try {
            const userQ = query(collection(db, "users"), where("email", "==", ownerEmail.trim().toLowerCase()));
            const userSnap = await getDocs(userQ);
            userSnap.forEach((uDoc) => {
              if (uDoc.id) {
                ownerId = uDoc.id;
              }
            });
          } catch {}
        }
      } catch (err) {
        console.warn("[OpportunityEnquiryModal] lookup listing owner error:", err);
      }
    }

    // Check if the current user is the owner
    const isOwner = Boolean(
      user?.uid &&
      ((ownerId && ownerId !== "platform-admin" && ownerId === user.uid) ||
        (ownerEmail && userEmail && ownerEmail.trim().toLowerCase() === userEmail.trim().toLowerCase()))
    );

    if (isOwner) {
      setErrorMsg("You cannot submit an enquiry on your own business listing.");
      setLoading(false);
      return;
    }

    // Extract sender profile metadata
    const senderLocation = profile?.location || "";
    const senderType = profile?.sector || (effectiveRole === "Investor" ? "Verified Investor" : "Entrepreneur");
    const senderInvestmentRange = opportunity.investmentRange || "";

    const res = await submitOpportunityEnquiry({
      opportunityId: opportunity.id,
      opportunityTitle: opportunity.title,
      opportunityOwnerId: ownerId,
      opportunityOwnerName: ownerName,
      opportunityOwnerEmail: ownerEmail,
      ownerEmail: ownerEmail,
      senderId: user?.uid,
      userId: user?.uid,
      userUid: user?.uid,
      senderRole: effectiveRole,
      role: effectiveRole,
      senderName: userFullName,
      name: userFullName,
      senderEmail: userEmail,
      email: userEmail,
      senderPhone: data.phone,
      phone: data.phone,
      senderLocation,
      senderType,
      investmentRange: senderInvestmentRange,
      investmentCapacity: senderInvestmentRange || effectiveRole,
      message: data.message,
      status: "New",
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

  if (!isOpen || !opportunity) return null;

  const oppPhone =
    opportunity.contactPhone ||
    opportunity.whatsappNumber ||
    opportunity.keyInformation?.find((k) => k.label.toLowerCase().includes("phone"))?.value ||
    "";

  const targetWaNumber = formatWhatsAppNumber(oppPhone, "919841881008");
  const displayPhone = oppPhone || COMPANY.contact.whatsapp;

  const whatsappUrl = `https://wa.me/${targetWaNumber}?text=${encodeURIComponent(
    `Hello, I am interested in learning more about: ${opportunity.title} (${opportunity.category} - ${opportunity.sector}) on Wenture India.`
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
          className="relative w-full max-w-lg bg-white border border-[#DCECF2] rounded-2xl shadow-2xl z-10 overflow-hidden my-auto max-h-[calc(100vh-2rem)] sm:max-h-[90vh] flex flex-col"
        >
          {/* Modal Header */}
          <div className="p-4 sm:p-6 border-b border-[#DCECF2] flex justify-between items-start bg-[#F6FAFF] shrink-0">
            <div>
              <span className="text-[11px] text-[#00A6E8] font-bold uppercase tracking-wider block mb-1">
                Opportunity Enquiry
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-[#0A192A] leading-tight">
                {opportunity.title}
              </h3>
              <p className="text-xs text-[#5F7180] mt-1 flex items-center gap-2 flex-wrap">
                <span>{opportunity.category}</span>
                <span>•</span>
                <span>{opportunity.sector}</span>
                <span>•</span>
                <span>{opportunity.location}</span>
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-[#5F7180] hover:text-[#0A192A] p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors shrink-0"
              aria-label="Close Modal"
            >
              <span className="material-symbols-outlined text-[22px]">close</span>
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-4 sm:p-6 md:p-8 overflow-y-auto flex-1">
            {!isAuthenticated ? (
              <div className="text-center py-4">
                <div className="w-14 h-14 bg-[#EBF6FC] text-[#00A6E8] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#00A6E8]/20 shadow-xs">
                  <span className="material-symbols-outlined text-[28px]">lock</span>
                </div>
                <h4 className="text-xl font-bold text-[#0A192A] mb-2 font-heading">
                  Sign In to Submit Enquiry
                </h4>
                <p className="text-sm text-[#5F7180] max-w-sm mx-auto mb-6 leading-relaxed">
                  Please sign in to submit an enquiry for <strong>{opportunity.title}</strong>. Your profile information and verified role will be automatically attached.
                </p>

                <div className="flex flex-col gap-3 max-w-xs mx-auto">
                  <Link
                    href={`/login?redirect=${encodeURIComponent("/opportunities")}`}
                    className="w-full py-3 bg-[#00A6E8] hover:bg-[#0093CE] text-white font-bold text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">login</span>
                    <span>Log In to Continue</span>
                  </Link>

                  <Link
                    href="/signup"
                    className="w-full py-2.5 bg-white border border-[#DCECF2] hover:bg-[#F4FAFD] text-[#00658F] font-bold text-xs rounded-xl transition-colors text-center"
                  >
                    Don&apos;t have an account? Sign Up
                  </Link>

                  {/* Direct WhatsApp Option */}
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs rounded-xl transition-colors border border-emerald-200 flex items-center justify-center gap-2 mt-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">chat</span>
                    <span>Chat on WhatsApp ({displayPhone})</span>
                  </a>
                </div>
              </div>
            ) : isOwner ? (
              <div className="text-center py-6">
                <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-200 shadow-xs">
                  <span className="material-symbols-outlined text-[28px]">account_circle</span>
                </div>
                <h4 className="text-xl font-bold text-[#0A192A] mb-2 font-heading">
                  Your Business Listing
                </h4>
                <p className="text-sm text-[#5F7180] max-w-sm mx-auto mb-6 leading-relaxed">
                  You are the owner of <strong>{opportunity.title}</strong>. You cannot submit an enquiry to your own listing. Inbound interest from verified investors will be delivered to your listings dashboard.
                </p>

                <div className="flex flex-col gap-3 max-w-xs mx-auto">
                  <Link
                    href="/profile/listings"
                    onClick={handleClose}
                    className="w-full py-3 bg-[#00A6E8] hover:bg-[#0093CE] text-white font-bold text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">list_alt</span>
                    <span>Manage in My Listings</span>
                  </Link>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="w-full py-2.5 bg-white border border-[#DCECF2] hover:bg-[#F4FAFD] text-[#0A192A] font-bold text-xs rounded-xl transition-colors text-center"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : submitted ? (
              <div className="text-center py-6">
                <div className="w-14 h-14 bg-[#EBF6FC] text-[#00A6E8] rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-[30px]">check_circle</span>
                </div>
                <h4 className="text-2xl font-bold text-[#0A192A] mb-2">
                  Enquiry Received
                </h4>
                <p className="text-sm text-[#5F7180] max-w-md mx-auto mb-6 leading-relaxed">
                  Thank you. Your enquiry has been received. The Wenture India team will get in touch with you.
                </p>
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full py-3 bg-[#00A6E8] hover:bg-[#0093CE] text-white font-bold text-sm rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {errorMsg && (
                  <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs border border-red-200">
                    {errorMsg}
                  </div>
                )}

                {/* Pre-populated Opportunity Banner */}
                <div className="p-3 bg-[#F6FAFF] rounded-lg border border-[#DCECF2] flex items-center justify-between text-xs">
                  <span className="text-[#5F7180]">Selected Opportunity:</span>
                  <span className="font-bold text-[#0A192A] truncate max-w-[240px]">{opportunity.title}</span>
                </div>

                {/* Name (Read-Only) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-[#0A192A]">
                      Your Full Name
                    </label>
                    <span className="text-[10px] font-bold text-[#5F7180] flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[12px] text-[#00A6E8]">lock</span>
                      <span>Verified Profile</span>
                    </span>
                  </div>
                  <input
                    type="text"
                    readOnly
                    {...register("name")}
                    className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#DCECF2] rounded-lg text-sm text-[#0A192A] font-medium cursor-not-allowed focus:outline-none"
                  />
                  {errors.name && (
                    <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>
                  )}
                </div>

                {/* Email (Read-Only) & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-[#0A192A]">
                        Email Address
                      </label>
                      <span className="text-[10px] font-bold text-[#5F7180] flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-[12px] text-[#00A6E8]">lock</span>
                        <span>Read Only</span>
                      </span>
                    </div>
                    <input
                      type="email"
                      readOnly
                      {...register("email")}
                      className="w-full px-4 py-2.5 bg-[#F8FAFC] border border-[#DCECF2] rounded-lg text-sm text-[#0A192A] font-medium cursor-not-allowed focus:outline-none"
                    />
                    {errors.email && (
                      <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#0A192A] mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      placeholder="+91 95407 21008"
                      {...register("phone")}
                      className="w-full px-4 py-2.5 bg-white border border-[#DCECF2] rounded-lg text-sm text-[#0A192A] placeholder:text-slate-400 focus:outline-none focus:border-[#00A6E8] focus:ring-1 focus:ring-[#00A6E8]/20"
                    />
                    {errors.phone && (
                      <p className="text-xs text-red-500 mt-1">{errors.phone.message}</p>
                    )}
                  </div>
                </div>

                {/* Submitting Role Info */}
                <div>
                  <span className="block text-xs font-semibold text-[#0A192A] mb-1">
                    Submitting Role
                  </span>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-[#F6FAFF] border border-[#DCECF2]">
                    <span className="text-xs text-[#5F7180]">Enquiry will be submitted as:</span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-[#EBF6FC] text-[#00658F] border border-[#DCECF2]">
                      <span className="material-symbols-outlined text-[15px] text-[#00A6E8]">
                        {autoRole === "Investor" ? "badge" : "rocket_launch"}
                      </span>
                      <span>{autoRole}</span>
                    </span>
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-xs font-semibold text-[#0A192A] mb-1">
                    Message / Questions
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Tell us what information you are seeking..."
                    {...register("message")}
                    className="w-full px-4 py-2 bg-white border border-[#DCECF2] rounded-lg text-sm text-[#0A192A] placeholder:text-slate-400 focus:outline-none focus:border-[#00A6E8] focus:ring-1 focus:ring-[#00A6E8]/20"
                  />
                  {errors.message && (
                    <p className="text-xs text-red-500 mt-1">{errors.message.message}</p>
                  )}
                </div>

                {/* Submit Action */}
                <div className="pt-2 flex flex-col gap-2.5">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-[#00A6E8] hover:bg-[#0093CE] text-white font-bold text-sm rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    <span>{loading ? "Submitting..." : "Submit Enquiry"}</span>
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </button>

                  {/* Direct WhatsApp Option */}
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs rounded-lg transition-colors border border-emerald-200 flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">chat</span>
                    <span>Chat on WhatsApp ({displayPhone})</span>
                  </a>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
