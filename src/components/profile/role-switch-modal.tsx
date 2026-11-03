"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/firebase/auth-context";

export interface RoleSwitchModalProps {
  isOpen: boolean;
  targetRole: "investor" | "entrepreneur";
  targetPath?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function RoleSwitchModal({
  isOpen,
  targetRole,
  targetPath,
  onClose,
  onSuccess,
}: RoleSwitchModalProps) {
  const router = useRouter();
  const { switchActiveRole } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll and listen for Escape key when open
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, loading, onClose]);

  if (!isOpen || !mounted) return null;

  const isSwitchingToInvestor = targetRole === "investor";
  const title = isSwitchingToInvestor
    ? "Switch to Investor Mode?"
    : "Switch to Entrepreneur Mode?";
  const description = isSwitchingToInvestor
    ? "You are currently using Wenture as an Entrepreneur. To access your Investor Profile, you need to switch your active role to Investor."
    : "You are currently using Wenture as an Investor. To access your Entrepreneur Dashboard, you need to switch your active role to Entrepreneur.";
  const confirmButtonLabel = isSwitchingToInvestor
    ? "Switch to Investor"
    : "Switch to Entrepreneur";

  const handleConfirm = async () => {
    setLoading(true);
    setErrorMsg(null);

    const res = await switchActiveRole(targetRole);

    if (res.error) {
      setLoading(false);
      setErrorMsg(res.error);
      return;
    }

    setLoading(false);
    onClose();

    if (onSuccess) {
      onSuccess();
    }

    if (targetPath) {
      router.push(targetPath);
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[99999] overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="role-switch-modal-title"
    >
      {/* Darkened Backdrop */}
      <div
        className="fixed inset-0 bg-[#0A192A]/70 backdrop-blur-sm transition-opacity"
        onClick={() => {
          if (!loading) onClose();
        }}
        aria-hidden="true"
      />

      {/* Centering Wrapper ensuring vertical & horizontal centering without clipping */}
      <div className="flex min-h-full items-center justify-center p-4 sm:p-6 text-center">
        <div
          className="relative w-full max-w-md rounded-2xl bg-white text-left shadow-2xl border border-[#DCECF2] p-6 sm:p-7 my-8 transition-all"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="absolute top-4 right-4 p-1.5 rounded-xl text-[#5F7180] hover:text-[#0A192A] hover:bg-slate-100 transition-colors disabled:opacity-40 cursor-pointer"
            aria-label="Close dialog"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>

          {/* Header Icon + Role Badge */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-xl bg-[#EBF6FC] text-[#00A6E8] flex items-center justify-center shadow-xs border border-[#00A6E8]/20 shrink-0">
              <span className="material-symbols-outlined text-[24px]">
                {isSwitchingToInvestor ? "badge" : "rocket_launch"}
              </span>
            </div>
            <div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-[#EBF6FC] text-[#00658F] border border-[#00A6E8]/20">
                Role Switch Required
              </span>
            </div>
          </div>

          {/* Title */}
          <h2
            id="role-switch-modal-title"
            className="text-lg sm:text-xl font-bold text-[#0A192A] tracking-tight mb-2"
          >
            {title}
          </h2>

          {/* Description */}
          <p className="text-xs sm:text-sm text-[#5F7180] leading-relaxed mb-6">
            {description}
          </p>

          {/* Error Message */}
          {errorMsg && (
            <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-red-500 shrink-0">
                error
              </span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#DCECF2] text-xs sm:text-sm font-bold text-[#5F7180] hover:text-[#0A192A] hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleConfirm}
              className="px-5 py-2 rounded-xl bg-[#00A6E8] hover:bg-[#0093CE] text-white text-xs sm:text-sm font-bold transition-all shadow-md shadow-[#00A6E8]/20 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Switching...</span>
                </>
              ) : (
                <>
                  <span>{confirmButtonLabel}</span>
                  <span className="material-symbols-outlined text-[16px]">
                    arrow_forward
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(modalContent, document.body)
    : null;
}
