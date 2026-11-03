"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  getAllVerifications,
  approveVerification,
  rejectVerification,
  getVerificationDocumentSignedUrl,
  VerificationRecord,
  VerificationStatus,
} from "@/lib/firebase/verifications";
import { useAuth } from "@/lib/firebase/auth-context";
import { AnimatePresence, motion } from "framer-motion";

export default function AdminVerificationsPage() {
  const { user } = useAuth();
  const [records, setRecords] = useState<VerificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<VerificationStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<VerificationRecord | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Reject modal state
  const [rejectingRecord, setRejectingRecord] = useState<VerificationRecord | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Viewing document state
  const [viewingDoc, setViewingDoc] = useState<string | null>(null);
  const [docError, setDocError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const res = await getAllVerifications();
    if (!res.error) {
      setRecords(res.records);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredRecords = useMemo(() => {
    return records.filter((item) => {
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.userName.toLowerCase().includes(q) ||
        item.userEmail.toLowerCase().includes(q) ||
        item.documentType.toLowerCase().includes(q) ||
        item.fileName.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [records, statusFilter, searchQuery]);

  const handleApprove = async (record: VerificationRecord) => {
    if (!user) return;
    const adminIdentifier = user.email || user.uid;
    setActionLoading(record.userId);
    const res = await approveVerification(record.userId, adminIdentifier);
    if (!res.error) {
      await loadData();
      if (selectedRecord?.userId === record.userId) {
        setSelectedRecord((prev) => (prev ? { ...prev, status: "approved" } : null));
      }
    } else {
      alert("Error approving verification: " + res.error);
    }
    setActionLoading(null);
  };

  const handleConfirmReject = async () => {
    if (!rejectingRecord || !rejectReason.trim() || !user) return;
    const adminIdentifier = user.email || user.uid;
    setActionLoading(rejectingRecord.userId);
    const res = await rejectVerification(rejectingRecord.userId, rejectReason, adminIdentifier);
    if (!res.error) {
      await loadData();
      if (selectedRecord?.userId === rejectingRecord.userId) {
        setSelectedRecord((prev) =>
          prev ? { ...prev, status: "rejected", rejectionReason: rejectReason.trim() } : null
        );
      }
      setRejectingRecord(null);
      setRejectReason("");
    } else {
      alert("Error rejecting verification: " + res.error);
    }
    setActionLoading(null);
  };

  const handleViewDocument = async (record: VerificationRecord) => {
    if (!record.storagePath) {
      alert("No document path associated with this record.");
      return;
    }
    setViewingDoc(record.id);
    setDocError(null);
    try {
      const res = await getVerificationDocumentSignedUrl(record.storagePath, record.userId);
      if (res.url) {
        window.open(res.url, "_blank", "noopener,noreferrer");
      } else {
        setDocError(res.error || "Unable to generate signed link for document.");
      }
    } catch {
      setDocError("Failed to open document. Please try again.");
    } finally {
      setViewingDoc(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-[#00A6E8] uppercase tracking-wider block mb-1">
            Trust & Compliance
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0A192A] font-heading">
            Verification Submissions
          </h1>
          <p className="text-xs sm:text-sm text-[#5F7180] mt-1">
            Review user-submitted compliance certificates and business documents stored securely in Supabase Storage.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="px-4 py-2 bg-white border border-[#DCECF2] hover:bg-slate-50 text-[#0A192A] rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 self-start sm:self-auto shadow-xs"
        >
          <span className={`material-symbols-outlined text-[16px] ${loading ? "animate-spin" : ""}`}>
            refresh
          </span>
          <span>Refresh</span>
        </button>
      </div>

      {docError && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{docError}</span>
        </div>
      )}

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-3.5 sm:p-4 rounded-2xl border border-[#DCECF2] shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: "all", label: "All" },
              { id: "pending", label: "Pending Review" },
              { id: "approved", label: "Approved" },
              { id: "rejected", label: "Rejected" },
            ] as const
          ).map((tab) => {
            const count = records.filter((r) => tab.id === "all" || r.status === tab.id).length;
            const active = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  active
                    ? "bg-[#0A192A] text-white shadow-xs"
                    : "text-[#5F7180] hover:bg-[#F6FAFF] hover:text-[#0A192A]"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                    active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-64">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[18px]">
            search
          </span>
          <input
            type="text"
            placeholder="Search submitter or file..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#0A192A] focus:outline-none focus:border-[#00A6E8] focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Submissions List */}
        <div className={`${selectedRecord ? "lg:col-span-7" : "lg:col-span-12"} transition-all`}>
          <div className="bg-white border border-[#DCECF2] rounded-2xl overflow-hidden shadow-xs">
            {loading ? (
              <div className="p-12 text-center text-slate-400">
                <div className="w-6 h-6 border-2 border-[#00A6E8] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs">Loading verification submissions...</p>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="p-12 text-center text-[#5F7180]">
                <span className="material-symbols-outlined text-[36px] text-slate-300 mb-2">
                  verified
                </span>
                <p className="text-sm font-bold text-[#0A192A]">No submissions found</p>
                <p className="text-xs text-slate-400 mt-1">
                  {searchQuery ? "No matches for your query." : "No verification documents submitted in this view."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredRecords.map((item) => {
                  const isSelected = selectedRecord?.userId === item.userId;
                  const isActioning = actionLoading === item.userId;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedRecord(item)}
                      className={`p-4 sm:p-5 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isSelected ? "bg-[#F6FAFF] border-l-4 border-l-[#00A6E8]" : "hover:bg-slate-50/60"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                              item.status === "approved"
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                : item.status === "rejected"
                                ? "bg-rose-50 text-rose-800 border border-rose-200"
                                : "bg-amber-50 text-amber-800 border border-amber-200"
                            }`}
                          >
                            {item.status}
                          </span>
                          <span className="text-xs font-bold text-[#00A6E8]">{item.documentType}</span>
                          <span className="text-xs text-slate-300">•</span>
                          <span className="text-xs font-semibold text-slate-600 capitalize">{item.role}</span>
                        </div>

                        <h3 className="text-sm font-bold text-[#0A192A]">{item.userName}</h3>
                        <p className="text-xs text-[#5F7180] flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[14px]">mail</span>
                          <span>{item.userEmail}</span>
                          <span className="text-slate-300">•</span>
                          <span className="material-symbols-outlined text-[14px]">attach_file</span>
                          <span className="truncate max-w-[200px]">{item.fileName}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDocument(item);
                          }}
                          disabled={viewingDoc === item.id}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[14px]">
                            {viewingDoc === item.id ? "sync" : "visibility"}
                          </span>
                          <span>View Doc</span>
                        </button>

                        {item.status === "pending" && (
                          <>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleApprove(item);
                              }}
                              disabled={isActioning}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <span className="material-symbols-outlined text-[14px]">check</span>
                              <span>Approve</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setRejectingRecord(item);
                              }}
                              disabled={isActioning}
                              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <span className="material-symbols-outlined text-[14px]">close</span>
                              <span>Reject</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Selected Record Detail Panel */}
        {selectedRecord && (
          <div className="lg:col-span-5">
            <div className="bg-white border border-[#DCECF2] rounded-2xl p-5 sm:p-6 shadow-sm sticky top-20 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#DCECF2]">
                <div>
                  <h3 className="text-base font-bold text-[#0A192A]">Submission Detail</h3>
                  <p className="text-[11px] text-[#5F7180]">Audit & Document Inspection</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-[#0A192A] hover:bg-slate-100 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <div className="space-y-4 text-xs">
                {/* User Info */}
                <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 border border-slate-100">
                  <span className="font-extrabold uppercase text-[10px] text-[#5F7180] block">User Profile</span>
                  <div className="font-bold text-sm text-[#0A192A]">{selectedRecord.userName}</div>
                  <div className="text-[#5F7180]">{selectedRecord.userEmail}</div>
                  <div className="text-slate-500 font-semibold uppercase text-[10px]">Role: {selectedRecord.role}</div>
                </div>

                {/* Document Info */}
                <div className="p-3.5 bg-[#F6FAFF] border border-[#DCECF2] rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[24px] text-[#00A6E8]">
                      description
                    </span>
                    <div>
                      <strong className="block text-xs text-[#0A192A] font-bold">
                        {selectedRecord.documentType}
                      </strong>
                      <span className="text-[11px] text-[#5F7180] truncate max-w-[180px] block">
                        {selectedRecord.fileName}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleViewDocument(selectedRecord)}
                    disabled={viewingDoc === selectedRecord.id}
                    className="px-3 py-1.5 bg-[#00A6E8] hover:bg-[#0093CE] text-white rounded-lg font-bold text-xs flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      {viewingDoc === selectedRecord.id ? "sync" : "open_in_new"}
                    </span>
                    <span>View</span>
                  </button>
                </div>

                {/* Status & Rejection Note */}
                {selectedRecord.rejectionReason && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 space-y-1">
                    <strong className="block text-[11px] uppercase font-bold text-rose-900">Rejection Reason:</strong>
                    <p className="text-xs leading-relaxed">{selectedRecord.rejectionReason}</p>
                  </div>
                )}

                {/* Audit Trail */}
                <div>
                  <strong className="block text-[#0A192A] text-xs mb-2">Audit History:</strong>
                  {selectedRecord.auditTrail && selectedRecord.auditTrail.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {selectedRecord.auditTrail.map((item, idx) => (
                        <div key={idx} className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-[11px] space-y-0.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[#0A192A] capitalize">{item.action}</span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(item.timestamp).toLocaleDateString()} {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <p className="text-slate-600">{item.notes}</p>
                          <span className="text-[10px] text-slate-400 block">By: {item.performedBy}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 text-xs italic">No prior audit logs.</p>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleApprove(selectedRecord)}
                    disabled={actionLoading === selectedRecord.userId}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[16px]">check</span>
                    <span>Approve & Verify</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRejectingRecord(selectedRecord)}
                    disabled={actionLoading === selectedRecord.userId}
                    className="flex-1 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Reject Reason Modal */}
      <AnimatePresence>
        {rejectingRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A192A]/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white border border-[#DCECF2] rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[22px]">assignment_late</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0A192A]">Reject Document</h3>
                  <p className="text-xs text-[#5F7180]">{rejectingRecord.userName} ({rejectingRecord.documentType})</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#0A192A]">
                  Mandatory Rejection Feedback *
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Explain why this document was rejected (e.g. expired certificate, unreadable scan, mismatch in name)..."
                  rows={4}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-[#0A192A] focus:outline-none focus:border-rose-500 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setRejectingRecord(null);
                    setRejectReason("");
                  }}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReject}
                  disabled={!rejectReason.trim() || actionLoading === rejectingRecord.userId}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold disabled:opacity-50 flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">send</span>
                  <span>Confirm Rejection</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

