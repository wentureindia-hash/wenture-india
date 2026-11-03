import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  deleteUser,
  onAuthStateChanged,
  sendPasswordResetEmail,
  User,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "./client";

export type UserRole = "investor" | "entrepreneur" | "admin";

export interface UserProfile {
  uid: string;
  fullName: string;
  name?: string;
  email: string;
  phone?: string;
  role: UserRole; // Active role mirror for backward compatibility
  roles?: UserRole[]; // Array of assigned roles, e.g. ["investor", "entrepreneur"]
  activeRole?: UserRole; // Currently active platform role
  isAdmin?: boolean;
  isVerified?: boolean;
  verificationStatus?: "unsubmitted" | "pending" | "approved" | "rejected";
  companyName?: string;
  sector?: string;
  location?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

/**
 * Normalizes roles and activeRole for backward-compatible multi-role support.
 * Single-role accounts gracefully map to roles: [role], activeRole: role.
 */
export function normalizeUserRoles(data: {
  role?: unknown;
  roles?: unknown;
  activeRole?: unknown;
}): { roles: UserRole[]; activeRole: UserRole } {
  const allowedRoles: UserRole[] = ["investor", "entrepreneur", "admin"];

  let roles: UserRole[] = [];
  if (Array.isArray(data.roles)) {
    roles = data.roles
      .map((r) => String(r).toLowerCase().trim() as UserRole)
      .filter((r) => allowedRoles.includes(r));
  }

  // Fallback to legacy single role field if roles array is empty or absent
  if (roles.length === 0) {
    const legacyRole = (data.role ? String(data.role).toLowerCase().trim() : "entrepreneur") as UserRole;
    roles = [allowedRoles.includes(legacyRole) ? legacyRole : "entrepreneur"];
  }

  // Determine active platform role
  let activeRole: UserRole = "entrepreneur";
  const rawActive = data.activeRole ? String(data.activeRole).toLowerCase().trim() as UserRole : null;
  const rawRole = data.role ? String(data.role).toLowerCase().trim() as UserRole : null;

  if (rawActive && allowedRoles.includes(rawActive)) {
    activeRole = rawActive;
  } else if (rawRole && allowedRoles.includes(rawRole)) {
    activeRole = rawRole;
  } else if (roles.length > 0) {
    activeRole = roles[0];
  }

  // Ensure activeRole is always present in roles list
  if (!roles.includes(activeRole)) {
    roles.push(activeRole);
  }

  return { roles, activeRole };
}

/**
 * Format Firebase Auth error codes into clean, human-friendly messages
 */
export function formatFirebaseAuthError(errorCode?: string, fallback = "Authentication failed"): string {
  if (!errorCode) return fallback;

  switch (errorCode) {
    case "auth/email-already-in-use":
      return "An account with this email already exists.";
    case "auth/wrong-password":
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
      return "Incorrect email or password.";
    case "auth/user-not-found":
      return "No account found with this email address.";
    case "auth/weak-password":
      return "Password is too weak. Please use at least 6 characters.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/too-many-requests":
      return "Too many unsuccessful attempts. Please try again in a few minutes.";
    case "auth/network-request-failed":
      return "Please check your internet connection and try again.";
    case "auth/user-disabled":
      return "This account has been disabled. Please contact Wenture India support.";
    case "auth/requires-recent-login":
      return "Please log in again before performing this action.";
    default:
      return fallback;
  }
}

/**
 * Create or set a user profile in Firestore (users/{uid})
 */
export async function createUserProfile(
  uid: string,
  profileData: Omit<UserProfile, "uid" | "createdAt">
): Promise<{ profile: UserProfile | null; error: string | null }> {
  try {
    const { roles, activeRole } = normalizeUserRoles(profileData);
    const fullProfile: UserProfile = {
      uid,
      ...profileData,
      role: activeRole,
      roles,
      activeRole,
    };

    const docRef = doc(db, "users", uid);
    await setDoc(docRef, {
      ...fullProfile,
      createdAt: serverTimestamp(),
    });

    return { profile: fullProfile, error: null };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return { profile: null, error: error.message || "Failed to create user profile in database." };
  }
}

/**
 * Get user profile from Firestore (users/{uid})
 */
export async function getUserProfile(uid: string): Promise<{ profile: UserProfile | null; error: string | null }> {
  try {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      const resolvedName = data.fullName || data.name || "";
      const { roles, activeRole } = normalizeUserRoles(data);

      const profile: UserProfile = {
        uid,
        fullName: resolvedName,
        name: resolvedName,
        email: data.email || "",
        phone: data.phone || "",
        role: activeRole,
        roles,
        activeRole,
        isAdmin: data.role === "admin" || data.isAdmin === true,
        isVerified: data.isVerified === true,
        verificationStatus: data.verificationStatus || "unsubmitted",
        companyName: data.companyName || "",
        sector: data.sector || "",
        location: data.location || "",
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
      return { profile, error: null };
    }

    // Fallback: If no Firestore doc exists yet, initialize from Firebase Auth user
    const currentUser = auth.currentUser;
    if (currentUser && currentUser.uid === uid) {
      const resolvedName = currentUser.displayName || "";
      const fallbackProfile: UserProfile = {
        uid,
        fullName: resolvedName,
        name: resolvedName,
        email: currentUser.email || "",
        phone: currentUser.phoneNumber || "",
        role: "entrepreneur",
        roles: ["entrepreneur"],
        activeRole: "entrepreneur",
        isAdmin: false,
        companyName: "",
        sector: "",
        location: "",
      };
      return { profile: fallbackProfile, error: null };
    }

    return { profile: null, error: "Profile not found." };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return { profile: null, error: error.message || "Failed to fetch user profile." };
  }
}

/**
 * Update user profile in Firestore (users/{auth.currentUser.uid})
 * Strictly uses auth.currentUser.uid to ensure User A can never modify User B's profile.
 */
export async function updateUserProfile(
  dataOrUid:
    | string
    | {
        fullName?: string;
        name?: string;
        phone?: string;
        companyName?: string;
        sector?: string;
        location?: string;
      },
  optionalData?: {
    fullName?: string;
    name?: string;
    phone?: string;
    companyName?: string;
    sector?: string;
    location?: string;
  }
): Promise<{ error: string | null; profile?: UserProfile }> {
  try {
    // 1. Strictly obtain the authenticated user from Firebase Auth
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return { error: "You must be signed in to update your profile." };
    }

    // Always use the verified authenticated UID - never an arbitrary client-passed UID
    const uid = currentUser.uid;
    const data = typeof dataOrUid === "string" ? (optionalData || {}) : dataOrUid;

    const resolvedName = (data.fullName || data.name || "").trim();
    const docRef = doc(db, "users", uid);

    // Prepare fields to write according to expected Firestore structure
    const updatePayload: Record<string, unknown> = {
      fullName: resolvedName,
      name: resolvedName,
      phone: (data.phone || "").trim(),
      location: (data.location || "").trim(),
      email: currentUser.email || "",
      updatedAt: serverTimestamp(),
    };

    if (data.companyName !== undefined) {
      updatePayload.companyName = data.companyName.trim();
    }
    if (data.sector !== undefined) {
      updatePayload.sector = data.sector.trim();
    }

    // setDoc with { merge: true } creates the document if missing,
    // or updates existing fields while preserving non-form fields (role, createdAt)
    await setDoc(docRef, updatePayload, { merge: true });

    return { error: null };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return { error: error.message || "Failed to update profile in database." };
  }
}

/**
 * Sign up a new user (Investor or Entrepreneur) with Email and Password
 */
export async function signUpUser(
  email: string,
  password: string,
  profileData: {
    name?: string;
    fullName?: string;
    phone?: string;
    role: UserRole;
    companyName?: string;
    sector?: string;
    location?: string;
  }
): Promise<{
  user: User | null;
  profile: UserProfile | null;
  error: string | null;
  code?: string;
  emailInUse?: boolean;
}> {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
    const user = userCredential.user;

    const resolvedName = (profileData.fullName || profileData.name || "").trim();
    const targetRole = profileData.role;

    const fullProfile: UserProfile = {
      uid: user.uid,
      email: user.email || email.trim(),
      fullName: resolvedName,
      name: resolvedName,
      phone: (profileData.phone || "").trim(),
      role: targetRole,
      roles: [targetRole],
      activeRole: targetRole,
      isAdmin: false,
      companyName: (profileData.companyName || "").trim(),
      sector: (profileData.sector || "").trim(),
      location: (profileData.location || "").trim(),
    };

    // Store in Firestore users/{uid}
    try {
      await setDoc(doc(db, "users", user.uid), {
        ...fullProfile,
        isAdmin: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch {
      // In offline/initial build environments, fallback profile still resolves
    }

    return { user, profile: fullProfile, error: null };
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    const isEmailInUse = error.code === "auth/email-already-in-use";
    const cleanMsg = formatFirebaseAuthError(error.code, error.message || "Failed to create account.");
    return {
      user: null,
      profile: null,
      error: cleanMsg,
      code: error.code,
      emailInUse: isEmailInUse,
    };
  }
}

/**
 * Sign in existing user with Email and Password & handle multi-role validation seamlessly
 */
export async function signInUser(
  email: string,
  password: string,
  expectedRole?: UserRole
): Promise<{
  user: User | null;
  profile: UserProfile | null;
  error: string | null;
  code?: string;
  needsRoleAddition?: boolean;
  missingRole?: UserRole;
  existingRoles?: UserRole[];
}> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
    const user = userCredential.user;

    // Fetch profile from Firestore with normalized roles
    let profile: UserProfile | null = null;
    try {
      const profileRes = await getUserProfile(user.uid);
      profile = profileRes.profile;
    } catch {
      // Ignore firestore read error if offline
    }

    // Role check & activeRole synchronization if expectedRole is specified
    if (expectedRole && profile) {
      const userRoles = profile.roles || [profile.role];
      const hasExpectedRole = userRoles.includes(expectedRole);

      if (hasExpectedRole) {
        // User already has this role; ensure activeRole matches
        if (profile.activeRole !== expectedRole) {
          try {
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, {
              activeRole: expectedRole,
              role: expectedRole,
              updatedAt: serverTimestamp(),
            });
            profile.activeRole = expectedRole;
            profile.role = expectedRole;
          } catch {
            // Non-blocking in case of offline
          }
        }
      } else {
        // User is authenticated, but does not yet possess the expected role.
        // Return context so UI can prompt user to add the missing role without signing out.
        return {
          user,
          profile,
          error: null,
          needsRoleAddition: true,
          missingRole: expectedRole,
          existingRoles: userRoles,
        };
      }
    }

    return { user, profile, error: null };
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    const cleanMsg = formatFirebaseAuthError(error.code, error.message || "Failed to sign in.");
    return { user: null, profile: null, error: cleanMsg, code: error.code };
  }
}

/**
 * Switch the active role between assigned roles for the current authenticated user
 */
export async function switchActiveRole(targetRole: UserRole): Promise<{ error: string | null; activeRole?: UserRole }> {
  try {
    if (targetRole !== "investor" && targetRole !== "entrepreneur") {
      return { error: "Invalid role selected. Only Investor or Entrepreneur roles can be active." };
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      return { error: "You must be signed in to switch roles." };
    }

    const { profile } = await getUserProfile(currentUser.uid);
    if (!profile) {
      return { error: "User profile not found." };
    }

    const roles = profile.roles || [profile.role];
    if (!roles.includes(targetRole)) {
      return { error: `Your account does not have the ${targetRole} role assigned.` };
    }

    const docRef = doc(db, "users", currentUser.uid);
    await updateDoc(docRef, {
      activeRole: targetRole,
      role: targetRole,
      updatedAt: serverTimestamp(),
    });

    return { error: null, activeRole: targetRole };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return { error: error.message || "Failed to switch active role." };
  }
}

/**
 * Add a new role (Investor or Entrepreneur) to the current authenticated user's account.
 * Strictly prevents self-assignment of administrative roles.
 */
export async function addRoleToAccount(
  newRole: UserRole,
  additionalData?: {
    companyName?: string;
    sector?: string;
    phone?: string;
    location?: string;
  }
): Promise<{ error: string | null; roles?: UserRole[]; activeRole?: UserRole }> {
  try {
    if (newRole !== "investor" && newRole !== "entrepreneur") {
      return { error: "Unauthorized role assignment. Only Investor or Entrepreneur roles may be added." };
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      return { error: "You must be signed in to add a role." };
    }

    const { profile } = await getUserProfile(currentUser.uid);
    const existingRoles = profile?.roles || (profile?.role ? [profile.role] : []);

    const updatedRoles = Array.from(new Set([...existingRoles, newRole]));

    const docRef = doc(db, "users", currentUser.uid);
    const updatePayload: Record<string, unknown> = {
      roles: updatedRoles,
      activeRole: newRole,
      role: newRole,
      updatedAt: serverTimestamp(),
    };

    if (additionalData?.companyName && !profile?.companyName) {
      updatePayload.companyName = additionalData.companyName.trim();
    }
    if (additionalData?.sector && !profile?.sector) {
      updatePayload.sector = additionalData.sector.trim();
    }
    if (additionalData?.phone && !profile?.phone) {
      updatePayload.phone = additionalData.phone.trim();
    }
    if (additionalData?.location && !profile?.location) {
      updatePayload.location = additionalData.location.trim();
    }

    await setDoc(docRef, updatePayload, { merge: true });

    return { error: null, roles: updatedRoles, activeRole: newRole };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return { error: error.message || "Failed to add role to account." };
  }
}

/**
 * Sign out the currently authenticated user
 */
export async function signOutUser(): Promise<{ error: string | null }> {
  try {
    await signOut(auth);
    return { error: null };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return { error: error.message || "Failed to sign out." };
  }
}

/**
 * Get current authenticated user synchronous object
 */
export function getCurrentUser(): User | null {
  return auth.currentUser;
}

/**
 * Send password reset email
 */
export async function resetUserPassword(email: string): Promise<{ error: string | null }> {
  try {
    await sendPasswordResetEmail(auth, email.trim());
    return { error: null };
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    const cleanMsg = formatFirebaseAuthError(error.code, error.message || "Failed to send password reset email.");
    return { error: cleanMsg };
  }
}

/**
 * Listen to auth state changes
 */
export function onAuthChanged(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

/**
 * Permanently delete current user's profile, listings, storage assets, and Auth account.
 * Orchestrates server-side cascade cleanup across Firestore, Supabase Storage, and Firebase Auth.
 */
export async function deleteUserAccount(): Promise<{ error: string | null; requiresRecentLogin?: boolean }> {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { error: "No authenticated user found. Please sign in and try again." };
    }

    const uid = user.uid;

    // 1. Obtain fresh Firebase ID Token for authenticated server orchestration
    let idToken: string;
    try {
      idToken = await user.getIdToken(true);
    } catch (tokenErr: unknown) {
      const err = tokenErr as { code?: string };
      if (err.code === "auth/requires-recent-login" || err.code === "auth/user-token-expired") {
        return {
          error: "For security reasons, please sign in again before deleting your account.",
          requiresRecentLogin: true,
        };
      }
      idToken = await user.getIdToken(false);
    }

    // 2. Call secure server-side cascading deletion endpoint
    let serverSuccess = false;
    let authAlreadyDeleted = false;
    let serverErrorMessage: string | null = null;

    try {
      const apiRes = await fetch("/api/user/delete-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (apiRes.ok) {
        const data = await apiRes.json();
        serverSuccess = true;
        authAlreadyDeleted = Boolean(data.authDeleted);
      } else {
        const errorData = await apiRes.json().catch(() => null);
        serverErrorMessage = errorData?.error || null;
        console.warn("[deleteUserAccount] Server API returned failure:", errorData);
      }
    } catch (fetchErr) {
      console.warn("[deleteUserAccount] Network error reaching deletion API:", fetchErr);
      serverErrorMessage = "Network error communicating with the deletion service. Please check your connection and retry.";
    }

    // 3. If server-side cascade failed: prevent premature Auth deletion and return failure
    if (!serverSuccess) {
      // Immediate public visibility removal as an emergency safeguard
      try {
        const userRef = doc(db, "users", uid);
        await setDoc(
          userRef,
          {
            accountStatus: "deletion_pending",
            isDeleted: true,
            status: "deleted",
          },
          { merge: true }
        );

        const invRef = doc(db, "investorProfiles", uid);
        await setDoc(
          invRef,
          {
            status: "deleted",
            isDeleted: true,
            isPublic: false,
          },
          { merge: true }
        );
      } catch (fbErr) {
        console.warn("[deleteUserAccount] Emergency visibility hide warning:", fbErr);
      }

      // Do NOT report premature success or delete Auth account if server cascade failed
      return {
        error:
          serverErrorMessage ||
          "We could not complete your account deletion right now. Your profile has been paused from public view. Please retry shortly.",
      };
    }

    // 4. Delete Firebase Auth account if not already deleted by server Admin SDK
    if (!authAlreadyDeleted) {
      try {
        await deleteUser(user);
      } catch (authDelErr: unknown) {
        const err = authDelErr as { code?: string; message?: string };
        if (err.code === "auth/requires-recent-login") {
          return {
            error: "For security reasons, please sign in again before deleting your account.",
            requiresRecentLogin: true,
          };
        }
        // If user already deleted by server, ignore error
        if (err.code !== "auth/user-not-found") {
          console.warn("[deleteUserAccount] Auth deletion error:", err);
        }
      }
    }

    return { error: null };
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    if (error.code === "auth/requires-recent-login") {
      return {
        error: "For security reasons, please sign in again before deleting your account.",
        requiresRecentLogin: true,
      };
    }
    return {
      error: "We couldn't delete your account right now. Please try again.",
    };
  }
}

/**
 * Check if the user has administrative privileges
 */
export async function checkIsAdmin(user: User | null, profile?: UserProfile | null): Promise<boolean> {
  if (!user) return false;

  // 1. Check environment variable admin whitelist
  const adminEmailsEnv = process.env.NEXT_PUBLIC_ADMIN_EMAILS || "";
  const adminEmails = adminEmailsEnv
    .split(",")
    .map((e) => e.replace(/['"]/g, "").trim().toLowerCase())
    .filter(Boolean);

  const currentUserEmail = user.email ? user.email.trim().toLowerCase() : "";
  const profileEmail = profile?.email ? profile.email.trim().toLowerCase() : "";

  const isWhitelisted =
    (currentUserEmail && adminEmails.includes(currentUserEmail)) ||
    (profileEmail && adminEmails.includes(profileEmail));

  if (isWhitelisted) {
    return true;
  }

  // 2. Check profile role or flag if provided
  if (profile?.role === "admin" || profile?.isAdmin === true) {
    return true;
  }

  // 3. Check Firestore admins/{uid} or users/{uid} role
  try {
    const adminDocRef = doc(db, "admins", user.uid);
    const adminDocSnap = await getDoc(adminDocRef);
    if (adminDocSnap.exists()) {
      return true;
    }

    const userDocRef = doc(db, "users", user.uid);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      const data = userDocSnap.data();
      if (data.role === "admin" || data.isAdmin === true) {
        return true;
      }
    }
  } catch {
    // Offline or permissions boundary
  }

  return false;
}

/**
 * Fetch all registered users for Admin panel
 */
export async function getAllUsers(): Promise<{ users: UserProfile[]; error: string | null }> {
  try {
    let querySnapshot;
    try {
      const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
      querySnapshot = await getDocs(q);
    } catch {
      querySnapshot = await getDocs(collection(db, "users"));
    }

    const users: UserProfile[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const resolvedName = data.fullName || data.name || "Unnamed User";
      const { roles, activeRole } = normalizeUserRoles(data);
      users.push({
        uid: docSnap.id,
        fullName: resolvedName,
        name: resolvedName,
        email: data.email || "",
        phone: data.phone || "",
        role: activeRole,
        roles,
        activeRole,
        isAdmin: data.role === "admin" || data.isAdmin === true,
        isVerified: data.isVerified === true,
        verificationStatus: data.verificationStatus || "unsubmitted",
        companyName: data.companyName || "",
        sector: data.sector || "",
        location: data.location || "",
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      });
    });

    return { users, error: null };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return { users: [], error: error.message || "Failed to load user directory." };
  }
}

/**
 * Trusted admin-controlled mechanism to grant or revoke admin privileges.
 * Can only be executed by an authenticated administrator.
 */
export async function setAdminPrivilege(
  targetUid: string,
  isAdmin: boolean
): Promise<{ error: string | null }> {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return { error: "Authentication required." };
    }

    const callerIsAdmin = await checkIsAdmin(currentUser);
    if (!callerIsAdmin) {
      return { error: "Permission denied. Only administrators can modify administrative privileges." };
    }

    // 1. Update user document in users/{targetUid}
    const userRef = doc(db, "users", targetUid);
    await setDoc(userRef, { isAdmin, updatedAt: serverTimestamp() }, { merge: true });

    // 2. Sync admins/{targetUid} collection document
    const adminDocRef = doc(db, "admins", targetUid);
    if (isAdmin) {
      const userSnap = await getDoc(userRef);
      const data = userSnap.data() || {};
      await setDoc(
        adminDocRef,
        {
          uid: targetUid,
          email: data.email || "",
          role: data.role || "investor",
          isAdmin: true,
          grantedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } else {
      await deleteDoc(adminDocRef).catch(() => {});
    }

    return { error: null };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return { error: error.message || "Failed to update administrative privilege." };
  }
}



