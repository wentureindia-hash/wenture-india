import React from "react";
import { Metadata } from "next";
import { AuthSplitCard } from "@/components/forms/auth-split-card";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export const metadata: Metadata = {
  title: "Request Access | Wenture India International",
  description: "Join the verified global investment and venture scaling network.",
};

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-[#F6FAFF] flex flex-col justify-between selection:bg-primary-container selection:text-white">
      <Navbar />

      <main className="flex-grow flex items-center justify-center px-3.5 sm:px-6 md:p-margin-desktop py-8 sm:py-12">
        <AuthSplitCard initialMode="signup" initialRole="investor" />
      </main>

      <Footer />
    </div>
  );
}
