"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import {
  investorLoginSchema,
  investorSignupSchema,
  InvestorLoginInput,
  InvestorSignupInput,
} from "@/lib/validation/auth-schemas";
import { signInUser, signUpUser } from "@/lib/firebase/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface InvestorAuthFormProps {
  mode: "login" | "signup";
}

export function InvestorAuthForm({ mode }: InvestorAuthFormProps) {
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Login Form Hook
  const {
    register: registerLogin,
    handleSubmit: handleSubmitLogin,
    formState: { errors: errorsLogin },
  } = useForm<InvestorLoginInput>({
    resolver: zodResolver(investorLoginSchema),
    defaultValues: { email: "", password: "", rememberMe: false },
  });

  // Signup Form Hook
  const {
    register: registerSignup,
    handleSubmit: handleSubmitSignup,
    formState: { errors: errorsSignup },
  } = useForm<InvestorSignupInput>({
    resolver: zodResolver(investorSignupSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      location: "",
      password: "",
      confirmPassword: "",
      terms: false,
    },
  });

  const onLoginSubmit = async (data: InvestorLoginInput) => {
    setLoading(true);
    setServerError(null);
    setSuccessMessage(null);

    const res = await signInUser(data.email, data.password);
    setLoading(false);

    if (res.error) {
      setServerError(res.error);
    } else {
      setSuccessMessage("Authentication successful! Redirecting to investor portal...");
    }
  };

  const onSignupSubmit = async (data: InvestorSignupInput) => {
    setLoading(true);
    setServerError(null);
    setSuccessMessage(null);

    const res = await signUpUser(data.email, data.password, {
      fullName: data.fullName,
      phone: data.phone,
      location: data.location,
      role: "investor",
    });
    setLoading(false);

    if (res.error) {
      setServerError(res.error);
    } else {
      setSuccessMessage("Profile application submitted successfully! Welcome to Wenture India.");
    }
  };

  if (mode === "login") {
    return (
      <form onSubmit={handleSubmitLogin(onLoginSubmit)} className="space-y-4">
        {serverError && (
          <div className="p-3.5 rounded-lg bg-error-container text-on-error-container text-sm font-body-md">
            {serverError}
          </div>
        )}
        {successMessage && (
          <div className="p-3.5 rounded-lg bg-surface-container-low text-primary text-sm font-body-md">
            {successMessage}
          </div>
        )}

        <Input
          id="email"
          label="Corporate Email"
          type="email"
          placeholder="name@institution.com"
          icon="mail"
          error={errorsLogin.email?.message}
          {...registerLogin("email")}
        />

        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label
              htmlFor="password"
              className="block font-label-caps text-xs font-semibold text-on-surface-variant uppercase tracking-wider"
            >
              Password
            </label>
            <a
              href="#"
              className="text-xs text-primary-container hover:text-primary font-semibold transition-colors"
            >
              Forgot Password?
            </a>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            icon="lock"
            error={errorsLogin.password?.message}
            {...registerLogin("password")}
          />
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2"
          >
            {loading ? "Authenticating..." : "Login as Investor"}
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </Button>
        </div>

        <div className="text-center pt-3">
          <p className="font-body-md text-sm text-secondary">
            Not registered yet?{" "}
            <Link
              href="/signup/investor"
              className="text-primary-container font-semibold hover:underline"
            >
              Apply for Access
            </Link>
          </p>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmitSignup(onSignupSubmit)} className="space-y-4">
      {serverError && (
        <div className="p-3.5 rounded-lg bg-error-container text-on-error-container text-sm font-body-md">
          {serverError}
        </div>
      )}
      {successMessage && (
        <div className="p-3.5 rounded-lg bg-surface-container-low text-primary text-sm font-body-md">
          {successMessage}
        </div>
      )}

      <Input
        id="fullName"
        label="Full Name"
        placeholder="Jane Doe"
        icon="person"
        error={errorsSignup.fullName?.message}
        {...registerSignup("fullName")}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          id="email"
          label="Work Email"
          type="email"
          placeholder="jane@capital.com"
          icon="mail"
          error={errorsSignup.email?.message}
          {...registerSignup("email")}
        />

        <Input
          id="phone"
          label="Phone Number"
          type="tel"
          placeholder="+91 98418 81008"
          icon="call"
          error={errorsSignup.phone?.message}
          {...registerSignup("phone")}
        />
      </div>

      <Input
        id="location"
        label="Primary Location"
        placeholder="City, Country"
        icon="location_on"
        error={errorsSignup.location?.message}
        {...registerSignup("location")}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          id="password"
          label="Password"
          type="password"
          placeholder="••••••••"
          icon="lock"
          error={errorsSignup.password?.message}
          {...registerSignup("password")}
        />

        <Input
          id="confirmPassword"
          label="Confirm Password"
          type="password"
          placeholder="••••••••"
          icon="lock"
          error={errorsSignup.confirmPassword?.message}
          {...registerSignup("confirmPassword")}
        />
      </div>

      <div className="flex items-start gap-2 pt-2">
        <input
          id="terms"
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-border-subtle text-primary-container focus:ring-primary-container"
          {...registerSignup("terms")}
        />
        <label htmlFor="terms" className="font-body-md text-xs text-on-surface-variant">
          I agree to the{" "}
          <span className="text-primary-container hover:underline cursor-pointer">
            Terms of Service
          </span>{" "}
          and{" "}
          <span className="text-primary-container hover:underline cursor-pointer">
            Privacy Policy
          </span>
          .
        </label>
      </div>
      {errorsSignup.terms && (
        <p className="text-xs text-error">{errorsSignup.terms.message}</p>
      )}

      <div className="pt-2">
        <Button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3.5"
        >
          {loading ? "Creating Profile..." : "Join as Investor"}
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </Button>
      </div>

      <div className="text-center pt-2">
        <p className="font-body-md text-sm text-secondary">
          Already have an account?{" "}
          <Link
            href="/login/investor"
            className="text-primary-container font-semibold hover:underline"
          >
            Login
          </Link>
        </p>
      </div>
    </form>
  );
}
