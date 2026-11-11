"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInUser, signUpUser, resetUserPassword, addRoleToAccount, UserRole } from "@/lib/firebase/auth";
import { BrandLogo } from "@/components/brand-logo";

interface AuthSplitCardProps {
  initialMode?: "login" | "signup";
  initialRole?: UserRole;
}

export function AuthSplitCard({
  initialMode = "login",
  initialRole = "investor",
}: AuthSplitCardProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [role, setRole] = useState<UserRole>(initialRole);

  // Form states
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [sector, setSector] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [emailExistsPrompt, setEmailExistsPrompt] = useState(false);
  const [pendingRoleAddition, setPendingRoleAddition] = useState<{
    missingRole: UserRole;
    existingRoles: UserRole[];
  } | null>(null);

  const handlePasswordReset = async () => {
    if (!email) {
      setErrorMsg("Please enter your email address first, then click Forgot.");
      return;
    }
    setErrorMsg(null);
    setLoading(true);
    const res = await resetUserPassword(email);
    setLoading(false);
    if (res.error) {
      setErrorMsg(res.error);
    } else {
      setSuccessMsg("Password reset link sent! Check your inbox.");
    }
  };

  const handleConfirmAddRole = async () => {
    if (!pendingRoleAddition) return;
    setLoading(true);
    setErrorMsg(null);
    const targetRole = pendingRoleAddition.missingRole;
    const res = await addRoleToAccount(targetRole, {
      companyName: targetRole === "entrepreneur" ? companyName : undefined,
      sector: targetRole === "entrepreneur" ? sector : undefined,
      phone,
      location,
    });
    setLoading(false);
    if (res.error) {
      setErrorMsg(res.error);
    } else {
      setSuccessMsg(`Successfully added ${targetRole} role! Redirecting...`);
      setPendingRoleAddition(null);
      setTimeout(() => {
        router.push(targetRole === "investor" ? "/for-investors" : "/for-entrepreneurs");
      }, 1200);
    }
  };

  const handleContinueExistingRole = () => {
    if (!pendingRoleAddition) return;
    const primaryRole = pendingRoleAddition.existingRoles[0] || "entrepreneur";
    router.push(primaryRole === "investor" ? "/for-investors" : "/for-entrepreneurs");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setEmailExistsPrompt(false);
    setPendingRoleAddition(null);
    setLoading(true);

    if (mode === "login") {
      if (!email || !password) {
        setErrorMsg("Please provide both email and password.");
        setLoading(false);
        return;
      }
      const res = await signInUser(email, password, role);
      setLoading(false);
      if (res.error) {
        setErrorMsg(res.error);
      } else if (res.needsRoleAddition && res.missingRole) {
        setPendingRoleAddition({
          missingRole: res.missingRole,
          existingRoles: res.existingRoles || ["entrepreneur"],
        });
      } else {
        setSuccessMsg("Authentication successful! Redirecting...");
        setTimeout(() => {
          router.push(role === "investor" ? "/for-investors" : "/for-entrepreneurs");
        }, 1200);
      }
    } else {
      // Signup mode validation
      if (!fullName || !email || !password) {
        setErrorMsg("Please fill in all required fields.");
        setLoading(false);
        return;
      }
      if (password.length < 6) {
        setErrorMsg("Password must be at least 6 characters.");
        setLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg("Passwords do not match.");
        setLoading(false);
        return;
      }

      const res = await signUpUser(email, password, {
        name: fullName,
        companyName: role === "entrepreneur" ? companyName : undefined,
        phone,
        location,
        sector: role === "entrepreneur" ? sector : undefined,
        role,
      });
      setLoading(false);
      if (res.error) {
        if (res.emailInUse) {
          setEmailExistsPrompt(true);
        } else {
          setErrorMsg(res.error);
        }
      } else {
        setSuccessMsg("Profile registered successfully! Welcome to Wenture India.");
        setTimeout(() => {
          router.push(role === "investor" ? "/for-investors" : "/for-entrepreneurs");
        }, 1500);
      }
    }
  };

  return (
    <div className="w-full max-w-[1020px] mx-auto bg-white rounded-2xl shadow-[0_10px_40px_rgba(10,25,42,0.08)] border border-[#DCECF2] overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[580px]">
      {/* ============================================================ */}
      {/* LEFT PANEL: Geometric Crystalline 3D Visual + Brand Context */}
      {/* ============================================================ */}
      <div className="lg:col-span-6 relative p-5 sm:p-8 md:p-10 flex flex-col justify-between overflow-hidden border-b lg:border-b-0 lg:border-r border-[#DCECF2] bg-[#F4FAFD]">
        {/* Premium 3D Crystalline Origami Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/auth-bg.jpg"
            alt="Wenture India Aesthetic Architecture"
            fill
            priority
            className="object-cover opacity-85 brightness-105 contrast-[1.02]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#EBF6FB]/90 via-[#F4FAFD]/40 to-[#F4FAFD]/80" />
        </div>

        {/* Ambient radial lighting */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-white/40 rounded-full blur-3xl pointer-events-none" />

        {/* Top: Brand Header */}
        <div className="relative z-10">
          <Link href="/" className="inline-block transition-opacity hover:opacity-90">
            <BrandLogo size="md" showTagline={false} />
          </Link>
          <p className="text-xs sm:text-sm font-normal text-[#5F7180] mt-2">
            The intersection of vision and capital.
          </p>
        </div>

        {/* Center: Floating Glassmorphic Mini-Card Mockup */}
        <div className="relative z-10 my-8 self-end w-48 sm:w-56 bg-white/60 backdrop-blur-md rounded-2xl p-4 border border-white/80 shadow-[0_8px_24px_rgba(10,25,42,0.06)] transform rotate-1 hover:rotate-0 transition-transform duration-300">
          <div className="flex items-center gap-2 mb-3">
            <BrandLogo size="sm" />
          </div>

          <div className="space-y-2 mb-3">
            <div className="h-2 bg-slate-200/80 rounded w-full" />
            <div className="h-2 bg-slate-200/80 rounded w-3/4" />
          </div>

          <div className="h-5 bg-[#00A6E8]/30 rounded-md flex items-center justify-center text-[9px] font-bold text-[#00658F]">
            Sign In
          </div>
        </div>

        {/* Bottom: "ENGINEERED FOR SCALE" Badge (From User's Image) */}
        <div className="relative z-10 flex items-center gap-2 text-[#00A6E8]">
          <span className="material-symbols-outlined text-[20px] font-bold">
            ssid_chart
          </span>
          <span className="text-xs font-bold uppercase tracking-wider">
            ENGINEERED FOR SCALE
          </span>
        </div>
      </div>

      {/* ============================================================ */}
      {/* RIGHT PANEL: Authentic Form Matching Uploaded Design */}
      {/* ============================================================ */}
      <div className="lg:col-span-6 p-5 sm:p-8 md:p-12 flex flex-col justify-center bg-white">
        <div className="w-full max-w-[400px] mx-auto">
          {/* Headline & Subtitle */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#0A192A] tracking-tight">
              {mode === "login" ? "Welcome back." : "Create Account."}
            </h1>
            <p className="text-sm font-normal text-[#5F7180] mt-1.5">
              {mode === "login"
                ? "Securely access your global network."
                : "Join our verified global investment ecosystem."}
            </p>
          </div>

          {/* Segmented Role Switcher: INVESTOR / ENTREPRENEUR */}
          <div className="bg-[#F1F6FA] p-1 rounded-xl flex border border-[#E2EDF3] mb-6">
            <button
              type="button"
              onClick={() => setRole("investor")}
              className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-200 ${
                role === "investor"
                  ? "bg-white text-[#0A192A] shadow-sm"
                  : "text-[#5F7180] hover:text-[#0A192A]"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">
                explore
              </span>
              INVESTOR
            </button>

            <button
              type="button"
              onClick={() => setRole("entrepreneur")}
              className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-200 ${
                role === "entrepreneur"
                  ? "bg-white text-[#0A192A] shadow-sm"
                  : "text-[#5F7180] hover:text-[#0A192A]"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">
                rocket_launch
              </span>
              ENTREPRENEUR
            </button>
          </div>

          {/* Error / Success Feedback */}
          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="mb-4 p-3 rounded-lg bg-cyan-50 border border-cyan-200 text-[#00658F] text-xs font-medium">
              {successMsg}
            </div>
          )}

          {/* Existing Account Detected Alert */}
          {emailExistsPrompt && (
            <div className="mb-5 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2.5">
              <div className="flex items-center gap-2 font-bold text-amber-950">
                <span className="material-symbols-outlined text-[18px] text-amber-700">info</span>
                <span>Account Already Exists</span>
              </div>
              <p className="leading-relaxed">
                An account with <strong className="font-semibold text-amber-950">{email}</strong> already exists on Wenture India. Please sign in to access your account and add the <strong className="capitalize">{role}</strong> role.
              </p>
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setErrorMsg(null);
                  setEmailExistsPrompt(false);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-lg text-xs transition-colors shadow-xs"
              >
                <span>Sign In to Existing Account</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
            </div>
          )}

          {/* Multi-Role Addition Flow (Post-Authentication) */}
          {pendingRoleAddition ? (
            <div className="bg-[#F4FAFD] border border-[#00A6E8]/30 rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2.5 text-[#00658F]">
                <span className="material-symbols-outlined text-[24px]">verified_user</span>
                <h3 className="font-bold text-sm sm:text-base text-[#0A192A]">Authentication Verified</h3>
              </div>
              <p className="text-xs text-[#5F7180] leading-relaxed">
                You are securely signed in as an{" "}
                <span className="font-bold text-[#0A192A] capitalize">
                  {pendingRoleAddition.existingRoles.join(", ")}
                </span>
                . Your account does not currently include the{" "}
                <span className="font-bold text-[#00658F] capitalize">
                  {pendingRoleAddition.missingRole}
                </span>{" "}
                role.
              </p>

              {pendingRoleAddition.missingRole === "entrepreneur" && (
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-[#0A192A] mb-1">
                      Company / Enterprise Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Acme Technologies"
                      className="w-full px-3 py-2 bg-white border border-[#DCECF2] rounded-lg text-xs text-[#0A192A] placeholder:text-slate-400 focus:outline-none focus:border-[#00A6E8]"
                    />
                  </div>
                </div>
              )}

              <div className="pt-2 flex flex-col gap-2.5">
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleConfirmAddRole}
                  className="w-full py-3 bg-[#00A6E8] hover:bg-[#0093CE] text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-all shadow-md shadow-[#00A6E8]/20 disabled:opacity-50"
                >
                  {loading ? "ADDING ROLE..." : `Add ${pendingRoleAddition.missingRole} Role & Continue`}
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={handleContinueExistingRole}
                  className="w-full py-2.5 bg-white border border-[#DCECF2] hover:bg-[#F1F6FA] text-[#5F7180] hover:text-[#0A192A] font-bold text-xs rounded-lg transition-all"
                >
                  Continue as {pendingRoleAddition.existingRoles[0]}
                </button>
              </div>
            </div>
          ) : (
            /* Form */
            <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-[#0A192A] mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full px-4 py-3 bg-white border border-[#DCECF2] rounded-lg text-sm text-[#0A192A] placeholder:text-slate-400 focus:outline-none focus:border-[#00A6E8] focus:ring-2 focus:ring-[#00A6E8]/15 transition-all"
                  />
                </div>

                {role === "entrepreneur" && (
                  <div>
                    <label className="block text-xs font-semibold text-[#0A192A] mb-1.5">
                      Company / Enterprise Name
                    </label>
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Acme Technologies"
                      className="w-full px-4 py-3 bg-white border border-[#DCECF2] rounded-lg text-sm text-[#0A192A] placeholder:text-slate-400 focus:outline-none focus:border-[#00A6E8] focus:ring-2 focus:ring-[#00A6E8]/15 transition-all"
                    />
                  </div>
                )}
              </>
            )}

            {/* Email Address */}
            <div>
              <label className="block text-xs font-semibold text-[#0A192A] mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full px-4 py-3 bg-white border border-[#DCECF2] rounded-lg text-sm text-[#0A192A] placeholder:text-slate-400 focus:outline-none focus:border-[#00A6E8] focus:ring-2 focus:ring-[#00A6E8]/15 transition-all"
              />
            </div>

            {mode === "signup" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#0A192A] mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 95407 21008"
                    className="w-full px-4 py-3 bg-white border border-[#DCECF2] rounded-lg text-sm text-[#0A192A] placeholder:text-slate-400 focus:outline-none focus:border-[#00A6E8] focus:ring-2 focus:ring-[#00A6E8]/15 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0A192A] mb-1.5">
                    Location
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="New Delhi, India"
                    className="w-full px-4 py-3 bg-white border border-[#DCECF2] rounded-lg text-sm text-[#0A192A] placeholder:text-slate-400 focus:outline-none focus:border-[#00A6E8] focus:ring-2 focus:ring-[#00A6E8]/15 transition-all"
                  />
                </div>
              </div>
            )}

            {/* Password */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold text-[#0A192A]">
                  Password
                </label>
                {mode === "login" && (
                  <button
                    type="button"
                    onClick={handlePasswordReset}
                    className="text-xs font-semibold text-[#00A6E8] hover:underline"
                  >
                    Forgot?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-11 bg-white border border-[#DCECF2] rounded-lg text-sm text-[#0A192A] placeholder:text-slate-400 focus:outline-none focus:border-[#00A6E8] focus:ring-2 focus:ring-[#00A6E8]/15 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            {mode === "signup" && (
              <div>
                <label className="block text-xs font-semibold text-[#0A192A] mb-1.5">
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-white border border-[#DCECF2] rounded-lg text-sm text-[#0A192A] placeholder:text-slate-400 focus:outline-none focus:border-[#00A6E8] focus:ring-2 focus:ring-[#00A6E8]/15 transition-all"
                />
              </div>
            )}

            {/* Primary Action Button (AUTHENTICATE) */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-[#00A6E8] hover:bg-[#0093CE] text-white font-bold text-sm uppercase tracking-wider rounded-lg transition-all duration-200 shadow-md shadow-[#00A6E8]/25 hover:shadow-lg disabled:opacity-50"
              >
                {loading
                  ? "PROCESSING..."
                  : mode === "login"
                  ? "AUTHENTICATE"
                  : "REQUEST ACCESS"}
              </button>
            </div>
          </form>
          )}

          {/* Footer Note */}
          <div className="mt-6 text-center text-sm text-[#5F7180]">
            {mode === "login" ? (
              <p>
                New to Wenture India?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("signup");
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className="text-[#00658F] font-bold hover:underline"
                >
                  Request Access
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className="text-[#00658F] font-bold hover:underline"
                >
                  Sign In
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
