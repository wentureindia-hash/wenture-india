"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  getAllInvestorsAdmin,
  approveInvestor,
  rejectInvestor,
  requestChangesInvestor,
  addInvestorAdminNote,
  updateInvestorAdmin,
  deleteInvestor,
  InvestorProfile,
  InvestorStatus,
  InvestorType,
  INVESTOR_TYPES,
  INVESTOR_RANGES,
  INVESTMENT_STAGES,
  normalizeInvestorWhatsAppPhone,
  formatInvestorWhatsAppPhone,
  getInvestorWhatsAppUrl,
} from "@/lib/firebase/investors";
import { AnimatePresence, motion } from "framer-motion";

export default function AdminInvestorsPage() {
  const [investors, setInvestors] = useState<InvestorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<InvestorStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Modals state
  const [selectedInvestor, setSelectedInvestor] = useState<InvestorProfile | null>(null);
  const [rejectingInvestor, setRejectingInvestor] = useState<InvestorProfile | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [revisionInvestor, setRevisionInvestor] = useState<InvestorProfile | null>(null);
  const [revisionFeedback, setRevisionFeedback] = useState("");
  const [noteInvestor, setNoteInvestor] = useState<InvestorProfile | null>(null);
  const [adminNoteText, setAdminNoteText] = useState("");
  const [editingInvestor, setEditingInvestor] = useState<InvestorProfile | null>(null);

  const loadInvestors = async () => {
    setLoading(true);
    const res = await getAllInvestorsAdmin();
    if (!res.error) {
      setInvestors(res.investors);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadInvestors();
  }, []);

  const handleApprove = async (uid: string) => {
    const target =
      investors.find((i) => i.id === uid) ||
      (selectedInvestor?.id === uid ? selectedInvestor : null);

    if (target && !normalizeInvestorWhatsAppPhone(target.contactPhone)) {
      alert(
        "Cannot approve investor profile: A valid WhatsApp contact number is mandatory before publishing."
      );
      return;
    }
    if (target && target.whatsAppConsent === false) {
      alert(
        "Cannot approve investor profile: Public WhatsApp contact consent has not been confirmed by the investor."
      );
      return;
    }

    setActionLoading(uid);
    const res = await approveInvestor(uid);
    setActionLoading(null);
    if (res?.error) {
      alert(res.error);
    }
    await loadInvestors();
    if (selectedInvestor?.id === uid) setSelectedInvestor(null);
  };

  const handleConfirmReject = async () => {
    if (!rejectingInvestor || !rejectReason.trim()) return;
    setActionLoading(rejectingInvestor.id);
    const res = await rejectInvestor(rejectingInvestor.id, rejectReason.trim());
    setActionLoading(null);
    if (res?.error) {
      alert(res.error);
    }
    setRejectingInvestor(null);
    setRejectReason("");
    await loadInvestors();
    if (selectedInvestor?.id === rejectingInvestor.id) setSelectedInvestor(null);
  };

  const handleConfirmRequestRevision = async () => {
    if (!revisionInvestor || !revisionFeedback.trim()) return;
    setActionLoading(revisionInvestor.id);
    await requestChangesInvestor(revisionInvestor.id, revisionFeedback.trim());
    setActionLoading(null);
    setRevisionInvestor(null);
    setRevisionFeedback("");
    await loadInvestors();
    if (selectedInvestor?.id === revisionInvestor.id) setSelectedInvestor(null);
  };

  const handleConfirmAddNote = async () => {
    if (!noteInvestor || !adminNoteText.trim()) return;
    setActionLoading(noteInvestor.id);
    await addInvestorAdminNote(noteInvestor.id, adminNoteText.trim());
    setActionLoading(null);
    setNoteInvestor(null);
    setAdminNoteText("");
    await loadInvestors();
    if (selectedInvestor?.id === noteInvestor.id) {
      // Refresh current modal data
      const updated = (await getAllInvestorsAdmin()).investors.find((i) => i.id === noteInvestor.id);
      if (updated) setSelectedInvestor(updated);
    }
  };

  const handleDelete = async (uid: string) => {
    if (!confirm("Are you sure you want to permanently delete this investor directory profile?")) return;
    setActionLoading(uid);
    await deleteInvestor(uid);
    setActionLoading(null);
    await loadInvestors();
    if (selectedInvestor?.id === uid) setSelectedInvestor(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvestor) return;

    setActionLoading(editingInvestor.id);
    await updateInvestorAdmin(editingInvestor.id, {
      investorName: editingInvestor.investorName,
      investorType: editingInvestor.investorType,
      location: editingInvestor.location,
      investmentRange: editingInvestor.investmentRange,
      typicalInvestmentSize: editingInvestor.typicalInvestmentSize,
      investmentStage: editingInvestor.investmentStage,
      preferredLocations: editingInvestor.preferredLocations,
      shortIntroduction: editingInvestor.shortIntroduction,
      experience: editingInvestor.experience,
      investmentExperience: editingInvestor.investmentExperience,
      previousInvestments: editingInvestor.previousInvestments,
      professionalBackground: editingInvestor.professionalBackground,
      contactEmail: editingInvestor.contactEmail,
      contactPhone: editingInvestor.contactPhone,
      contactLinkedin: editingInvestor.contactLinkedin,
    });
    setActionLoading(null);
    setEditingInvestor(null);
    await loadInvestors();
  };

  const filteredInvestors = useMemo(() => {
    return investors.filter((inv) => {
      if (inv.status === "deleted" || inv.isDeleted) {
        return false;
      }
      if (statusFilter !== "all" && inv.status !== statusFilter) {
        return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = inv.investorName?.toLowerCase().includes(q);
        const matchType = inv.investorType?.toLowerCase().includes(q);
        const matchLoc = inv.location?.toLowerCase().includes(q);
        const matchSec = inv.preferredSectors?.some((s) => s.toLowerCase().includes(q));
        if (!matchName && !matchType && !matchLoc && !matchSec) {
          return false;
        }
      }
      return true;
    });
  }, [investors, statusFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-[#00A6E8] uppercase tracking-wider block mb-1">
            Directory Moderation
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0A192A] tracking-tight font-heading">
            Investor Profiles
          </h1>
          <p className="text-xs sm:text-sm text-[#5F7180] mt-1">
            Review, verify, edit, and approve capital partner profiles submitted to the public directory.
          </p>
        </div>

        <button
          type="button"
          onClick={loadInvestors}
          className="px-4 py-2 bg-white border border-[#DCECF2] hover:bg-slate-50 text-[#0A192A] text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 self-stretch sm:self-auto shadow-sm"
        >
          <span className="material-symbols-outlined text-[16px] text-[#00A6E8]">refresh</span>
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white border border-[#DCECF2] rounded-2xl p-3.5 sm:p-5 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-[#F4FAFD] border border-[#DCECF2] rounded-xl w-full sm:w-auto overflow-x-auto no-scrollbar">
          {(
            [
              { key: "all", label: "All" },
              { key: "pending", label: "Pending" },
              { key: "under_review", label: "Under Review" },
              { key: "changes_requested", label: "Revision" },
              { key: "published", label: "Published" },
              { key: "rejected", label: "Rejected" },
            ] as const
          ).map((tab) => {
            const active = statusFilter === tab.key;
            const count =
              tab.key === "all"
                ? investors.length
                : investors.filter((i) => i.status === tab.key).length;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  active
                    ? "bg-[#00A6E8] text-white shadow-sm"
                    : "text-[#5F7180] hover:text-[#0A192A]"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    active ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
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
            placeholder="Search by name, sector, location..."
            className="w-full pl-9 pr-4 py-2 bg-[#F4FAFD] border border-[#DCECF2] rounded-xl text-xs text-[#0A192A] focus:outline-none focus:border-[#00A6E8]"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-[#DCECF2] rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="w-8 h-8 border-3 border-[#00A6E8] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-semibold">Loading investor directory queue...</p>
          </div>
        ) : filteredInvestors.length === 0 ? (
          <div className="p-12 text-center text-[#5F7180]">
            <span className="material-symbols-outlined text-[36px] text-slate-300 mb-2">inbox</span>
            <p className="text-sm font-bold text-[#0A192A]">No investor profiles found.</p>
            <p className="text-xs text-slate-400 mt-1">No profiles match the selected status filter or search query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-[#F4FAFD] border-b border-[#DCECF2] text-[#5F7180] uppercase tracking-wider font-extrabold text-[10px]">
                <tr>
                  <th className="py-3.5 px-4 sm:px-6">Investor Name &amp; Location</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Type</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Investment Range</th>
                  <th className="py-3.5 px-4">Sectors &amp; Stage</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Status</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[#0A192A]">
                {filteredInvestors.map((inv) => {
                  let badge = "bg-amber-50 text-amber-800 border-amber-200/80";
                  let dot = "bg-amber-500";
                  let statusLabel = inv.status.replace("_", " ");

                  if (inv.status === "published") {
                    badge = "bg-emerald-50 text-emerald-800 border-emerald-200/80";
                    dot = "bg-emerald-500";
                    statusLabel = "Published";
                  } else if (inv.status === "rejected") {
                    badge = "bg-rose-50 text-rose-800 border-rose-200/80";
                    dot = "bg-rose-500";
                    statusLabel = "Rejected";
                  } else if (inv.status === "changes_requested") {
                    badge = "bg-purple-50 text-purple-800 border-purple-200/80";
                    dot = "bg-purple-500";
                    statusLabel = "Sent for Revision – Awaiting Investor Changes";
                  } else if (inv.status === "under_review") {
                    badge = "bg-blue-50 text-blue-800 border-blue-200/80";
                    dot = "bg-blue-500";
                    statusLabel = "Under Review";
                  } else if (inv.status === "pending") {
                    badge = "bg-amber-50 text-amber-800 border-amber-200/80";
                    dot = "bg-amber-500";
                    statusLabel = inv.isResubmitted
                      ? "Resubmitted / Pending Review"
                      : "Pending Review";
                  }

                  return (
                    <tr key={inv.id} className="hover:bg-[#F6FAFF]/60 transition-colors">
                      <td className="py-4 px-4 sm:px-6 font-bold">
                        <div className="text-sm text-[#0A192A]">{inv.investorName}</div>
                        <div className="text-[11px] text-[#5F7180] font-normal flex items-center gap-1 mt-0.5">
                          <span className="material-symbols-outlined text-[13px] text-[#00A6E8]">location_on</span>
                          <span>{inv.location}</span>
                        </div>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200/60 whitespace-nowrap">
                          {inv.investorType}
                        </span>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap font-bold text-[#00658F]">
                        {inv.investmentRange}
                      </td>

                      <td className="py-4 px-4 text-[#5F7180]">
                        <div className="text-[11px] truncate max-w-xs font-medium text-[#0A192A]">
                          {inv.preferredSectors.join(", ")}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{inv.investmentStage}</div>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wide border whitespace-nowrap shadow-2xs ${badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
                          <span>{statusLabel}</span>
                        </span>
                      </td>

                      <td className="py-4 px-4 sm:px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View details */}
                          <button
                            type="button"
                            onClick={() => setSelectedInvestor(inv)}
                            className="p-1.5 text-slate-500 hover:text-[#00A6E8] hover:bg-slate-100 rounded-lg transition-colors"
                            title="View Full Profile"
                          >
                            <span className="material-symbols-outlined text-[18px]">visibility</span>
                          </button>

                          {/* Edit button */}
                          <button
                            type="button"
                            onClick={() => setEditingInvestor(inv)}
                            className="p-1.5 text-slate-500 hover:text-[#00A6E8] hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit Investor Profile"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>

                          {/* Approve button */}
                          {inv.status !== "published" && inv.status !== "changes_requested" && (
                            <button
                              type="button"
                              disabled={
                                actionLoading === inv.id ||
                                !normalizeInvestorWhatsAppPhone(inv.contactPhone) ||
                                inv.whatsAppConsent === false
                              }
                              onClick={() => handleApprove(inv.id)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors shadow-sm flex items-center gap-1 ${
                                normalizeInvestorWhatsAppPhone(inv.contactPhone) && inv.whatsAppConsent !== false
                                  ? "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                                  : "bg-slate-200 text-slate-400 cursor-not-allowed opacity-60"
                              }`}
                              title={
                                !normalizeInvestorWhatsAppPhone(inv.contactPhone)
                                  ? "Cannot approve: Missing valid WhatsApp contact number"
                                  : inv.whatsAppConsent === false
                                  ? "Cannot approve: Public WhatsApp contact consent is missing"
                                  : "Approve profile"
                              }
                            >
                              <span className="material-symbols-outlined text-[14px]">check</span>
                              <span>Approve</span>
                            </button>
                          )}

                          {/* Request Revision button */}
                          {inv.status !== "published" && inv.status !== "changes_requested" && (
                            <button
                              type="button"
                              disabled={actionLoading === inv.id}
                              onClick={() => {
                                setRevisionInvestor(inv);
                                setRevisionFeedback("");
                              }}
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[11px] font-bold transition-colors disabled:opacity-50 flex items-center gap-1"
                              title="Request Revision"
                            >
                              <span className="material-symbols-outlined text-[14px]">edit_note</span>
                              <span>Revision</span>
                            </button>
                          )}

                          {/* Reject button */}
                          {inv.status !== "rejected" && inv.status !== "changes_requested" && (
                            <button
                              type="button"
                              disabled={actionLoading === inv.id}
                              onClick={() => {
                                setRejectingInvestor(inv);
                                setRejectReason("");
                              }}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold transition-colors disabled:opacity-50 flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-[14px]">close</span>
                              <span>Reject</span>
                            </button>
                          )}

                          {/* Delete button */}
                          <button
                            type="button"
                            disabled={actionLoading === inv.id}
                            onClick={() => handleDelete(inv.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Profile"
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

      {/* View Detail Modal */}
      <AnimatePresence>
        {selectedInvestor && (() => {
          let badgeStyle = "bg-amber-50 text-amber-800 border-amber-200/80";
          let dotStyle = "bg-amber-500";
          let statusLabel = selectedInvestor.status.replace("_", " ");
          if (selectedInvestor.status === "published") {
            badgeStyle = "bg-emerald-50 text-emerald-800 border-emerald-200/80";
            dotStyle = "bg-emerald-500";
            statusLabel = "Published";
          } else if (selectedInvestor.status === "rejected") {
            badgeStyle = "bg-rose-50 text-rose-800 border-rose-200/80";
            dotStyle = "bg-rose-500";
            statusLabel = "Rejected";
          } else if (selectedInvestor.status === "changes_requested") {
            badgeStyle = "bg-purple-50 text-purple-800 border-purple-200/80";
            dotStyle = "bg-purple-500";
            statusLabel = "Sent for Revision – Awaiting Investor Changes";
          } else if (selectedInvestor.status === "under_review") {
            badgeStyle = "bg-blue-50 text-blue-800 border-blue-200/80";
            dotStyle = "bg-blue-500";
            statusLabel = "Under Review";
          } else if (selectedInvestor.status === "pending") {
            badgeStyle = "bg-amber-50 text-amber-800 border-amber-200/80";
            dotStyle = "bg-amber-500";
            statusLabel = selectedInvestor.isResubmitted
              ? "Resubmitted / Pending Review"
              : "Pending Review";
          }

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedInvestor(null)}
                className="fixed inset-0 bg-[#0A192A]/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="relative bg-white rounded-3xl border border-[#DCECF2] shadow-2xl w-full max-w-3xl overflow-hidden z-10 my-4 sm:my-8 max-h-[88vh] flex flex-col"
              >
                {/* Modal Header */}
                <div className="p-4 sm:p-6 border-b border-[#DCECF2] bg-[#F8FAFD] flex items-center justify-between gap-4 shrink-0">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white border border-[#DCECF2] p-1 flex items-center justify-center shrink-0 shadow-xs overflow-hidden">
                      {selectedInvestor.profileImage ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={selectedInvestor.profileImage}
                          alt={selectedInvestor.investorName}
                          className="w-full h-full object-contain rounded-xl"
                        />
                      ) : (
                        <div className="w-full h-full rounded-xl bg-[#EBF6FC] text-[#00A6E8] flex items-center justify-center font-black text-base sm:text-lg">
                          {selectedInvestor.investorName.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base sm:text-xl font-bold text-[#0A192A] font-heading truncate">
                          {selectedInvestor.investorName}
                        </h2>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wide border whitespace-nowrap shadow-2xs ${badgeStyle}`}>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotStyle}`} />
                          <span>{statusLabel}</span>
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#5F7180] mt-1">
                        <span className="font-semibold text-[#00658F]">{selectedInvestor.investorType}</span>
                        <span>•</span>
                        <span className="flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[14px] text-[#00A6E8]">location_on</span>
                          <span>{selectedInvestor.location}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedInvestor(null)}
                    className="p-2 text-slate-400 hover:text-[#0A192A] hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer shrink-0"
                    title="Close preview"
                  >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-4 sm:p-6 space-y-5 text-xs overflow-y-auto flex-1 bg-white">
                  {/* Sent for Revision Banner if changes_requested */}
                  {selectedInvestor.status === "changes_requested" && (
                    <div className="p-4 bg-purple-50 border border-purple-200 text-purple-950 rounded-2xl space-y-2">
                      <div className="flex items-center gap-2 text-purple-900 font-bold text-xs uppercase tracking-wider">
                        <span className="material-symbols-outlined text-[18px] text-purple-700">pending_actions</span>
                        <span>Sent for Revision – Awaiting Investor Changes</span>
                      </div>
                      <p className="text-xs text-purple-900/90 leading-relaxed">
                        This investor profile was sent back for revisions. The investor must review feedback, update requested fields, and resubmit their profile before approval or rejection is allowed.
                      </p>
                      {selectedInvestor.revisionFeedback && (
                        <div className="mt-2 p-3 bg-white/80 border border-purple-200/80 rounded-xl">
                          <span className="text-[10px] uppercase font-bold text-purple-800 block mb-1">Feedback Sent to Investor:</span>
                          <p className="text-xs text-purple-950 italic whitespace-pre-line">&ldquo;{selectedInvestor.revisionFeedback}&rdquo;</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Resubmitted / Pending Review Banner if resubmitted */}
                  {selectedInvestor.status === "pending" && selectedInvestor.isResubmitted && (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-950 rounded-2xl space-y-1.5">
                      <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs uppercase tracking-wider">
                        <span className="material-symbols-outlined text-[18px] text-emerald-700">mark_email_read</span>
                        <span>Resubmitted / Pending Review</span>
                      </div>
                      <p className="text-xs text-emerald-900/90 leading-relaxed">
                        The investor has updated their profile according to revision feedback and resubmitted it. You can now review the updated profile and choose to Approve &amp; Publish or Reject.
                      </p>
                    </div>
                  )}

                  {/* 1. Investment Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-[#F4FAFD] border border-[#DCECF2] rounded-xl min-w-0 overflow-hidden">
                      <span className="text-[#5F7180] block text-[10px] uppercase font-bold tracking-wider truncate">
                        Investment Range
                      </span>
                      <span
                        className="font-bold text-[#00658F] text-xs sm:text-sm mt-0.5 block truncate"
                        title={selectedInvestor.investmentRange}
                      >
                        {selectedInvestor.investmentRange}
                      </span>
                    </div>
                    <div className="p-3 bg-[#F4FAFD] border border-[#DCECF2] rounded-xl min-w-0 overflow-hidden">
                      <span className="text-[#5F7180] block text-[10px] uppercase font-bold tracking-wider truncate">
                        Ticket Size
                      </span>
                      <span
                        className="font-bold text-[#0A192A] text-xs sm:text-sm mt-0.5 block truncate"
                        title={selectedInvestor.typicalInvestmentSize || "Standard Ticket"}
                      >
                        {selectedInvestor.typicalInvestmentSize || "Standard Ticket"}
                      </span>
                    </div>
                    <div className="p-3 bg-[#F4FAFD] border border-[#DCECF2] rounded-xl min-w-0 overflow-hidden">
                      <span className="text-[#5F7180] block text-[10px] uppercase font-bold tracking-wider truncate">
                        Stage Preference
                      </span>
                      <span
                        className="font-bold text-[#0A192A] text-xs sm:text-sm mt-0.5 block truncate"
                        title={selectedInvestor.investmentStage}
                      >
                        {selectedInvestor.investmentStage}
                      </span>
                    </div>
                    <div className="p-3 bg-[#F4FAFD] border border-[#DCECF2] rounded-xl min-w-0 overflow-hidden">
                      <span className="text-[#5F7180] block text-[10px] uppercase font-bold tracking-wider truncate">
                        Experience Level
                      </span>
                      <span
                        className="font-bold text-[#0A192A] text-xs sm:text-sm mt-0.5 block truncate"
                        title={selectedInvestor.investmentExperience || "Active Investor"}
                      >
                        {selectedInvestor.investmentExperience || "Active Investor"}
                      </span>
                    </div>
                  </div>

                  {/* 2. Contact Channels Card */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <div className="text-[10px] uppercase font-bold text-[#5F7180] tracking-wider flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[15px] text-[#00A6E8]">contact_mail</span>
                        <span>Verified Contact Channels</span>
                      </div>
                      {selectedInvestor.contactPhone && normalizeInvestorWhatsAppPhone(selectedInvestor.contactPhone) ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>WhatsApp Verified</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          <span>Missing WhatsApp Number</span>
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-slate-700 pt-0.5">
                      <div>
                        <span className="text-[10px] text-[#5F7180] block font-semibold">Email</span>
                        <span className="font-medium text-xs break-all">{selectedInvestor.contactEmail || "Not provided"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#5F7180] block font-semibold">WhatsApp Number (Mandatory)</span>
                        {selectedInvestor.contactPhone ? (
                          <div className="space-y-1">
                            <span className="font-bold text-xs text-[#0A192A] block">
                              {formatInvestorWhatsAppPhone(selectedInvestor.contactPhone) || selectedInvestor.contactPhone}
                            </span>
                            {normalizeInvestorWhatsAppPhone(selectedInvestor.contactPhone) ? (
                              <a
                                href={getInvestorWhatsAppUrl(selectedInvestor.contactPhone) || "#"}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold"
                              >
                                <span className="material-symbols-outlined text-[13px]">chat</span>
                                <span>Test WhatsApp Link</span>
                              </a>
                            ) : (
                              <span className="text-[10px] text-rose-600 font-semibold block">Invalid format</span>
                            )}
                          </div>
                        ) : (
                          <span className="font-bold text-xs text-rose-600">Not provided (Required)</span>
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] text-[#5F7180] block font-semibold">LinkedIn / Website</span>
                        {selectedInvestor.contactLinkedin ? (
                          <a
                            href={selectedInvestor.contactLinkedin}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#00A6E8] hover:underline font-medium text-xs flex items-center gap-1 break-all"
                          >
                            <span>View Profile</span>
                            <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                          </a>
                        ) : (
                          <span className="font-medium text-xs text-slate-400">Not provided</span>
                        )}
                      </div>
                    </div>
                    {/* Public WhatsApp Contact Consent status */}
                    <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-medium">Public WhatsApp Contact Consent:</span>
                      {selectedInvestor.whatsAppConsent !== false ? (
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px]">verified</span>
                          <span>Authorized by Investor</span>
                        </span>
                      ) : (
                        <span className="text-rose-600 font-semibold flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px]">cancel</span>
                          <span>Consent Missing</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 3. Sectors & Geographies */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <strong className="block text-[10px] uppercase font-bold text-[#5F7180] tracking-wider">Target Sectors:</strong>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedInvestor.preferredSectors.map((s) => (
                          <span key={s} className="px-2.5 py-1 bg-sky-50 text-sky-800 border border-sky-100 rounded-lg text-xs font-semibold">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <strong className="block text-[10px] uppercase font-bold text-[#5F7180] tracking-wider">Preferred Geographies:</strong>
                      <div className="flex flex-wrap gap-1.5">
                        {(selectedInvestor.preferredLocations && selectedInvestor.preferredLocations.length > 0
                          ? selectedInvestor.preferredLocations
                          : ["Pan India"]
                        ).map((loc) => (
                          <span key={loc} className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-lg text-xs font-semibold">
                            {loc}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 4. Areas of Expertise */}
                  {selectedInvestor.areasOfExpertise && selectedInvestor.areasOfExpertise.length > 0 && (
                    <div className="space-y-1.5">
                      <strong className="block text-[10px] uppercase font-bold text-[#5F7180] tracking-wider">Areas of Expertise:</strong>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedInvestor.areasOfExpertise.map((e) => (
                          <span key={e} className="px-2.5 py-1 bg-purple-50 text-purple-800 border border-purple-100 rounded-lg text-xs font-semibold">
                            {e}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 5. Investment Thesis & Introduction */}
                  <div className="space-y-1.5">
                    <strong className="block text-[10px] uppercase font-bold text-[#5F7180] tracking-wider">Investment Thesis &amp; Introduction:</strong>
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#0A192A] leading-relaxed whitespace-pre-line">
                      {selectedInvestor.shortIntroduction}
                    </div>
                  </div>

                  {/* 6. Professional Background & Portfolio */}
                  {(selectedInvestor.professionalBackground || selectedInvestor.previousInvestments) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {selectedInvestor.professionalBackground && (
                        <div className="space-y-1.5">
                          <strong className="block text-[10px] uppercase font-bold text-[#5F7180] tracking-wider">Professional Background:</strong>
                          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#0A192A] leading-relaxed whitespace-pre-line">
                            {selectedInvestor.professionalBackground}
                          </div>
                        </div>
                      )}
                      {selectedInvestor.previousInvestments && (
                        <div className="space-y-1.5">
                          <strong className="block text-[10px] uppercase font-bold text-[#5F7180] tracking-wider">Past Portfolio / Investments:</strong>
                          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#0A192A] leading-relaxed whitespace-pre-line">
                            {selectedInvestor.previousInvestments}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Investment Experience Narrative */}
                  {selectedInvestor.investmentExperience && (
                    <div className="space-y-1.5">
                      <strong className="block text-[10px] uppercase font-bold text-[#5F7180] tracking-wider">
                        Investment Experience &amp; Track Record:
                      </strong>
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#0A192A] leading-relaxed whitespace-pre-line break-words overflow-hidden">
                        {selectedInvestor.investmentExperience}
                      </div>
                    </div>
                  )}

                  {selectedInvestor.experience &&
                    selectedInvestor.experience !== selectedInvestor.investmentExperience && (
                      <div className="space-y-1.5">
                        <strong className="block text-[10px] uppercase font-bold text-[#5F7180] tracking-wider">
                          Detailed Bio / Experience Narrative:
                        </strong>
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#0A192A] leading-relaxed whitespace-pre-line break-words overflow-hidden">
                          {selectedInvestor.experience}
                        </div>
                      </div>
                    )}

                  {/* 7. Revision Feedback Alert (if present) */}
                  {selectedInvestor.revisionFeedback && (
                    <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl space-y-1">
                      <div className="flex items-center gap-1.5 text-amber-800 font-bold text-[11px] uppercase tracking-wider">
                        <span className="material-symbols-outlined text-[16px]">edit_note</span>
                        <span>Requested Revision Feedback</span>
                      </div>
                      <p className="mt-0.5 leading-relaxed text-xs">{selectedInvestor.revisionFeedback}</p>
                    </div>
                  )}

                  {/* 8. Rejection Reason Alert (if present) */}
                  {selectedInvestor.rejectionReason && (
                    <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl space-y-1">
                      <div className="flex items-center gap-1.5 text-rose-800 font-bold text-[11px] uppercase tracking-wider">
                        <span className="material-symbols-outlined text-[16px]">cancel</span>
                        <span>Rejection Reason</span>
                      </div>
                      <p className="mt-0.5 leading-relaxed text-xs">{selectedInvestor.rejectionReason}</p>
                    </div>
                  )}

                  {/* 9. Internal Admin Notes (if present) */}
                  {selectedInvestor.adminNotes && (
                    <div className="p-3.5 bg-slate-100 border border-slate-200 text-slate-800 rounded-xl space-y-1">
                      <div className="flex items-center gap-1.5 text-slate-600 font-bold text-[11px] uppercase tracking-wider">
                        <span className="material-symbols-outlined text-[16px]">sticky_note_2</span>
                        <span>Internal Administrator Notes</span>
                      </div>
                      <p className="mt-0.5 leading-relaxed text-xs">{selectedInvestor.adminNotes}</p>
                    </div>
                  )}

                  {/* 10. WhatsApp Missing Warning Banner (if missing or invalid) */}
                  {(!selectedInvestor.contactPhone || !normalizeInvestorWhatsAppPhone(selectedInvestor.contactPhone)) && (
                    <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl space-y-1">
                      <div className="flex items-center gap-1.5 text-rose-800 font-bold text-[11px] uppercase tracking-wider">
                        <span className="material-symbols-outlined text-[16px]">warning</span>
                        <span>WhatsApp Number Required Before Approval</span>
                      </div>
                      <p className="mt-0.5 leading-relaxed text-xs text-rose-950">
                        This investor profile does not have a valid WhatsApp contact number. Publication is blocked until a valid number is provided. Click <strong>Request Revision</strong> to instruct the investor to update their profile with their WhatsApp number.
                      </p>
                    </div>
                  )}

                  {/* 11. Audit & Review History Timeline */}
                  {selectedInvestor.reviewHistory && selectedInvestor.reviewHistory.length > 0 && (
                    <div className="pt-2 border-t border-[#DCECF2] space-y-2">
                      <strong className="block text-[10px] uppercase font-bold text-[#5F7180] tracking-wider">
                        Audit &amp; Review History
                      </strong>
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {selectedInvestor.reviewHistory.map((h, i) => (
                          <div key={i} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px]">
                            <div className="flex items-center justify-between font-bold text-[#0A192A]">
                              <span className="uppercase text-[10px] text-[#00658F]">{h.action.replace("_", " ")}</span>
                              <span className="text-[10px] font-normal text-slate-400">
                                {h.timestamp ? new Date(h.timestamp).toLocaleString() : ""}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">By: {h.performedBy}</div>
                            {h.notes && <p className="text-slate-600 text-xs mt-1 italic">&ldquo;{h.notes}&rdquo;</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="p-4 sm:p-5 border-t border-[#DCECF2] bg-[#F8FAFD] flex flex-wrap items-center justify-end gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelectedInvestor(null)}
                    className="px-4 py-2 border border-[#DCECF2] text-xs font-bold rounded-xl text-center text-[#5F7180] hover:text-[#0A192A] hover:bg-white transition-colors cursor-pointer"
                  >
                    Close
                  </button>

                  {/* Add Note Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setNoteInvestor(selectedInvestor);
                      setAdminNoteText(selectedInvestor.adminNotes || "");
                    }}
                    className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl text-center border border-[#DCECF2] shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit_note</span>
                    <span>Internal Note</span>
                  </button>

                  {/* Request Revision Button */}
                  {selectedInvestor.status !== "published" && selectedInvestor.status !== "changes_requested" && (
                    <button
                      type="button"
                      onClick={() => {
                        setRevisionInvestor(selectedInvestor);
                        setRevisionFeedback("");
                      }}
                      className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold rounded-xl text-center flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">history_edu</span>
                      <span>Request Revision</span>
                    </button>
                  )}

                  {/* Reject Button */}
                  {selectedInvestor.status !== "rejected" && selectedInvestor.status !== "changes_requested" && (
                    <button
                      type="button"
                      onClick={() => {
                        setRejectingInvestor(selectedInvestor);
                        setRejectReason("");
                      }}
                      className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl text-center flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                      <span>Reject</span>
                    </button>
                  )}

                  {/* Approve Button */}
                  {selectedInvestor.status !== "published" && selectedInvestor.status !== "changes_requested" && (
                    <button
                      type="button"
                      disabled={
                        actionLoading === selectedInvestor.id ||
                        !normalizeInvestorWhatsAppPhone(selectedInvestor.contactPhone) ||
                        selectedInvestor.whatsAppConsent === false
                      }
                      onClick={() => handleApprove(selectedInvestor.id)}
                      className={`px-4 py-2 text-xs font-bold rounded-xl text-center shadow-sm flex items-center gap-1.5 transition-colors ${
                        normalizeInvestorWhatsAppPhone(selectedInvestor.contactPhone) && selectedInvestor.whatsAppConsent !== false
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                          : "bg-slate-200 text-slate-400 cursor-not-allowed opacity-60"
                      }`}
                      title={
                        !normalizeInvestorWhatsAppPhone(selectedInvestor.contactPhone)
                          ? "Cannot approve: A valid WhatsApp contact number is mandatory"
                          : selectedInvestor.whatsAppConsent === false
                          ? "Cannot approve: Public WhatsApp contact consent is missing"
                          : "Approve and publish profile"
                      }
                    >
                      <span className="material-symbols-outlined text-[16px]">check</span>
                      <span>Approve &amp; Publish</span>
                    </button>
                  )}

                  {/* Status Note when awaiting investor changes */}
                  {selectedInvestor.status === "changes_requested" && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-purple-50 text-purple-800 border border-purple-200/80">
                      <span className="material-symbols-outlined text-[15px] text-purple-600">lock_clock</span>
                      <span>Awaiting Investor Resubmission</span>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* Reject Modal */}
      <AnimatePresence>
        {rejectingInvestor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRejectingInvestor(null)}
              className="fixed inset-0 bg-[#0A192A]/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-2xl border border-[#DCECF2] shadow-2xl w-full max-w-md p-4 sm:p-6 z-10"
            >
              <h3 className="text-lg font-bold text-[#0A192A] mb-2 font-heading">
                Reject Investor Profile
              </h3>
              <p className="text-xs text-[#5F7180] mb-4">
                Please provide a mandatory reason for rejecting this profile. The investor will see this feedback in their dashboard to make required edits.
              </p>

              <textarea
                rows={4}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Please provide a more detailed professional introduction and specify your target sectors."
                className="w-full p-3 border border-[#DCECF2] rounded-xl text-xs focus:outline-none focus:border-[#00A6E8] resize-none mb-4"
              />

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRejectingInvestor(null)}
                  className="px-4 py-2.5 sm:py-2 border border-[#DCECF2] text-xs font-bold rounded-xl text-center"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!rejectReason.trim()}
                  onClick={handleConfirmReject}
                  className="px-4 py-2.5 sm:py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl disabled:opacity-50 text-center"
                >
                  Confirm Rejection
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Request Revision Modal */}
      <AnimatePresence>
        {revisionInvestor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRevisionInvestor(null)}
              className="fixed inset-0 bg-[#0A192A]/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-2xl border border-[#DCECF2] shadow-2xl w-full max-w-md p-4 sm:p-6 z-10"
            >
              <h3 className="text-lg font-bold text-[#0A192A] mb-2 font-heading">
                Request Revisions
              </h3>
              <p className="text-xs text-[#5F7180] mb-4">
                Provide clear feedback on what needs to be updated. The investor will see this prompt on their profile dashboard and be able to edit and resubmit.
              </p>

              <textarea
                rows={4}
                value={revisionFeedback}
                onChange={(e) => setRevisionFeedback(e.target.value)}
                placeholder="e.g. Please clarify your typical investment ticket size and add your verified LinkedIn profile URL."
                className="w-full p-3 border border-[#DCECF2] rounded-xl text-xs focus:outline-none focus:border-[#00A6E8] resize-none mb-4"
              />

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRevisionInvestor(null)}
                  className="px-4 py-2.5 sm:py-2 border border-[#DCECF2] text-xs font-bold rounded-xl text-center"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!revisionFeedback.trim()}
                  onClick={handleConfirmRequestRevision}
                  className="px-4 py-2.5 sm:py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl disabled:opacity-50 text-center"
                >
                  Send Revision Request
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Internal Admin Note Modal */}
      <AnimatePresence>
        {noteInvestor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setNoteInvestor(null)}
              className="fixed inset-0 bg-[#0A192A]/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-2xl border border-[#DCECF2] shadow-2xl w-full max-w-md p-4 sm:p-6 z-10"
            >
              <h3 className="text-lg font-bold text-[#0A192A] mb-2 font-heading">
                Internal Administrative Note
              </h3>
              <p className="text-xs text-[#5F7180] mb-4">
                Save an internal operational note for this investor profile. This is visible only to platform administrators.
              </p>

              <textarea
                rows={4}
                value={adminNoteText}
                onChange={(e) => setAdminNoteText(e.target.value)}
                placeholder="e.g. Spoke via WhatsApp; confirmed accreditation and active angel syndicate membership."
                className="w-full p-3 border border-[#DCECF2] rounded-xl text-xs focus:outline-none focus:border-[#00A6E8] resize-none mb-4"
              />

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setNoteInvestor(null)}
                  className="px-4 py-2.5 sm:py-2 border border-[#DCECF2] text-xs font-bold rounded-xl text-center"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!adminNoteText.trim()}
                  onClick={handleConfirmAddNote}
                  className="px-4 py-2.5 sm:py-2 bg-[#00A6E8] hover:bg-[#0093CE] text-white text-xs font-bold rounded-xl disabled:opacity-50 text-center"
                >
                  Save Admin Note
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingInvestor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingInvestor(null)}
              className="fixed inset-0 bg-[#0A192A]/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-2xl border border-[#DCECF2] shadow-2xl w-full max-w-xl p-4 sm:p-6 sm:p-8 z-10 my-4 sm:my-8 max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-lg sm:text-xl font-bold text-[#0A192A] mb-4 font-heading">
                Admin Edit: {editingInvestor.investorName}
              </h3>

              <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-[#0A192A] mb-1">Investor / Firm Name</label>
                  <input
                    type="text"
                    value={editingInvestor.investorName}
                    onChange={(e) =>
                      setEditingInvestor({ ...editingInvestor, investorName: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-[#DCECF2] rounded-xl"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#0A192A] mb-1">Investor Type</label>
                    <select
                      value={editingInvestor.investorType}
                      onChange={(e) =>
                        setEditingInvestor({
                          ...editingInvestor,
                          investorType: e.target.value as InvestorType,
                        })
                      }
                      className="w-full px-3 py-2 border border-[#DCECF2] rounded-xl"
                    >
                      {INVESTOR_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-[#0A192A] mb-1">Location</label>
                    <input
                      type="text"
                      value={editingInvestor.location}
                      onChange={(e) =>
                        setEditingInvestor({ ...editingInvestor, location: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-[#DCECF2] rounded-xl"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#0A192A] mb-1">Investment Range</label>
                    <select
                      value={editingInvestor.investmentRange}
                      onChange={(e) =>
                        setEditingInvestor({ ...editingInvestor, investmentRange: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-[#DCECF2] rounded-xl"
                    >
                      {INVESTOR_RANGES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-[#0A192A] mb-1">Typical Ticket Size</label>
                    <input
                      type="text"
                      value={editingInvestor.typicalInvestmentSize || ""}
                      onChange={(e) =>
                        setEditingInvestor({ ...editingInvestor, typicalInvestmentSize: e.target.value })
                      }
                      placeholder="e.g. ₹25L – ₹50L per deal"
                      className="w-full px-3 py-2 border border-[#DCECF2] rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#0A192A] mb-1">Preferred Stage</label>
                    <select
                      value={editingInvestor.investmentStage}
                      onChange={(e) =>
                        setEditingInvestor({ ...editingInvestor, investmentStage: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-[#DCECF2] rounded-xl"
                    >
                      {INVESTMENT_STAGES.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-[#0A192A] mb-1">Experience Level</label>
                    <input
                      type="text"
                      value={editingInvestor.investmentExperience || ""}
                      onChange={(e) =>
                        setEditingInvestor({ ...editingInvestor, investmentExperience: e.target.value })
                      }
                      placeholder="e.g. 5+ Years / Angel"
                      className="w-full px-3 py-2 border border-[#DCECF2] rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#0A192A] mb-1">Contact Email</label>
                    <input
                      type="email"
                      value={editingInvestor.contactEmail || ""}
                      onChange={(e) =>
                        setEditingInvestor({ ...editingInvestor, contactEmail: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-[#DCECF2] rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#0A192A] mb-1">
                      WhatsApp Number (Required for Approval)
                    </label>
                    <input
                      type="text"
                      value={editingInvestor.contactPhone || ""}
                      onChange={(e) =>
                        setEditingInvestor({ ...editingInvestor, contactPhone: e.target.value })
                      }
                      placeholder="+91 98765 43210"
                      className="w-full px-3 py-2 border border-[#DCECF2] rounded-xl"
                    />
                    {editingInvestor.contactPhone && (
                      <span className="text-[10px] mt-1 block">
                        {normalizeInvestorWhatsAppPhone(editingInvestor.contactPhone) ? (
                          <span className="text-emerald-700 font-semibold">
                            ✓ Normalized: {normalizeInvestorWhatsAppPhone(editingInvestor.contactPhone)}
                          </span>
                        ) : (
                          <span className="text-rose-600 font-semibold">
                            ⚠️ Invalid format. Must be international number with country code.
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#0A192A] mb-1">Preferred Locations / Geographies</label>
                  <input
                    type="text"
                    value={
                      Array.isArray(editingInvestor.preferredLocations)
                        ? editingInvestor.preferredLocations.join(", ")
                        : editingInvestor.preferredLocations || ""
                    }
                    onChange={(e) =>
                      setEditingInvestor({
                        ...editingInvestor,
                        preferredLocations: e.target.value
                          ? e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                          : [],
                      })
                    }
                    placeholder="e.g. Pan India, Bengaluru, Mumbai"
                    className="w-full px-3 py-2 border border-[#DCECF2] rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#0A192A] mb-1">Short Introduction / Thesis</label>
                  <textarea
                    rows={3}
                    value={editingInvestor.shortIntroduction}
                    onChange={(e) =>
                      setEditingInvestor({ ...editingInvestor, shortIntroduction: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-[#DCECF2] rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#0A192A] mb-1">Professional Background</label>
                  <textarea
                    rows={2}
                    value={editingInvestor.professionalBackground || ""}
                    onChange={(e) =>
                      setEditingInvestor({ ...editingInvestor, professionalBackground: e.target.value })
                    }
                    placeholder="Executive experience, industry background..."
                    className="w-full px-3 py-2 border border-[#DCECF2] rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#0A192A] mb-1">Previous Investments / Portfolio</label>
                  <textarea
                    rows={2}
                    value={editingInvestor.previousInvestments || ""}
                    onChange={(e) =>
                      setEditingInvestor({ ...editingInvestor, previousInvestments: e.target.value })
                    }
                    placeholder="Notable past investments or ventures..."
                    className="w-full px-3 py-2 border border-[#DCECF2] rounded-xl"
                  />
                </div>

                <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-3 border-t border-[#DCECF2]">
                  <button
                    type="button"
                    onClick={() => setEditingInvestor(null)}
                    className="px-4 py-2.5 sm:py-2 border border-[#DCECF2] text-xs font-bold rounded-xl text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 sm:py-2 bg-[#00A6E8] hover:bg-[#0093CE] text-white text-xs font-bold rounded-xl text-center shadow-sm"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
