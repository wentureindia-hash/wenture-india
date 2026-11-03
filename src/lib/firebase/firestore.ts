import {
  collection,
  doc,
  getDoc,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./client";

export interface ContactSubmission {
  id?: string;
  fullName: string;
  email: string;
  phone: string;
  userRole: string;
  subject: string;
  message: string;
  createdAt?: unknown;
  status?: "new" | "contacted" | "closed";
}

export type EnquiryStatus =
  | "New"
  | "Contacted"
  | "In Discussion"
  | "Closed"
  | "new"
  | "contacted"
  | "closed";

export interface OpportunityEnquiry {
  id?: string;
  opportunityId: string;
  opportunityTitle: string;
  opportunityOwnerId?: string;
  opportunityOwnerName?: string;
  opportunityOwnerEmail?: string;
  ownerEmail?: string;
  senderId?: string;
  userId?: string;
  userUid?: string;
  senderRole?: "Investor" | "Entrepreneur" | string;
  role?: string;
  senderName?: string;
  name: string;
  senderEmail?: string;
  email: string;
  senderPhone?: string;
  phone: string;
  senderLocation?: string;
  senderType?: string;
  investmentRange?: string;
  investmentCapacity?: string;
  message: string;
  createdAt?: unknown;
  updatedAt?: unknown;
  status?: EnquiryStatus;
}

/**
 * Submit general contact inquiry
 */
export async function submitContactMessage(data: ContactSubmission) {
  try {
    const docRef = await addDoc(collection(db, "contact_inquiries"), {
      ...data,
      createdAt: serverTimestamp(),
      status: "new",
    });
    return { id: docRef.id, error: null };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return { id: null, error: error.message || "Failed to submit message" };
  }
}

/**
 * Submit deal/opportunity specific enquiry
 */
export async function submitOpportunityEnquiry(data: OpportunityEnquiry) {
  try {
    const ownerId = data.opportunityOwnerId || "";
    const ownerEmail = data.opportunityOwnerEmail || data.ownerEmail || "";
    const senderId = data.senderId || data.userUid || data.userId || "";
    const senderRole = data.senderRole || data.role || "Investor";
    const senderName = data.senderName || data.name || "";
    const senderEmail = data.senderEmail || data.email || "";

    // Prevent self-enquiries where owner is sending enquiry to their own listing
    if (ownerId && senderId && ownerId !== "platform-admin" && ownerId === senderId) {
      return { id: null, error: "You cannot submit an enquiry on your own opportunity." };
    }
    if (
      ownerEmail &&
      senderEmail &&
      ownerEmail.trim().toLowerCase() === senderEmail.trim().toLowerCase()
    ) {
      return { id: null, error: "You cannot submit an enquiry on your own opportunity." };
    }

    // Block enquiries if target opportunity is deleted
    if (data.opportunityId) {
      try {
        const oppDoc = await getDoc(doc(db, "listings", data.opportunityId));
        if (oppDoc.exists()) {
          const oppData = oppDoc.data();
          if (
            oppData.status === "deleted" ||
            oppData.isDeleted === true ||
            oppData.accountStatus === "deletion_pending"
          ) {
            return { id: null, error: "This business opportunity is no longer available." };
          }
        }
      } catch {
        // Fallback ignore
      }
    }

    // Block enquiries if sender account is deletion_pending
    if (senderId) {
      try {
        const senderDoc = await getDoc(doc(db, "users", senderId));
        if (senderDoc.exists()) {
          const sData = senderDoc.data();
          if (
            sData.accountStatus === "deletion_pending" ||
            sData.isDeleted === true ||
            sData.status === "deleted"
          ) {
            return {
              id: null,
              error: "Your account is scheduled for deletion. New enquiries cannot be submitted.",
            };
          }
        }
      } catch {
        // Fallback ignore
      }
    }

    const docRef = await addDoc(collection(db, "opportunity_enquiries"), {
      ...data,
      opportunityId: data.opportunityId,
      opportunityTitle: data.opportunityTitle || "Business Opportunity",
      opportunityOwnerId: ownerId,
      ownerId: ownerId, // duplicate for backwards-compatibility
      opportunityOwnerEmail: ownerEmail,
      ownerEmail: ownerEmail,
      senderId,
      userUid: senderId,
      senderRole,
      role: senderRole,
      senderName,
      name: senderName,
      senderEmail,
      email: senderEmail,
      senderPhone: data.senderPhone || data.phone || "",
      phone: data.senderPhone || data.phone || "",
      message: data.message || "",
      status: data.status || "New",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { id: docRef.id, error: null };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return { id: null, error: error.message || "Failed to submit enquiry" };
  }
}

/**
 * Admin: Get all general contact inquiries
 */
export async function getAllContactInquiries(): Promise<{ inquiries: ContactSubmission[]; error: string | null }> {
  try {
    let querySnapshot;
    try {
      const q = query(collection(db, "contact_inquiries"), orderBy("createdAt", "desc"));
      querySnapshot = await getDocs(q);
    } catch {
      querySnapshot = await getDocs(collection(db, "contact_inquiries"));
    }

    const inquiries: ContactSubmission[] = [];
    querySnapshot.forEach((docSnap) => {
      inquiries.push({
        id: docSnap.id,
        ...(docSnap.data() as Omit<ContactSubmission, "id">),
      });
    });

    return { inquiries, error: null };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return { inquiries: [], error: error.message || "Failed to load contact inquiries." };
  }
}

/**
 * Admin: Get all opportunity inquiries
 */
export async function getAllOpportunityEnquiries(): Promise<{
  enquiries: OpportunityEnquiry[];
  error: string | null;
}> {
  try {
    let querySnapshot;
    try {
      const q = query(collection(db, "opportunity_enquiries"), orderBy("createdAt", "desc"));
      querySnapshot = await getDocs(q);
    } catch {
      querySnapshot = await getDocs(collection(db, "opportunity_enquiries"));
    }

    const enquiries: OpportunityEnquiry[] = [];
    querySnapshot.forEach((docSnap) => {
      enquiries.push({
        id: docSnap.id,
        ...(docSnap.data() as Omit<OpportunityEnquiry, "id">),
      });
    });

    return { enquiries, error: null };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return { enquiries: [], error: error.message || "Failed to load opportunity enquiries." };
  }
}

/**
 * Delete an opportunity enquiry (by sender investor, opportunity owner, or admin)
 */
export async function deleteOpportunityEnquiry(
  enquiryId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    if (!enquiryId) {
      return { success: false, error: "Enquiry ID is required" };
    }
    await deleteDoc(doc(db, "opportunity_enquiries", enquiryId));
    return { success: true, error: null };
  } catch (err: unknown) {
    const error = err as { message?: string };
    console.error("[deleteOpportunityEnquiry] error:", err);
    return { success: false, error: error.message || "Failed to delete enquiry" };
  }
}

/**
 * Delete a general contact inquiry (admin only)
 */
export async function deleteContactInquiry(
  inquiryId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    if (!inquiryId) {
      return { success: false, error: "Inquiry ID is required" };
    }
    await deleteDoc(doc(db, "contact_inquiries", inquiryId));
    return { success: true, error: null };
  } catch (err: unknown) {
    const error = err as { message?: string };
    console.error("[deleteContactInquiry] error:", err);
    return { success: false, error: error.message || "Failed to delete contact inquiry" };
  }
}

/**
 * Get enquiries received for a specific Entrepreneur's opportunities
 * Strictly queries by opportunityOwnerId == ownerId, with backward compatibility for legacy field names
 */
export async function getEnquiriesForEntrepreneur(
  ownerId: string,
  userEmail?: string | null
): Promise<{
  enquiries: OpportunityEnquiry[];
  error: string | null;
}> {
  if (!ownerId) {
    return { enquiries: [], error: null };
  }

  try {
    const enquiriesMap = new Map<string, OpportunityEnquiry>();

    // 1. Primary Query: opportunityOwnerId == currentUser.uid
    try {
      let querySnapshot;
      try {
        const q = query(
          collection(db, "opportunity_enquiries"),
          where("opportunityOwnerId", "==", ownerId),
          orderBy("createdAt", "desc")
        );
        querySnapshot = await getDocs(q);
      } catch {
        // Fallback in case composite index is not yet built
        const fallbackQuery = query(
          collection(db, "opportunity_enquiries"),
          where("opportunityOwnerId", "==", ownerId)
        );
        querySnapshot = await getDocs(fallbackQuery);
      }

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.status === "listing_deleted" || data.opportunityStatus === "deleted") {
          return;
        }
        enquiriesMap.set(docSnap.id, {
          id: docSnap.id,
          ...(data as Omit<OpportunityEnquiry, "id">),
        });
      });
    } catch (err) {
      console.warn("[getEnquiriesForEntrepreneur] primary query error:", err);
    }

    // 2. Legacy Field Query: ownerId == currentUser.uid
    try {
      const legacyQuery = query(
        collection(db, "opportunity_enquiries"),
        where("ownerId", "==", ownerId)
      );
      const legacySnap = await getDocs(legacyQuery);
      legacySnap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.status === "listing_deleted" || data.opportunityStatus === "deleted") return;
        if (!enquiriesMap.has(docSnap.id)) {
          enquiriesMap.set(docSnap.id, {
            id: docSnap.id,
            opportunityOwnerId: ownerId,
            ...(data as Omit<OpportunityEnquiry, "id">),
          });
        }
      });
    } catch {
      // ignore
    }

    // 3. Email Queries if userEmail is provided
    if (userEmail) {
      const normalizedEmail = userEmail.trim().toLowerCase();
      try {
        const emailQ = query(
          collection(db, "opportunity_enquiries"),
          where("opportunityOwnerEmail", "==", normalizedEmail)
        );
        const emailSnap = await getDocs(emailQ);
        emailSnap.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.status === "listing_deleted" || data.opportunityStatus === "deleted") return;
          if (!enquiriesMap.has(docSnap.id)) {
            enquiriesMap.set(docSnap.id, {
              id: docSnap.id,
              opportunityOwnerId: ownerId,
              ...(data as Omit<OpportunityEnquiry, "id">),
            });
          }
        });
      } catch {}

      try {
        const ownerEmailQ = query(
          collection(db, "opportunity_enquiries"),
          where("ownerEmail", "==", normalizedEmail)
        );
        const ownerEmailSnap = await getDocs(ownerEmailQ);
        ownerEmailSnap.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.status === "listing_deleted" || data.opportunityStatus === "deleted") return;
          if (!enquiriesMap.has(docSnap.id)) {
            enquiriesMap.set(docSnap.id, {
              id: docSnap.id,
              opportunityOwnerId: ownerId,
              ...(data as Omit<OpportunityEnquiry, "id">),
            });
          }
        });
      } catch {}
    }

    // 4. Listing Correlation & Backfill for unlinked or "platform-admin" enquiries
    try {
      const myListingIds = new Set<string>();
      const myListingTitles = new Set<string>();

      // A. Query listings by ownerId
      try {
        const lQ1 = query(collection(db, "listings"), where("ownerId", "==", ownerId));
        const lSnap1 = await getDocs(lQ1);
        lSnap1.forEach((d) => {
          myListingIds.add(d.id);
          const t = d.data().title;
          if (t && typeof t === "string") myListingTitles.add(t.trim().toLowerCase());
        });
      } catch {}

      // B. Query listings by legacy userId
      try {
        const lQ2 = query(collection(db, "listings"), where("userId", "==", ownerId));
        const lSnap2 = await getDocs(lQ2);
        lSnap2.forEach((d) => {
          myListingIds.add(d.id);
          const t = d.data().title;
          if (t && typeof t === "string") myListingTitles.add(t.trim().toLowerCase());
        });
      } catch {}

      // C. Query listings by contact email
      if (userEmail) {
        try {
          const lQ3 = query(collection(db, "listings"), where("contactEmail", "==", userEmail));
          const lSnap3 = await getDocs(lQ3);
          lSnap3.forEach((d) => {
            myListingIds.add(d.id);
            const t = d.data().title;
            if (t && typeof t === "string") myListingTitles.add(t.trim().toLowerCase());
          });
        } catch {}
      }

      // D. Check enquiries with opportunityOwnerId == "platform-admin" that belong to this entrepreneur's listings
      if (myListingIds.size > 0 || myListingTitles.size > 0) {
        try {
          const platformAdminQ = query(
            collection(db, "opportunity_enquiries"),
            where("opportunityOwnerId", "==", "platform-admin")
          );
          const platformSnap = await getDocs(platformAdminQ);
          platformSnap.forEach((docSnap) => {
            const data = docSnap.data();
            const oppId = (data.opportunityId || "") as string;
            const oppTitle = ((data.opportunityTitle || "") as string).trim().toLowerCase();

            if (myListingIds.has(oppId) || myListingTitles.has(oppTitle)) {
              if (!enquiriesMap.has(docSnap.id)) {
                enquiriesMap.set(docSnap.id, {
                  id: docSnap.id,
                  opportunityOwnerId: ownerId,
                  ...(data as Omit<OpportunityEnquiry, "id">),
                });
              }
              // Auto-backfill document so future reads are instantaneous
              updateDoc(docSnap.ref, {
                opportunityOwnerId: ownerId,
                ownerId: ownerId,
                opportunityOwnerEmail: userEmail || "",
                ownerEmail: userEmail || "",
                updatedAt: serverTimestamp(),
              }).catch(() => {});
            }
          });
        } catch (err) {
          console.warn("[getEnquiriesForEntrepreneur] platform-admin reconciliation error:", err);
        }
      }
    } catch {
      // ignore
    }

    // Filter out self-enquiries where the sender is the same user/owner
    const enquiries = Array.from(enquiriesMap.values()).filter((enquiry) => {
      const senderUid = enquiry.senderId || enquiry.userUid || enquiry.userId;
      const isSelfUid = Boolean(senderUid && ownerId && senderUid === ownerId);

      const normUserEmail = userEmail ? userEmail.trim().toLowerCase() : "";
      const senderEmail = (enquiry.senderEmail || enquiry.email || "").trim().toLowerCase();
      const isSelfEmail = Boolean(normUserEmail && senderEmail && senderEmail === normUserEmail);

      return !isSelfUid && !isSelfEmail;
    });

    // Client-side fallback sort in case index-less query returned unordered
    enquiries.sort((a, b) => {
      const timeA = (a.createdAt as { seconds?: number })?.seconds || 0;
      const timeB = (b.createdAt as { seconds?: number })?.seconds || 0;
      return timeB - timeA;
    });

    return { enquiries, error: null };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return { enquiries: [], error: error.message || "Failed to load received enquiries." };
  }
}

/**
 * Investor: Get all enquiries/expressed interest sent by this user
 */
export async function getEnquiriesSentByUser(userId: string): Promise<{
  enquiries: OpportunityEnquiry[];
  error: string | null;
}> {
  if (!userId) {
    return { enquiries: [], error: null };
  }

  try {
    const enquiriesMap = new Map<string, OpportunityEnquiry>();

    // 1. Primary Query: senderId == userId
    try {
      let querySnapshot;
      try {
        const q = query(
          collection(db, "opportunity_enquiries"),
          where("senderId", "==", userId),
          orderBy("createdAt", "desc")
        );
        querySnapshot = await getDocs(q);
      } catch {
        const fallbackQuery = query(
          collection(db, "opportunity_enquiries"),
          where("senderId", "==", userId)
        );
        querySnapshot = await getDocs(fallbackQuery);
      }

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.status === "listing_deleted" || data.opportunityStatus === "deleted") {
          return;
        }
        enquiriesMap.set(docSnap.id, {
          id: docSnap.id,
          ...(data as Omit<OpportunityEnquiry, "id">),
        });
      });
    } catch (err) {
      console.warn("[getEnquiriesSentByUser] primary query error:", err);
    }

    // 2. Fallback Query: userUid == userId or userId == userId
    try {
      const userUidQuery = query(
        collection(db, "opportunity_enquiries"),
        where("userUid", "==", userId)
      );
      const userUidSnap = await getDocs(userUidQuery);
      userUidSnap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.status === "listing_deleted" || data.opportunityStatus === "deleted") return;
        if (!enquiriesMap.has(docSnap.id)) {
          enquiriesMap.set(docSnap.id, {
            id: docSnap.id,
            ...(data as Omit<OpportunityEnquiry, "id">),
          });
        }
      });
    } catch {
      // ignore
    }

    try {
      const userIdQuery = query(
        collection(db, "opportunity_enquiries"),
        where("userId", "==", userId)
      );
      const userIdSnap = await getDocs(userIdQuery);
      userIdSnap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.status === "listing_deleted" || data.opportunityStatus === "deleted") return;
        if (!enquiriesMap.has(docSnap.id)) {
          enquiriesMap.set(docSnap.id, {
            id: docSnap.id,
            ...(data as Omit<OpportunityEnquiry, "id">),
          });
        }
      });
    } catch {
      // ignore
    }

    const enquiries = Array.from(enquiriesMap.values());
    enquiries.sort((a, b) => {
      const timeA = (a.createdAt as { seconds?: number })?.seconds || 0;
      const timeB = (b.createdAt as { seconds?: number })?.seconds || 0;
      return timeB - timeA;
    });

    return { enquiries, error: null };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return { enquiries: [], error: error.message || "Failed to load expressed interests." };
  }
}

/**
 * Update status of an enquiry (accessible by opportunity owner or admin)
 */
export async function updateEnquiryStatus(
  collectionName: "opportunity_enquiries" | "contact_inquiries",
  id: string,
  status: EnquiryStatus
): Promise<{ error: string | null }> {
  try {
    const docRef = doc(db, collectionName, id);
    await updateDoc(docRef, {
      status,
      updatedAt: serverTimestamp(),
    });
    return { error: null };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return { error: error.message || "Failed to update status." };
  }
}

export interface AdminDashboardStats {
  totalUsers: number;
  totalEntrepreneurs: number;
  totalInvestors: number;
  pendingListings: number;
  publishedListings: number;
  rejectedListings: number;
  totalEnquiries: number;
}

/**
 * Admin: Fetch real stats across Firestore collections
 */
export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const stats: AdminDashboardStats = {
    totalUsers: 0,
    totalEntrepreneurs: 0,
    totalInvestors: 0,
    pendingListings: 0,
    publishedListings: 0,
    rejectedListings: 0,
    totalEnquiries: 0,
  };

  try {
    // 1. Users
    const usersSnap = await getDocs(collection(db, "users"));
    stats.totalUsers = usersSnap.size;
    usersSnap.forEach((d) => {
      const data = d.data();
      if (data.role === "investor") stats.totalInvestors++;
      else stats.totalEntrepreneurs++;
    });

    // 2. Listings (with safe status normalization)
    const listingsSnap = await getDocs(collection(db, "listings"));
    listingsSnap.forEach((d) => {
      const data = d.data();
      const rawStatus = (data.status || data.approvalStatus || data.listingStatus || "pending")
        .toString()
        .toLowerCase()
        .trim();

      if (rawStatus === "published" || rawStatus === "approved" || rawStatus === "live") {
        stats.publishedListings++;
      } else if (rawStatus === "rejected" || rawStatus === "declined") {
        stats.rejectedListings++;
      } else {
        // Pending, draft, submitted, or missing status all count as pending review
        stats.pendingListings++;
      }
    });

    // 3. Enquiries
    const oppEnqSnap = await getDocs(collection(db, "opportunity_enquiries"));
    const contactSnap = await getDocs(collection(db, "contact_inquiries"));
    stats.totalEnquiries = oppEnqSnap.size + contactSnap.size;
  } catch (e) {
    console.warn("Could not load full stats from Firestore:", e);
  }

  return stats;
}
