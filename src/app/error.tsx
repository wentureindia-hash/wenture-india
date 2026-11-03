"use client";

import { useEffect } from "react";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error securely for diagnostic tracking
    console.error("[Application Error Boundary Caught]:", error);
  }, [error]);

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-16 bg-[#F6FAFF]">
      <div className="w-full max-w-lg text-center bg-white border border-[#DCECF2] rounded-2xl p-8 sm:p-12 shadow-sm">
        <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-6 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
          <span className="material-symbols-outlined text-[36px] sm:text-[44px]">warning</span>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold uppercase tracking-wider mb-4 border border-amber-200">
          Unexpected Error
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0A192A] font-heading mb-3">
          Something went wrong
        </h1>

        <p className="text-xs sm:text-sm text-[#5F7180] mb-8 leading-relaxed">
          We encountered an unexpected technical problem loading this resource. Please try refreshing or return to the homepage.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto px-6 py-3 bg-[#00A6E8] hover:bg-[#0095d1] text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            <span>Try Again</span>
          </button>
          <Link
            href="/"
            className="w-full sm:w-auto px-6 py-3 bg-white hover:bg-slate-50 text-[#0A192A] border border-[#DCECF2] text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">home</span>
            <span>Homepage</span>
          </Link>
        </div>

        <div className="mt-8 pt-6 border-t border-[#DCECF2] text-center">
          <p className="text-xs text-[#5F7180]">
            Persistent issue?{" "}
            <Link href="/contact" className="text-[#00A6E8] font-semibold hover:underline">
              Contact Wenture Support
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

