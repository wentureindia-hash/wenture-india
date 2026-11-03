"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useAuth } from "@/lib/firebase/auth-context";
import { updateUserProfile, resetUserPassword, deleteUserAccount } from "@/lib/firebase/auth";
import {
  getEnquiriesForEntrepreneur,
  getEnquiriesSentByUser,
  updateEnquiryStatus,
  deleteOpportunityEnquiry,
  OpportunityEnquiry,
  EnquiryStatus,
} from "@/lib/firebase/firestore";
import { formatWhatsAppNumber } from "@/lib/constants/opportunities";
import { motion } from "framer-motion";
import {
  InvestorContactModal,
  formatEnquiryWhatsAppText,
  formatEnquiryEmailSubject,
  formatEnquiryEmailBody,
} from "@/components/enquiries/investor-contact-modal";
import { VerificationTrustSection } from "@/components/profile/verification-trust-section";

export default function ProfilePage() {
  const router = useRouter();
  const {
    user,
    profile,
    role,
    roles,
    activeRole,
    switchActiveRole,
    addRole,
    isEntrepreneur,
    isInvestor,
    isAdmin,
    loading,
    isAuthenticated,
    signOut,
    refreshProfile,
  } = useAuth();

  // Multi-Role Management State
  const [showAddRoleModal, setShowAddRoleModal] = useState<"investor" | "entrepreneur" | null>(null);
  const [newRoleCompany, setNewRoleCompany] = useState("");
  const [newRoleSector, setNewRoleSector] = useState("");
  const [addingRole, setAddingRole] = useState(false);
  const [switchingRole, setSwitchingRole] = useState(false);
  const [roleActionMsg, setRoleActionMsg] = useState<string | null>(null);

  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [sector, setSector] = useState("");
  const [location, setLocation] = useState("");

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [resettingPassword, setResettingPassword] = useState(false);

  // Account Deletion States
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Received Enquiries for Entrepreneur's Opportunities
  const [enquiries, setEnquiries] = useState<OpportunityEnquiry[]>([]);
  const [loadingEnquiries, setLoadingEnquiries] = useState(false);
  const [updatingEnquiryId, setUpdatingEnquiryId] = useState<string | null>(null);
  const [selectedContactEnquiry, setSelectedContactEnquiry] = useState<OpportunityEnquiry | null>(null);

  // Sent Enquiries / Expressed Interest History for Investor
  const [sentEnquiries, setSentEnquiries] = useState<OpportunityEnquiry[]>([]);
  const [loadingSentEnquiries, setLoadingSentEnquiries] = useState(false);
  const [deletingEnquiry, setDeletingEnquiry] = useState<OpportunityEnquiry | null>(null);
  const [isDeletingEnquiry, setIsDeletingEnquiry] = useState(false);
  const [deleteEnquiryError, setDeleteEnquiryError] = useState<string | null>(null);

  const handleConfirmDeleteEnquiry = async () => {
    if (!deletingEnquiry?.id) return;
    setIsDeletingEnquiry(true);
    setDeleteEnquiryError(null);
    const res = await deleteOpportunityEnquiry(deletingEnquiry.id);
    if (res.success) {
      setSentEnquiries((prev) => prev.filter((item) => item.id !== deletingEnquiry.id));
      setDeletingEnquiry(null);
    } else {
      setDeleteEnquiryError(res.error || "Failed to delete enquiry");
    }
    setIsDeletingEnquiry(false);
  };

  const loadEnquiries = useCallback(async () => {
    if (!user?.uid) return;
    setLoadingEnquiries(true);
    const res = await getEnquiriesForEntrepreneur(user.uid, user.email);
    if (!res.error) {
      setEnquiries(res.enquiries);
    }
    setLoadingEnquiries(false);
  }, [user?.uid, user?.email]);

  const loadSentEnquiries = useCallback(async () => {
    if (!user?.uid) return;
    setLoadingSentEnquiries(true);
    const res = await getEnquiriesSentByUser(user.uid);
    if (!res.error) {
      setSentEnquiries(res.enquiries);
    }
    setLoadingSentEnquiries(false);
  }, [user?.uid]);

  useEffect(() => {
    if (!loading && isAuthenticated && user?.uid && (isEntrepreneur || role === "entrepreneur" || isAdmin)) {
      loadEnquiries();
    }
  }, [loading, isAuthenticated, user?.uid, isEntrepreneur, role, isAdmin, loadEnquiries]);

  useEffect(() => {
    if (!loading && isAuthenticated && user?.uid && (isInvestor || role === "investor" || isAdmin)) {
      loadSentEnquiries();
    }
  }, [loading, isAuthenticated, user?.uid, isInvestor, role, isAdmin, loadSentEnquiries]);

  const handleEnquiryStatusUpdate = async (enquiryId?: string, newStatus?: EnquiryStatus) => {
    if (!enquiryId || !newStatus) return;
    setUpdatingEnquiryId(enquiryId);
    await updateEnquiryStatus("opportunity_enquiries", enquiryId, newStatus);
    setEnquiries((prev) =>
      prev.map((item) => (item.id === enquiryId ? { ...item, status: newStatus } : item))
    );
    setUpdatingEnquiryId(null);
  };

  const formatEnquiryDate = (createdAt: unknown) => {
    if (!createdAt) return "Recent";
    if (typeof createdAt === "object" && "seconds" in (createdAt as { seconds: number })) {
      return new Date((createdAt as { seconds: number }).seconds * 1000).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
    return "Recent";
  };

  // Sync profile fields when loaded
  useEffect(() => {
    if (profile) {
      setName(profile.fullName || profile.name || "");
      setPhone(profile.phone || "");
      setCompanyName(profile.companyName || "");
      setSector(profile.sector || "");
      setLocation(profile.location || "");
    }
  }, [profile]);

  // Protect route
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [loading, isAuthenticated, router]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const trimmedLocation = location.trim();

    if (!trimmedName || trimmedName.length < 2) {
      setErrorMsg("Please enter a valid full name (at least 2 characters).");
      return;
    }

    if (trimmedPhone && !/^[+0-9\s-]{8,20}$/.test(trimmedPhone)) {
      setErrorMsg("Please enter a valid phone number.");
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);
    setSaving(true);

    const res = await updateUserProfile({
      fullName: trimmedName,
      name: trimmedName,
      phone: trimmedPhone,
      companyName: companyName.trim(),
      sector: sector.trim(),
      location: trimmedLocation,
    });

    setSaving(false);

    if (res.error) {
      setErrorMsg(res.error);
    } else {
      await refreshProfile();
      setSuccessMsg("Profile updated successfully.");
      setIsEditing(false);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  const handleSwitchRole = async (targetRole: "investor" | "entrepreneur") => {
    setSwitchingRole(true);
    setErrorMsg(null);
    const res = await switchActiveRole(targetRole);
    setSwitchingRole(false);
    if (res.error) {
      setErrorMsg(res.error);
    } else {
      setSuccessMsg(`Switched active view to ${targetRole.toUpperCase()}.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const handleAddRoleConfirm = async () => {
    if (!showAddRoleModal) return;
    setAddingRole(true);
    setRoleActionMsg(null);
    const targetRole = showAddRoleModal;
    const res = await addRole(targetRole, {
      companyName: newRoleCompany.trim() || undefined,
      sector: newRoleSector.trim() || undefined,
    });
    setAddingRole(false);
    if (res.error) {
      setRoleActionMsg(res.error);
    } else {
      setSuccessMsg(`Successfully added ${targetRole.toUpperCase()} role to your account.`);
      setShowAddRoleModal(null);
      setNewRoleCompany("");
      setNewRoleSector("");
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  const handleChangePassword = async () => {
    if (!user || !user.email) return;
    setPasswordMsg(null);
    setResettingPassword(true);

    const res = await resetUserPassword(user.email);
    setResettingPassword(false);

    if (res.error) {
      setPasswordMsg(`Error: ${res.error}`);
    } else {
      setPasswordMsg(`Password reset instructions have been sent to ${user.email}.`);
      setTimeout(() => setPasswordMsg(null), 5000);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  const handleConfirmDelete = async () => {
    setDeleteError(null);
    setDeleting(true);

    const res = await deleteUserAccount();

    if (res.error) {
      setDeleting(false);
      setDeleteError(res.error);
    } else {
      setShowDeleteModal(false);
      setDeleting(false);
      // Clear session state
      await signOut();
      router.push("/?deleted=true");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-[#F6FAFF]">
        <Navbar />
        <main className="flex-grow flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-[#00A6E8] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-[#5F7180] font-medium">Loading your profile...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const roleLabel = isEntrepreneur
    ? "ENTREPRENEUR"
    : isInvestor
    ? "INVESTOR"
    : "MEMBER";

  return (
    <div className="flex flex-col min-h-screen bg-[#F6FAFF] selection:bg-[#00A6E8] selection:text-white">
      <Navbar />

      <main className="flex-grow py-12 sm:py-16">
        <div className="w-full max-w-[1020px] mx-auto px-5 sm:px-8">
          {/* ============================================================ */}
          {/* 1. HEADER */}
          {/* ============================================================ */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-8"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-[#00A6E8] uppercase tracking-wider block mb-1">
                  Account Management
                </span>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0A192A] tracking-tight font-heading">
                  Your Profile
                </h1>
                <p className="text-sm sm:text-base text-[#5F7180] mt-1">
                  Manage your Wenture India account and business information.
                </p>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="px-3 py-1 rounded-full text-xs font-extrabold tracking-wider bg-[#EBF6FC] text-[#00658F] border border-[#DCECF2]">
                  {roleLabel}
                </span>
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="px-3 py-1 rounded-full text-xs font-extrabold tracking-wider bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100 transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">shield_person</span>
                    <span>ADMIN PANEL</span>
                  </Link>
                )}
              </div>
            </div>
          </motion.div>

          {/* Feedback Messages */}
          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px] text-emerald-600">
                check_circle
              </span>
              <span>{successMsg}</span>
            </motion.div>
          )}

          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px] text-red-500">
                error
              </span>
              <span>{errorMsg}</span>
            </motion.div>
          )}

          {passwordMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-sm flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px] text-blue-600">
                info
              </span>
              <span>{passwordMsg}</span>
            </motion.div>
          )}

          {/* ============================================================ */}
          {/* 1.5. ACCOUNT ROLES & CAPABILITIES (MULTI-ROLE ARCHITECTURE) */}
          {/* ============================================================ */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.05 }}
            className="bg-white border border-[#DCECF2] rounded-2xl shadow-[0_8px_30px_rgba(10,25,42,0.04)] p-6 sm:p-7 mb-8"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#DCECF2]">
              <div>
                <span className="text-[11px] font-bold text-[#00A6E8] uppercase tracking-wider block mb-0.5">
                  Account Roles &amp; Access
                </span>
                <h2 className="text-xl font-bold text-[#0A192A] flex items-center gap-2">
                  <span>Role Management</span>
                  {roles && roles.length > 1 && (
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Multi-Role Enabled
                    </span>
                  )}
                </h2>
                <p className="text-xs sm:text-sm text-[#5F7180] mt-1">
                  Access both Entrepreneur venture creation and Investor deal-discovery with your single Wenture India account.
                </p>
              </div>

              {/* Quick Switch Action for Multi-Role accounts */}
              {roles && roles.includes("investor") && roles.includes("entrepreneur") && (
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  {activeRole === "entrepreneur" ? (
                    <button
                      type="button"
                      disabled={switchingRole}
                      onClick={() => handleSwitchRole("investor")}
                      className="px-4 py-2 rounded-xl bg-[#EBF6FC] hover:bg-[#DCECF2] text-[#00658F] font-bold text-xs flex items-center gap-2 border border-[#DCECF2] transition-colors shadow-xs"
                    >
                      <span className="material-symbols-outlined text-[16px]">explore</span>
                      <span>{switchingRole ? "Switching..." : "Switch to Investor View"}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={switchingRole}
                      onClick={() => handleSwitchRole("entrepreneur")}
                      className="px-4 py-2 rounded-xl bg-[#EBF6FC] hover:bg-[#DCECF2] text-[#00658F] font-bold text-xs flex items-center gap-2 border border-[#DCECF2] transition-colors shadow-xs"
                    >
                      <span className="material-symbols-outlined text-[16px]">rocket_launch</span>
                      <span>{switchingRole ? "Switching..." : "Switch to Entrepreneur View"}</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-5">
              {/* Entrepreneur Role Card */}
              <div
                className={`p-4 rounded-xl border transition-all ${
                  activeRole === "entrepreneur"
                    ? "bg-[#F4FAFD] border-[#00A6E8]/40 shadow-xs ring-1 ring-[#00A6E8]/20"
                    : roles?.includes("entrepreneur")
                    ? "bg-white border-[#DCECF2]"
                    : "bg-slate-50/70 border-dashed border-slate-200"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        activeRole === "entrepreneur"
                          ? "bg-[#00A6E8] text-white"
                          : roles?.includes("entrepreneur")
                          ? "bg-[#EBF6FC] text-[#00A6E8]"
                          : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[20px]">rocket_launch</span>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-[#0A192A] flex items-center gap-2">
                        <span>Entrepreneur</span>
                        {activeRole === "entrepreneur" && (
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-[#00658F] text-white">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#5F7180] mt-0.5">
                        List ventures, raise capital, and receive investor enquiries.
                      </p>
                    </div>
                  </div>

                  {roles?.includes("entrepreneur") ? (
                    activeRole !== "entrepreneur" ? (
                      <button
                        type="button"
                        disabled={switchingRole}
                        onClick={() => handleSwitchRole("entrepreneur")}
                        className="text-xs font-bold text-[#00658F] hover:underline shrink-0"
                      >
                        Activate
                      </button>
                    ) : (
                      <span className="material-symbols-outlined text-[18px] text-emerald-600 shrink-0">
                        check_circle
                      </span>
                    )
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowAddRoleModal("entrepreneur")}
                      className="px-3 py-1.5 rounded-lg bg-[#00A6E8] hover:bg-[#0093CE] text-white font-bold text-xs shrink-0 transition-colors"
                    >
                      + Add Role
                    </button>
                  )}
                </div>
              </div>

              {/* Investor Role Card */}
              <div
                className={`p-4 rounded-xl border transition-all ${
                  activeRole === "investor"
                    ? "bg-[#F4FAFD] border-[#00A6E8]/40 shadow-xs ring-1 ring-[#00A6E8]/20"
                    : roles?.includes("investor")
                    ? "bg-white border-[#DCECF2]"
                    : "bg-slate-50/70 border-dashed border-slate-200"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        activeRole === "investor"
                          ? "bg-[#00A6E8] text-white"
                          : roles?.includes("investor")
                          ? "bg-[#EBF6FC] text-[#00A6E8]"
                          : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[20px]">explore</span>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-[#0A192A] flex items-center gap-2">
                        <span>Investor</span>
                        {activeRole === "investor" && (
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-[#00658F] text-white">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#5F7180] mt-0.5">
                        Discover deals, express investment interest, and build a public investor profile.
                      </p>
                    </div>
                  </div>

                  {roles?.includes("investor") ? (
                    activeRole !== "investor" ? (
                      <button
                        type="button"
                        disabled={switchingRole}
                        onClick={() => handleSwitchRole("investor")}
                        className="text-xs font-bold text-[#00658F] hover:underline shrink-0"
                      >
                        Activate
                      </button>
                    ) : (
                      <span className="material-symbols-outlined text-[18px] text-emerald-600 shrink-0">
                        check_circle
                      </span>
                    )
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowAddRoleModal("investor")}
                      className="px-3 py-1.5 rounded-lg bg-[#00A6E8] hover:bg-[#0093CE] text-white font-bold text-xs shrink-0 transition-colors"
                    >
                      + Add Role
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Modal for Adding a Role */}
          {showAddRoleModal && (
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white border border-[#DCECF2] rounded-2xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#DCECF2]">
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[24px] text-[#00A6E8]">
                      {showAddRoleModal === "investor" ? "explore" : "rocket_launch"}
                    </span>
                    <h3 className="font-bold text-base text-[#0A192A]">
                      Add {showAddRoleModal === "investor" ? "Investor" : "Entrepreneur"} Role
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddRoleModal(null)}
                    className="text-slate-400 hover:text-slate-600 p-1"
                  >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                </div>

                <p className="text-xs text-[#5F7180] leading-relaxed">
                  {showAddRoleModal === "investor"
                    ? "Adding the Investor role allows you to browse curated venture listings, connect directly with founders, and publish an investor profile."
                    : "Adding the Entrepreneur role allows you to list your businesses, upload pitch decks, and receive capital enquiries from verified investors."}
                </p>

                {roleActionMsg && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                    {roleActionMsg}
                  </div>
                )}

                {showAddRoleModal === "entrepreneur" && (
                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-[#0A192A] mb-1">
                        Company / Venture Name (Optional)
                      </label>
                      <input
                        type="text"
                        value={newRoleCompany}
                        onChange={(e) => setNewRoleCompany(e.target.value)}
                        placeholder="e.g. Acme Ventures"
                        className="w-full px-3 py-2 bg-white border border-[#DCECF2] rounded-lg text-xs text-[#0A192A] focus:outline-none focus:border-[#00A6E8]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#0A192A] mb-1">
                        Industry Sector (Optional)
                      </label>
                      <input
                        type="text"
                        value={newRoleSector}
                        onChange={(e) => setNewRoleSector(e.target.value)}
                        placeholder="e.g. FinTech, Healthcare, SaaS"
                        className="w-full px-3 py-2 bg-white border border-[#DCECF2] rounded-lg text-xs text-[#0A192A] focus:outline-none focus:border-[#00A6E8]"
                      />
                    </div>
                  </div>
                )}

                <div className="pt-3 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddRoleModal(null)}
                    className="px-4 py-2 rounded-xl border border-[#DCECF2] text-xs font-bold text-[#5F7180] hover:text-[#0A192A] hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={addingRole}
                    onClick={handleAddRoleConfirm}
                    className="px-4 py-2 rounded-xl bg-[#00A6E8] hover:bg-[#0093CE] text-white text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    {addingRole ? "Adding..." : `Confirm & Add ${showAddRoleModal === "investor" ? "Investor" : "Entrepreneur"}`}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* 2. MAIN PROFILE CARD */}
          {/* ============================================================ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white border border-[#DCECF2] rounded-2xl shadow-[0_8px_30px_rgba(10,25,42,0.04)] overflow-hidden mb-8"
          >
            <div className="p-6 sm:p-8 border-b border-[#DCECF2] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#F4FAFD]/50">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#00A6E8]/15 border border-[#00A6E8]/30 flex items-center justify-center text-[#00658F] font-extrabold text-xl">
                  {(profile?.fullName || profile?.name)
                    ? (profile.fullName || profile.name)!.charAt(0).toUpperCase()
                    : user?.email?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#0A192A]">
                    {profile?.fullName || profile?.name || "Wenture India Member"}
                  </h2>
                  <p className="text-xs sm:text-sm text-[#5F7180]">
                    {user?.email}
                  </p>
                </div>
              </div>

              {!isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="px-5 py-2 rounded-xl bg-white border border-[#DCECF2] hover:border-[#00A6E8] text-[#0A192A] font-bold text-xs hover:bg-[#F6FAFF] transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <span className="material-symbols-outlined text-[16px] text-[#00A6E8]">
                    edit
                  </span>
                  <span>Edit Profile</span>
                </button>
              )}
            </div>

            <div className="p-6 sm:p-8">
              {isEditing ? (
                /* Edit Profile Form */
                <form onSubmit={handleSaveProfile} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Full Name */}
                    <div>
                      <label className="block text-xs font-bold text-[#0A192A] mb-1.5">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        placeholder="Your full name"
                        className="w-full px-4 py-2.5 bg-white border border-[#DCECF2] rounded-xl text-sm text-[#0A192A] focus:outline-none focus:border-[#00A6E8] focus:ring-1 focus:ring-[#00A6E8]/20"
                      />
                    </div>

                    {/* Email (Read Only) */}
                    <div>
                      <label className="block text-xs font-bold text-[#5F7180] mb-1.5">
                        Email Address (Permanent)
                      </label>
                      <input
                        type="email"
                        value={user?.email || ""}
                        disabled
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed"
                      />
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-xs font-bold text-[#0A192A] mb-1.5">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98418 1008"
                        className="w-full px-4 py-2.5 bg-white border border-[#DCECF2] rounded-xl text-sm text-[#0A192A] focus:outline-none focus:border-[#00A6E8] focus:ring-1 focus:ring-[#00A6E8]/20"
                      />
                    </div>

                    {/* Company Name */}
                    <div>
                      <label className="block text-xs font-bold text-[#0A192A] mb-1.5">
                        Company Name
                      </label>
                      <input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Company or Organization"
                        className="w-full px-4 py-2.5 bg-white border border-[#DCECF2] rounded-xl text-sm text-[#0A192A] focus:outline-none focus:border-[#00A6E8] focus:ring-1 focus:ring-[#00A6E8]/20"
                      />
                    </div>

                    {/* Sector */}
                    <div>
                      <label className="block text-xs font-bold text-[#0A192A] mb-1.5">
                        Primary Sector
                      </label>
                      <input
                        type="text"
                        value={sector}
                        onChange={(e) => setSector(e.target.value)}
                        placeholder="e.g. Technology, Manufacturing, Retail"
                        className="w-full px-4 py-2.5 bg-white border border-[#DCECF2] rounded-xl text-sm text-[#0A192A] focus:outline-none focus:border-[#00A6E8] focus:ring-1 focus:ring-[#00A6E8]/20"
                      />
                    </div>

                    {/* Location */}
                    <div>
                      <label className="block text-xs font-bold text-[#0A192A] mb-1.5">
                        City / Location
                      </label>
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="e.g. New Delhi, Mumbai, Bengaluru"
                        className="w-full px-4 py-2.5 bg-white border border-[#DCECF2] rounded-xl text-sm text-[#0A192A] focus:outline-none focus:border-[#00A6E8] focus:ring-1 focus:ring-[#00A6E8]/20"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#DCECF2]">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setErrorMsg(null);
                      }}
                      className="px-5 py-2.5 rounded-xl border border-[#DCECF2] text-xs font-bold text-[#5F7180] hover:text-[#0A192A] hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-6 py-2.5 rounded-xl bg-[#00A6E8] hover:bg-[#0093CE] text-white text-xs font-bold transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {saving ? "Saving Changes..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              ) : (
                /* View Profile Details */
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  <div>
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-[#5F7180] mb-1">
                      Full Name
                    </span>
                    <span className="text-sm sm:text-base font-bold text-[#0A192A]">
                      {profile?.fullName || profile?.name || "—"}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-[#5F7180] mb-1">
                      Email Address
                    </span>
                    <span className="text-sm sm:text-base font-bold text-[#0A192A]">
                      {user?.email || "—"}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-[#5F7180] mb-1">
                      Phone Number
                    </span>
                    <span className="text-sm sm:text-base font-bold text-[#0A192A]">
                      {profile?.phone || "Not specified"}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-[#5F7180] mb-1">
                      Role
                    </span>
                    <span className="text-sm font-bold text-[#00658F]">
                      {roleLabel}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-[#5F7180] mb-1">
                      Company
                    </span>
                    <span className="text-sm sm:text-base font-bold text-[#0A192A]">
                      {profile?.companyName || "Not specified"}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-[#5F7180] mb-1">
                      Sector
                    </span>
                    <span className="text-sm sm:text-base font-bold text-[#0A192A]">
                      {profile?.sector || "General"}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-[#5F7180] mb-1">
                      Location
                    </span>
                    <span className="text-sm sm:text-base font-bold text-[#0A192A] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px] text-[#00A6E8]">
                        location_on
                      </span>
                      {profile?.location || "India"}
                    </span>
                  </div>

                  <div>
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-[#5F7180] mb-1">
                      Account Status
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Active Member
                    </span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* ============================================================ */}
          {/* 3. ROLE SPECIFIC SECTION */}
          {/* ============================================================ */}
          {/* Entrepreneur Enquiries Section */}
          {(isEntrepreneur || role === "entrepreneur") ? (
            <div className="space-y-8 mb-8">
              {/* Business & Opportunities Manage Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15 }}
                className="bg-white border border-[#DCECF2] rounded-2xl p-6 sm:p-8 shadow-[0_8px_30px_rgba(10,25,42,0.04)]"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#EBF6FC] text-[#00A6E8] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[24px]">rocket_launch</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-[#0A192A]">
                    Your Business &amp; Opportunities
                  </h3>
                </div>
                <p className="text-sm text-[#5F7180] max-w-2xl leading-relaxed mb-6">
                  Manage your active and pending venture listings, track investor views, and add new opportunities to Wenture India.
                </p>

                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href="/profile/listings"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00A6E8] hover:bg-[#0093CE] text-white font-bold text-xs transition-all shadow-sm"
                  >
                    <span>Manage Your Business Listings</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </Link>

                  <Link
                    href="/investors"
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-white border border-[#DCECF2] hover:bg-[#F4FAFD] hover:border-[#00A6E8]/40 text-[#00658F] font-bold text-xs transition-colors shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[16px] text-[#00A6E8]">search</span>
                    <span>Find an Investor</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </Link>
                </div>
              </motion.div>

              {/* Interest Received / Investor Enquiries Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.18 }}
                className="bg-white border border-[#DCECF2] rounded-2xl p-6 sm:p-8 shadow-[0_8px_30px_rgba(10,25,42,0.04)]"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#DCECF2] mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 rounded-lg bg-[#EBF6FC] text-[#00A6E8] flex items-center justify-center">
                        <span className="material-symbols-outlined text-[20px]">forum</span>
                      </div>
                      <h2 className="text-xl sm:text-2xl font-bold text-[#0A192A] font-heading">
                        Interest Received / Investor Enquiries
                      </h2>
                      {enquiries.length > 0 && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-[#00A6E8] text-white">
                          {enquiries.length}
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-[#5F7180] leading-relaxed">
                      Direct inquiries sent by verified investors and partners who expressed interest in your opportunities.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => loadEnquiries()}
                      disabled={loadingEnquiries}
                      className="p-2 rounded-xl border border-[#DCECF2] hover:border-[#00A6E8] text-[#5F7180] hover:text-[#00A6E8] transition-colors"
                      title="Refresh Enquiries"
                    >
                      <span className={`material-symbols-outlined text-[18px] ${loadingEnquiries ? "animate-spin" : ""}`}>
                        refresh
                      </span>
                    </button>
                  </div>
                </div>

                {loadingEnquiries ? (
                  <div className="py-12 text-center text-[#5F7180]">
                    <div className="w-8 h-8 border-3 border-[#00A6E8] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm">Fetching enquiries received for your opportunities...</p>
                  </div>
                ) : enquiries.length === 0 ? (
                  <div className="py-12 px-4 text-center">
                    <div className="w-16 h-16 rounded-full bg-[#F4FAFD] text-[#00A6E8] flex items-center justify-center mx-auto mb-4 border border-[#DCECF2]">
                      <span className="material-symbols-outlined text-[32px]">inbox</span>
                    </div>
                    <h3 className="text-lg font-bold text-[#0A192A] mb-2 font-heading">
                      No Enquiries Received Yet
                    </h3>
                    <p className="text-xs sm:text-sm text-[#5F7180] max-w-md mx-auto leading-relaxed mb-6">
                      When investors or entrepreneurs click &ldquo;I&apos;m Interested&rdquo; on your opportunities, their details, investment range, message, and direct contact options will appear here automatically.
                    </p>
                    <Link
                      href="/profile/listings"
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#00A6E8] hover:bg-[#0093CE] text-white font-bold text-xs transition-all shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[16px]">add_circle</span>
                      <span>List a Business Opportunity</span>
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-5">
                    {enquiries.map((enq) => {
                      const normStatus = (enq.status || "New").toLowerCase();
                      let statusBg = "bg-blue-50 text-blue-700 border-blue-200";
                      if (normStatus === "contacted") {
                        statusBg = "bg-amber-50 text-amber-700 border-amber-200";
                      } else if (normStatus === "in discussion") {
                        statusBg = "bg-purple-50 text-purple-700 border-purple-200";
                      } else if (normStatus === "closed") {
                        statusBg = "bg-emerald-50 text-emerald-700 border-emerald-200";
                      }

                      const senderPhone = enq.senderPhone || enq.phone || "";
                      const senderEmail = enq.senderEmail || enq.email || "";
                      const senderWaUrl = senderPhone
                        ? `https://wa.me/${formatWhatsAppNumber(senderPhone)}?text=${encodeURIComponent(
                            formatEnquiryWhatsAppText(enq)
                          )}`
                        : "";
                      const senderMailtoUrl = senderEmail
                        ? `mailto:${senderEmail}?subject=${encodeURIComponent(
                            formatEnquiryEmailSubject(enq)
                          )}&body=${encodeURIComponent(
                            formatEnquiryEmailBody(
                              enq,
                              profile?.fullName || profile?.name || user?.displayName || "Entrepreneur"
                            )
                          )}`
                        : "";

                      return (
                        <div
                          key={enq.id}
                          className="bg-[#F8FAFC] border border-[#DCECF2] rounded-xl p-5 sm:p-6 hover:border-[#00A6E8]/40 transition-colors shadow-2xs"
                        >
                          {/* Top: Opportunity & Status */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="px-2.5 py-1 bg-white border border-[#DCECF2] text-[#00658F] text-xs font-bold rounded-lg shadow-2xs">
                                Opportunity: {enq.opportunityTitle || "Business Opportunity"}
                              </span>
                              <span
                                className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border uppercase tracking-wider ${statusBg}`}
                              >
                                {enq.status || "New"}
                              </span>
                            </div>

                            {/* Status Updater */}
                            <div className="flex items-center gap-2 self-start sm:self-auto">
                              <span className="text-xs text-[#5F7180] font-medium">Status:</span>
                              <select
                                value={
                                  normStatus === "contacted"
                                    ? "Contacted"
                                    : normStatus === "in discussion"
                                    ? "In Discussion"
                                    : normStatus === "closed"
                                    ? "Closed"
                                    : "New"
                                }
                                disabled={updatingEnquiryId === enq.id}
                                onChange={(e) =>
                                  handleEnquiryStatusUpdate(enq.id, e.target.value as EnquiryStatus)
                                }
                                className="text-xs font-bold border border-[#DCECF2] rounded-lg px-2.5 py-1 bg-white text-[#0A192A] focus:outline-none focus:border-[#00A6E8] cursor-pointer"
                              >
                                <option value="New">New</option>
                                <option value="Contacted">Contacted</option>
                                <option value="In Discussion">In Discussion</option>
                                <option value="Closed">Closed</option>
                              </select>
                            </div>
                          </div>

                          {/* Middle: Investor Details Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 py-4 border-b border-[#E2E8F0] text-xs">
                            <div>
                              <span className="text-[11px] font-semibold text-[#5F7180] block mb-0.5">
                                Investor Name
                              </span>
                              <span className="font-bold text-[#0A192A] block truncate">
                                {enq.senderName || enq.name}
                              </span>
                              <span className="text-[10px] text-[#00A6E8] font-medium">
                                Role: {enq.senderRole || "Investor"}
                              </span>
                            </div>

                            <div>
                              <span className="text-[11px] font-semibold text-[#5F7180] block mb-0.5">
                                Phone Number
                              </span>
                              <span className="font-bold text-[#0A192A] block truncate">
                                {senderPhone || "Not provided"}
                              </span>
                            </div>

                            <div>
                              <span className="text-[11px] font-semibold text-[#5F7180] block mb-0.5">
                                Email Address
                              </span>
                              <span className="font-bold text-[#0A192A] block truncate" title={senderEmail}>
                                {senderEmail || "Not provided"}
                              </span>
                            </div>

                            <div>
                              <span className="text-[11px] font-semibold text-[#5F7180] block mb-0.5">
                                Investor Type
                              </span>
                              <span className="font-semibold text-[#0A192A] block">
                                {enq.senderType || "Verified Investor"}
                              </span>
                            </div>

                            <div>
                              <span className="text-[11px] font-semibold text-[#5F7180] block mb-0.5">
                                Location
                              </span>
                              <span className="font-semibold text-[#0A192A] block">
                                {enq.senderLocation || "India"}
                              </span>
                            </div>

                            <div>
                              <span className="text-[11px] font-semibold text-[#5F7180] block mb-0.5">
                                Investment Range
                              </span>
                              <span className="font-bold text-emerald-700 block">
                                {enq.investmentRange || enq.investmentCapacity || "Flexible"}
                              </span>
                            </div>
                          </div>

                          {/* Message */}
                          <div className="py-3">
                            <span className="text-[11px] font-semibold text-[#5F7180] block mb-1">
                              Enquiry Message:
                            </span>
                            <p className="text-xs sm:text-sm text-[#0A192A] bg-white p-3 rounded-lg border border-[#E2E8F0] leading-relaxed whitespace-pre-wrap">
                              {enq.message}
                            </p>
                          </div>

                          {/* Bottom: Date and Direct Action CTAs */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                            <span className="text-xs text-[#5F7180]">
                              Received: <strong className="text-[#0A192A]">{formatEnquiryDate(enq.createdAt)}</strong>
                            </span>

                            <div className="flex flex-wrap items-center gap-2">
                              {/* View Details / All Contact Info */}
                              <button
                                type="button"
                                onClick={() => setSelectedContactEnquiry(enq)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EBF6FC] hover:bg-[#DCECF2] text-[#00658F] font-bold text-xs transition-colors shadow-2xs"
                              >
                                <span className="material-symbols-outlined text-[15px]">badge</span>
                                <span>Investor Details</span>
                              </button>

                              {/* WhatsApp Direct with Investor Details */}
                              {senderWaUrl ? (
                                <a
                                  href={senderWaUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs transition-colors shadow-2xs"
                                >
                                  <span className="material-symbols-outlined text-[15px]">chat</span>
                                  <span>WhatsApp</span>
                                </a>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setSelectedContactEnquiry(enq)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs transition-colors shadow-2xs"
                                >
                                  <span className="material-symbols-outlined text-[15px]">chat</span>
                                  <span>WhatsApp</span>
                                </button>
                              )}

                              {/* Email Direct with Detailed Body */}
                              {senderMailtoUrl ? (
                                <a
                                  href={senderMailtoUrl}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#DCECF2] hover:border-[#00A6E8] text-[#0A192A] font-bold text-xs transition-colors shadow-2xs"
                                >
                                  <span className="material-symbols-outlined text-[15px] text-[#00A6E8]">mail</span>
                                  <span>Email</span>
                                </a>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setSelectedContactEnquiry(enq)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#DCECF2] hover:border-[#00A6E8] text-[#0A192A] font-bold text-xs transition-colors shadow-2xs"
                                >
                                  <span className="material-symbols-outlined text-[15px] text-[#00A6E8]">mail</span>
                                  <span>Email</span>
                                </button>
                              )}

                              {/* Call Action */}
                              <button
                                type="button"
                                onClick={() => setSelectedContactEnquiry(enq)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#DCECF2] hover:border-[#00A6E8] text-[#0A192A] font-bold text-xs transition-colors shadow-2xs"
                              >
                                <span className="material-symbols-outlined text-[15px] text-[#00658F]">call</span>
                                <span>Call</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="bg-white border border-[#DCECF2] rounded-2xl p-6 sm:p-8 shadow-[0_8px_30px_rgba(10,25,42,0.04)] mb-8"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#EBF6FC] text-[#00A6E8] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[24px]">trending_up</span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-[#0A192A]">
                  My Investor Profile
                </h3>
              </div>
              <p className="text-sm text-[#5F7180] max-w-2xl leading-relaxed mb-6">
                Create and manage the investor profile that entrepreneurs can discover on Wenture India. Add your investment interests, experience, preferred sectors and other details to help entrepreneurs understand your profile.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/profile/investor"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#00A6E8] hover:bg-[#0093CE] text-white font-bold text-xs transition-colors shadow-sm"
                >
                  <span className="material-symbols-outlined text-[16px]">badge</span>
                  <span>My Investor Profile</span>
                </Link>

                <Link
                  href="/opportunities"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-white border border-[#DCECF2] hover:bg-slate-50 text-[#0A192A] font-bold text-xs transition-colors"
                >
                  <span>Browse Opportunity Catalog</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </Link>
              </div>
            </motion.div>
          )}

          {/* ============================================================ */}
          {/* 3B. INVESTOR EXPRESSED INTEREST HISTORY */}
          {/* ============================================================ */}
          {(isInvestor || role === "investor") && (
            <div id="expressed-interests" className="space-y-8 mb-8 scroll-mt-24">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.18 }}
                className="bg-white border border-[#DCECF2] rounded-2xl p-6 sm:p-8 shadow-[0_8px_30px_rgba(10,25,42,0.04)]"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#DCECF2] mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 rounded-lg bg-[#EBF6FC] text-[#00A6E8] flex items-center justify-center">
                        <span className="material-symbols-outlined text-[20px]">send</span>
                      </div>
                      <h2 className="text-xl sm:text-2xl font-bold text-[#0A192A] font-heading">
                        Opportunities You&apos;ve Shown Interest In
                      </h2>
                      {sentEnquiries.length > 0 && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-[#00A6E8] text-white">
                          {sentEnquiries.length}
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-[#5F7180] leading-relaxed">
                      Track the business ventures and opportunities where you clicked &ldquo;I&apos;m Interested&rdquo;. Monitor entrepreneur response status and your submitted criteria.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => loadSentEnquiries()}
                      disabled={loadingSentEnquiries}
                      className="p-2 rounded-xl border border-[#DCECF2] hover:border-[#00A6E8] text-[#5F7180] hover:text-[#00A6E8] transition-colors"
                      title="Refresh History"
                    >
                      <span className={`material-symbols-outlined text-[18px] ${loadingSentEnquiries ? "animate-spin" : ""}`}>
                        refresh
                      </span>
                    </button>
                    <Link
                      href="/opportunities"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#F4FAFD] border border-[#00A6E8]/30 hover:bg-[#EBF6FC] text-[#00658F] font-bold text-xs transition-colors"
                    >
                      <span>Explore Opportunities</span>
                      <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </Link>
                  </div>
                </div>

                {loadingSentEnquiries ? (
                  <div className="py-12 text-center text-[#5F7180]">
                    <div className="w-8 h-8 border-3 border-[#00A6E8] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm">Fetching your expressed interest history...</p>
                  </div>
                ) : sentEnquiries.length === 0 ? (
                  <div className="py-12 px-4 text-center">
                    <div className="w-16 h-16 rounded-full bg-[#F4FAFD] text-[#00A6E8] flex items-center justify-center mx-auto mb-4 border border-[#DCECF2]">
                      <span className="material-symbols-outlined text-[32px]">manage_search</span>
                    </div>
                    <h3 className="text-lg font-bold text-[#0A192A] mb-2 font-heading">
                      No Expressed Interests Yet
                    </h3>
                    <p className="text-xs sm:text-sm text-[#5F7180] max-w-md mx-auto leading-relaxed mb-6">
                      When you explore the Wenture India catalog and click &ldquo;I&apos;m Interested&rdquo; on any business opportunity, the details of your inquiry and current entrepreneur discussion status will appear here.
                    </p>
                    <Link
                      href="/opportunities"
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#00A6E8] hover:bg-[#0093CE] text-white font-bold text-xs transition-all shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[16px]">travel_explore</span>
                      <span>Browse Investment Opportunities</span>
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {sentEnquiries.map((enq) => {
                      const normStatus = (enq.status || "New").toLowerCase();
                      let statusBadge = {
                        label: "Pending Response from Entrepreneur",
                        bg: "bg-blue-50 text-blue-700 border-blue-200",
                        icon: "hourglass_top",
                      };
                      if (normStatus === "contacted") {
                        statusBadge = {
                          label: "Entrepreneur Reached Out",
                          bg: "bg-amber-50 text-amber-700 border-amber-200",
                          icon: "mark_email_read",
                        };
                      } else if (normStatus === "in discussion") {
                        statusBadge = {
                          label: "In Active Discussion",
                          bg: "bg-purple-50 text-purple-700 border-purple-200",
                          icon: "forum",
                        };
                      } else if (normStatus === "closed") {
                        statusBadge = {
                          label: "Discussion Closed",
                          bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
                          icon: "task_alt",
                        };
                      }

                      return (
                        <div
                          key={enq.id}
                          className="p-5 sm:p-6 rounded-2xl border border-[#DCECF2] bg-[#FBFDFF] hover:border-[#00A6E8]/40 transition-all shadow-xs"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#DCECF2]/60 mb-4">
                            <div>
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#00658F] bg-[#EBF6FC] px-2 py-0.5 rounded inline-block mb-1.5">
                                Opportunity Interest
                              </span>
                              <h3 className="text-base sm:text-lg font-bold text-[#0A192A] hover:text-[#00A6E8] transition-colors">
                                <Link href={`/opportunities/${enq.opportunityId || ""}`}>
                                  {enq.opportunityTitle || "Business Opportunity"}
                                </Link>
                              </h3>
                              <span className="text-xs text-[#5F7180] mt-0.5 block">
                                Interest sent on {formatEnquiryDate(enq.createdAt)}
                              </span>
                            </div>

                            <div className="shrink-0">
                              <span
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusBadge.bg}`}
                              >
                                <span className="material-symbols-outlined text-[15px]">{statusBadge.icon}</span>
                                {statusBadge.label}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs mb-4">
                            {(enq.investmentRange || enq.investmentCapacity) && (
                              <div className="p-2.5 rounded-xl bg-white border border-[#DCECF2]/70">
                                <span className="text-[#5F7180] block text-[10px] uppercase font-bold">
                                  Your Investment Range
                                </span>
                                <span className="font-bold text-[#0A192A] mt-0.5 block">
                                  {enq.investmentRange || enq.investmentCapacity}
                                </span>
                              </div>
                            )}
                            {enq.senderRole && (
                              <div className="p-2.5 rounded-xl bg-white border border-[#DCECF2]/70">
                                <span className="text-[#5F7180] block text-[10px] uppercase font-bold">
                                  Role Submitted
                                </span>
                                <span className="font-bold text-[#0A192A] mt-0.5 block">
                                  {enq.senderRole}
                                </span>
                              </div>
                            )}
                            {enq.senderType && (
                              <div className="p-2.5 rounded-xl bg-white border border-[#DCECF2]/70">
                                <span className="text-[#5F7180] block text-[10px] uppercase font-bold">
                                  Investor Type
                                </span>
                                <span className="font-bold text-[#0A192A] mt-0.5 block">
                                  {enq.senderType}
                                </span>
                              </div>
                            )}
                          </div>

                          {enq.message && (
                            <div className="p-3.5 rounded-xl bg-white border border-[#DCECF2]/80 text-xs text-[#0A192A] mb-3">
                              <strong className="text-[#5F7180] block text-[10px] uppercase font-bold mb-1">
                                Your Message to Opportunity Owner:
                              </strong>
                              <p className="whitespace-pre-line leading-relaxed italic text-[#2C3E50]">
                                &ldquo;{enq.message}&rdquo;
                              </p>
                            </div>
                          )}

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px] text-[#5F7180] pt-2 border-t border-[#DCECF2]/50 mt-1">
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px] text-emerald-600">verified</span>
                              Delivered directly to opportunity entrepreneur &amp; monitored by Wenture India Admin
                            </span>

                            <div className="flex items-center gap-3 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setDeletingEnquiry(enq);
                                  setDeleteEnquiryError(null);
                                }}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-red-600 transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
                                title="Delete this expression of interest"
                              >
                                <span className="material-symbols-outlined text-[15px]">delete</span>
                                <span>Delete Interest</span>
                              </button>

                              <Link
                                href={`/opportunities/${enq.opportunityId || ""}`}
                                className="text-[#00658F] hover:text-[#00A6E8] font-bold flex items-center gap-0.5 hover:underline"
                              >
                                <span>View Opportunity</span>
                                <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            </div>
          )}

          {/* ============================================================ */}
          {/* VERIFICATION & TRUST LAYER */}
          {/* ============================================================ */}
          <VerificationTrustSection />

          {/* ============================================================ */}
          {/* 4. ACCOUNT SECURITY & ACTIONS */}
          {/* ============================================================ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white border border-[#DCECF2] rounded-2xl p-6 sm:p-8 shadow-[0_8px_30px_rgba(10,25,42,0.04)]"
          >
            <h3 className="text-lg font-bold text-[#0A192A] mb-2 font-heading">
              Account Security &amp; Actions
            </h3>
            <p className="text-xs sm:text-sm text-[#5F7180] mb-6">
              Update password instructions or sign out of your current session.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={handleChangePassword}
                disabled={resettingPassword}
                className="px-5 py-2.5 rounded-xl border border-[#DCECF2] hover:border-[#00A6E8] bg-[#F6FAFF] hover:bg-white text-[#0A192A] font-bold text-xs transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px] text-[#00A6E8]">
                  lock_reset
                </span>
                <span>{resettingPassword ? "Sending link..." : "Change Password"}</span>
              </button>

              <button
                type="button"
                onClick={handleSignOut}
                className="px-5 py-2.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px]">
                  logout
                </span>
                <span>Sign Out</span>
              </button>
            </div>
          </motion.div>

          {/* ============================================================ */}
          {/* 5. DANGER ZONE — DELETE ACCOUNT */}
          {/* ============================================================ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="mt-8 bg-white border border-red-200/80 rounded-2xl p-6 sm:p-8 shadow-[0_8px_30px_rgba(239,68,68,0.03)]"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-red-600 block mb-1">
                  Danger Zone
                </span>
                <h3 className="text-lg font-bold text-[#0A192A]">
                  Delete Account
                </h3>
                <p className="text-xs sm:text-sm text-[#5F7180] mt-1 max-w-xl">
                  Once your account is deleted, your account information will no longer be available.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setDeleteError(null);
                  setShowDeleteModal(true);
                }}
                className="px-5 py-2.5 rounded-xl bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border border-red-200 hover:border-red-600 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm whitespace-nowrap self-start sm:self-auto"
              >
                <span className="material-symbols-outlined text-[16px]">
                  delete
                </span>
                <span>Delete Account</span>
              </button>
            </div>
          </motion.div>
        </div>
      </main>

      {/* ============================================================ */}
      {/* CONFIRMATION MODAL */}
      {/* ============================================================ */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white border border-[#DCECF2] rounded-2xl shadow-2xl p-6 sm:p-7 overflow-hidden">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 border border-red-200 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-[24px]">
                warning
              </span>
            </div>

            <h3 className="text-xl font-bold text-[#0A192A] mb-2 font-heading">
              Delete your account?
            </h3>
            <p className="text-sm text-[#5F7180] leading-relaxed mb-6">
              This action is permanent and cannot be undone. Your Wenture India account and associated profile information will be deleted.
            </p>

            {deleteError && (
              <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                <span className="material-symbols-outlined text-[18px] text-red-500 shrink-0">
                  error
                </span>
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={deleting}
                onClick={() => {
                  if (!deleting) {
                    setShowDeleteModal(false);
                    setDeleteError(null);
                  }
                }}
                className="px-4 py-2 rounded-xl border border-[#DCECF2] text-xs font-bold text-[#5F7180] hover:text-[#0A192A] hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-sm shadow-red-500/20 disabled:opacity-60 flex items-center gap-1.5"
              >
                {deleting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Deleting account...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                    <span>Delete Account</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Enquiry Confirmation Modal */}
      {deletingEnquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#DCECF2] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px]">delete_forever</span>
              </div>
              <div>
                <h3 className="text-base font-bold text-[#0A192A]">Delete Expressed Interest?</h3>
                <p className="text-xs text-[#5F7180]">Remove this enquiry from your history</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-[#5F7180] leading-relaxed mb-4">
              Are you sure you want to delete your enquiry for{" "}
              <strong className="text-[#0A192A]">
                &ldquo;{deletingEnquiry.opportunityTitle || "Business Opportunity"}&rdquo;
              </strong>
              ? This will remove your enquiry record and you will no longer track it here.
            </p>

            {deleteEnquiryError && (
              <div className="p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">error</span>
                <span>{deleteEnquiryError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#DCECF2]">
              <button
                type="button"
                disabled={isDeletingEnquiry}
                onClick={() => setDeletingEnquiry(null)}
                className="px-4 py-2 rounded-xl border border-[#DCECF2] text-xs font-bold text-[#5F7180] hover:text-[#0A192A] hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isDeletingEnquiry}
                onClick={handleConfirmDeleteEnquiry}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-sm shadow-red-500/20 disabled:opacity-60 flex items-center gap-1.5"
              >
                {isDeletingEnquiry ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                    <span>Yes, Delete Enquiry</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Investor Contact & Details Modal */}
      <InvestorContactModal
        enquiry={selectedContactEnquiry}
        isOpen={!!selectedContactEnquiry}
        onClose={() => setSelectedContactEnquiry(null)}
        onStatusUpdate={handleEnquiryStatusUpdate}
        entrepreneurName={profile?.fullName || profile?.name || user?.displayName || "Entrepreneur"}
      />

      <Footer />
    </div>
  );
}
