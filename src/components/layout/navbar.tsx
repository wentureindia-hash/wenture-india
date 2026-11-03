"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand-logo";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/lib/firebase/auth-context";
import { RoleSwitchModal } from "@/components/profile/role-switch-modal";

interface NavbarProps {
  className?: string;
  hideAuth?: boolean;
}

export function Navbar({ className, hideAuth = false }: NavbarProps) {
  const pathname = usePathname();
  const { isAuthenticated, isAdmin, signOut, roles, activeRole, switchActiveRole } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [investorDropdownOpen, setInvestorDropdownOpen] = useState(false);
  const [entrepreneurDropdownOpen, setEntrepreneurDropdownOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const investorTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const entrepreneurTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const roleDropdownRef = React.useRef<HTMLDivElement | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [roleSwitchModalConfig, setRoleSwitchModalConfig] = useState<{
    isOpen: boolean;
    targetRole: "investor" | "entrepreneur";
    targetPath: string;
  } | null>(null);

  const handleListVentureClick = (e: React.MouseEvent) => {
    if (
      isAuthenticated &&
      !isAdmin &&
      roles?.includes("investor") &&
      roles?.includes("entrepreneur") &&
      activeRole === "investor"
    ) {
      e.preventDefault();
      setEntrepreneurDropdownOpen(false);
      setMobileMenuOpen(false);
      setRoleSwitchModalConfig({
        isOpen: true,
        targetRole: "entrepreneur",
        targetPath: "/profile/listings",
      });
      return;
    }
    setEntrepreneurDropdownOpen(false);
    setMobileMenuOpen(false);
  };

  const handleInvestorProfileClick = (e: React.MouseEvent) => {
    if (
      isAuthenticated &&
      !isAdmin &&
      roles?.includes("investor") &&
      roles?.includes("entrepreneur") &&
      activeRole === "entrepreneur"
    ) {
      e.preventDefault();
      setInvestorDropdownOpen(false);
      setMobileMenuOpen(false);
      setRoleSwitchModalConfig({
        isOpen: true,
        targetRole: "investor",
        targetPath: "/profile/investor",
      });
      return;
    }
    setInvestorDropdownOpen(false);
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setInvestorDropdownOpen(false);
    setEntrepreneurDropdownOpen(false);
    setRoleDropdownOpen(false);
  }, [pathname]);

  // Handle click outside for role dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(e.target as Node)) {
        setRoleDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInvestorDropdownEnter = () => {
    if (investorTimeoutRef.current) clearTimeout(investorTimeoutRef.current);
    setInvestorDropdownOpen(true);
    setEntrepreneurDropdownOpen(false);
  };

  const handleInvestorDropdownLeave = () => {
    investorTimeoutRef.current = setTimeout(() => {
      setInvestorDropdownOpen(false);
    }, 180);
  };

  const handleEntrepreneurDropdownEnter = () => {
    if (entrepreneurTimeoutRef.current) clearTimeout(entrepreneurTimeoutRef.current);
    setEntrepreneurDropdownOpen(true);
    setInvestorDropdownOpen(false);
  };

  const handleEntrepreneurDropdownLeave = () => {
    entrepreneurTimeoutRef.current = setTimeout(() => {
      setEntrepreneurDropdownOpen(false);
    }, 180);
  };

  const navLinks = [
    { name: "Discover", href: "/" },
    { name: "For Entrepreneurs", href: "/for-entrepreneurs" },
    { name: "For Investors", href: "/for-investors" },
    { name: "Opportunities", href: "/opportunities" },
    { name: "How It Works", href: "/how-it-works" },
    { name: "About", href: "/about" },
  ];

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/" || pathname === "/discover";
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      <header
        className={cn(
        "sticky top-0 w-full z-50 transition-all duration-200 bg-[#F4FAFD]/95 backdrop-blur-md border-b border-[#DCECF2]",
        scrolled ? "shadow-sm" : "",
        className
      )}
    >
      <div className="w-full px-3.5 sm:px-6 lg:px-6 xl:px-10 2xl:px-12 py-3 lg:py-3.5 flex items-center justify-between flex-nowrap min-w-0">
        {/* Official Brand Logo */}
        <Link
          href="/"
          className="flex items-center group transition-opacity hover:opacity-90 shrink-0 mr-3 lg:mr-4 xl:mr-8 2xl:mr-10 select-none"
        >
          <BrandLogo size="md" showTagline={false} />
        </Link>

        {/* Center Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center justify-center gap-1 xl:gap-3.5 2xl:gap-6 flex-1 min-w-0 flex-nowrap px-1">
          {navLinks.map((link) => {
            const active = isActive(link.href);

            if (link.href === "/for-entrepreneurs") {
              return (
                <div
                  key={link.name}
                  className="relative group py-1 shrink-0"
                  onMouseEnter={handleEntrepreneurDropdownEnter}
                  onMouseLeave={handleEntrepreneurDropdownLeave}
                >
                  <Link
                    href={link.href}
                    className={cn(
                      "text-[12.5px] lg:text-[13px] xl:text-[14px] 2xl:text-[14.5px] whitespace-nowrap shrink-0 transition-colors py-1 px-1.5 xl:px-2.5 rounded-lg relative font-medium select-none inline-flex items-center gap-0.5 xl:gap-1",
                      active
                        ? "text-[#00658F] font-bold"
                        : "text-[#5F7180] hover:text-[#0A192A] hover:bg-[#EBF6FC]/50"
                    )}
                  >
                    <span className="whitespace-nowrap">{link.name}</span>
                    <span
                      className={cn(
                        "material-symbols-outlined text-[15px] xl:text-[16px] transition-transform duration-200 shrink-0",
                        entrepreneurDropdownOpen ? "rotate-180 text-[#00658F]" : "text-[#5F7180] group-hover:text-[#0A192A]"
                      )}
                    >
                      expand_more
                    </span>
                    {active && (
                      <motion.div
                        layoutId="headerUnderline"
                        className="absolute -bottom-1 left-1.5 right-1.5 xl:left-2.5 xl:right-2.5 h-[2px] bg-[#00658F] rounded-full"
                        transition={{ type: "spring", stiffness: 450, damping: 35 }}
                      />
                    )}
                  </Link>

                  {/* Dropdown Menu */}
                  <AnimatePresence>
                    {entrepreneurDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.98 }}
                        transition={{ duration: 0.16, ease: "easeOut" }}
                        className="absolute top-full left-1/2 -translate-x-1/2 pt-2 z-50 w-[380px]"
                      >
                        <div className="bg-white/95 backdrop-blur-xl border border-[#DCECF2] rounded-2xl p-2.5 shadow-[0_16px_40px_rgba(10,25,42,0.12)] space-y-1">
                          {/* 1. Find Investors */}
                          <Link
                            href="/investors"
                            onClick={() => setEntrepreneurDropdownOpen(false)}
                            className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-[#F4FAFD] transition-colors group/item"
                          >
                            <div className="w-9 h-9 rounded-xl bg-[#EBF6FC] text-[#00A6E8] group-hover/item:bg-[#00A6E8] group-hover/item:text-white flex items-center justify-center shrink-0 transition-colors shadow-xs">
                              <span className="material-symbols-outlined text-[20px]">person_search</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-bold text-[#0A192A] group-hover/item:text-[#00658F] transition-colors">
                                Find Investors
                              </div>
                              <p className="text-xs text-[#5F7180] leading-snug mt-0.5">
                                Search and connect with verified angel investors, venture funds &amp; capital partners.
                              </p>
                            </div>
                          </Link>

                          {/* 2. List Your Venture */}
                          <Link
                            href="/profile/listings"
                            onClick={handleListVentureClick}
                            className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-[#F4FAFD] transition-colors group/item"
                          >
                            <div className="w-9 h-9 rounded-xl bg-[#EBF6FC] text-[#00A6E8] group-hover/item:bg-[#00A6E8] group-hover/item:text-white flex items-center justify-center shrink-0 transition-colors shadow-xs">
                              <span className="material-symbols-outlined text-[20px]">rocket_launch</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-bold text-[#0A192A] group-hover/item:text-[#00658F] transition-colors">
                                List Your Venture
                              </div>
                              <p className="text-xs text-[#5F7180] leading-snug mt-0.5">
                                Publish business, franchise or funding opportunities to reach accredited investors.
                              </p>
                            </div>
                          </Link>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            }

            if (link.href === "/for-investors") {
              return (
                <div
                  key={link.name}
                  className="relative group py-1 shrink-0"
                  onMouseEnter={handleInvestorDropdownEnter}
                  onMouseLeave={handleInvestorDropdownLeave}
                >
                  <Link
                    href={link.href}
                    className={cn(
                      "text-[12.5px] lg:text-[13px] xl:text-[14px] 2xl:text-[14.5px] whitespace-nowrap shrink-0 transition-colors py-1 px-1.5 xl:px-2.5 rounded-lg relative font-medium select-none inline-flex items-center gap-0.5 xl:gap-1",
                      active
                        ? "text-[#00658F] font-bold"
                        : "text-[#5F7180] hover:text-[#0A192A] hover:bg-[#EBF6FC]/50"
                    )}
                  >
                    <span className="whitespace-nowrap">{link.name}</span>
                    <span
                      className={cn(
                        "material-symbols-outlined text-[15px] xl:text-[16px] transition-transform duration-200 shrink-0",
                        investorDropdownOpen ? "rotate-180 text-[#00658F]" : "text-[#5F7180] group-hover:text-[#0A192A]"
                      )}
                    >
                      expand_more
                    </span>
                    {active && (
                      <motion.div
                        layoutId="headerUnderline"
                        className="absolute -bottom-1 left-1.5 right-1.5 xl:left-2.5 xl:right-2.5 h-[2px] bg-[#00658F] rounded-full"
                        transition={{ type: "spring", stiffness: 450, damping: 35 }}
                      />
                    )}
                  </Link>

                  {/* Dropdown Menu */}
                  <AnimatePresence>
                    {investorDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.98 }}
                        transition={{ duration: 0.16, ease: "easeOut" }}
                        className="absolute top-full left-1/2 -translate-x-1/2 pt-2 z-50 w-[380px]"
                      >
                        <div className="bg-white/95 backdrop-blur-xl border border-[#DCECF2] rounded-2xl p-2.5 shadow-[0_16px_40px_rgba(10,25,42,0.12)] space-y-1">
                          {/* 1. Explore Opportunities */}
                          <Link
                            href="/opportunities"
                            onClick={() => setInvestorDropdownOpen(false)}
                            className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-[#F4FAFD] transition-colors group/item"
                          >
                            <div className="w-9 h-9 rounded-xl bg-[#EBF6FC] text-[#00A6E8] group-hover/item:bg-[#00A6E8] group-hover/item:text-white flex items-center justify-center shrink-0 transition-colors shadow-xs">
                              <span className="material-symbols-outlined text-[20px]">domain</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-bold text-[#0A192A] group-hover/item:text-[#00658F] transition-colors">
                                Explore Opportunities
                              </div>
                              <p className="text-xs text-[#5F7180] leading-snug mt-0.5">
                                Browse curated businesses, startups & investment ventures seeking capital.
                              </p>
                            </div>
                          </Link>

                          {/* 2. Create Investor Profile */}
                          <Link
                            href="/profile/investor"
                            onClick={handleInvestorProfileClick}
                            className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-[#F4FAFD] transition-colors group/item"
                          >
                            <div className="w-9 h-9 rounded-xl bg-[#EBF6FC] text-[#00A6E8] group-hover/item:bg-[#00A6E8] group-hover/item:text-white flex items-center justify-center shrink-0 transition-colors shadow-xs">
                              <span className="material-symbols-outlined text-[20px]">badge</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-bold text-[#0A192A] group-hover/item:text-[#00658F] transition-colors">
                                My Investor Profile
                              </div>
                              <p className="text-xs text-[#5F7180] leading-snug mt-0.5">
                                Create and manage the investor profile that entrepreneurs can discover on Wenture India. Add your investment interests, experience, preferred sectors and other details.
                              </p>
                            </div>
                          </Link>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            }

            return (
              <Link
                key={link.name}
                href={link.href}
                className={cn(
                  "text-[12.5px] lg:text-[13px] xl:text-[14px] 2xl:text-[14.5px] whitespace-nowrap shrink-0 transition-colors py-1 px-1.5 xl:px-2.5 rounded-lg relative font-medium select-none inline-flex items-center",
                  active
                    ? "text-[#00658F] font-bold"
                    : "text-[#5F7180] hover:text-[#0A192A] hover:bg-[#EBF6FC]/50"
                )}
              >
                <span className="whitespace-nowrap">{link.name}</span>
                {active && (
                  <motion.div
                    layoutId="headerUnderline"
                    className="absolute -bottom-1 left-1.5 right-1.5 xl:left-2.5 xl:right-2.5 h-[2px] bg-[#00658F] rounded-full"
                    transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right CTA */}
        {!hideAuth && (
          <div className="hidden lg:flex items-center gap-1.5 xl:gap-2.5 shrink-0 ml-3 lg:ml-4 xl:mr-0 xl:ml-8 2xl:ml-10">
            {isAuthenticated ? (
              <div className="flex items-center gap-1.5 xl:gap-2 whitespace-nowrap shrink-0">
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="px-2.5 xl:px-3 py-1.5 rounded-md text-xs font-bold text-[#00658F] bg-[#F4FAFD] border border-[#DCECF2] hover:bg-[#EBF6FC] flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
                  >
                    <span className="material-symbols-outlined text-[15px] xl:text-[16px]">shield_person</span>
                    <span>Admin</span>
                  </Link>
                )}

                {/* Multi-Role Switcher / Active Role Badge */}
                {roles.includes("investor") && roles.includes("entrepreneur") ? (
                  <div className="relative shrink-0" ref={roleDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                      className="px-2 xl:px-2.5 py-1.5 rounded-md text-xs font-bold text-[#00658F] bg-[#EBF6FC] hover:bg-[#DCECF2] border border-[#DCECF2] flex items-center gap-1 transition-colors whitespace-nowrap cursor-pointer shrink-0"
                      title="Switch active platform role"
                    >
                      <span className="material-symbols-outlined text-[15px] xl:text-[16px] text-[#00A6E8]">
                        {activeRole === "investor" ? "explore" : "rocket_launch"}
                      </span>
                      <span className="capitalize">{activeRole}</span>
                      <span className="material-symbols-outlined text-[13px] xl:text-[14px]">expand_more</span>
                    </button>
                    <AnimatePresence>
                      {roleDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 4, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 4, scale: 0.95 }}
                          className="absolute right-0 mt-1.5 w-44 bg-white border border-[#DCECF2] rounded-xl shadow-lg p-1.5 z-50 space-y-1"
                        >
                          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#5F7180]">
                            Active Role
                          </div>
                          <button
                            type="button"
                            onClick={async () => {
                              setRoleDropdownOpen(false);
                              if (activeRole !== "entrepreneur") {
                                await switchActiveRole("entrepreneur");
                              }
                            }}
                            className={cn(
                              "w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer",
                              activeRole === "entrepreneur"
                                ? "bg-[#EBF6FC] text-[#00658F]"
                                : "text-[#0A192A] hover:bg-[#F4FAFD]"
                            )}
                          >
                            <span className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-[15px]">rocket_launch</span>
                              <span>Entrepreneur</span>
                            </span>
                            {activeRole === "entrepreneur" && (
                              <span className="material-symbols-outlined text-[15px]">check</span>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              setRoleDropdownOpen(false);
                              if (activeRole !== "investor") {
                                await switchActiveRole("investor");
                              }
                            }}
                            className={cn(
                              "w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer",
                              activeRole === "investor"
                                ? "bg-[#EBF6FC] text-[#00658F]"
                                : "text-[#0A192A] hover:bg-[#F4FAFD]"
                            )}
                          >
                            <span className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-[15px]">explore</span>
                              <span>Investor</span>
                            </span>
                            {activeRole === "investor" && (
                              <span className="material-symbols-outlined text-[15px]">check</span>
                            )}
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-[#F4FAFD] text-[#5F7180] border border-[#DCECF2] whitespace-nowrap shrink-0">
                    {activeRole || "Member"}
                  </span>
                )}

                <Link
                  href="/profile"
                  className="px-2.5 xl:px-3 py-1.5 rounded-md text-xs font-bold text-[#0A192A] hover:text-[#00A6E8] flex items-center gap-1 transition-colors border border-transparent hover:border-[#DCECF2] whitespace-nowrap shrink-0"
                >
                  <span className="material-symbols-outlined text-[16px] xl:text-[18px] text-[#00A6E8]">
                    person
                  </span>
                  <span>Profile</span>
                </Link>
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="bg-white border border-[#DCECF2] hover:border-red-300 hover:text-red-600 text-[#0A192A] px-2.5 xl:px-3.5 py-1.5 rounded-md text-xs font-bold transition-all shadow-xs flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px] xl:text-[16px]">logout</span>
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <Link
                href="/signup"
                className="bg-[#00A6E8] hover:bg-[#0093CE] text-white px-3.5 xl:px-5 py-2 rounded-md text-xs xl:text-sm font-bold tracking-normal transition-all duration-200 shadow-xs shadow-[#00A6E8]/20 hover:shadow whitespace-nowrap shrink-0"
              >
                Join Wenture India
              </Link>
            )}
          </div>
        )}

        {/* Mobile Hamburger / Quick CTA */}
        <div className="flex lg:hidden items-center gap-2">
          {!hideAuth && (
            isAuthenticated ? (
              <div className="flex items-center gap-1.5">
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="bg-[#F4FAFD] border border-[#DCECF2] text-xs font-bold text-[#00658F] px-2.5 py-1.5 rounded-md flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[15px]">shield_person</span>
                    <span>Admin</span>
                  </Link>
                )}
                <Link
                  href="/profile"
                  className="bg-white border border-[#DCECF2] text-xs font-bold text-[#0A192A] px-2.5 py-1.5 rounded-md flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px] text-[#00A6E8]">
                    person
                  </span>
                </Link>
              </div>
            ) : (
              <Link
                href="/signup"
                className="bg-[#00A6E8] text-white px-3 py-1.5 rounded-md text-xs font-bold"
              >
                Join
              </Link>
            )
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 text-[#0A192A] hover:text-[#00A6E8] rounded-md focus:outline-none"
            aria-label="Toggle Navigation"
          >
            <span className="material-symbols-outlined text-[26px]">
              {mobileMenuOpen ? "close" : "menu"}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden bg-white border-b border-[#DCECF2] overflow-hidden"
          >
            <div className="px-6 py-5 flex flex-col space-y-3">
              {navLinks.map((link) => {
                const active = isActive(link.href);
                return (
                  <React.Fragment key={link.name}>
                    <Link
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "text-sm py-2 border-b border-slate-100 transition-colors",
                        active
                          ? "text-[#00658F] font-bold"
                          : "text-[#5F7180] hover:text-[#0A192A]"
                      )}
                    >
                      {link.name}
                    </Link>

                    {/* Sub-items under For Entrepreneurs */}
                    {link.href === "/for-entrepreneurs" && (
                      <div className="pl-3 pb-2 pt-1 border-b border-slate-100 flex flex-col gap-2">
                        {/* 1. Find Investors */}
                        <Link
                          href="/investors"
                          onClick={() => setMobileMenuOpen(false)}
                          className={cn(
                            "text-xs py-2 px-3 rounded-xl flex items-start gap-2.5 transition-colors",
                            pathname.startsWith("/investors")
                              ? "bg-[#EBF6FC] text-[#00658F] font-bold border border-[#00A6E8]/30"
                              : "text-[#5F7180] bg-[#F4FAFD] border border-[#DCECF2] hover:text-[#0A192A]"
                          )}
                        >
                          <div className="w-6 h-6 rounded-md bg-[#EBF6FC] text-[#00A6E8] flex items-center justify-center shrink-0 mt-0.5">
                            <span className="material-symbols-outlined text-[15px]">person_search</span>
                          </div>
                          <div>
                            <div className="font-bold text-[#0A192A]">Find Investors</div>
                            <div className="text-[11px] text-[#5F7180] leading-snug mt-0.5">
                              Search and connect with verified angel investors, VC funds &amp; capital partners.
                            </div>
                          </div>
                        </Link>

                        {/* 2. List Your Venture */}
                        <Link
                          href="/profile/listings"
                          onClick={handleListVentureClick}
                          className={cn(
                            "text-xs py-2 px-3 rounded-xl flex items-start gap-2.5 transition-colors",
                            pathname.startsWith("/profile/listings")
                              ? "bg-[#EBF6FC] text-[#00658F] font-bold border border-[#00A6E8]/30"
                              : "text-[#5F7180] bg-[#F4FAFD] border border-[#DCECF2] hover:text-[#0A192A]"
                          )}
                        >
                          <div className="w-6 h-6 rounded-md bg-[#EBF6FC] text-[#00A6E8] flex items-center justify-center shrink-0 mt-0.5">
                            <span className="material-symbols-outlined text-[15px]">rocket_launch</span>
                          </div>
                          <div>
                            <div className="font-bold text-[#0A192A]">List Your Venture</div>
                            <div className="text-[11px] text-[#5F7180] leading-snug">Publish opportunities to reach accredited investors</div>
                          </div>
                        </Link>
                      </div>
                    )}

                    {/* Sub-items under For Investors */}
                    {link.href === "/for-investors" && (
                      <div className="pl-3 pb-2 pt-1 border-b border-slate-100 flex flex-col gap-2">
                        {/* 1. Explore Opportunities */}
                        <Link
                          href="/opportunities"
                          onClick={() => setMobileMenuOpen(false)}
                          className={cn(
                            "text-xs py-2 px-3 rounded-xl flex items-start gap-2.5 transition-colors",
                            pathname.startsWith("/opportunities")
                              ? "bg-[#EBF6FC] text-[#00658F] font-bold border border-[#00A6E8]/30"
                              : "text-[#5F7180] bg-[#F4FAFD] border border-[#DCECF2] hover:text-[#0A192A]"
                          )}
                        >
                          <div className="w-6 h-6 rounded-md bg-[#EBF6FC] text-[#00A6E8] flex items-center justify-center shrink-0 mt-0.5">
                            <span className="material-symbols-outlined text-[15px]">domain</span>
                          </div>
                          <div>
                            <div className="font-bold text-[#0A192A]">Explore Opportunities</div>
                            <div className="text-[11px] text-[#5F7180] leading-snug">Browse vetted businesses & investment ventures</div>
                          </div>
                        </Link>

                        {/* 2. Create Investor Profile */}
                        <Link
                          href="/profile/investor"
                          onClick={handleInvestorProfileClick}
                          className={cn(
                            "text-xs py-2 px-3 rounded-xl flex items-start gap-2.5 transition-colors",
                            pathname.startsWith("/profile/investor")
                              ? "bg-[#EBF6FC] text-[#00658F] font-bold border border-[#00A6E8]/30"
                              : "text-[#5F7180] bg-[#F4FAFD] border border-[#DCECF2] hover:text-[#0A192A]"
                          )}
                        >
                          <div className="w-6 h-6 rounded-md bg-[#EBF6FC] text-[#00A6E8] flex items-center justify-center shrink-0 mt-0.5">
                            <span className="material-symbols-outlined text-[15px]">badge</span>
                          </div>
                          <div>
                            <div className="font-bold text-[#0A192A]">My Investor Profile</div>
                            <div className="text-[11px] text-[#5F7180] leading-snug mt-0.5">
                              Create and manage the investor profile that entrepreneurs can discover on Wenture India.
                            </div>
                          </div>
                        </Link>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}

              {!hideAuth && (
                <div className="pt-2 flex flex-col gap-2">
                  {isAuthenticated ? (
                    <>
                      {/* Mobile Multi-Role Switcher */}
                      {roles.includes("investor") && roles.includes("entrepreneur") && (
                        <div className="bg-[#F4FAFD] border border-[#DCECF2] rounded-xl p-2.5 space-y-2">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-[#5F7180] px-1 flex items-center justify-between">
                            <span>Active Platform Role</span>
                            <span className="capitalize text-[#00658F] font-extrabold">{activeRole}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={async () => {
                                if (activeRole !== "entrepreneur") {
                                  await switchActiveRole("entrepreneur");
                                }
                              }}
                              className={cn(
                                "py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors",
                                activeRole === "entrepreneur"
                                  ? "bg-[#00A6E8] text-white shadow-xs"
                                  : "bg-white text-[#0A192A] border border-[#DCECF2]"
                              )}
                            >
                              <span className="material-symbols-outlined text-[15px]">rocket_launch</span>
                              <span>Entrepreneur</span>
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                if (activeRole !== "investor") {
                                  await switchActiveRole("investor");
                                }
                              }}
                              className={cn(
                                "py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors",
                                activeRole === "investor"
                                  ? "bg-[#00A6E8] text-white shadow-xs"
                                  : "bg-white text-[#0A192A] border border-[#DCECF2]"
                              )}
                            >
                              <span className="material-symbols-outlined text-[15px]">explore</span>
                              <span>Investor</span>
                            </button>
                          </div>
                        </div>
                      )}

                      <Link
                        href="/profile"
                        onClick={() => setMobileMenuOpen(false)}
                        className="w-full text-center py-2.5 rounded-md border border-[#DCECF2] text-[#0A192A] font-bold text-xs hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-[16px] text-[#00A6E8]">
                          person
                        </span>
                        <span>My Profile</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          signOut();
                          setMobileMenuOpen(false);
                        }}
                        className="w-full text-center py-2.5 rounded-md bg-red-50 text-red-700 font-bold text-xs border border-red-200"
                      >
                        Sign Out
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/signup"
                        onClick={() => setMobileMenuOpen(false)}
                        className="w-full text-center py-2.5 rounded-md bg-[#00A6E8] text-white font-bold text-xs hover:bg-[#0093CE] transition-colors"
                      >
                        Join Wenture India
                      </Link>
                      <Link
                        href="/login"
                        onClick={() => setMobileMenuOpen(false)}
                        className="w-full text-center py-2 rounded-md border border-[#DCECF2] text-[#5F7180] font-semibold text-xs hover:text-[#0A192A] hover:bg-slate-50 transition-colors"
                      >
                        Already have an account? Sign In
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      </header>

      {/* Cross-Role Navigation Confirmation Modal */}
      {roleSwitchModalConfig && (
        <RoleSwitchModal
          isOpen={roleSwitchModalConfig.isOpen}
          targetRole={roleSwitchModalConfig.targetRole}
          targetPath={roleSwitchModalConfig.targetPath}
          onClose={() => setRoleSwitchModalConfig(null)}
        />
      )}
    </>
  );
}
