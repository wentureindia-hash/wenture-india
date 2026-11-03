"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/firebase/auth-context";
import { BrandLogo } from "@/components/brand-logo";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { name: "Dashboard", href: "/admin", icon: "dashboard" },
  { name: "Listings", href: "/admin/listings", icon: "storefront" },
  { name: "Investors", href: "/admin/investors", icon: "badge" },
  { name: "Verifications", href: "/admin/verifications", icon: "verified" },
  { name: "Users", href: "/admin/users", icon: "group" },
  { name: "Opportunities", href: "/admin/opportunities", icon: "trending_up" },
  { name: "Featured Content", href: "/admin/featured", icon: "stars" },
  { name: "Guides", href: "/admin/guides", icon: "menu_book" },
  { name: "Enquiries", href: "/admin/enquiries", icon: "mark_email_unread" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, isAdmin, loading, isAuthenticated, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6FAFF] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-3 border-[#00A6E8] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-[#5F7180]">Verifying administrative security...</p>
        </div>
      </div>
    );
  }

  // Strict Authorization Guard
  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-screen bg-[#F6FAFF] flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white border border-[#DCECF2] rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 border border-red-200 flex items-center justify-center mx-auto mb-5">
            <span className="material-symbols-outlined text-[32px]">lock</span>
          </div>
          <h2 className="text-2xl font-extrabold text-[#0A192A] mb-2 font-heading">
            Access Restricted
          </h2>
          <p className="text-sm text-[#5F7180] leading-relaxed mb-6">
            The Wenture India Admin Portal is strictly restricted to authorized administrators. Your account ({user?.email || "Guest"}) does not possess administrative privileges.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href="/"
              className="w-full py-3 bg-[#00A6E8] hover:bg-[#0093CE] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm text-center"
            >
              Return to Website
            </Link>
            {isAuthenticated && (
              <button
                type="button"
                onClick={async () => {
                  await signOut();
                  router.push("/login");
                }}
                className="w-full py-2.5 bg-white border border-[#DCECF2] hover:bg-slate-50 text-[#0A192A] font-bold text-xs rounded-xl transition-colors"
              >
                Sign In with Different Account
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4FAFD] flex flex-col selection:bg-[#00A6E8] selection:text-white">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#DCECF2] px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-1.5 text-[#0A192A] hover:bg-slate-100 rounded-lg"
            aria-label="Toggle Sidebar"
          >
            <span className="material-symbols-outlined text-[24px]">
              {sidebarOpen ? "close" : "menu"}
            </span>
          </button>
          <div className="flex items-center gap-3">
            <BrandLogo />
            <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-md text-[10px] font-extrabold tracking-wider uppercase bg-[#EBF6FC] text-[#00658F] border border-[#DCECF2]">
              Admin Portal
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            target="_blank"
            className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-[#5F7180] hover:text-[#00A6E8] px-3 py-1.5 rounded-lg transition-colors border border-transparent hover:border-[#DCECF2]"
          >
            <span>Live Website</span>
            <span className="material-symbols-outlined text-[16px]">open_in_new</span>
          </Link>

          <div className="h-4 w-px bg-slate-200 hidden sm:block" />

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#00A6E8] text-white font-extrabold text-xs flex items-center justify-center shadow-sm">
              {profile?.fullName ? profile.fullName.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase()}
            </div>
            <div className="hidden md:block text-left">
              <span className="block text-xs font-bold text-[#0A192A] leading-tight">
                {profile?.fullName || user?.email?.split("@")[0] || "Admin"}
              </span>
              <span className="text-[10px] text-[#5F7180] leading-none">Super Administrator</span>
            </div>
          </div>

          <button
            type="button"
            onClick={async () => {
              await signOut();
              router.push("/");
            }}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-1"
            title="Sign Out"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
          </button>
        </div>
      </header>

      <div className="flex-grow flex relative">
        {/* Mobile Backdrop Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-[#0A192A]/50 backdrop-blur-xs z-20 lg:hidden transition-opacity"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Sidebar Navigation */}
        <aside
          className={cn(
            "fixed lg:sticky top-[57px] z-30 w-64 bg-white border-r border-[#DCECF2] h-[calc(100vh-57px)] flex flex-col justify-between transition-transform duration-200 lg:translate-x-0 shadow-lg lg:shadow-none",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="p-4 space-y-1 overflow-y-auto">
            <div className="px-3 py-2 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              Management
            </div>
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all",
                    isActive
                      ? "bg-[#00A6E8] text-white shadow-sm shadow-[#00A6E8]/20"
                      : "text-[#5F7180] hover:text-[#0A192A] hover:bg-[#F6FAFF]"
                  )}
                >
                  <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          <div className="p-4 border-t border-[#DCECF2] bg-[#F4FAFD]/50">
            <div className="text-[11px] text-[#5F7180] leading-snug">
              <strong className="text-[#0A192A]">Wenture India</strong>
              <span className="block text-[10px] text-slate-400 mt-0.5">Admin Security Layer v2.0</span>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-grow p-3.5 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto overflow-x-hidden min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
