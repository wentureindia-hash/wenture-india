"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  getUserVerification,
  submitVerification,
  DocumentType,
  VerificationRecord,
} from "@/lib/firebase/verifications";
import { uploadVerificationDocFile, formatStorageError } from "@/lib/firebase/storage";
import { useAuth } from "@/lib/firebase/auth-context";

const DOCUMENT_OPTIONS: DocumentType[] = [
  "Business Incorporation Certificate",
  "GST Registration Certificate",
  "PAN Card Document",
  "Investor Net Worth / Accreditation",
  "Audited Financials / Balance Sheet",
  "Other Compliance Document",
];

export function VerificationTrustSection() {
  const { user, profile } = useAuth();
  const [record, setRecord] = useState<VerificationRecord | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [documentType, setDocumentType] = useState<DocumentType>(DOCUMENT_OPTIONS[0]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);

  const loadVerificationStatus = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    const res = await getUserVerification(user.uid);
    if (!res.error && res.record) {
      setRecord(res.record);
    }
    setLoading(false);
  }, [user?.uid]);

  useEffect(() => {
    loadVerificationStatus();
  }, [loadVerificationStatus]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFormError(null);
    setFormSuccess(null);

    // Client-side quick check
    if (file.size > 15 * 1024 * 1024) {
      setFormError("File size exceeds maximum 15MB limit.");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid || !selectedFile) {
      setFormError("Please select a document file to upload.");
      return;
    }

    setUploading(true);
    setFormError(null);
    setFormSuccess(null);

    try {
      // 1. Upload to Supabase Storage (wenture-private bucket)
      const uploadRes = await uploadVerificationDocFile(selectedFile, user.uid);
      if (uploadRes.error || !uploadRes.storagePath) {
        setFormError(uploadRes.error || "Failed to upload document.");
        setUploading(false);
        return;
      }

      // 2. Submit Firestore verification record
      const role = (profile?.role as "entrepreneur" | "investor" | "user") || "user";
      const submitRes = await submitVerification({
        documentType,
        fileName: selectedFile.name,
        storagePath: uploadRes.storagePath,
        role,
        userName: profile?.fullName || profile?.name || user.displayName || user.email?.split("@")[0] || "User",
      });

      if (submitRes.error) {
        setFormError(submitRes.error);
        setUploading(false);
        return;
      }

      setFormSuccess("Verification document submitted successfully. Our team will review your submission.");
      setSelectedFile(null);
      setShowUploadForm(false);
      await loadVerificationStatus();
    } catch (err) {
      const formatted = formatStorageError(err);
      setFormError(formatted.message);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-[#DCECF2] rounded-2xl p-6 sm:p-8 shadow-[0_8px_30px_rgba(10,25,42,0.04)] mb-8 text-center text-slate-400">
        <div className="w-5 h-5 border-2 border-[#00A6E8] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <span className="text-xs">Checking verification status...</span>
      </div>
    );
  }

  const isApproved = record?.status === "approved" || profile?.isVerified === true;
  const isPending = record?.status === "pending";
  const isRejected = record?.status === "rejected";

  return (
    <div className="bg-white border border-[#DCECF2] rounded-2xl p-6 sm:p-8 shadow-[0_8px_30px_rgba(10,25,42,0.04)] mb-8 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#DCECF2]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#EBF6FC] text-[#00A6E8] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[24px]">verified</span>
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-[#0A192A] font-heading flex items-center gap-2">
              <span>Verification & Trust Status</span>
              {isApproved && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">check_circle</span>
                  <span>Verified</span>
                </span>
              )}
            </h3>
            <p className="text-xs sm:text-sm text-[#5F7180] mt-0.5">
              Secure business identity and accreditation verification powered by Supabase Private Storage.
            </p>
          </div>
        </div>

        {!isApproved && !showUploadForm && (
          <button
            type="button"
            onClick={() => setShowUploadForm(true)}
            className="px-4 py-2 bg-[#00A6E8] hover:bg-[#0093CE] text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">upload_file</span>
            <span>{isRejected ? "Re-upload Document" : isPending ? "Replace Document" : "Submit Verification"}</span>
          </button>
        )}
      </div>

      {formSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-emerald-600">check_circle</span>
          <span>{formSuccess}</span>
        </div>
      )}

      {formError && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-red-500">error</span>
          <span>{formError}</span>
        </div>
      )}

      {/* Status Banners */}
      {isApproved && (
        <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
            <span className="material-symbols-outlined text-[18px] text-emerald-600">verified_user</span>
            <span>Your account has completed identity and credential verification.</span>
          </div>
          <p className="text-[11px] text-emerald-800 leading-relaxed">
            Your verified badge is actively displayed on your profile and marketplace listings, increasing investor trust and engagement.
          </p>
          {record && (
            <div className="text-[10px] text-emerald-700 pt-1 border-t border-emerald-200/60 flex items-center gap-2">
              <span>Verified Document: {record.documentType}</span>
              <span>•</span>
              <span>Reviewed by Wenture Administration</span>
            </div>
          )}
        </div>
      )}

      {isPending && !showUploadForm && (
        <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
            <span className="material-symbols-outlined text-[18px] text-amber-600">hourglass_top</span>
            <span>Verification Submission Under Review</span>
          </div>
          <p className="text-[11px] text-amber-800 leading-relaxed">
            Our administration team is reviewing your submitted document (<strong>{record?.documentType}</strong>: {record?.fileName}). Your trust badge will activate automatically upon approval.
          </p>
        </div>
      )}

      {isRejected && !showUploadForm && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-rose-900 font-bold text-xs">
            <span className="material-symbols-outlined text-[18px] text-rose-600">cancel</span>
            <span>Verification Document Declined</span>
          </div>
          <p className="text-xs text-rose-800 leading-relaxed">
            <strong>Feedback from Administrator:</strong> {record?.rejectionReason || "The document provided could not be verified. Please re-upload a clear and valid certificate."}
          </p>
        </div>
      )}

      {!record && !showUploadForm && (
        <div className="p-4 bg-[#F6FAFF] border border-[#DCECF2] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-bold text-[#0A192A]">Unverified Profile</h4>
            <p className="text-[11px] text-[#5F7180] mt-0.5">
              Submit your company incorporation, GST, or accreditation documents to earn the Wenture Trust Badge.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowUploadForm(true)}
            className="px-4 py-2 bg-white border border-[#00A6E8] text-[#00658F] hover:bg-[#EBF6FC] rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0"
          >
            Start Verification
          </button>
        </div>
      )}

      {/* Document Upload Form */}
      {showUploadForm && (
        <form onSubmit={handleSubmit} className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-[#0A192A] uppercase tracking-wider">
              Submit Document for Verification
            </h4>
            <button
              type="button"
              onClick={() => {
                setShowUploadForm(false);
                setSelectedFile(null);
                setFormError(null);
              }}
              className="text-xs text-[#5F7180] hover:text-[#0A192A] cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#0A192A] mb-1">
                Document Type *
              </label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value as DocumentType)}
                className="w-full px-3 py-2 bg-white border border-[#DCECF2] rounded-xl text-xs text-[#0A192A] focus:outline-none focus:border-[#00A6E8]"
              >
                {DOCUMENT_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0A192A] mb-1">
                Select File (PDF or Image, max 15MB) *
              </label>
              <input
                type="file"
                accept=".pdf,image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#EBF6FC] file:text-[#00658F] hover:file:bg-[#d8ebfc] cursor-pointer"
              />
              {selectedFile && (
                <span className="text-[11px] text-emerald-700 font-semibold block mt-1">
                  Selected: {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                </span>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
            <span className="text-[11px] text-[#5F7180]">
              Documents are encrypted and stored in private storage accessible only to platform administrators.
            </span>
            <button
              type="submit"
              disabled={uploading || !selectedFile}
              className="px-5 py-2 bg-[#00A6E8] hover:bg-[#0093CE] text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">
                {uploading ? "sync" : "cloud_upload"}
              </span>
              <span>{uploading ? "Uploading & Submitting..." : "Submit for Verification"}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
