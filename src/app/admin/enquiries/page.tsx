"use client";

import React, { useState, useEffect } from "react";
import { auth } from "@/lib/firebase/client";
import {
  getAllOpportunityEnquiries,
  getAllContactInquiries,
  updateEnquiryStatus,
  deleteOpportunityEnquiry,
  deleteContactInquiry,
  OpportunityEnquiry,
  ContactSubmission,
  EnquiryStatus,
} from "@/lib/firebase/firestore";

type EnquiryTab = "opportunity" | "contact";

export default function AdminEnquiriesPage() {
  const [activeTab, setActiveTab] = useState<EnquiryTab>("opportunity");
  const [oppEnquiries, setOppEnquiries] = useState<OpportunityEnquiry[]>([]);
  const [contactInquiries, setContactInquiries] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Single Enquiry Deletion State
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{
    id: string;
    type: "opportunity" | "contact";
    title: string;
    sender: string;
  } | null>(null);

  // Bulk Clear Modal & Operation State
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Filter States for Opportunity Enquiries
  const [selectedOpportunity, setSelectedOpportunity] = useState<string>("all");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [selectedOwner, setSelectedOwner] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [dateSort, setDateSort] = useState<"newest" | "oldest">("newest");

  const loadEnquiries = async () => {
    setLoading(true);
    const oppRes = await getAllOpportunityEnquiries();
    if (!oppRes.error) {
      setOppEnquiries(oppRes.enquiries);
    }
    const contactRes = await getAllContactInquiries();
    if (!contactRes.error) {
      setContactInquiries(contactRes.inquiries);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadEnquiries();
  }, []);

  const handleStatusChange = async (
    collection: "opportunity_enquiries" | "contact_inquiries",
    id?: string,
    newStatus?: EnquiryStatus
  ) => {
    if (!id || !newStatus) return;
    setUpdatingId(id);
    await updateEnquiryStatus(collection, id, newStatus);
    setUpdatingId(null);
    await loadEnquiries();
  };

  const handleDeleteSingleEnquiry = async () => {
    if (!deleteConfirmTarget) return;
    const { id, type } = deleteConfirmTarget;
    setDeletingId(id);
    setNotification(null);
    try {
      let deleted = false;
      const idToken = await auth.currentUser?.getIdToken();

      // Attempt 1: Server-side Firebase Admin API
      if (idToken) {
        try {
          const res = await fetch("/api/admin/enquiries/delete", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({ id, type }),
          });
          const data = await res.json();
          if (res.ok && data.success) {
            deleted = true;
          }
        } catch (fetchErr) {
          console.warn("[handleDeleteSingleEnquiry] API error, falling back to client SDK:", fetchErr);
        }
      }

      // Attempt 2: Client SDK direct deletion fallback
      if (!deleted) {
        if (type === "opportunity") {
          const res = await deleteOpportunityEnquiry(id);
          if (res.success) {
            deleted = true;
          } else {
            throw new Error(res.error || "Failed to delete opportunity enquiry");
          }
        } else {
          const res = await deleteContactInquiry(id);
          if (res.success) {
            deleted = true;
          } else {
            throw new Error(res.error || "Failed to delete general contact message");
          }
        }
      }

      if (deleted) {
        setNotification({
          type: "success",
          message: `Successfully deleted ${
            type === "opportunity" ? "opportunity enquiry" : "general contact message"
          }.`,
        });
        // Optimistic UI removal
        if (type === "opportunity") {
          setOppEnquiries((prev) => prev.filter((e) => e.id !== id));
        } else {
          setContactInquiries((prev) => prev.filter((c) => c.id !== id));
        }
        setDeleteConfirmTarget(null);
      }
    } catch (err: unknown) {
      const error = err as Error;
      setNotification({
        type: "error",
        message: error.message || "Failed to delete enquiry.",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAllOpportunityEnquiries = async () => {
    setClearing(true);
    setNotification(null);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        setNotification({
          type: "error",
          message: "Authentication required. Please re-sign in.",
        });
        setClearing(false);
        return;
      }

      const res = await fetch("/api/admin/enquiries/clear-all", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setNotification({
          type: "success",
          message:
            data.totalDeleted > 0
              ? `Successfully cleared all ${data.totalDeleted} opportunity enquiries. The inbox is now clean for launch.`
              : "The opportunity enquiry inbox is already clean.",
        });
        setShowClearModal(false);
        setConfirmPhrase("");
        await loadEnquiries();
      } else {
        setNotification({
          type: "error",
          message: data.error || "Failed to clear opportunity enquiries.",
        });
      }
    } catch (err: unknown) {
      const error = err as Error;
      setNotification({
        type: "error",
        message: error.message || "Network error while clearing enquiries.",
      });
    } finally {
      setClearing(false);
    }
  };

  const formatDate = (createdAt: unknown) => {
    if (!createdAt) return "—";
    if (typeof createdAt === "object" && "seconds" in (createdAt as { seconds: number })) {
      return new Date((createdAt as { seconds: number }).seconds * 1000).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
    return "—";
  };

  // Derive unique options for filters
  const uniqueOpportunities = Array.from(
    new Set(oppEnquiries.map((e) => e.opportunityTitle).filter(Boolean))
  );

  const uniqueOwners = Array.from(
    new Set(
      oppEnquiries
        .map((e) => e.opportunityOwnerName || e.opportunityOwnerId || "Platform")
        .filter(Boolean)
    )
  );

  const filteredOppEnquiries = oppEnquiries
    .filter((enq) => {
      if (selectedOpportunity !== "all" && enq.opportunityTitle !== selectedOpportunity) {
        return false;
      }
      if (selectedRole !== "all") {
        const enqRole = (enq.senderRole || enq.role || "").toLowerCase();
        if (enqRole !== selectedRole.toLowerCase()) {
          return false;
        }
      }
      if (selectedOwner !== "all") {
        const ownerVal = enq.opportunityOwnerName || enq.opportunityOwnerId || "Platform";
        if (ownerVal !== selectedOwner) {
          return false;
        }
      }
      if (selectedStatus !== "all") {
        const enqStatus = (enq.status || "new").toLowerCase();
        if (enqStatus !== selectedStatus.toLowerCase()) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => {
      const timeA = (a.createdAt as { seconds?: number })?.seconds || 0;
      const timeB = (b.createdAt as { seconds?: number })?.seconds || 0;
      return dateSort === "newest" ? timeB - timeA : timeA - timeB;
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-[#00A6E8] uppercase tracking-wider block mb-1">
            Inbound Communications
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0A192A] tracking-tight font-heading">
            Enquiry Management
          </h1>
          <p className="text-xs sm:text-sm text-[#5F7180] mt-1">
            Monitor decentralized investor-to-entrepreneur interest routing and general platform contacts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto">
          {activeTab === "opportunity" && (
            <button
              type="button"
              onClick={() => {
                setNotification(null);
                setShowClearModal(true);
              }}
              disabled={clearing || oppEnquiries.length === 0}
              className="px-4 py-2 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              title={
                oppEnquiries.length === 0
                  ? "Opportunity inbox is already clean"
                  : "Permanently clear all opportunity enquiries"
              }
            >
              <span className="material-symbols-outlined text-[16px] text-rose-600">
                delete_sweep
              </span>
              <span>Clear All Opportunity Enquiries</span>
            </button>
          )}

          <button
            type="button"
            onClick={loadEnquiries}
            className="px-4 py-2 bg-white border border-[#DCECF2] hover:bg-slate-50 text-[#0A192A] text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px] text-[#00A6E8]">refresh</span>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {notification && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center justify-between gap-3 ${
            notification.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">
              {notification.type === "success" ? "check_circle" : "error"}
            </span>
            <span className="font-semibold">{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-white border border-[#DCECF2] rounded-2xl overflow-x-auto no-scrollbar shadow-sm">
        <button
          type="button"
          onClick={() => setActiveTab("opportunity")}
          className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === "opportunity"
              ? "bg-[#00A6E8] text-white shadow-sm"
              : "text-[#5F7180] hover:text-[#0A192A] hover:bg-[#F6FAFF]"
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">handshake</span>
          <span>Opportunity Enquiries ({oppEnquiries.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("contact")}
          className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === "contact"
              ? "bg-[#00A6E8] text-white shadow-sm"
              : "text-[#5F7180] hover:text-[#0A192A] hover:bg-[#F6FAFF]"
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">mail</span>
          <span>General Contact ({contactInquiries.length})</span>
        </button>
      </div>

      {/* Multi-Criteria Filters for Opportunity Enquiries */}
      {activeTab === "opportunity" && !loading && oppEnquiries.length > 0 && (
        <div className="bg-white border border-[#DCECF2] rounded-2xl p-3.5 sm:p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#0A192A] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-[#00A6E8]">tune</span>
              <span>Filter Enquiries ({filteredOppEnquiries.length} shown)</span>
            </span>

            {(selectedOpportunity !== "all" ||
              selectedRole !== "all" ||
              selectedOwner !== "all" ||
              selectedStatus !== "all" ||
              dateSort !== "newest") && (
              <button
                type="button"
                onClick={() => {
                  setSelectedOpportunity("all");
                  setSelectedRole("all");
                  setSelectedOwner("all");
                  setSelectedStatus("all");
                  setDateSort("newest");
                }}
                className="text-xs text-[#00A6E8] hover:underline font-semibold"
              >
                Reset Filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Filter by Opportunity */}
            <div>
              <label className="block text-[11px] font-bold text-[#5F7180] mb-1">Opportunity</label>
              <select
                value={selectedOpportunity}
                onChange={(e) => setSelectedOpportunity(e.target.value)}
                className="w-full text-xs font-medium border border-[#DCECF2] rounded-xl px-2.5 py-2 bg-white text-[#0A192A] focus:outline-none focus:border-[#00A6E8]"
              >
                <option value="all">All Opportunities</option>
                {uniqueOpportunities.map((op, idx) => (
                  <option key={idx} value={op}>
                    {op}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Sender Role */}
            <div>
              <label className="block text-[11px] font-bold text-[#5F7180] mb-1">Sender Role</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full text-xs font-medium border border-[#DCECF2] rounded-xl px-2.5 py-2 bg-white text-[#0A192A] focus:outline-none focus:border-[#00A6E8]"
              >
                <option value="all">All Roles</option>
                <option value="investor">Investor</option>
                <option value="entrepreneur">Entrepreneur</option>
              </select>
            </div>

            {/* Filter by Entrepreneur / Owner */}
            <div>
              <label className="block text-[11px] font-bold text-[#5F7180] mb-1">Opportunity Owner</label>
              <select
                value={selectedOwner}
                onChange={(e) => setSelectedOwner(e.target.value)}
                className="w-full text-xs font-medium border border-[#DCECF2] rounded-xl px-2.5 py-2 bg-white text-[#0A192A] focus:outline-none focus:border-[#00A6E8]"
              >
                <option value="all">All Owners</option>
                {uniqueOwners.map((own, idx) => (
                  <option key={idx} value={own}>
                    {own}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Status */}
            <div>
              <label className="block text-[11px] font-bold text-[#5F7180] mb-1">Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full text-xs font-medium border border-[#DCECF2] rounded-xl px-2.5 py-2 bg-white text-[#0A192A] focus:outline-none focus:border-[#00A6E8]"
              >
                <option value="all">All Statuses</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="in discussion">In Discussion</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            {/* Sort by Date */}
            <div>
              <label className="block text-[11px] font-bold text-[#5F7180] mb-1">Date Order</label>
              <select
                value={dateSort}
                onChange={(e) => setDateSort(e.target.value as "newest" | "oldest")}
                className="w-full text-xs font-medium border border-[#DCECF2] rounded-xl px-2.5 py-2 bg-white text-[#0A192A] focus:outline-none focus:border-[#00A6E8]"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Enquiries Container */}
      <div className="bg-white border border-[#DCECF2] rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="w-8 h-8 border-3 border-[#00A6E8] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-semibold">Loading submissions...</p>
          </div>
        ) : activeTab === "opportunity" ? (
          filteredOppEnquiries.length === 0 ? (
            <div className="p-12 text-center text-[#5F7180]">
              <span className="material-symbols-outlined text-[36px] text-slate-300 mb-2">inbox</span>
              <p className="text-sm font-bold text-[#0A192A]">
                {oppEnquiries.length === 0 ? "No opportunity enquiries recorded yet." : "No enquiries match your filter criteria."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[750px]">
                <thead className="bg-[#F4FAFD] border-b border-[#DCECF2] text-[#5F7180] uppercase tracking-wider font-extrabold text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4 sm:px-6">Opportunity &amp; Owner</th>
                    <th className="py-3.5 px-4">Sender</th>
                    <th className="py-3.5 px-4">Contact Info</th>
                    <th className="py-3.5 px-4">Capacity / Location</th>
                    <th className="py-3.5 px-4">Message</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4 sm:px-6">Status / Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[#0A192A]">
                  {filteredOppEnquiries.map((enq) => {
                    const normStatus = (enq.status || "New").toLowerCase();
                    const statusVal =
                      normStatus === "contacted"
                        ? "Contacted"
                        : normStatus === "in discussion"
                        ? "In Discussion"
                        : normStatus === "closed"
                        ? "Closed"
                        : "New";

                    let statusClass = "bg-blue-50 text-blue-700 border-blue-200";
                    if (statusVal === "Contacted") statusClass = "bg-amber-50 text-amber-700 border-amber-200";
                    if (statusVal === "In Discussion") statusClass = "bg-purple-50 text-purple-700 border-purple-200";
                    if (statusVal === "Closed") statusClass = "bg-emerald-50 text-emerald-700 border-emerald-200";

                    return (
                      <tr key={enq.id} className="hover:bg-[#F6FAFF]/60 transition-colors">
                        <td className="py-4 px-4 sm:px-6 font-bold max-w-xs">
                          <span className="text-sm text-[#0A192A] block">{enq.opportunityTitle}</span>
                          <span className="text-[11px] text-[#00658F] font-medium block mt-0.5">
                            Owner: {enq.opportunityOwnerName || enq.opportunityOwnerId || "Platform Desk"}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="font-bold text-[#0A192A] block">{enq.senderName || enq.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-700 font-semibold rounded inline-block mt-0.5">
                            {enq.senderRole || enq.role || "Investor"}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-[#5F7180]">
                          <div className="font-medium text-[#0A192A]">{enq.senderEmail || enq.email}</div>
                          <div>{enq.senderPhone || enq.phone}</div>
                        </td>
                        <td className="py-4 px-4 text-[#5F7180]">
                          <div className="font-semibold text-[#00658F]">
                            {enq.investmentRange || enq.investmentCapacity || "Flexible"}
                          </div>
                          <div className="text-[11px]">{enq.senderLocation || enq.senderType || "India"}</div>
                        </td>
                        <td className="py-4 px-4 max-w-xs text-[#5F7180]">
                          <p className="line-clamp-2 leading-relaxed">{enq.message}</p>
                        </td>
                        <td className="py-4 px-4 text-[#5F7180] whitespace-nowrap">
                          {formatDate(enq.createdAt)}
                        </td>
                        <td className="py-4 px-4 sm:px-6">
                          <div className="flex items-center gap-2">
                            <select
                              value={statusVal}
                              disabled={updatingId === enq.id || deletingId === enq.id}
                              onChange={(e) =>
                                handleStatusChange(
                                  "opportunity_enquiries",
                                  enq.id,
                                  e.target.value as EnquiryStatus
                                )
                              }
                              className={`px-2.5 py-1.5 text-xs font-bold rounded-xl border focus:outline-none cursor-pointer ${statusClass}`}
                            >
                              <option value="New">New</option>
                              <option value="Contacted">Contacted</option>
                              <option value="In Discussion">In Discussion</option>
                              <option value="Closed">Closed</option>
                            </select>

                            <button
                              type="button"
                              disabled={updatingId === enq.id || deletingId === enq.id}
                              onClick={() =>
                                setDeleteConfirmTarget({
                                  id: enq.id!,
                                  type: "opportunity",
                                  title: enq.opportunityTitle || "Opportunity Enquiry",
                                  sender: enq.senderName || enq.name || "Sender",
                                })
                              }
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer disabled:opacity-40"
                              title="Delete this opportunity enquiry"
                            >
                              {deletingId === enq.id ? (
                                <div className="w-4 h-4 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : (
          contactInquiries.length === 0 ? (
            <div className="p-12 text-center text-[#5F7180]">
              <span className="material-symbols-outlined text-[36px] text-slate-300 mb-2">inbox</span>
              <p className="text-sm font-bold text-[#0A192A]">No general contact messages recorded yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[750px]">
                <thead className="bg-[#F4FAFD] border-b border-[#DCECF2] text-[#5F7180] uppercase tracking-wider font-extrabold text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4 sm:px-6">Sender</th>
                    <th className="py-3.5 px-4">Contact</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4">Subject</th>
                    <th className="py-3.5 px-4">Message</th>
                    <th className="py-3.5 px-4 sm:px-6">Status / Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[#0A192A]">
                  {contactInquiries.map((ci) => {
                    const status = ci.status || "new";
                    return (
                      <tr key={ci.id} className="hover:bg-[#F6FAFF]/60 transition-colors">
                        <td className="py-4 px-4 sm:px-6 font-bold">{ci.fullName}</td>
                        <td className="py-4 px-4 text-[#5F7180]">
                          <div>{ci.email}</div>
                          <div>{ci.phone}</div>
                        </td>
                        <td className="py-4 px-4 uppercase text-[11px] font-semibold text-[#00658F]">
                          {ci.userRole}
                        </td>
                        <td className="py-4 px-4 font-semibold text-[#0A192A]">{ci.subject}</td>
                        <td className="py-4 px-4 max-w-xs text-[#5F7180]">
                          <p className="line-clamp-2 leading-relaxed">{ci.message}</p>
                        </td>
                        <td className="py-4 px-4 sm:px-6">
                          <div className="flex items-center gap-2">
                            <select
                              value={status}
                              disabled={updatingId === ci.id || deletingId === ci.id}
                              onChange={(e) =>
                                handleStatusChange(
                                  "contact_inquiries",
                                  ci.id,
                                  e.target.value as "new" | "contacted" | "closed"
                                )
                              }
                              className={`px-2.5 py-1 text-xs font-bold rounded-lg border focus:outline-none cursor-pointer ${
                                status === "new"
                                  ? "bg-amber-50 text-amber-800 border-amber-200"
                                  : status === "contacted"
                                  ? "bg-sky-50 text-sky-800 border-sky-200"
                                  : "bg-emerald-50 text-emerald-800 border-emerald-200"
                              }`}
                            >
                              <option value="new">New</option>
                              <option value="contacted">Contacted</option>
                              <option value="closed">Closed</option>
                            </select>

                            <button
                              type="button"
                              disabled={updatingId === ci.id || deletingId === ci.id}
                              onClick={() =>
                                setDeleteConfirmTarget({
                                  id: ci.id!,
                                  type: "contact",
                                  title: ci.subject || "General Contact Enquiry",
                                  sender: ci.fullName || ci.email || "Sender",
                                })
                              }
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer disabled:opacity-40"
                              title="Delete this contact message"
                            >
                              {deletingId === ci.id ? (
                                <div className="w-4 h-4 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* Clear All Opportunity Enquiries Confirmation Modal */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl border border-[#DCECF2] max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                <span className="material-symbols-outlined text-[28px]">delete_forever</span>
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-[#0A192A] font-heading">
                  Clear All Opportunity Enquiries
                </h3>
                <p className="text-xs text-[#5F7180]">Pre-Launch Bulk Inbox Purge</p>
              </div>
            </div>

            <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-4 text-xs space-y-2 text-rose-900">
              <p className="font-bold flex items-center gap-1.5 text-rose-700">
                <span className="material-symbols-outlined text-[16px]">warning</span>
                <span>Permanent Deletion Warning</span>
              </p>
              <p>
                This action will permanently delete all{" "}
                <strong>{oppEnquiries.length}</strong> opportunity enquiry records from the{" "}
                <code className="bg-rose-100 px-1 py-0.5 rounded font-mono">
                  opportunity_enquiries
                </code>{" "}
                Firestore collection.
              </p>
              <div className="pt-2 border-t border-rose-200/80 text-[11px] text-[#5F7180] space-y-1">
                <p className="font-semibold text-slate-700">Strict Data Protection Guarantee:</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>Actual business opportunities and listings remain completely intact.</li>
                  <li>Investor profiles and authentication accounts remain untouched.</li>
                  <li>
                    Investor enquiries (<code>investor_enquiries</code>) are not affected.
                  </li>
                  <li>Storage files, pitch decks, and KYC verifications remain untouched.</li>
                </ul>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-[#0A192A] block">
                To confirm permanent deletion, type{" "}
                <span className="font-mono text-rose-600 font-extrabold">DELETE</span> below:
              </label>
              <input
                type="text"
                value={confirmPhrase}
                onChange={(e) => setConfirmPhrase(e.target.value)}
                placeholder="DELETE"
                disabled={clearing}
                className="w-full px-4 py-2.5 bg-slate-50 border border-[#DCECF2] rounded-xl text-sm font-semibold text-[#0A192A] focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 uppercase tracking-wider font-mono disabled:opacity-50"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowClearModal(false);
                  setConfirmPhrase("");
                }}
                disabled={clearing}
                className="px-5 py-2.5 bg-white border border-[#DCECF2] hover:bg-slate-50 text-[#5F7180] text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearAllOpportunityEnquiries}
                disabled={clearing || confirmPhrase !== "DELETE"}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-2 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {clearing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Clearing Inboxes...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
                    <span>Permanently Delete All ({oppEnquiries.length})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single Enquiry Deletion Confirmation Modal */}
      {deleteConfirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl border border-[#DCECF2] max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                <span className="material-symbols-outlined text-[24px]">delete</span>
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-[#0A192A] font-heading">
                  Delete Enquiry
                </h3>
                <p className="text-xs text-[#5F7180]">
                  Permanently remove this {deleteConfirmTarget.type === "opportunity" ? "opportunity enquiry" : "contact message"}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-[#DCECF2] rounded-2xl p-4 text-xs space-y-2.5">
              <div>
                <span className="text-[10px] font-bold text-[#5F7180] uppercase tracking-wider block mb-0.5">
                  Sender
                </span>
                <span className="font-bold text-[#0A192A] text-sm block">
                  {deleteConfirmTarget.sender}
                </span>
              </div>
              <div className="pt-2 border-t border-[#DCECF2]/70">
                <span className="text-[10px] font-bold text-[#5F7180] uppercase tracking-wider block mb-0.5">
                  {deleteConfirmTarget.type === "opportunity" ? "Opportunity" : "Subject"}
                </span>
                <span className="font-semibold text-[#00658F] block">
                  {deleteConfirmTarget.title}
                </span>
              </div>
            </div>

            <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3 font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] shrink-0 text-rose-600">warning</span>
              <span>This enquiry will be permanently deleted from the database. This action cannot be undone.</span>
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmTarget(null)}
                disabled={Boolean(deletingId)}
                className="px-4 py-2 bg-white border border-[#DCECF2] hover:bg-slate-50 text-[#5F7180] text-xs font-bold rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSingleEnquiry}
                disabled={Boolean(deletingId)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {deletingId ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                    <span>Delete Record</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
