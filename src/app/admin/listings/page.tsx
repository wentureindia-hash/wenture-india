"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  getAllListings,
  approveListing,
  rejectListing,
  deleteListing,
  getListingPitchDeck,
  BusinessListing,
  ListingStatus,
} from "@/lib/firebase/listings";
import { AnimatePresence, motion } from "framer-motion";

export default function AdminListingsPage() {
  const [listings, setListings] = useState<BusinessListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ListingStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedListing, setSelectedListing] = useState<BusinessListing | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [openingDeck, setOpeningDeck] = useState(false);
  const [adminDeckError, setAdminDeckError] = useState<string | null>(null);

  const handleAdminViewDeck = async (listing: BusinessListing) => {
    if (listing.pitchDeckUrl) {
      window.open(listing.pitchDeckUrl, "_blank", "noopener,noreferrer");
      return;
    }
    if (!listing.id) return;
    setOpeningDeck(true);
    setAdminDeckError(null);
    try {
      const res = await getListingPitchDeck(listing.id);
      if (res.url) {
        window.open(res.url, "_blank", "noopener,noreferrer");
      } else {
        setAdminDeckError(res.error || "Unable to retrieve pitch deck.");
      }
    } catch {
      setAdminDeckError("Failed to open pitch deck document.");
    } finally {
      setOpeningDeck(false);
    }
  };

  // Reject modal state
  const [rejectingListing, setRejectingListing] = useState<BusinessListing | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const loadListings = async () => {
    setLoading(true);
    const res = await getAllListings();
    if (!res.error) {
      setListings(res.listings);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadListings();
  }, []);

  const handleApprove = async (id?: string) => {
    if (!id) return;
    setActionLoading(id);
    await approveListing(id);
    setActionLoading(null);
    await loadListings();
    if (selectedListing?.id === id) {
      setSelectedListing(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingListing?.id || !rejectReason.trim()) return;
    setActionLoading(rejectingListing.id);
    await rejectListing(rejectingListing.id, rejectReason.trim());
    setActionLoading(null);
    setRejectingListing(null);
    setRejectReason("");
    await loadListings();
    if (selectedListing?.id === rejectingListing.id) {
      setSelectedListing(null);
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    if (!confirm("Are you sure you want to permanently delete this listing?")) return;
    setActionLoading(id);
    await deleteListing(id);
    setActionLoading(null);
    await loadListings();
    if (selectedListing?.id === id) {
      setSelectedListing(null);
    }
  };

  const filteredListings = useMemo(() => {
    return listings.filter((item) => {
      if (item.status === "deleted" || item.isDeleted) {
        return false;
      }
      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchTitle = item.title?.toLowerCase().includes(query);
        const matchOwner = item.ownerName?.toLowerCase().includes(query) || item.ownerEmail?.toLowerCase().includes(query);
        const matchSector = item.sector?.toLowerCase().includes(query);
        const matchLocation = item.location?.toLowerCase().includes(query);
        if (!matchTitle && !matchOwner && !matchSector && !matchLocation) {
          return false;
        }
      }
      return true;
    });
  }, [listings, statusFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-[#00A6E8] uppercase tracking-wider block mb-1">
            Ecosystem Catalog
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0A192A] tracking-tight font-heading">
            Listing Approvals &amp; Management
          </h1>
          <p className="text-xs sm:text-sm text-[#5F7180] mt-1">
            Review, curate, approve, or reject business opportunities submitted by platform entrepreneurs.
          </p>
        </div>

        <button
          type="button"
          onClick={loadListings}
          className="px-4 py-2 bg-white border border-[#DCECF2] hover:bg-slate-50 text-[#0A192A] text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 self-stretch sm:self-auto shadow-sm"
        >
          <span className="material-symbols-outlined text-[16px] text-[#00A6E8]">refresh</span>
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#DCECF2] rounded-2xl p-3.5 sm:p-5 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-[#F4FAFD] border border-[#DCECF2] rounded-xl w-full sm:w-auto overflow-x-auto no-scrollbar">
          {(["all", "pending", "published", "rejected"] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                statusFilter === st
                  ? "bg-[#00A6E8] text-white shadow-sm"
                  : "text-[#5F7180] hover:text-[#0A192A]"
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, owner, sector..."
            className="w-full pl-9 pr-4 py-2 bg-[#F4FAFD] border border-[#DCECF2] rounded-xl text-xs text-[#0A192A] focus:outline-none focus:border-[#00A6E8]"
          />
        </div>
      </div>

      {/* Listings Table / Cards */}
      <div className="bg-white border border-[#DCECF2] rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="w-8 h-8 border-3 border-[#00A6E8] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-semibold">Loading listings database...</p>
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="p-12 text-center text-[#5F7180]">
            <span className="material-symbols-outlined text-[36px] text-slate-300 mb-2">inbox</span>
            <p className="text-sm font-bold text-[#0A192A]">No listings match your criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-[#F4FAFD] border-b border-[#DCECF2] text-[#5F7180] uppercase tracking-wider font-extrabold text-[10px]">
                <tr>
                  <th className="py-3.5 px-4 sm:px-6">Opportunity Title</th>
                  <th className="py-3.5 px-4">Owner / Contact</th>
                  <th className="py-3.5 px-4">Category &amp; Sector</th>
                  <th className="py-3.5 px-4">Investment &amp; Date</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[#0A192A]">
                {filteredListings.map((item) => {
                  let statusBadge = "bg-amber-50 text-amber-800 border-amber-200";
                  if (item.status === "published") statusBadge = "bg-emerald-50 text-emerald-800 border-emerald-200";
                  if (item.status === "rejected") statusBadge = "bg-rose-50 text-rose-800 border-rose-200";

                  return (
                    <tr key={item.id} className="hover:bg-[#F6FAFF]/60 transition-colors">
                      <td className="py-4 px-4 sm:px-6 font-bold max-w-xs">
                        <div className="truncate text-sm text-[#0A192A]">{item.title}</div>
                        <div className="text-[11px] text-[#5F7180] font-normal truncate">{item.location}</div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="font-semibold text-[#0A192A]">{item.ownerName}</div>
                        <div className="text-[11px] text-[#5F7180]">{item.ownerEmail}</div>
                      </td>

                      <td className="py-4 px-4">
                        <span className="font-medium text-[#00658F] block">{item.listingType}</span>
                        <span className="text-[11px] text-[#5F7180] block">{item.sector}</span>
                      </td>

                      <td className="py-4 px-4 font-semibold text-[#0A192A]">
                        <div>{item.investmentRange}</div>
                        <div className="text-[11px] text-[#5F7180] font-normal">
                          {item.createdAt && typeof item.createdAt === "object" && "seconds" in (item.createdAt as { seconds?: number })
                            ? new Date((item.createdAt as { seconds: number }).seconds * 1000).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : "Recently Submitted"}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase border ${statusBadge}`}>
                            {item.status}
                          </span>
                          {item.hasPendingEdits && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-0.5">
                              <span className="material-symbols-outlined text-[12px] text-amber-600">pending_actions</span>
                              <span>Revisions</span>
                            </span>
                          )}
                          {item.isVerified && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-0.5">
                              <span className="material-symbols-outlined text-[11px] text-blue-600">verified</span>
                              <span>Verified</span>
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-4 sm:px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Direct link to dedicated review page */}
                          <Link
                            href={`/admin/listings/${item.id}`}
                            className="px-3 py-1.5 bg-[#EBF6FC] hover:bg-[#00A6E8] text-[#00658F] hover:text-white border border-[#00A6E8]/20 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
                          >
                            <span>Review</span>
                            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                          </Link>

                          {/* Quick details preview button */}
                          <button
                            type="button"
                            onClick={() => setSelectedListing(item)}
                            className="p-1.5 text-slate-500 hover:text-[#00A6E8] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Quick Preview"
                          >
                            <span className="material-symbols-outlined text-[18px]">visibility</span>
                          </button>

                          {/* Quick Approve button */}
                          {item.status !== "published" && (
                            <button
                              type="button"
                              disabled={actionLoading === item.id}
                              onClick={() => handleApprove(item.id)}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 hover:border-emerald-600 text-[11px] font-bold rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                            >
                              Approve
                            </button>
                          )}

                          {/* Quick Reject button */}
                          {item.status !== "rejected" && (
                            <button
                              type="button"
                              disabled={actionLoading === item.id}
                              onClick={() => {
                                setRejectingListing(item);
                                setRejectReason("");
                              }}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 hover:border-rose-600 text-[11px] font-bold rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                            >
                              Reject
                            </button>
                          )}

                          {/* Delete button */}
                          <button
                            type="button"
                            disabled={actionLoading === item.id}
                            onClick={() => handleDelete(item.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Listing"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* REJECT MODAL */}
      {/* ============================================================ */}
      <AnimatePresence>
        {rejectingListing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white border border-[#DCECF2] rounded-2xl shadow-2xl p-4 sm:p-6"
            >
              <h3 className="text-lg font-bold text-[#0A192A] font-heading mb-2">
                Reject Business Listing
              </h3>
              <p className="text-xs text-[#5F7180] mb-4 leading-relaxed">
                Provide constructive feedback explaining why this opportunity cannot be approved in its current state. The entrepreneur will see this reason on their dashboard.
              </p>

              <div className="mb-4">
                <label className="block text-xs font-bold text-[#0A192A] mb-1">
                  Rejection Reason *
                </label>
                <textarea
                  rows={3}
                  required
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Please provide valid company registration details or clearer financial expansion estimates."
                  className="w-full px-3 py-2 bg-[#F4FAFD] border border-[#DCECF2] rounded-xl text-xs text-[#0A192A] focus:outline-none focus:border-rose-400"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRejectingListing(null)}
                  className="px-4 py-2.5 sm:py-2 rounded-xl text-xs font-bold text-[#5F7180] hover:bg-slate-50 text-center"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!rejectReason.trim() || actionLoading === rejectingListing.id}
                  onClick={handleConfirmReject}
                  className="px-5 py-2.5 sm:py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50 text-center"
                >
                  Confirm Rejection
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* VIEW DETAILS MODAL */}
      {/* ============================================================ */}
      <AnimatePresence>
        {selectedListing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-white border border-[#DCECF2] rounded-2xl shadow-2xl p-4 sm:p-6 sm:p-8 my-4 sm:my-8 max-h-[90vh] overflow-y-auto flex flex-col"
            >
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#DCECF2] mb-5 shrink-0">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-[#EBF6FC] text-[#00658F] border border-[#DCECF2]">
                      {selectedListing.listingType}
                    </span>
                    <span className="text-xs text-[#5F7180]">Sector: <strong>{selectedListing.sector}</strong></span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-[#0A192A] font-heading">{selectedListing.title}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedListing(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <span className="material-symbols-outlined text-[24px]">close</span>
                </button>
              </div>

              <div className="space-y-4 sm:space-y-5 text-xs text-[#5F7180] overflow-y-auto pr-1">
                {/* Pitch Deck Notice / Button */}
                {(selectedListing.hasPitchDeck || selectedListing.pitchDeckUrl) && (
                  <div className="p-3.5 sm:p-4 bg-rose-50 border border-rose-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-start sm:items-center gap-3">
                      <span className="material-symbols-outlined text-[26px] text-rose-600 shrink-0">picture_as_pdf</span>
                      <div>
                        <strong className="block text-xs text-rose-950 font-bold">
                          {selectedListing.pitchDeckFileName || "Attached Company Pitch Deck (PDF)"}
                        </strong>
                        <span className="text-[11px] text-rose-800">Uploaded pitch deck document available for admin review</span>
                        {adminDeckError && (
                          <p className="text-[11px] text-rose-700 mt-1 font-medium">{adminDeckError}</p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAdminViewDeck(selectedListing)}
                      disabled={openingDeck}
                      className="w-full sm:w-auto px-3.5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {openingDeck ? "sync" : "visibility"}
                      </span>
                      <span>{openingDeck ? "Loading..." : "View Deck"}</span>
                    </button>
                  </div>
                )}

                <div>
                  <strong className="text-[#0A192A] block mb-1 text-xs">Summary:</strong>
                  <p className="leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100 text-[#0A192A]">
                    {selectedListing.shortDescription}
                  </p>
                </div>

                <div>
                  <strong className="text-[#0A192A] block mb-1 text-xs">Full Business Narrative:</strong>
                  <p className="leading-relaxed whitespace-pre-line text-[#0A192A] bg-slate-50 p-3 rounded-xl border border-slate-100">
                    {selectedListing.description}
                  </p>
                </div>

                {/* Business Model & Operations */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 sm:p-4 bg-[#F4FAFD] border border-[#DCECF2] rounded-xl">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Business Type</span>
                    <strong className="text-[#0A192A] text-[11px] sm:text-xs">{selectedListing.businessType || "Not specified"}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Stage</span>
                    <strong className="text-[#0A192A] text-[11px] sm:text-xs">{selectedListing.businessStage || "Not specified"}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Years in Operation</span>
                    <strong className="text-[#0A192A] text-[11px] sm:text-xs">{selectedListing.yearsInOperation || "Not specified"}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Business Model</span>
                    <strong className="text-[#0A192A] text-[11px] sm:text-xs">{selectedListing.businessModel || "Not specified"}</strong>
                  </div>
                </div>

                {/* Investment Purpose & Requirements */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 sm:p-4 bg-[#F4FAFD] border border-[#DCECF2] rounded-xl">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Investment Range</span>
                    <strong className="text-[#00658F] text-sm">{selectedListing.investmentRange}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Investment Purpose</span>
                    <strong className="text-[#0A192A]">{selectedListing.investmentPurpose || "General Expansion"}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Preferred Investor</span>
                    <strong className="text-[#0A192A]">{selectedListing.preferredInvestorType || "Any Suitable Investor"}</strong>
                  </div>
                  {selectedListing.expectedUseOfFunds && (
                    <div className="col-span-1 sm:col-span-3 pt-2 border-t border-[#DCECF2]">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Expected Use of Funds</span>
                      <p className="text-[#0A192A] mt-0.5">{selectedListing.expectedUseOfFunds}</p>
                    </div>
                  )}
                </div>

                {/* Founder Profile & Contact Details */}
                <div className="p-3.5 sm:p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <strong className="text-[#0A192A] block text-xs uppercase font-bold">Founder / Management Details:</strong>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Founder Name</span>
                      <strong className="text-[#0A192A]">{selectedListing.founderName || selectedListing.ownerName}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Experience</span>
                      <strong className="text-[#0A192A]">{selectedListing.founderExperience || "Not provided"}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Contact Phone</span>
                      <strong className="text-[#0A192A]">{selectedListing.contactPhone}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Contact Email</span>
                      <strong className="text-[#0A192A]">{selectedListing.contactEmail || selectedListing.ownerEmail}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Location</span>
                      <strong className="text-[#0A192A]">{selectedListing.location}</strong>
                    </div>
                  </div>
                  {selectedListing.founderBackground && (
                    <div className="pt-2 border-t border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Founder Background &amp; Bio</span>
                      <p className="text-[#0A192A] mt-0.5 whitespace-pre-line">{selectedListing.founderBackground}</p>
                    </div>
                  )}
                </div>

                {/* Rejection notice if exists */}
                {selectedListing.rejectionReason && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
                    <strong>Rejection Reason:</strong> {selectedListing.rejectionReason}
                  </div>
                )}
                {/* Image Assets Preview */}
                {selectedListing.images && selectedListing.images.length > 0 && (
                  <div>
                    <strong className="text-[#0A192A] block mb-2 text-xs">Submitted Image Assets:</strong>
                    <div className="grid grid-cols-3 gap-2">
                      {selectedListing.images.map((img, idx) => (
                        <div key={idx} className="aspect-video rounded-lg overflow-hidden border border-[#DCECF2] bg-slate-100">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img} alt="listing visual" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 pt-4 sm:pt-6 border-t border-[#DCECF2] mt-4 sm:mt-6 shrink-0">
                <Link
                  href={`/admin/listings/${selectedListing.id}`}
                  className="px-4 py-2.5 bg-[#EBF6FC] hover:bg-[#00A6E8] text-[#00658F] hover:text-white border border-[#00A6E8]/20 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <span>Open Full Review Dossier (7 Sections)</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </Link>

                <div className="flex items-center gap-2">
                  {selectedListing.status !== "published" && (
                    <button
                      type="button"
                      onClick={() => handleApprove(selectedListing.id)}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors text-center shadow-sm cursor-pointer"
                    >
                      Approve
                    </button>
                  )}
                  {selectedListing.status !== "rejected" && (
                    <button
                      type="button"
                      onClick={() => {
                        setRejectingListing(selectedListing);
                        setRejectReason("");
                      }}
                      className="px-4 py-2.5 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 text-xs font-bold rounded-xl transition-colors text-center cursor-pointer"
                    >
                      Reject
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
