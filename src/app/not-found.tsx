import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-16 bg-[#F6FAFF]">
      <div className="w-full max-w-lg text-center bg-white border border-[#DCECF2] rounded-2xl p-8 sm:p-12 shadow-sm">
        <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-6 rounded-2xl bg-[#EBF6FC] text-[#00A6E8] flex items-center justify-center">
          <span className="material-symbols-outlined text-[36px] sm:text-[44px]">search_off</span>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EBF6FC] text-[#00A6E8] text-xs font-bold uppercase tracking-wider mb-4">
          404 Error
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0A192A] font-heading mb-3">
          Page or Opportunity Not Found
        </h1>

        <p className="text-xs sm:text-sm text-[#5F7180] mb-8 leading-relaxed">
          The page, business opportunity, or investor profile you are looking for may have been moved, expired, or does not exist.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/opportunities"
            className="w-full sm:w-auto px-6 py-3 bg-[#00A6E8] hover:bg-[#0095d1] text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">explore</span>
            <span>Explore Opportunities</span>
          </Link>
          <Link
            href="/"
            className="w-full sm:w-auto px-6 py-3 bg-white hover:bg-slate-50 text-[#0A192A] border border-[#DCECF2] text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">home</span>
            <span>Return to Homepage</span>
          </Link>
        </div>

        <div className="mt-8 pt-6 border-t border-[#DCECF2] text-center">
          <p className="text-xs text-[#5F7180]">
            Need assistance?{" "}
            <Link href="/contact" className="text-[#00A6E8] font-semibold hover:underline">
              Contact our team
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

