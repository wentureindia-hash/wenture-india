"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getListingById,
  approveListing,
  rejectListing,
  requestChangesListing,
  addAdminNotes,
  updateListingVerification,
  getListingPitchDeck,
  BusinessListing,
} from "@/lib/firebase/listings";
import { AnimatePresence, motion } from "framer-motion";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function AdminListingReviewPage({ params }: PageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const listingId = resolvedParams.id;

  const [listing, setListing] = useState<BusinessListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Deck viewing
  const [viewingDeck, setViewingDeck] = useState(false);
  const [deckError, setDeckError] = useState<string | null>(null);

  // Modals for actions
  const [actionModal, setActionModal] = useState<"reject" | "changes" | "note" | null>(null);
  const [modalText, setModalText] = useState("");
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Action busy states
  const [approving, setApproving] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Image lightbox preview
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Toggle between Live Published version and Staged Edits (if hasPendingEdits is true)
  const [viewVersion, setViewVersion] = useState<"live" | "staged">("staged");

  const loadListing = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    const res = await getListingById(listingId);
    if (res.error || !res.listing) {
      setErrorMsg(res.error || "Listing not found.");
    } else {
      setListing(res.listing);
      if (res.listing.hasPendingEdits && res.listing.pendingReviewData) {
        setViewVersion("staged");
      } else {
        setViewVersion("live");
      }
    }
    setLoading(false);
  }, [listingId]);

  useEffect(() => {
    if (listingId) {
      loadListing();
    }
  }, [listingId, loadListing]);

  const handleOpenDeck = async () => {
    if (!listing) return;
    if (listing.pitchDeckUrl) {
      window.open(listing.pitchDeckUrl, "_blank", "noopener,noreferrer");
      return;
    }
    setViewingDeck(true);
    setDeckError(null);
    try {
      const res = await getListingPitchDeck(listing.id || listingId);
      if (res.url) {
        window.open(res.url, "_blank", "noopener,noreferrer");
      } else {
        setDeckError(res.error || "Unable to retrieve pitch deck.");
      }
    } catch {
      setDeckError("Failed to open pitch deck document.");
    } finally {
      setViewingDeck(false);
    }
  };

  const handleApprove = async () => {
    if (!listing?.id) return;
    const isApprovingEdits = Boolean(listing.hasPendingEdits && listing.pendingReviewData);
    const confirmMsg = isApprovingEdits
      ? "Approve and publish these submitted revisions? They will update the live public listing."
      : "Approve this listing and publish it to the live Wenture India opportunity catalog?";
    if (!confirm(confirmMsg)) return;

    setApproving(true);
    setActionSuccess(null);
    const res = await approveListing(listing.id);
    setApproving(false);

    if (res.error) {
      alert("Failed to approve: " + res.error);
    } else {
      setActionSuccess(isApprovingEdits ? "Revisions approved & published!" : "Listing approved and published successfully!");
      await loadListing();
    }
  };

  const handleModalSubmit = async () => {
    if (!listing?.id || !modalText.trim()) return;
    setModalLoading(true);
    setModalError(null);

    let res: { error: string | null };

    if (actionModal === "reject") {
      res = await rejectListing(listing.id, modalText.trim());
    } else if (actionModal === "changes") {
      res = await requestChangesListing(listing.id, modalText.trim());
    } else {
      res = await addAdminNotes(listing.id, modalText.trim());
    }

    setModalLoading(false);

    if (res.error) {
      setModalError(res.error);
    } else {
      const successText =
        actionModal === "reject"
          ? "Listing marked as Rejected."
          : actionModal === "changes"
          ? "Changes requested. Feedback sent to entrepreneur."
          : "Internal note recorded.";
      setActionSuccess(successText);
      setActionModal(null);
      setModalText("");
      await loadListing();
    }
  };

  const handleToggleVerification = async () => {
    if (!listing?.id) return;
    const newStatus = !listing.isVerified;
    setVerifying(true);
    const res = await updateListingVerification(listing.id, newStatus);
    setVerifying(false);
    if (res.error) {
      alert("Failed to update verification status: " + res.error);
    } else {
      setActionSuccess(`Listing marked as ${newStatus ? "VERIFIED" : "UNVERIFIED"}.`);
      await loadListing();
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-9 h-9 border-3 border-[#00A6E8] border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-semibold text-[#5F7180]">Loading listing verification dossier...</p>
      </div>
    );
  }

  if (errorMsg || !listing) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 border border-red-200 flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-[32px]">error</span>
        </div>
        <h2 className="text-2xl font-bold text-[#0A192A] mb-2 font-heading">Listing Not Found</h2>
        <p className="text-sm text-[#5F7180] mb-6">{errorMsg || "The requested listing could not be found."}</p>
        <Link
          href="/admin/listings"
          className="px-5 py-2.5 rounded-xl bg-[#00A6E8] text-white font-bold text-xs uppercase tracking-wider shadow-sm inline-flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          <span>Back to Listings Management</span>
        </Link>
      </div>
    );
  }

  // Active data to display: if looking at staged revisions, overlay pendingReviewData over listing
  const hasStaged = Boolean(listing.hasPendingEdits && listing.pendingReviewData);
  const stagedData = hasStaged ? (listing.pendingReviewData as Record<string, unknown>) : null;
  const currentData = viewVersion === "staged" && stagedData ? { ...listing, ...stagedData } : listing;

  const formatDate = (val: unknown) => {
    if (!val) return "Not recorded";
    if (typeof val === "object" && val !== null && "seconds" in val) {
      return new Date((val as { seconds: number }).seconds * 1000).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "medium",
        timeStyle: "short",
      });
    }
    if (typeof val === "string") {
      const parsed = new Date(val);
      if (!isNaN(parsed.getTime())) {
        return parsed.toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
          dateStyle: "medium",
          timeStyle: "short",
        });
      }
    }
    return String(val);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Breadcrumb & Return */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#DCECF2]">
        <div className="flex items-center gap-2 text-xs text-[#5F7180]">
          <Link href="/admin/listings" className="hover:text-[#00A6E8] transition-colors flex items-center gap-1 font-semibold">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Listings Management</span>
          </Link>
          <span>/</span>
          <span className="text-[#0A192A] font-bold truncate max-w-xs">{listing.title}</span>
        </div>

        <div className="flex items-center gap-2">
          {listing.status === "published" && (
            <Link
              href={`/opportunities/${listing.id}`}
              target="_blank"
              className="px-3 py-1.5 rounded-lg bg-white border border-[#DCECF2] hover:bg-[#F4FAFD] text-[#00658F] font-bold text-xs transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <span>View Live Public Page</span>
              <span className="material-symbols-outlined text-[15px]">open_in_new</span>
            </Link>
          )}
        </div>
      </div>

      {/* Success Notification */}
      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-emerald-600">check_circle</span>
            <span>{actionSuccess}</span>
          </div>
          <button type="button" onClick={() => setActionSuccess(null)} className="text-emerald-700 hover:text-emerald-900">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      {/* Staged Pending Edits Notice Banner */}
      {hasStaged && (
        <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-[26px] text-amber-600 shrink-0 mt-0.5">pending_actions</span>
              <div>
                <strong className="block text-sm font-bold text-amber-950">
                  Pending Revisions Awaiting Administrator Verification
                </strong>
                <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                  The entrepreneur has submitted updates to this live published listing. The current live public listing remains active in the catalog until you review and approve these staged changes.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-white/80 p-1.5 rounded-xl border border-amber-200/80 shrink-0 self-start md:self-auto">
              <button
                type="button"
                onClick={() => setViewVersion("staged")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewVersion === "staged"
                    ? "bg-amber-500 text-white shadow-xs"
                    : "text-amber-900 hover:bg-amber-100/60"
                }`}
              >
                View Staged Edits (New)
              </button>
              <button
                type="button"
                onClick={() => setViewVersion("live")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewVersion === "live"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                View Live Approved Version
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white border border-[#DCECF2] rounded-3xl p-6 sm:p-8 shadow-[0_4px_24px_rgba(10,25,42,0.04)]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-[#DCECF2]">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2.5">
              {/* Primary Status */}
              <span
                className={`px-3 py-1 rounded-md text-xs font-extrabold uppercase tracking-wider border ${
                  listing.status === "published"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : listing.status === "rejected"
                    ? "bg-rose-50 text-rose-800 border-rose-200"
                    : "bg-amber-50 text-amber-800 border-amber-200"
                }`}
              >
                {listing.status === "published"
                  ? "Published & Live"
                  : listing.status === "rejected"
                  ? "Needs Revision / Rejected"
                  : "Pending Admin Review"}
              </span>

              {/* Verification Status */}
              {listing.isVerified ? (
                <span className="px-3 py-1 rounded-md text-xs font-extrabold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1 shadow-2xs">
                  <span className="material-symbols-outlined text-[15px] text-blue-600">verified</span>
                  <span>Officially Verified Listing</span>
                </span>
              ) : (
                <span className="px-3 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-slate-500">info</span>
                  <span>Self-Reported / Unverified</span>
                </span>
              )}

              <span className="px-3 py-1 rounded-md text-xs font-bold bg-[#F4FAFD] text-[#00658F] border border-[#DCECF2]">
                {currentData.listingType}
              </span>

              <span className="text-xs text-[#5F7180]">
                Sector: <strong className="text-[#0A192A]">{currentData.sector}</strong>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0A192A] font-heading tracking-tight">
              {currentData.title}
            </h1>
            <p className="text-xs sm:text-sm text-[#5F7180] mt-1.5 max-w-3xl leading-relaxed">
              {currentData.shortDescription}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start lg:self-center">
            {listing.status !== "published" || hasStaged ? (
              <button
                type="button"
                disabled={approving}
                onClick={handleApprove}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {hasStaged ? "rule" : "check_circle"}
                </span>
                <span>{approving ? "Processing..." : hasStaged ? "Approve Revisions" : "Approve & Publish"}</span>
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => {
                setActionModal("changes");
                setModalText("");
                setModalError(null);
              }}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">edit_note</span>
              <span>Request Changes</span>
            </button>

            {listing.status !== "rejected" && (
              <button
                type="button"
                onClick={() => {
                  setActionModal("reject");
                  setModalText("");
                  setModalError(null);
                }}
                className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">cancel</span>
                <span>Reject</span>
              </button>
            )}

            <button
              type="button"
              disabled={verifying}
              onClick={handleToggleVerification}
              className={`px-4 py-2.5 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                listing.isVerified
                  ? "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100"
                  : "border-[#DCECF2] bg-white text-[#5F7180] hover:text-[#0A192A] hover:bg-slate-50"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">
                {listing.isVerified ? "verified" : "add_moderator"}
              </span>
              <span>{verifying ? "Updating..." : listing.isVerified ? "Verified (Click to Revoke)" : "Mark Verified"}</span>
            </button>
          </div>
        </div>

        {/* Rejection / Revision reason notice if exists */}
        {listing.rejectionReason && (
          <div className="mt-5 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-900 flex items-start gap-3">
            <span className="material-symbols-outlined text-[20px] text-rose-600 shrink-0 mt-0.5">warning</span>
            <div>
              <strong className="block font-bold text-rose-950 mb-0.5">Active Feedback on Record:</strong>
              <p className="text-rose-800 leading-relaxed">{listing.rejectionReason}</p>
            </div>
          </div>
        )}
      </div>

      {/* Grid of the 7 Structured Review Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Content Column (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* SECTION 1: BUSINESS OVERVIEW */}
          <section className="bg-white border border-[#DCECF2] rounded-3xl p-6 sm:p-7 shadow-[0_4px_20px_rgba(10,25,42,0.03)] space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#DCECF2]">
              <div className="w-8 h-8 rounded-xl bg-[#EBF6FC] text-[#00A6E8] flex items-center justify-center font-bold text-xs shrink-0">
                1
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-[#0A192A] font-heading">
                  1. Business Overview
                </h2>
                <p className="text-xs text-[#5F7180]">Core operational profile and commercial classification.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Business Name</span>
                <strong className="text-sm text-[#0A192A]">{currentData.title}</strong>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Category &amp; Opportunity Type</span>
                <span className="text-xs font-semibold text-[#00658F]">{currentData.category} • {currentData.listingType}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Industry / Sector</span>
                <strong className="text-xs text-[#0A192A]">{currentData.sector}</strong>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Business Entity Type</span>
                <span className="text-xs font-semibold text-[#0A192A]">{currentData.businessType || "Not specified"}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Operational Maturity Stage</span>
                <span className="text-xs font-semibold text-[#0A192A]">{currentData.businessStage || "Not specified"}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Primary Business Model</span>
                <span className="text-xs font-semibold text-[#0A192A]">{currentData.businessModel || "Not specified"}</span>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Elevator Pitch / Tagline</span>
              <p className="text-xs sm:text-sm text-[#0A192A] bg-[#F4FAFD] border border-[#DCECF2] p-3.5 rounded-xl leading-relaxed">
                {currentData.shortDescription}
              </p>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Full Detailed Business Narrative</span>
              <div className="text-xs sm:text-sm text-[#0A192A] bg-slate-50 border border-slate-200 p-4 rounded-xl leading-relaxed whitespace-pre-wrap">
                {currentData.description}
              </div>
            </div>
          </section>

          {/* SECTION 3: INVESTMENT INFORMATION */}
          <section className="bg-white border border-[#DCECF2] rounded-3xl p-6 sm:p-7 shadow-[0_4px_20px_rgba(10,25,42,0.03)] space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#DCECF2]">
              <div className="w-8 h-8 rounded-xl bg-[#EBF6FC] text-[#00A6E8] flex items-center justify-center font-bold text-xs shrink-0">
                3
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-[#0A192A] font-heading">
                  3. Investment &amp; Capital Requirements
                </h2>
                <p className="text-xs text-[#5F7180]">Financial ask, valuation terms, and allocation plan.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-[#F4FAFD] border border-[#DCECF2] rounded-2xl">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Funding Requirement</span>
                <strong className="text-sm sm:text-base text-[#00658F] font-black">{currentData.investmentRange}</strong>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Expected Valuation</span>
                <strong className="text-xs sm:text-sm text-[#0A192A]">{currentData.expectedValuation || "Undisclosed / Negotiable"}</strong>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Equity / Deal Terms</span>
                <strong className="text-xs sm:text-sm text-[#0A192A]">{currentData.equityOffered || "Flexible / On Request"}</strong>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Investment Purpose</span>
                <span className="text-xs font-semibold text-[#0A192A]">{currentData.investmentPurpose || "General Expansion"}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Minimum Ticket Size</span>
                <span className="text-xs font-semibold text-[#0A192A]">{currentData.minimumInvestment || "Flexible"}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target Investor Profile</span>
                <span className="text-xs font-semibold text-[#0A192A]">{currentData.preferredInvestorType || "Any Suitable Investor"}</span>
              </div>
            </div>

            {currentData.expectedUseOfFunds && (
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Expected Use of Funds Breakdown</span>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-[#0A192A] whitespace-pre-wrap leading-relaxed">
                  {currentData.expectedUseOfFunds}
                </div>
              </div>
            )}
          </section>

          {/* SECTION 4: FINANCIAL INFORMATION */}
          <section className="bg-white border border-[#DCECF2] rounded-3xl p-6 sm:p-7 shadow-[0_4px_20px_rgba(10,25,42,0.03)] space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#DCECF2]">
              <div className="w-8 h-8 rounded-xl bg-[#EBF6FC] text-[#00A6E8] flex items-center justify-center font-bold text-xs shrink-0">
                4
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-[#0A192A] font-heading">
                  4. Financial Information &amp; Operational Metrics
                </h2>
                <p className="text-xs text-[#5F7180]">Submitted financial turnover, profit metrics, and operating duration.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Annual Turnover / Revenue</span>
                <strong className="text-xs sm:text-sm text-[#0A192A]">{currentData.turnover || currentData.revenue || "Not specified"}</strong>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Net Profit / EBITDA</span>
                <strong className="text-xs sm:text-sm text-[#0A192A]">{currentData.profit || "Not specified"}</strong>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Years in Operation</span>
                <strong className="text-xs sm:text-sm text-[#0A192A]">{currentData.yearsInOperation || "Not specified"}</strong>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Reporting Period</span>
                <strong className="text-xs sm:text-sm text-[#0A192A]">{currentData.financialYear || "Latest Fiscal Year"}</strong>
              </div>
            </div>
            <p className="text-[11px] text-[#5F7180] italic">
              Note: The above metrics represent self-reported entrepreneur declarations unless verified through certified audit documentation.
            </p>
          </section>

          {/* SECTION 5: BUSINESS DETAILS */}
          <section className="bg-white border border-[#DCECF2] rounded-3xl p-6 sm:p-7 shadow-[0_4px_20px_rgba(10,25,42,0.03)] space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#DCECF2]">
              <div className="w-8 h-8 rounded-xl bg-[#EBF6FC] text-[#00A6E8] flex items-center justify-center font-bold text-xs shrink-0">
                5
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-[#0A192A] font-heading">
                  5. Business Details &amp; Market Alignment
                </h2>
                <p className="text-xs text-[#5F7180]">Commercial strategy, market positioning, and growth drivers.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-[#F4FAFD] border border-[#DCECF2] rounded-2xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Commercial Structure</span>
                <p className="text-xs text-[#0A192A] leading-relaxed">
                  Operates as a <strong>{currentData.businessType || "Commercial Entity"}</strong> delivering value through a <strong>{currentData.businessModel || "B2B"}</strong> model in the <strong>{currentData.sector}</strong> domain.
                </p>
              </div>

              <div className="p-4 bg-[#F4FAFD] border border-[#DCECF2] rounded-2xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Expansion &amp; Synergy Objective</span>
                <p className="text-xs text-[#0A192A] leading-relaxed">
                  Seeking capital allocation for <strong>{currentData.investmentPurpose || "Expansion"}</strong> targeting strategic engagement with <strong>{currentData.preferredInvestorType || "Accredited Investors"}</strong>.
                </p>
              </div>
            </div>
          </section>

          {/* SECTION 6: MEDIA & DOCUMENTS */}
          <section className="bg-white border border-[#DCECF2] rounded-3xl p-6 sm:p-7 shadow-[0_4px_20px_rgba(10,25,42,0.03)] space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-[#DCECF2]">
              <div className="w-8 h-8 rounded-xl bg-[#EBF6FC] text-[#00A6E8] flex items-center justify-center font-bold text-xs shrink-0">
                6
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-[#0A192A] font-heading">
                  6. Media &amp; Verified Documents
                </h2>
                <p className="text-xs text-[#5F7180]">All submitted images, confidential pitch deck, and authorized attachments.</p>
              </div>
            </div>

            {/* Pitch Deck Card */}
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 shadow-2xs">
                  <span className="material-symbols-outlined text-[24px]">picture_as_pdf</span>
                </div>
                <div>
                  <strong className="block text-xs sm:text-sm text-rose-950 font-bold">
                    {currentData.pitchDeckFileName || "Venture Pitch Deck (PDF Presentation)"}
                  </strong>
                  <span className="text-[11px] text-rose-800">
                    {currentData.hasPitchDeck || currentData.pitchDeckUrl
                      ? "Protected PDF document securely isolated in storage"
                      : "No pitch deck document attached"}
                  </span>
                  {deckError && <p className="text-[11px] text-rose-700 mt-1 font-semibold">{deckError}</p>}
                </div>
              </div>

              {currentData.hasPitchDeck || currentData.pitchDeckUrl ? (
                <button
                  type="button"
                  onClick={handleOpenDeck}
                  disabled={viewingDeck}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-60 shrink-0"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {viewingDeck ? "sync" : "visibility"}
                  </span>
                  <span>{viewingDeck ? "Generating Signed URL..." : "View Document"}</span>
                </button>
              ) : (
                <span className="px-3 py-1 bg-rose-100 text-rose-700 text-xs font-semibold rounded-lg">
                  Not Provided
                </span>
              )}
            </div>

            {/* Images Gallery */}
            <div>
              <span className="text-xs font-bold text-[#0A192A] block mb-2">Uploaded Listing Visuals &amp; Brand Assets:</span>
              {currentData.images && currentData.images.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {currentData.images.map((imgUrl, idx) => (
                    <div
                      key={idx}
                      className="group relative aspect-video bg-slate-100 rounded-xl overflow-hidden border border-[#DCECF2] shadow-2xs hover:shadow-md transition-all cursor-pointer"
                      onClick={() => setPreviewImage(imgUrl)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imgUrl}
                        alt={`Listing asset ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                        <span className="material-symbols-outlined text-[18px]">zoom_in</span>
                        <span>Preview</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#5F7180] italic">No image assets uploaded.</p>
              )}
            </div>
          </section>
        </div>

        {/* Sidebar Column (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* SECTION 2: FOUNDER & CONTACT */}
          <section className="bg-white border border-[#DCECF2] rounded-3xl p-6 shadow-[0_4px_20px_rgba(10,25,42,0.03)] space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#DCECF2]">
              <div className="w-7 h-7 rounded-lg bg-[#EBF6FC] text-[#00A6E8] flex items-center justify-center font-bold text-xs shrink-0">
                2
              </div>
              <h2 className="text-sm sm:text-base font-bold text-[#0A192A] font-heading">
                2. Founder &amp; Contact Details
              </h2>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Founder / Owner Name</span>
                <strong className="text-sm text-[#0A192A]">{currentData.founderName || currentData.ownerName}</strong>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Contact Phone Number</span>
                <a href={`tel:${currentData.contactPhone}`} className="text-xs font-semibold text-[#00658F] hover:underline flex items-center gap-1 mt-0.5">
                  <span className="material-symbols-outlined text-[14px]">phone</span>
                  <span>{currentData.contactPhone}</span>
                </a>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Contact Email Address</span>
                <a href={`mailto:${currentData.contactEmail || currentData.ownerEmail}`} className="text-xs font-semibold text-[#00658F] hover:underline flex items-center gap-1 mt-0.5 truncate">
                  <span className="material-symbols-outlined text-[14px]">email</span>
                  <span className="truncate">{currentData.contactEmail || currentData.ownerEmail}</span>
                </a>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Headquarters / Location</span>
                <span className="text-xs text-[#0A192A] flex items-center gap-1 mt-0.5">
                  <span className="material-symbols-outlined text-[14px] text-[#00A6E8]">location_on</span>
                  <span>{currentData.location}</span>
                </span>
              </div>

              {currentData.website && (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Official Website</span>
                  <a
                    href={currentData.website.startsWith("http") ? currentData.website : `https://${currentData.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-[#00658F] hover:underline flex items-center gap-1 mt-0.5 truncate"
                  >
                    <span className="material-symbols-outlined text-[14px]">language</span>
                    <span className="truncate">{currentData.website}</span>
                  </a>
                </div>
              )}

              {currentData.founderBackground && (
                <div className="pt-2 border-t border-[#DCECF2]">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Professional Background</span>
                  <p className="text-[11px] text-[#5F7180] leading-relaxed whitespace-pre-wrap">{currentData.founderBackground}</p>
                </div>
              )}

              {currentData.founderExperience && (
                <div className="pt-2 border-t border-[#DCECF2]">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Domain Experience</span>
                  <p className="text-[11px] text-[#5F7180] leading-relaxed whitespace-pre-wrap">{currentData.founderExperience}</p>
                </div>
              )}
            </div>
          </section>

          {/* SECTION 7: SUBMISSION & AUDIT TRAIL */}
          <section className="bg-white border border-[#DCECF2] rounded-3xl p-6 shadow-[0_4px_20px_rgba(10,25,42,0.03)] space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#DCECF2]">
              <div className="w-7 h-7 rounded-lg bg-[#EBF6FC] text-[#00A6E8] flex items-center justify-center font-bold text-xs shrink-0">
                7
              </div>
              <h2 className="text-sm sm:text-base font-bold text-[#0A192A] font-heading">
                7. Submission &amp; Audit Trail
              </h2>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Listing Document ID</span>
                <code className="text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-800 font-mono select-all block mt-0.5 truncate">
                  {listing.id}
                </code>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Owner User UID</span>
                <code className="text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-800 font-mono select-all block mt-0.5 truncate">
                  {listing.ownerId}
                </code>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#DCECF2]">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">First Submitted</span>
                  <span className="text-[11px] text-[#0A192A] font-medium">{formatDate(listing.createdAt)}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Last Updated</span>
                  <span className="text-[11px] text-[#0A192A] font-medium">{formatDate(listing.updatedAt)}</span>
                </div>
              </div>

              {Boolean(listing.publishedAt) && (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Publication Date</span>
                  <span className="text-[11px] text-emerald-800 font-medium">{formatDate(listing.publishedAt)}</span>
                </div>
              )}

              {Boolean(listing.verifiedAt) && (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Admin Verified On</span>
                  <span className="text-[11px] text-blue-800 font-medium">{formatDate(listing.verifiedAt)}</span>
                </div>
              )}

              {/* Internal Admin Notes */}
              <div className="pt-2 border-t border-[#DCECF2]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Internal Administrator Notes</span>
                  <button
                    type="button"
                    onClick={() => {
                      setActionModal("note");
                      setModalText("");
                      setModalError(null);
                    }}
                    className="text-[11px] font-bold text-[#00658F] hover:underline flex items-center gap-0.5"
                  >
                    <span className="material-symbols-outlined text-[14px]">add</span>
                    <span>Add Note</span>
                  </button>
                </div>
                {listing.adminNotes ? (
                  <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-[11px] text-amber-950 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                    {listing.adminNotes}
                  </div>
                ) : (
                  <p className="text-[11px] text-[#5F7180] italic">No internal administrator notes recorded yet.</p>
                )}
              </div>

              {/* Review History Timeline */}
              <div className="pt-2 border-t border-[#DCECF2]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Review &amp; Revision Log</span>
                {listing.reviewHistory && listing.reviewHistory.length > 0 ? (
                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                    {listing.reviewHistory.map((item, idx) => (
                      <div key={idx} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] space-y-0.5">
                        <div className="flex items-center justify-between gap-1 text-[10px]">
                          <span className="font-extrabold uppercase text-[#00658F] tracking-wider">{item.action}</span>
                          <span className="text-slate-400">{formatDate(item.timestamp)}</span>
                        </div>
                        <p className="text-[#0A192A] font-medium leading-snug">{item.notes || "No description provided."}</p>
                        <span className="text-[10px] text-[#5F7180] block">By: {item.performedBy}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-[#5F7180] italic">No audit history entries recorded.</p>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Action Dialog Modal (Reject, Request Changes, Add Note) */}
      <AnimatePresence>
        {actionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white border border-[#DCECF2] rounded-3xl shadow-2xl p-6 sm:p-7 space-y-4"
            >
              <div className="flex items-start justify-between pb-3 border-b border-[#DCECF2]">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      actionModal === "reject"
                        ? "bg-rose-100 text-rose-600"
                        : actionModal === "changes"
                        ? "bg-amber-100 text-amber-600"
                        : "bg-blue-100 text-blue-600"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {actionModal === "reject"
                        ? "cancel"
                        : actionModal === "changes"
                        ? "edit_note"
                        : "note_add"}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-[#0A192A] font-heading">
                      {actionModal === "reject"
                        ? "Reject Business Opportunity"
                        : actionModal === "changes"
                        ? "Request Changes from Entrepreneur"
                        : "Add Internal Administrator Note"}
                    </h3>
                    <p className="text-xs text-[#5F7180]">
                      {actionModal === "note"
                        ? "Internal note saved securely for administrative records only."
                        : "The reason will be visible to the entrepreneur so they can revise and resubmit."}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActionModal(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                >
                  <span className="material-symbols-outlined text-[22px]">close</span>
                </button>
              </div>

              {modalError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-red-500">error</span>
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#0A192A] mb-1.5">
                  {actionModal === "reject"
                    ? "Mandatory Rejection Reason *"
                    : actionModal === "changes"
                    ? "Specific Revision Instructions *"
                    : "Internal Administrator Note *"}
                </label>
                <textarea
                  rows={4}
                  required
                  value={modalText}
                  onChange={(e) => setModalText(e.target.value)}
                  placeholder={
                    actionModal === "reject"
                      ? "Explain why this opportunity cannot be published (e.g. Ineligible category, invalid contact details, or policy violations)..."
                      : actionModal === "changes"
                      ? "Explain clearly what needs correction before publication (e.g. Please attach a pitch deck PDF, clarify the valuation rationale, or update contact email)..."
                      : "Record verification findings, phone verification notes, or risk assessment observations..."
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-[#DCECF2] rounded-xl text-xs sm:text-sm text-[#0A192A] focus:outline-none focus:border-[#00A6E8]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setActionModal(null)}
                  disabled={modalLoading}
                  className="px-4 py-2 rounded-xl border border-[#DCECF2] text-xs font-bold text-[#5F7180] hover:text-[#0A192A] hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={modalLoading || !modalText.trim()}
                  onClick={handleModalSubmit}
                  className={`px-5 py-2 rounded-xl text-white text-xs font-bold transition-all shadow-sm disabled:opacity-50 cursor-pointer ${
                    actionModal === "reject"
                      ? "bg-rose-600 hover:bg-rose-700"
                      : actionModal === "changes"
                      ? "bg-amber-500 hover:bg-amber-600"
                      : "bg-[#00A6E8] hover:bg-[#0093CE]"
                  }`}
                >
                  {modalLoading ? "Saving..." : "Submit Decision"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Image Lightbox Modal */}
      <AnimatePresence>
        {previewImage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setPreviewImage(null)}
          >
            <div className="relative max-w-4xl w-full max-h-[85vh] flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewImage}
                alt="Enlarged asset preview"
                className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/20"
                onClick={(e) => e.stopPropagation()}
              />
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="absolute -top-10 right-0 text-white hover:text-slate-300 transition-colors flex items-center gap-1 text-xs font-bold cursor-pointer"
              >
                <span>Close</span>
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

