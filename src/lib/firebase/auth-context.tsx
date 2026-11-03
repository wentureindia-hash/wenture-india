"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User } from "firebase/auth";
import { auth, db } from "./client";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import {
  getUserProfile,
  signOutUser,
  checkIsAdmin,
  switchActiveRole as switchRoleInDb,
  addRoleToAccount,
  UserProfile,
  UserRole,
} from "./auth";

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole | null;
  roles: UserRole[];
  activeRole: UserRole | null;
  isEntrepreneur: boolean;
  isInvestor: boolean;
  hasInvestorProfile: boolean;
  isAdmin: boolean;
  loading: boolean;
  isAuthenticated: boolean;
  hasRole: (role: UserRole) => boolean;
  switchActiveRole: (targetRole: UserRole) => Promise<{ error: string | null }>;
  addRole: (
    newRole: UserRole,
    additionalData?: {
      companyName?: string;
      sector?: string;
      phone?: string;
      location?: string;
    }
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  role: null,
  roles: [],
  activeRole: null,
  isEntrepreneur: false,
  isInvestor: false,
  hasInvestorProfile: false,
  isAdmin: false,
  loading: true,
  isAuthenticated: false,
  hasRole: () => false,
  switchActiveRole: async () => ({ error: "Not initialized" }),
  addRole: async () => ({ error: "Not initialized" }),
  signOut: async () => ({ error: null }),
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [hasInvestorProfile, setHasInvestorProfile] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (currentUser: User | null) => {
    if (!currentUser) {
      setProfile(null);
      setIsAdmin(false);
      setHasInvestorProfile(false);
      return;
    }
    const { profile: userProfile } = await getUserProfile(currentUser.uid);
    setProfile(userProfile);
    const adminStatus = await checkIsAdmin(currentUser, userProfile);
    setIsAdmin(adminStatus);

    try {
      const invRef = doc(db, "investorProfiles", currentUser.uid);
      const invSnap = await getDoc(invRef);
      setHasInvestorProfile(invSnap.exists());
    } catch {
      setHasInvestorProfile(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      await fetchProfile(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    const res = await signOutUser();
    if (!res.error) {
      setUser(null);
      setProfile(null);
      setHasInvestorProfile(false);
    }
    return res;
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user);
    }
  };

  const switchActiveRole = async (targetRole: UserRole) => {
    const res = await switchRoleInDb(targetRole);
    if (!res.error) {
      if (user) {
        await fetchProfile(user);
      }
    }
    return res;
  };

  const addRole = async (
    newRole: UserRole,
    additionalData?: {
      companyName?: string;
      sector?: string;
      phone?: string;
      location?: string;
    }
  ) => {
    const res = await addRoleToAccount(newRole, additionalData);
    if (!res.error) {
      if (user) {
        await fetchProfile(user);
      }
    }
    return res;
  };

  const rawActive = profile?.activeRole || profile?.role || null;
  const activeRole: UserRole | null = rawActive
    ? (String(rawActive).toLowerCase().trim() as UserRole)
    : null;

  const rawRoles =
    profile?.roles && profile.roles.length > 0
      ? profile.roles
      : profile?.role
      ? [profile.role]
      : [];

  const userRoles: UserRole[] = rawRoles.map(
    (r) => String(r).toLowerCase().trim() as UserRole
  );

  const isInvestor = !!user && activeRole === "investor";
  const isEntrepreneur = !!user && activeRole === "entrepreneur";
  const hasRole = (r: UserRole) => userRoles.includes(String(r).toLowerCase().trim() as UserRole);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role: activeRole,
        roles: userRoles,
        activeRole,
        isEntrepreneur,
        isInvestor,
        hasInvestorProfile,
        isAdmin,
        loading,
        isAuthenticated: !!user,
        hasRole,
        switchActiveRole,
        addRole,
        signOut: handleSignOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
