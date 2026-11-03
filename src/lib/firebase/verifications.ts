import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "./client";
import { getSignedDocumentUrl } from "./storage";

export type VerificationStatus = "unsubmitted" | "pending" | "approved" | "rejected";

export type DocumentType =
  | "Business Incorporation Certificate"
  | "GST Registration Certificate"
  | "PAN Card Document"
  | "Investor Net Worth / Accreditation"
  | "Audited Financials / Balance Sheet"
  | "Other Compliance Document";

export interface VerificationRecord {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  role: "entrepreneur" | "investor" | "user";
  documentType: DocumentType;
  fileName: string;
  storagePath: string;
  status: VerificationStatus;
  rejectionReason?: string;
  submittedAt: unknown;
  reviewedAt?: unknown;
  reviewedBy?: string;
  auditTrail: {
    action: string;
    timestamp: string;
    performedBy: string;
    notes?: string;
  }[];
}

export interface SubmitVerificationInput {
  documentType: DocumentType;
  fileName: string;
  storagePath: string;
  role: "entrepreneur" | "investor" | "user";
  userName?: string;
}

/**
 * Submit or re-submit a verification document for admin review.
 */
export async function submitVerification(
  input: SubmitVerificationInput
): Promise<{ success: boolean; error: string | null }> {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return { success: false, error: "You must be signed in to submit verification documents." };
    }

    const docRef = doc(db, "verifications", currentUser.uid);
    const existingSnap = await getDoc(docRef);

    let auditTrail: VerificationRecord["auditTrail"] = [];
    if (existingSnap.exists()) {
      const data = existingSnap.data();
      auditTrail = Array.isArray(data.auditTrail) ? data.auditTrail : [];
    }

    auditTrail.push({
      action: existingSnap.exists() ? "resubmitted" : "submitted",
      timestamp: new Date().toISOString(),
      performedBy: currentUser.email || currentUser.uid,
      notes: `Document submitted: ${input.documentType} (${input.fileName})`,
    });

    const payload: Omit<VerificationRecord, "id"> = {
      userId: currentUser.uid,
      userName: input.userName || currentUser.displayName || (currentUser.email ? currentUser.email.split("@")[0] : "User"),
      userEmail: currentUser.email || "",
      role: input.role,
      documentType: input.documentType,
      fileName: input.fileName,
      storagePath: input.storagePath,
      status: "pending",
      submittedAt: serverTimestamp(),
      auditTrail,
    };

    await setDoc(docRef, payload, { merge: true });

    // Also update the user's primary profile verificationStatus
    try {
      const userRef = doc(db, "users", currentUser.uid);
      await updateDoc(userRef, {
        verificationStatus: "pending",
        isVerified: false,
        updatedAt: serverTimestamp(),
      });
    } catch {
      // Ignore if user profile collection doesn't exist yet
    }

    return { success: true, error: null };
  } catch (err: unknown) {
    const error = err as { message?: string };
    console.error("[submitVerification] Error:", err);
    return { success: false, error: error.message || "Failed to submit verification document." };
  }
}

/**
 * Fetch verification document record for a specific user.
 */
export async function getUserVerification(
  userId: string
): Promise<{ record: VerificationRecord | null; error: string | null }> {
  try {
    const docRef = doc(db, "verifications", userId);
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      return { record: null, error: null };
    }

    const data = snap.data();
    return {
      record: {
        id: snap.id,
        userId: data.userId || snap.id,
        userName: data.userName || "User",
        userEmail: data.userEmail || "",
        role: data.role || "entrepreneur",
        documentType: data.documentType || "Other Compliance Document",
        fileName: data.fileName || "Document.pdf",
        storagePath: data.storagePath || "",
        status: data.status || "pending",
        rejectionReason: data.rejectionReason,
        submittedAt: data.submittedAt,
        reviewedAt: data.reviewedAt,
        reviewedBy: data.reviewedBy,
        auditTrail: Array.isArray(data.auditTrail) ? data.auditTrail : [],
      },
      error: null,
    };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return { record: null, error: error.message || "Failed to load verification record." };
  }
}

/**
 * Admin: Fetch all verification submissions.
 */
export async function getAllVerifications(
  statusFilter?: VerificationStatus | "all"
): Promise<{ records: VerificationRecord[]; error: string | null }> {
  try {
    const ref = collection(db, "verifications");
    let querySnapshot;

    try {
      const q = query(ref, orderBy("submittedAt", "desc"));
      querySnapshot = await getDocs(q);
    } catch {
      querySnapshot = await getDocs(ref);
    }

    const records: VerificationRecord[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const status: VerificationStatus = data.status || "pending";
      if (!statusFilter || statusFilter === "all" || status === statusFilter) {
        records.push({
          id: docSnap.id,
          userId: data.userId || docSnap.id,
          userName: data.userName || "User",
          userEmail: data.userEmail || "",
          role: data.role || "entrepreneur",
          documentType: data.documentType || "Other Compliance Document",
          fileName: data.fileName || "Document.pdf",
          storagePath: data.storagePath || "",
          status,
          rejectionReason: data.rejectionReason,
          submittedAt: data.submittedAt,
          reviewedAt: data.reviewedAt,
          reviewedBy: data.reviewedBy,
          auditTrail: Array.isArray(data.auditTrail) ? data.auditTrail : [],
        });
      }
    });

    return { records, error: null };
  } catch (err: unknown) {
    const error = err as { message?: string };
    console.error("[getAllVerifications] Error:", err);
    return { records: [], error: error.message || "Failed to load verification records." };
  }
}

/**
 * Admin: Approve a user's verification submission.
 */
export async function approveVerification(
  userId: string,
  adminIdentifier: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const docRef = doc(db, "verifications", userId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      return { success: false, error: "Verification record not found." };
    }

    const data = snap.data();
    const auditTrail = Array.isArray(data.auditTrail) ? [...data.auditTrail] : [];
    auditTrail.push({
      action: "approved",
      timestamp: new Date().toISOString(),
      performedBy: adminIdentifier,
      notes: "Document approved. User granted Verified Trust Badge.",
    });

    await updateDoc(docRef, {
      status: "approved",
      rejectionReason: null,
      reviewedAt: serverTimestamp(),
      reviewedBy: adminIdentifier,
      auditTrail,
    });

    // Update users/{userId} verification badge status
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        isVerified: true,
        verificationStatus: "approved",
        verifiedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (uErr) {
      console.warn("[approveVerification] users doc update note:", uErr);
    }

    return { success: true, error: null };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return { success: false, error: error.message || "Failed to approve verification." };
  }
}

/**
 * Admin: Reject a verification submission with required reason.
 */
export async function rejectVerification(
  userId: string,
  reason: string,
  adminIdentifier: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    if (!reason.trim()) {
      return { success: false, error: "A rejection reason is required." };
    }

    const docRef = doc(db, "verifications", userId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      return { success: false, error: "Verification record not found." };
    }

    const data = snap.data();
    const auditTrail = Array.isArray(data.auditTrail) ? [...data.auditTrail] : [];
    auditTrail.push({
      action: "rejected",
      timestamp: new Date().toISOString(),
      performedBy: adminIdentifier,
      notes: `Rejected: ${reason.trim()}`,
    });

    await updateDoc(docRef, {
      status: "rejected",
      rejectionReason: reason.trim(),
      reviewedAt: serverTimestamp(),
      reviewedBy: adminIdentifier,
      auditTrail,
    });

    // Update users/{userId} verification status
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        isVerified: false,
        verificationStatus: "rejected",
        rejectionReason: reason.trim(),
        updatedAt: serverTimestamp(),
      });
    } catch (uErr) {
      console.warn("[rejectVerification] users doc update note:", uErr);
    }

    return { success: true, error: null };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return { success: false, error: error.message || "Failed to reject verification." };
  }
}

/**
 * Retrieve a temporary signed URL to view a verification document safely.
 */
export async function getVerificationDocumentSignedUrl(
  storagePath: string,
  ownerId: string
): Promise<{ url: string | null; error: string | null }> {
  const res = await getSignedDocumentUrl(storagePath, "verification", ownerId);
  return { url: res.signedUrl, error: res.error };
}

