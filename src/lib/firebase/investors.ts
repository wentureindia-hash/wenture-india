import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "./client";
import { uploadInvestorAvatarFile } from "./storage";

export type InvestorType =
  | "Individual"
  | "Angel Investor"
  | "VC"
  | "Corporate"
  | "Financier";

export type InvestorStatus =
  | "draft"
  | "pending"
  | "under_review"
  | "changes_requested"
  | "rejected"
  | "approved"
  | "published"
  | "deleted";

export interface InvestorReviewHistoryEntry {
  action:
    | "submitted"
    | "approved"
    | "rejected"
    | "changes_requested"
    | "resubmitted"
    | "note_added";
  performedBy: string;
  timestamp: string;
  notes?: string;
}

export interface InvestorProfile {
  id: string; // Firebase UID
  userId: string;
  investorName: string;
  investorType: InvestorType;
  location: string;
  contactEmail?: string;
  contactPhone?: string;
  contactLinkedin?: string;
  whatsAppConsent?: boolean;

  // Investment Preferences
  investmentRange: string;
  typicalInvestmentSize?: string;
  preferredSectors: string[];
  investmentStage: string;
  preferredLocations?: string[];

  // Investment Background
  investmentExperience?: string;
  previousInvestments?: string;
  areasOfExpertise: string[];
  professionalBackground?: string;
  shortIntroduction: string;
  experience: string;

  profileImage?: string;
  status: InvestorStatus;
  approvalStatus?: string;
  rejectionReason?: string;
  revisionFeedback?: string;
  adminNotes?: string;
  reviewHistory?: InvestorReviewHistoryEntry[];
  editStatus?: string;
  isResubmitted?: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
  publishedAt?: unknown;
  isDeleted?: boolean;
  accountStatus?: string;
  isDemo?: boolean;
}

export interface InvestorEnquiry {
  id?: string;
  investorId: string;
  investorName: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  senderId?: string;
  userId?: string;
  senderEmail?: string;
  senderRole?: string;
  createdAt?: unknown;
}

export const INVESTOR_TYPES: InvestorType[] = [
  "Individual",
  "Angel Investor",
  "VC",
  "Corporate",
  "Financier",
];

export const INVESTMENT_STAGES = [
  "Idea / Proof of Concept",
  "Seed / Early Stage",
  "Growth / Expansion",
  "Series A / Series B",
  "Pre-IPO / Late Stage",
  "Turnaround / Distress",
  "Any Stage",
];

export const INVESTOR_RANGES = [
  "₹5L – ₹25L",
  "₹25L – ₹50L",
  "₹50L – ₹1 Cr",
  "₹1 Cr – ₹5 Cr",
  "₹5 Cr – ₹10 Cr",
  "₹10 Cr+",
];

/**
 * Normalizes raw Firestore document to valid InvestorProfile
 */
export function normalizeInvestorProfile(
  id: string,
  raw: Record<string, unknown>
): InvestorProfile {
  const rawStatus = (raw.status || "pending").toString().toLowerCase().trim();
  let status: InvestorStatus = "pending";
  if (rawStatus === "deleted" || raw.isDeleted === true || raw.accountStatus === "deletion_pending") {
    status = "deleted";
  } else if (rawStatus === "published" || rawStatus === "approved") {
    status = "published";
  } else if (rawStatus === "rejected" || rawStatus === "declined") {
    status = "rejected";
  } else if (
    rawStatus === "changes_requested" ||
    rawStatus === "revision_requested" ||
    rawStatus === "needs_revision" ||
    rawStatus === "revision"
  ) {
    status = "changes_requested";
  } else if (rawStatus === "under_review" || rawStatus === "review") {
    status = "under_review";
  } else if (rawStatus === "draft") {
    status = "draft";
  } else if (rawStatus === "pending") {
    status = "pending";
  }

  const preferredSectors = Array.isArray(raw.preferredSectors)
    ? (raw.preferredSectors as string[])
    : typeof raw.preferredSectors === "string"
    ? (raw.preferredSectors as string).split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const preferredLocations = Array.isArray(raw.preferredLocations)
    ? (raw.preferredLocations as string[])
    : typeof raw.preferredLocations === "string"
    ? (raw.preferredLocations as string).split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const areasOfExpertise = Array.isArray(raw.areasOfExpertise)
    ? (raw.areasOfExpertise as string[])
    : typeof raw.areasOfExpertise === "string"
    ? (raw.areasOfExpertise as string).split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const reviewHistory = Array.isArray(raw.reviewHistory)
    ? (raw.reviewHistory as InvestorReviewHistoryEntry[])
    : undefined;

  return {
    id,
    userId: (raw.userId as string) || id,
    investorName: (raw.investorName as string) || (raw.name as string) || "Private Investor",
    investorType: (raw.investorType as InvestorType) || "Angel Investor",
    location: (raw.location as string) || "India",
    contactEmail: (raw.contactEmail as string) || undefined,
    contactPhone: (raw.contactPhone as string) || undefined,
    contactLinkedin: (raw.contactLinkedin as string) || undefined,
    whatsAppConsent: raw.whatsAppConsent !== undefined ? Boolean(raw.whatsAppConsent) : undefined,
    investmentRange: (raw.investmentRange as string) || "₹25L – ₹50L",
    typicalInvestmentSize: (raw.typicalInvestmentSize as string) || undefined,
    preferredSectors: preferredSectors.length > 0 ? preferredSectors : ["Technology", "Healthcare"],
    investmentStage: (raw.investmentStage as string) || "Seed / Early Stage",
    preferredLocations: preferredLocations.length > 0 ? preferredLocations : undefined,
    areasOfExpertise: areasOfExpertise.length > 0 ? areasOfExpertise : ["Strategy", "Scaling"],
    investmentExperience: (raw.investmentExperience as string) || undefined,
    previousInvestments: (raw.previousInvestments as string) || undefined,
    professionalBackground: (raw.professionalBackground as string) || undefined,
    shortIntroduction: (raw.shortIntroduction as string) || "Experienced investor backing high-growth opportunities.",
    experience: (raw.experience as string) || (raw.investmentExperience as string) || (raw.shortIntroduction as string) || "",
    profileImage: (raw.profileImage as string) || undefined,
    status,
    approvalStatus: (raw.approvalStatus as string) || undefined,
    rejectionReason: (raw.rejectionReason as string) || undefined,
    revisionFeedback: (raw.revisionFeedback as string) || (raw.changeRequests as string) || undefined,
    adminNotes: (raw.adminNotes as string) || undefined,
    reviewHistory,
    editStatus: (raw.editStatus as string) || undefined,
    isResubmitted: Boolean(raw.isResubmitted) || (Array.isArray(reviewHistory) && reviewHistory.some((h) => h.action === "resubmitted")),
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    publishedAt: raw.publishedAt,
    isDeleted: Boolean(raw.isDeleted) || status === "deleted",
    accountStatus: (raw.accountStatus as string) || undefined,
  };
}

/**
 * Fetch the authenticated investor's own directory profile (investorProfiles/{uid})
 */
export async function getMyInvestorProfile(
  uid: string
): Promise<{ profile: InvestorProfile | null; error: string | null }> {
  try {
    const docRef = doc(db, "investorProfiles", uid);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      return { profile: null, error: null };
    }
    return {
      profile: normalizeInvestorProfile(snap.id, snap.data()),
      error: null,
    };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return { profile: null, error: error.message || "Failed to load investor profile." };
  }
}

/**
 * Create or update authenticated investor profile (stores in investorProfiles/{uid})
 * Forces status = "pending" for admin review
 */
export async function saveInvestorProfile(
  uid: string,
  profileData: Omit<InvestorProfile, "id" | "userId" | "status" | "createdAt" | "updatedAt" | "publishedAt">
): Promise<{ error: string | null }> {
  try {
    const user = auth.currentUser;
    if (!user || user.uid !== uid) {
      return { error: "You must be signed in to update your investor profile." };
    }

    const docRef = doc(db, "investorProfiles", uid);
    const existingSnap = await getDoc(docRef);
    const isNew = !existingSnap.exists();

    let reviewHistory: InvestorReviewHistoryEntry[] = [];
    let isResubmission = false;
    const existingData = !isNew ? existingSnap.data() : null;
    if (!isNew) {
      const existingStatus = (existingData?.status || "").toString().toLowerCase().trim();
      if (
        existingStatus === "deleted" ||
        existingData?.isDeleted === true ||
        existingData?.accountStatus === "deletion_pending"
      ) {
        return {
          error: "This investor account has been deleted. Profile updates are disabled.",
        };
      }
      if (existingStatus === "pending") {
        return {
          error: "Your investor profile is currently under administrative review. Submissions are paused until review is complete.",
        };
      }
      if (existingStatus === "changes_requested" || existingStatus === "rejected") {
        isResubmission = true;
      }
      if (Array.isArray(existingData?.reviewHistory)) {
        reviewHistory = [...existingData.reviewHistory];
      }
    }

    // Server-side validation: Mandatory WhatsApp contact number
    if (!profileData.contactPhone || !profileData.contactPhone.trim()) {
      return {
        error: "WhatsApp Number is required. Please provide a valid WhatsApp contact number with country code.",
      };
    }

    const phoneValidation = validateInvestorWhatsAppPhone(profileData.contactPhone);
    if (!phoneValidation.valid || !phoneValidation.normalized) {
      return {
        error: phoneValidation.error || "Please enter a valid international WhatsApp phone number (e.g. +91 98765 43210).",
      };
    }

    // Server-side validation: Mandatory public WhatsApp contact consent
    if (profileData.whatsAppConsent !== true) {
      return {
        error: "Consent required: Please agree to display your WhatsApp number publicly on your approved profile.",
      };
    }

    const historyEntry: InvestorReviewHistoryEntry = {
      action: isNew ? "submitted" : "resubmitted",
      performedBy: user.email || uid,
      timestamp: new Date().toISOString(),
      notes: isNew
        ? "Initial profile submitted for review."
        : "Profile updated and resubmitted by investor for admin review.",
    };
    reviewHistory.push(historyEntry);

    const payload: Record<string, unknown> = {
      userId: uid,
      investorName: profileData.investorName.trim(),
      investorType: profileData.investorType,
      location: profileData.location.trim(),
      contactEmail: profileData.contactEmail?.trim() || null,
      contactPhone: phoneValidation.normalized,
      contactLinkedin: profileData.contactLinkedin?.trim() || null,
      whatsAppConsent: true,
      investmentRange: profileData.investmentRange,
      typicalInvestmentSize: profileData.typicalInvestmentSize?.trim() || null,
      preferredSectors: profileData.preferredSectors || [],
      investmentStage: profileData.investmentStage,
      preferredLocations: profileData.preferredLocations || [],
      areasOfExpertise: profileData.areasOfExpertise || [],
      investmentExperience: profileData.investmentExperience?.trim() || null,
      previousInvestments: profileData.previousInvestments?.trim() || null,
      professionalBackground: profileData.professionalBackground?.trim() || null,
      shortIntroduction: profileData.shortIntroduction.trim(),
      experience: (profileData.experience || profileData.investmentExperience || profileData.shortIntroduction).trim(),
      status: "pending", // Reset to pending review on submission
      approvalStatus: isResubmission ? "resubmitted" : "pending",
      isResubmitted: isResubmission,
      rejectionReason: null,
      revisionFeedback: existingData?.revisionFeedback || null,
      reviewHistory,
      updatedAt: serverTimestamp(),
    };

    if (profileData.profileImage?.trim()) {
      payload.profileImage = profileData.profileImage.trim();
    }

    if (isNew) {
      payload.createdAt = serverTimestamp();
    }

    await setDoc(docRef, payload, { merge: true });
    return { error: null };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return { error: error.message || "Failed to submit investor profile." };
  }
}

/**
 * Public: Fetch all genuine published investor profiles (status == 'published') directly from Firestore.
 */
export async function getPublishedInvestors(): Promise<{
  investors: InvestorProfile[];
  error: string | null;
}> {
  try {
    const profilesRef = collection(db, "investorProfiles");
    let snap;

    try {
      const q = query(
        profilesRef,
        where("status", "==", "published"),
        orderBy("updatedAt", "desc")
      );
      snap = await getDocs(q);
    } catch {
      const q = query(profilesRef, where("status", "==", "published"));
      snap = await getDocs(q);
    }

    const realInvestors: InvestorProfile[] = [];
    snap.forEach((d) => {
      const data = d.data();
      if (data.isDeleted === true || data.status === "deleted" || data.accountStatus === "deletion_pending") {
        return;
      }
      const normalized = normalizeInvestorProfile(d.id, data);
      if (normalized.status === "published" && !normalized.isDeleted) {
        realInvestors.push({ ...normalized, isDemo: false });
      }
    });

    return { investors: realInvestors, error: null };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return { investors: [], error: error.message || "Failed to load investors from directory." };
  }
}

/**
 * Public: Fetch single genuine published investor profile by ID from Firestore.
 */
export async function getPublishedInvestorById(
  id: string
): Promise<{ investor: InvestorProfile | null; error: string | null }> {
  try {
    const docRef = doc(db, "investorProfiles", id);
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      return { investor: null, error: "Investor profile not found." };
    }

    const rawData = snap.data();
    if (rawData.isDeleted === true || rawData.status === "deleted" || rawData.accountStatus === "deletion_pending") {
      return { investor: null, error: "Investor profile is no longer available." };
    }

    const investor = normalizeInvestorProfile(snap.id, rawData);
    if (investor.status !== "published" || investor.isDeleted) {
      // Allow owner or admin to preview unpublished (if not deleted)
      const user = auth.currentUser;
      if (!user || user.uid !== investor.userId || investor.isDeleted) {
        return { investor: null, error: "This investor profile is no longer available." };
      }
    }

    return { investor: { ...investor, isDemo: false }, error: null };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return { investor: null, error: error.message || "Failed to load investor profile." };
  }
}

/**
 * Admin: Fetch all investor profiles with optional status filter
 */
export async function getAllInvestorsAdmin(
  statusFilter?: InvestorStatus | "all"
): Promise<{ investors: InvestorProfile[]; error: string | null }> {
  try {
    const profilesRef = collection(db, "investorProfiles");
    const snap = await getDocs(profilesRef);

    const list: InvestorProfile[] = [];
    snap.forEach((d) => {
      list.push(normalizeInvestorProfile(d.id, d.data()));
    });

    list.sort((a, b) => {
      const timeA = (a.updatedAt as { seconds?: number })?.seconds || 0;
      const timeB = (b.updatedAt as { seconds?: number })?.seconds || 0;
      return timeB - timeA;
    });

    if (statusFilter && statusFilter !== "all") {
      return {
        investors: list.filter((i) => i.status === statusFilter),
        error: null,
      };
    }

    return { investors: list, error: null };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return { investors: [], error: error.message || "Failed to load investor profiles." };
  }
}

/**
 * Admin: Approve investor profile (sets status = 'published')
 */
export async function approveInvestor(
  uid: string
): Promise<{ error: string | null }> {
  try {
    const adminUser = auth.currentUser;
    const docRef = doc(db, "investorProfiles", uid);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      return { error: "Investor profile not found." };
    }
    const currentData = snap.data();
    if (currentData?.status === "deleted" || currentData?.isDeleted === true || currentData?.accountStatus === "deletion_pending") {
      return {
        error: "Cannot approve: This investor profile has been permanently deleted.",
      };
    }
    if (currentData?.status === "changes_requested") {
      return {
        error:
          "Cannot approve a profile that is currently awaiting investor revisions. The investor must review feedback, update requested fields, and resubmit their profile first.",
      };
    }

    // Backend approval gate: Validate WhatsApp contact number & consent
    const phoneValidation = validateInvestorWhatsAppPhone(currentData?.contactPhone);
    if (!phoneValidation.valid || !phoneValidation.normalized) {
      return {
        error:
          "Cannot approve investor profile: A valid WhatsApp contact number is mandatory before publishing.",
      };
    }

    if (currentData?.whatsAppConsent === false) {
      return {
        error:
          "Cannot approve investor profile: Public WhatsApp contact consent has not been confirmed by the investor.",
      };
    }

    const currentHistory: InvestorReviewHistoryEntry[] = Array.isArray(currentData?.reviewHistory)
      ? currentData.reviewHistory
      : [];

    const newEntry: InvestorReviewHistoryEntry = {
      action: "approved",
      performedBy: adminUser?.email || "admin",
      timestamp: new Date().toISOString(),
      notes: "Approved and published to directory.",
    };

    await updateDoc(docRef, {
      status: "published",
      approvalStatus: "approved",
      isResubmitted: false,
      publishedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      rejectionReason: null,
      revisionFeedback: null,
      reviewHistory: [...currentHistory, newEntry],
    });
    return { error: null };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return { error: error.message || "Failed to approve investor profile." };
  }
}

/**
 * Admin: Reject investor profile with mandatory reason
 */
export async function rejectInvestor(
  uid: string,
  rejectionReason: string
): Promise<{ error: string | null }> {
  try {
    if (!rejectionReason.trim()) {
      return { error: "A rejection reason is required." };
    }
    const adminUser = auth.currentUser;
    const docRef = doc(db, "investorProfiles", uid);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      return { error: "Investor profile not found." };
    }
    const currentData = snap.data();
    if (currentData?.status === "deleted" || currentData?.isDeleted === true || currentData?.accountStatus === "deletion_pending") {
      return {
        error: "Cannot approve: This investor profile has been permanently deleted.",
      };
    }
    if (currentData?.status === "changes_requested") {
      return {
        error:
          "Cannot reject a profile that is currently awaiting investor revisions. The investor must review feedback, update requested fields, and resubmit their profile first.",
      };
    }

    const currentHistory: InvestorReviewHistoryEntry[] = Array.isArray(currentData?.reviewHistory)
      ? currentData.reviewHistory
      : [];

    const newEntry: InvestorReviewHistoryEntry = {
      action: "rejected",
      performedBy: adminUser?.email || "admin",
      timestamp: new Date().toISOString(),
      notes: rejectionReason.trim(),
    };

    await updateDoc(docRef, {
      status: "rejected",
      approvalStatus: "rejected",
      isResubmitted: false,
      rejectionReason: rejectionReason.trim(),
      updatedAt: serverTimestamp(),
      reviewHistory: [...currentHistory, newEntry],
    });
    return { error: null };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return { error: error.message || "Failed to reject investor profile." };
  }
}

/**
 * Admin: Request revisions / changes from investor with mandatory feedback
 */
export async function requestChangesInvestor(
  uid: string,
  feedback: string
): Promise<{ error: string | null }> {
  try {
    if (!feedback.trim()) {
      return { error: "Revision feedback is required." };
    }
    const adminUser = auth.currentUser;
    const docRef = doc(db, "investorProfiles", uid);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      return { error: "Investor profile not found." };
    }
    const currentData = snap.data();
    if (currentData?.status === "deleted" || currentData?.isDeleted === true || currentData?.accountStatus === "deletion_pending") {
      return {
        error: "Cannot request revisions: This investor profile has been permanently deleted.",
      };
    }
    const currentHistory: InvestorReviewHistoryEntry[] = Array.isArray(currentData?.reviewHistory)
      ? currentData.reviewHistory
      : [];

    const newEntry: InvestorReviewHistoryEntry = {
      action: "changes_requested",
      performedBy: adminUser?.email || "admin",
      timestamp: new Date().toISOString(),
      notes: feedback.trim(),
    };

    await updateDoc(docRef, {
      status: "changes_requested",
      approvalStatus: "changes_requested",
      isResubmitted: false,
      revisionFeedback: feedback.trim(),
      updatedAt: serverTimestamp(),
      reviewHistory: [...currentHistory, newEntry],
    });
    return { error: null };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return { error: error.message || "Failed to request changes on investor profile." };
  }
}

/**
 * Admin: Add internal administrative note to investor profile
 */
export async function addInvestorAdminNote(
  uid: string,
  note: string
): Promise<{ error: string | null }> {
  try {
    if (!note.trim()) {
      return { error: "Admin note cannot be empty." };
    }
    const adminUser = auth.currentUser;
    const docRef = doc(db, "investorProfiles", uid);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      return { error: "Investor profile not found." };
    }
    const currentData = snap.data();
    if (currentData?.status === "deleted" || currentData?.isDeleted === true || currentData?.accountStatus === "deletion_pending") {
      return {
        error: "Cannot request revisions: This investor profile has been permanently deleted.",
      };
    }
    const currentHistory: InvestorReviewHistoryEntry[] = Array.isArray(currentData?.reviewHistory)
      ? currentData.reviewHistory
      : [];

    const newEntry: InvestorReviewHistoryEntry = {
      action: "note_added",
      performedBy: adminUser?.email || "admin",
      timestamp: new Date().toISOString(),
      notes: note.trim(),
    };

    await updateDoc(docRef, {
      adminNotes: note.trim(),
      updatedAt: serverTimestamp(),
      reviewHistory: [...currentHistory, newEntry],
    });
    return { error: null };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return { error: error.message || "Failed to add internal admin note." };
  }
}

/**
 * Admin: Edit investor profile directly
 */
export async function updateInvestorAdmin(
  uid: string,
  updates: Partial<InvestorProfile>
): Promise<{ error: string | null }> {
  try {
    const docRef = doc(db, "investorProfiles", uid);
    const sanitizedUpdates: Record<string, unknown> = { ...updates };
    if (typeof sanitizedUpdates.contactPhone === "string" && sanitizedUpdates.contactPhone.trim()) {
      const normalized = normalizeInvestorWhatsAppPhone(sanitizedUpdates.contactPhone);
      if (normalized) {
        sanitizedUpdates.contactPhone = normalized;
      }
    }
    await updateDoc(docRef, {
      ...sanitizedUpdates,
      updatedAt: serverTimestamp(),
    });
    return { error: null };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return { error: error.message || "Failed to update investor profile." };
  }
}

/**
 * Admin: Permanently delete investor profile
 */
export async function deleteInvestor(
  uid: string
): Promise<{ error: string | null }> {
  try {
    const docRef = doc(db, "investorProfiles", uid);
    await deleteDoc(docRef);
    return { error: null };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return { error: error.message || "Failed to delete investor profile." };
  }
}

/**
 * Entrepreneur: Express Interest in an investor
 * Strictly restricts investor-to-investor submissions.
 * Requires authenticated user with the 'entrepreneur' role operating in Entrepreneur Mode.
 */
export async function submitInvestorEnquiry(
  data: InvestorEnquiry
): Promise<{ id: string | null; error: string | null }> {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return {
        id: null,
        error: "Authentication required. You must be signed in with an Entrepreneur account to express interest.",
      };
    }

    if (!data.investorId || data.investorId === currentUser.uid) {
      return {
        id: null,
        error: "You cannot submit an expression of interest to your own investor profile.",
      };
    }

    // Fetch and validate the authenticated user's actual roles and active role
    const userDocRef = doc(db, "users", currentUser.uid);
    const userSnap = await getDoc(userDocRef);
    if (!userSnap.exists()) {
      return {
        id: null,
        error: "User account profile not found. Please complete your profile setup.",
      };
    }

    const userData = userSnap.data();
    const activeRole = (userData?.activeRole || userData?.role || "").toString().toLowerCase().trim();
    const userRoles: string[] = Array.isArray(userData?.roles) && userData.roles.length > 0
      ? userData.roles.map((r: string) => r.toLowerCase().trim())
      : [userData?.role].filter(Boolean).map((r: string) => r.toLowerCase().trim());

    if (!userRoles.includes("entrepreneur")) {
      return {
        id: null,
        error:
          "Access restricted: Only users with the Entrepreneur role can express interest in investors. Investor-to-investor expressions of interest are not permitted.",
      };
    }

    if (activeRole !== "entrepreneur") {
      return {
        id: null,
        error:
          "Please switch to Entrepreneur Mode to express interest. Expressions of interest cannot be submitted while operating in Investor Mode.",
      };
    }

    const docRef = await addDoc(collection(db, "investor_enquiries"), {
      ...data,
      senderId: currentUser.uid,
      userId: currentUser.uid,
      senderEmail: currentUser.email || data.email,
      senderRole: "entrepreneur",
      createdAt: serverTimestamp(),
    });
    return { id: docRef.id, error: null };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return { id: null, error: error.message || "Failed to submit expression of interest." };
  }
}

/**
 * Default professional intro message for direct WhatsApp contact with an investor
 */
export const INVESTOR_WHATSAPP_INTRO_MESSAGE =
  "Hello, I discovered your investor profile on Wenture India. I would like to connect with you regarding a potential business opportunity. Would you be available to discuss?";

/**
 * Detailed result of international phone validation
 */
export interface PhoneValidationResult {
  valid: boolean;
  normalized: string | null;
  formatted: string | null;
  countryCode: string | null;
  error: string | null;
}

/**
 * Validates an international phone number against E.164 guidelines and country-specific mobile rules.
 * Does not rely only on digit length.
 */
export function validateInvestorWhatsAppPhone(rawPhone?: string): PhoneValidationResult {
  if (!rawPhone || typeof rawPhone !== "string") {
    return {
      valid: false,
      normalized: null,
      formatted: null,
      countryCode: null,
      error: "WhatsApp number is required.",
    };
  }

  const cleaned = rawPhone.trim();
  if (!cleaned) {
    return {
      valid: false,
      normalized: null,
      formatted: null,
      countryCode: null,
      error: "WhatsApp number is required.",
    };
  }

  const digits = cleaned.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) {
    return {
      valid: false,
      normalized: null,
      formatted: null,
      countryCode: null,
      error: "Phone number must be between 10 and 15 digits including country code.",
    };
  }

  // Reject obvious dummy repeating sequences like 0000000000, 1111111111, or 9999999999
  const nationalDigits = digits.startsWith("91") ? digits.slice(2) : digits.startsWith("1") ? digits.slice(1) : digits;
  if (/^(\d)\1+$/.test(digits) || /^(\d)\1+$/.test(nationalDigits)) {
    return {
      valid: false,
      normalized: null,
      formatted: null,
      countryCode: null,
      error: "Please enter a valid active phone number, not repeated digits.",
    };
  }

  // 1. Explicit International '+' Format
  if (cleaned.startsWith("+")) {
    if (digits.startsWith("91")) {
      const national = digits.slice(2);
      if (national.length !== 10 || !/^[6-9]\d{9}$/.test(national)) {
        return {
          valid: false,
          normalized: null,
          formatted: null,
          countryCode: "+91",
          error: "Invalid Indian mobile number. Must be 10 digits starting with 6, 7, 8, or 9.",
        };
      }
      return {
        valid: true,
        normalized: digits,
        formatted: `+91 ${national.slice(0, 5)} ${national.slice(5)}`,
        countryCode: "+91",
        error: null,
      };
    }

    if (digits.startsWith("1") && digits.length === 11) {
      const national = digits.slice(1);
      if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(national)) {
        return {
          valid: false,
          normalized: null,
          formatted: null,
          countryCode: "+1",
          error: "Invalid US/Canada mobile number. Area code and exchange code cannot start with 0 or 1.",
        };
      }
      return {
        valid: true,
        normalized: digits,
        formatted: `+1 (${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6)}`,
        countryCode: "+1",
        error: null,
      };
    }

    if (digits.startsWith("44")) {
      const national = digits.slice(2);
      if (national.length < 9 || national.length > 10) {
        return {
          valid: false,
          normalized: null,
          formatted: null,
          countryCode: "+44",
          error: "Invalid UK phone number. Must be 9 to 10 digits after +44.",
        };
      }
      return {
        valid: true,
        normalized: digits,
        formatted: `+44 ${national.slice(0, 4)} ${national.slice(4)}`,
        countryCode: "+44",
        error: null,
      };
    }

    if (digits.startsWith("971")) {
      const national = digits.slice(3);
      if (national.length !== 9 || !national.startsWith("5")) {
        return {
          valid: false,
          normalized: null,
          formatted: null,
          countryCode: "+971",
          error: "Invalid UAE mobile number. Must be 9 digits starting with 5 after +971.",
        };
      }
      return {
        valid: true,
        normalized: digits,
        formatted: `+971 ${national.slice(0, 2)} ${national.slice(2, 5)} ${national.slice(5)}`,
        countryCode: "+971",
        error: null,
      };
    }

    if (digits.startsWith("65")) {
      const national = digits.slice(2);
      if (national.length !== 8 || !/^[89]/.test(national)) {
        return {
          valid: false,
          normalized: null,
          formatted: null,
          countryCode: "+65",
          error: "Invalid Singapore mobile number. Must be 8 digits starting with 8 or 9.",
        };
      }
      return {
        valid: true,
        normalized: digits,
        formatted: `+65 ${national.slice(0, 4)} ${national.slice(4)}`,
        countryCode: "+65",
        error: null,
      };
    }

    // Generic international format with '+'
    return {
      valid: true,
      normalized: digits,
      formatted: `+${digits}`,
      countryCode: `+${digits.slice(0, 3)}`,
      error: null,
    };
  }

  // 2. Numbers without '+' prefix
  // 10 digits -> Standard Indian mobile number
  if (digits.length === 10) {
    if (!/^[6-9]\d{9}$/.test(digits)) {
      return {
        valid: false,
        normalized: null,
        formatted: null,
        countryCode: "+91",
        error: "Indian mobile number must be 10 digits starting with 6, 7, 8, or 9.",
      };
    }
    return {
      valid: true,
      normalized: `91${digits}`,
      formatted: `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`,
      countryCode: "+91",
      error: null,
    };
  }

  // 11 digits starting with 0 -> Indian mobile with leading trunk prefix 0
  if (digits.length === 11 && digits.startsWith("0")) {
    const national = digits.slice(1);
    if (!/^[6-9]\d{9}$/.test(national)) {
      return {
        valid: false,
        normalized: null,
        formatted: null,
        countryCode: "+91",
        error: "Indian mobile number must be 10 digits starting with 6, 7, 8, or 9.",
      };
    }
    return {
      valid: true,
      normalized: `91${national}`,
      formatted: `+91 ${national.slice(0, 5)} ${national.slice(5)}`,
      countryCode: "+91",
      error: null,
    };
  }

  // 12 digits starting with 91 -> Indian mobile with 91 prefix
  if (digits.length === 12 && digits.startsWith("91")) {
    const national = digits.slice(2);
    if (!/^[6-9]\d{9}$/.test(national)) {
      return {
        valid: false,
        normalized: null,
        formatted: null,
        countryCode: "+91",
        error: "Indian mobile number must be 10 digits starting with 6, 7, 8, or 9.",
      };
    }
    return {
      valid: true,
      normalized: digits,
      formatted: `+91 ${national.slice(0, 5)} ${national.slice(5)}`,
      countryCode: "+91",
      error: null,
    };
  }

  // 11 digits starting with 1 -> North American Numbering Plan
  if (digits.length === 11 && digits.startsWith("1")) {
    const national = digits.slice(1);
    if (/^[2-9]\d{2}[2-9]\d{6}$/.test(national)) {
      return {
        valid: true,
        normalized: digits,
        formatted: `+1 (${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6)}`,
        countryCode: "+1",
        error: null,
      };
    }
  }

  return {
    valid: false,
    normalized: null,
    formatted: null,
    countryCode: null,
    error: "Please enter a valid phone number with country code (e.g. +91 98765 43210).",
  };
}

/**
 * Validates and normalizes an investor contact phone number into international E.164 digits (e.g. 919876543210).
 * Returns null if missing, invalid, or outside valid country/E.164 rules.
 */
export function normalizeInvestorWhatsAppPhone(rawPhone?: string): string | null {
  const result = validateInvestorWhatsAppPhone(rawPhone);
  return result.valid ? result.normalized : null;
}

/**
 * Returns user-friendly formatted international phone representation (e.g. +91 98765 43210).
 */
export function formatInvestorWhatsAppPhone(rawPhone?: string): string | null {
  const result = validateInvestorWhatsAppPhone(rawPhone);
  return result.valid ? result.formatted : null;
}

/**
 * Builds the direct WhatsApp redirect URL for an investor profile.
 * Returns null if the investor does not have a valid, normalized phone number.
 */
export function getInvestorWhatsAppUrl(rawPhone?: string): string | null {
  const normalized = normalizeInvestorWhatsAppPhone(rawPhone);
  if (!normalized) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(INVESTOR_WHATSAPP_INTRO_MESSAGE)}`;
}

/**
 * Upload an investor profile picture to Firebase Storage with friendly error handling.
 */
export async function uploadInvestorProfileImage(
  file: File,
  userId: string
): Promise<{ url: string | null; error: string | null }> {
  const res = await uploadInvestorAvatarFile(file, userId);
  return { url: res.url, error: res.error };
}

