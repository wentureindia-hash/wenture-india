import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "./client";
import { uploadPitchDeckFile, uploadListingImageFile, getSignedDocumentUrl } from "./storage";
import { Opportunity, InvestmentRangeCategory, OpportunityCategory } from "@/lib/constants/opportunities";

export type ListingStatus = "pending" | "published" | "rejected";

export type ListingType =
  | "Investment"
  | "Business"
  | "Franchise"
  | "Dealership"
  | "Partnership"
  | "International"
  | "EXIM";

export function convertListingToOpportunity(item: BusinessListing): Opportunity {
  let rangeCategory: InvestmentRangeCategory = "25l-50l";
  let targetAmountNum = 3500000;
  const rangeStr = (item.investmentRange || "").toLowerCase();

  if (rangeStr.includes("1l") && (rangeStr.includes("5l") || !rangeStr.includes("–"))) {
    rangeCategory = "1l-5l";
    targetAmountNum = 300000;
  } else if (rangeStr.includes("5l") && rangeStr.includes("10l")) {
    rangeCategory = "5l-10l";
    targetAmountNum = 750000;
  } else if (rangeStr.includes("10l") && rangeStr.includes("25l")) {
    rangeCategory = "10l-25l";
    targetAmountNum = 1500000;
  } else if (rangeStr.includes("25l") && rangeStr.includes("50l")) {
    rangeCategory = "25l-50l";
    targetAmountNum = 3500000;
  } else if (rangeStr.includes("50l") && (rangeStr.includes("1cr") || rangeStr.includes("1 cr"))) {
    rangeCategory = "50l-1cr";
    targetAmountNum = 7500000;
  } else if (rangeStr.includes("1cr") || rangeStr.includes("1 cr")) {
    rangeCategory = "1cr-plus";
    targetAmountNum = 15000000;
  }

  // Normalize category to valid OpportunityCategory
  const rawType = (item.listingType || item.category || "").toLowerCase();
  let category: OpportunityCategory = "Business";
  if (rawType.includes("franchise")) category = "Franchise";
  else if (rawType.includes("invest")) category = "Investment";
  else if (rawType.includes("dealership")) category = "Dealership";
  else if (rawType.includes("partner")) category = "Partnership";
  else if (rawType.includes("internat")) category = "International";
  else if (rawType.includes("exim")) category = "EXIM";
  else category = "Business";

  // Validate images gracefully
  const hasValidImage =
    Array.isArray(item.images) &&
    item.images.length > 0 &&
    typeof item.images[0] === "string" &&
    item.images[0].trim().length > 0 &&
    item.images[0] !== "/images/opp-default.jpg";

  const defaultImage =
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80";

  const imageUrl = hasValidImage ? item.images[0].trim() : defaultImage;

  const docId = item.id || `listing-${Date.now()}`;

  const detailsList: string[] = [];
  if (item.category) detailsList.push(`Category: ${item.category}`);
  if (item.sector) detailsList.push(`Sector: ${item.sector}`);
  if (item.businessType) detailsList.push(`Business Entity: ${item.businessType}`);
  if (item.businessStage) detailsList.push(`Operational Stage: ${item.businessStage}`);
  if (item.yearsInOperation) detailsList.push(`Years in Operation: ${item.yearsInOperation}`);
  if (item.businessModel) detailsList.push(`Business Model: ${item.businessModel}`);
  if (item.investmentPurpose) detailsList.push(`Capital Purpose: ${item.investmentPurpose}`);
  if (item.preferredInvestorType) detailsList.push(`Target Partner: ${item.preferredInvestorType}`);
  if (item.location) detailsList.push(`Location: ${item.location}`);
  if (item.investmentRange) detailsList.push(`Investment Range: ${item.investmentRange}`);
  if (item.founderName || item.ownerName) detailsList.push(`Leadership: ${item.founderName || item.ownerName}`);
  if (item.contactPhone) detailsList.push(`Contact Phone: ${item.contactPhone}`);
  if (item.contactEmail) detailsList.push(`Contact Email: ${item.contactEmail}`);

  const keyInfo: { label: string; value: string }[] = [];
  if (item.listingType) keyInfo.push({ label: "Listing Type", value: item.listingType });
  if (item.category) keyInfo.push({ label: "Category", value: item.category });
  if (item.sector) keyInfo.push({ label: "Sector", value: item.sector });
  if (item.businessType) keyInfo.push({ label: "Business Type", value: item.businessType });
  if (item.businessStage) keyInfo.push({ label: "Business Stage", value: item.businessStage });
  if (item.yearsInOperation) keyInfo.push({ label: "Years in Operation", value: item.yearsInOperation });
  if (item.businessModel) keyInfo.push({ label: "Business Model", value: item.businessModel });
  if (item.investmentPurpose) keyInfo.push({ label: "Investment Purpose", value: item.investmentPurpose });
  if (item.preferredInvestorType) keyInfo.push({ label: "Preferred Investor", value: item.preferredInvestorType });
  if (item.location) keyInfo.push({ label: "Location", value: item.location });
  if (item.investmentRange) keyInfo.push({ label: "Investment Range", value: item.investmentRange });
  if (item.founderName || item.ownerName) keyInfo.push({ label: "Founder / Contact", value: item.founderName || item.ownerName });
  if (item.contactPhone) keyInfo.push({ label: "Contact Phone", value: item.contactPhone });
  if (item.contactEmail) keyInfo.push({ label: "Contact Email", value: item.contactEmail });

  return {
    id: docId,
    slug: docId,
    title: item.title || "Untitled Opportunity",
    category,
    sector: item.sector || "General",
    location: item.location || "India",
    investmentRange: item.investmentRange || "₹25L – ₹50L",
    rangeCategory,
    targetRaise: item.investmentRange || "Undisclosed",
    targetAmountNum,
    type: item.category || item.listingType || "Business Opportunity",
    stageBadge: item.businessStage || "Verified Business",
    isFeatured: false,
    topOpportunity: false,
    isDemo: false,
    shortDescription:
      item.shortDescription ||
      (typeof item.description === "string" ? item.description.slice(0, 160) : "") ||
      "Verified commercial opportunity on Wenture India.",
    overview: item.shortDescription || item.description || "",
    businessDescription: item.description || item.shortDescription || "",
    opportunityDetails: detailsList,
    keyInformation: keyInfo,
    imageUrl,
    ownerId: item.ownerId || "",
    ownerName: item.founderName || item.ownerName || "",
    ownerEmail: item.ownerEmail || "",
    contactPhone: item.contactPhone || "",
    contactEmail: item.contactEmail || "",
    whatsappNumber: item.contactPhone || "",
    hasPitchDeck: Boolean(item.hasPitchDeck || item.pitchDeckUrl || item.pitchDeckStoragePath),
    pitchDeckUrl: item.pitchDeckUrl || undefined,
    pitchDeckFileName: item.pitchDeckFileName || undefined,
  };
}

export interface ReviewHistoryEntry {
  action:
    | "submitted"
    | "approved"
    | "rejected"
    | "changes_requested"
    | "resubmitted"
    | "edits_approved"
    | "edits_rejected"
    | "note_added";
  performedBy: string;
  timestamp: unknown;
  notes?: string;
}

export interface BusinessListing {
  id?: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;

  // Business Information
  title: string; // Business Name
  businessType?: string;
  listingType: ListingType;
  category: string;
  sector: string;
  location: string;
  businessStage?: string;
  yearsInOperation?: string;
  businessModel?: string;
  description: string; // Detailed Business Description

  // Investment Information
  investmentRange: string;
  investmentPurpose?: string;
  expectedUseOfFunds?: string;
  preferredInvestorType?: string;
  expectedValuation?: string;
  equityOffered?: string;
  minimumInvestment?: string;

  // Financial Information
  revenue?: string;
  profit?: string;
  turnover?: string;
  financialYear?: string;

  // Founder / Owner Information
  founderName?: string;
  founderBackground?: string;
  founderExperience?: string;
  website?: string;
  linkedinUrl?: string;

  // Business Presentation
  shortDescription: string; // Short Business Introduction
  hasPitchDeck?: boolean;
  pitchDeckUrl?: string | null;
  pitchDeckFileName?: string | null;
  pitchDeckStoragePath?: string | null;
  images: string[];

  // Contact Details
  contactPhone: string;
  contactEmail: string;

  // Verification & Review Workflow
  status: ListingStatus;
  approvalStatus?: string;
  isVerified?: boolean;
  verifiedAt?: unknown;
  verificationNotes?: string;
  rejectionReason?: string;
  adminNotes?: string;
  reviewHistory?: ReviewHistoryEntry[];

  // Pending Revision Workflow for Live Published Listings
  hasPendingEdits?: boolean;
  editStatus?: "idle" | "pending_review" | "approved" | "rejected";
  pendingReviewData?: Record<string, unknown> | null;
  editSubmittedAt?: unknown;

  createdAt: unknown;
  updatedAt: unknown;
  publishedAt?: unknown;
}

export type CreateListingInput = Omit<
  BusinessListing,
  | "id"
  | "ownerId"
  | "ownerName"
  | "ownerEmail"
  | "status"
  | "createdAt"
  | "updatedAt"
  | "publishedAt"
  | "rejectionReason"
  | "isVerified"
  | "verifiedAt"
  | "verificationNotes"
  | "adminNotes"
  | "reviewHistory"
  | "hasPendingEdits"
  | "editStatus"
  | "pendingReviewData"
  | "editSubmittedAt"
>;

export type UpdateListingInput = Partial<
  Omit<
    BusinessListing,
    | "id"
    | "ownerId"
    | "ownerEmail"
    | "createdAt"
    | "status"
    | "publishedAt"
    | "isVerified"
    | "verifiedAt"
    | "verificationNotes"
    | "adminNotes"
    | "reviewHistory"
  >
>;

/**
 * Create a new business listing (always starts as pending)
 */
export async function createListing(
  input: CreateListingInput
): Promise<{ id: string | null; error: string | null }> {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn("[createListing] No authenticated Firebase user found.");
      return { id: null, error: "You must be signed in as an entrepreneur to submit a listing." };
    }

    const hasPitchDeck = Boolean(input.pitchDeckUrl || input.pitchDeckStoragePath);

    const initialHistoryEntry: ReviewHistoryEntry = {
      action: "submitted",
      performedBy: currentUser.email || "Entrepreneur",
      timestamp: new Date().toISOString(),
      notes: "Initial business opportunity submitted for administrator review.",
    };

    const listingData = {
      ownerId: currentUser.uid,
      ownerEmail: currentUser.email || input.contactEmail || "",
      ownerName: currentUser.displayName || input.founderName || input.contactEmail.split("@")[0] || "Entrepreneur",
      title: input.title.trim(),
      businessType: input.businessType?.trim() || "Private Limited",
      listingType: input.listingType,
      category: input.category,
      sector: input.sector,
      location: input.location.trim(),
      businessStage: input.businessStage?.trim() || "Revenue Generating",
      yearsInOperation: input.yearsInOperation?.trim() || "1–3 years",
      businessModel: input.businessModel?.trim() || "B2B",
      shortDescription: input.shortDescription.trim(),
      description: input.description.trim(),
      investmentRange: input.investmentRange,
      investmentPurpose: input.investmentPurpose?.trim() || "Growth & Expansion",
      expectedUseOfFunds: input.expectedUseOfFunds?.trim() || null,
      preferredInvestorType: input.preferredInvestorType?.trim() || "Angel Investor",
      expectedValuation: input.expectedValuation?.trim() || null,
      equityOffered: input.equityOffered?.trim() || null,
      minimumInvestment: input.minimumInvestment?.trim() || null,
      revenue: input.revenue?.trim() || null,
      turnover: input.turnover?.trim() || null,
      profit: input.profit?.trim() || null,
      financialYear: input.financialYear?.trim() || null,
      website: input.website?.trim() || null,
      founderName: input.founderName?.trim() || null,
      founderBackground: input.founderBackground?.trim() || null,
      founderExperience: input.founderExperience?.trim() || null,
      hasPitchDeck,
      pitchDeckUrl: input.pitchDeckUrl?.trim() || null,
      pitchDeckFileName: input.pitchDeckFileName?.trim() || null,
      pitchDeckStoragePath: input.pitchDeckStoragePath?.trim() || null,
      contactPhone: input.contactPhone.trim(),
      contactEmail: input.contactEmail.trim(),
      images: input.images || [],
      status: "pending" as const, // Strictly forced to pending
      approvalStatus: "pending",
      isVerified: false,
      hasPendingEdits: false,
      editStatus: "idle" as const,
      pendingReviewData: null,
      reviewHistory: [initialHistoryEntry],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, "listings"), listingData);
    console.log("[createListing] Document written successfully to listings/" + docRef.id);

    // Securely isolate confidential pitch deck in restricted subcollection
    if (hasPitchDeck && (input.pitchDeckUrl || input.pitchDeckStoragePath)) {
      try {
        await setDoc(doc(db, "listings", docRef.id, "restricted", "pitchDeck"), {
          pitchDeckUrl: input.pitchDeckUrl?.trim() || null,
          pitchDeckFileName: input.pitchDeckFileName?.trim() || null,
          pitchDeckStoragePath: input.pitchDeckStoragePath?.trim() || null,
          ownerId: currentUser.uid,
          createdAt: serverTimestamp(),
        });
        console.log("[createListing] Protected pitch deck written to listings/" + docRef.id + "/restricted/pitchDeck");
      } catch (deckErr) {
        console.warn("[createListing] Failed to write restricted pitch deck document:", deckErr);
      }
    }

    return { id: docRef.id, error: null };
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    console.error("[createListing] Firebase error code:", error.code, "message:", error.message);
    return { id: null, error: error.message || "Failed to submit business listing." };
  }
}

/**
 * Normalize any raw Firestore listing document (modern, legacy, or imported)
 * to ensure all expected fields and statuses exist consistently.
 */
export function normalizeListing(docId: string, rawData: Record<string, unknown>): BusinessListing {
  // 1. Status normalization
  const rawStatus = (
    rawData.status ||
    rawData.approvalStatus ||
    rawData.listingStatus ||
    rawData.state ||
    "pending"
  )
    .toString()
    .toLowerCase()
    .trim();

  let status: ListingStatus = "pending";
  if (
    rawStatus === "published" ||
    rawStatus === "approved" ||
    rawStatus === "live" ||
    rawStatus === "active"
  ) {
    status = "published";
  } else if (
    rawStatus === "rejected" ||
    rawStatus === "declined" ||
    rawStatus === "disapproved"
  ) {
    status = "rejected";
  } else {
    // Older or unapproved listings default to "pending" review
    status = "pending";
  }

  // 2. Owner normalization (supports ownerId, userId, createdBy, authorId)
  const ownerId = (
    rawData.ownerId ||
    rawData.userId ||
    rawData.createdBy ||
    rawData.authorId ||
    rawData.uid ||
    "unknown"
  ) as string;

  const ownerName = (
    rawData.ownerName ||
    rawData.userName ||
    rawData.fullName ||
    rawData.contactPerson ||
    rawData.contactName ||
    rawData.name ||
    "Entrepreneur"
  ) as string;

  const ownerEmail = (
    rawData.ownerEmail ||
    rawData.userEmail ||
    rawData.contactEmail ||
    rawData.email ||
    ""
  ) as string;

  // 3. Title & Content normalization
  const title = (
    rawData.title ||
    rawData.listingTitle ||
    rawData.businessName ||
    rawData.opportunityTitle ||
    rawData.companyName ||
    rawData.name ||
    "Untitled Opportunity"
  ) as string;

  const listingType = (
    rawData.listingType ||
    rawData.opportunityType ||
    rawData.type ||
    rawData.category ||
    "Business"
  ) as ListingType;

  const category = (
    rawData.category ||
    rawData.listingCategory ||
    rawData.industry ||
    rawData.sector ||
    "General"
  ) as string;

  const sector = (
    rawData.sector ||
    rawData.industrySector ||
    rawData.domain ||
    category ||
    "General"
  ) as string;

  const location = (
    rawData.location ||
    rawData.city ||
    rawData.address ||
    "India"
  ) as string;

  const investmentRange = (
    rawData.investmentRange ||
    rawData.investment ||
    rawData.budget ||
    rawData.targetRaise ||
    rawData.askAmount ||
    "₹25L – ₹50L"
  ) as string;

  const shortDescription = (
    rawData.shortDescription ||
    rawData.summary ||
    rawData.overview ||
    (typeof rawData.description === "string" ? rawData.description.slice(0, 160) : "") ||
    "No summary provided."
  ) as string;

  const description = (
    rawData.description ||
    rawData.detailedDescription ||
    rawData.details ||
    shortDescription
  ) as string;

  const contactPhone = (
    rawData.contactPhone ||
    rawData.phone ||
    rawData.phoneNumber ||
    rawData.mobile ||
    ""
  ) as string;

  const contactEmail = (
    rawData.contactEmail ||
    ownerEmail ||
    ""
  ) as string;

  const images = Array.isArray(rawData.images) && rawData.images.length > 0
    ? (rawData.images as string[])
    : typeof rawData.imageUrl === "string" && rawData.imageUrl.trim()
    ? [rawData.imageUrl.trim()]
    : ["/images/opp-default.jpg"];

  // 4. Timestamps
  const createdAt =
    rawData.createdAt ||
    rawData.createdDate ||
    rawData.timestamp ||
    rawData.updatedAt ||
    null;

  const updatedAt =
    rawData.updatedAt ||
    rawData.updatedDate ||
    createdAt ||
    null;

  return {
    id: docId,
    ownerId,
    ownerName: (rawData.founderName as string) || ownerName,
    ownerEmail,
    title,
    businessType: (rawData.businessType as string) || undefined,
    listingType,
    category,
    sector,
    location,
    businessStage: (rawData.businessStage as string) || undefined,
    yearsInOperation: (rawData.yearsInOperation as string) || undefined,
    businessModel: (rawData.businessModel as string) || undefined,
    investmentRange,
    investmentPurpose: (rawData.investmentPurpose as string) || undefined,
    expectedUseOfFunds: (rawData.expectedUseOfFunds as string) || undefined,
    preferredInvestorType: (rawData.preferredInvestorType as string) || undefined,
    founderName: (rawData.founderName as string) || (rawData.ownerName as string) || undefined,
    founderBackground: (rawData.founderBackground as string) || undefined,
    founderExperience: (rawData.founderExperience as string) || undefined,
    expectedValuation: (rawData.expectedValuation as string) || undefined,
    equityOffered: (rawData.equityOffered as string) || undefined,
    minimumInvestment: (rawData.minimumInvestment as string) || undefined,
    revenue: (rawData.revenue as string) || (rawData.turnover as string) || undefined,
    turnover: (rawData.turnover as string) || undefined,
    profit: (rawData.profit as string) || undefined,
    financialYear: (rawData.financialYear as string) || undefined,
    website: (rawData.website as string) || undefined,
    linkedinUrl: (rawData.linkedinUrl as string) || undefined,
    hasPitchDeck: Boolean(
      rawData.hasPitchDeck ||
      rawData.pitchDeckUrl ||
      (rawData.pitchDeckFileName && typeof rawData.pitchDeckFileName === "string" && rawData.pitchDeckFileName.trim().length > 0)
    ),
    pitchDeckUrl: (rawData.pitchDeckUrl as string) || undefined,
    pitchDeckFileName: (rawData.pitchDeckFileName as string) || undefined,
    pitchDeckStoragePath: (rawData.pitchDeckStoragePath as string) || undefined,
    shortDescription,
    description,
    contactPhone,
    contactEmail,
    images,
    status,
    approvalStatus: (rawData.approvalStatus as string) || (status === "published" ? "approved" : status),
    isVerified: Boolean(rawData.isVerified),
    verifiedAt: rawData.verifiedAt || null,
    verificationNotes: (rawData.verificationNotes as string) || undefined,
    adminNotes: (rawData.adminNotes as string) || undefined,
    reviewHistory: Array.isArray(rawData.reviewHistory) ? (rawData.reviewHistory as ReviewHistoryEntry[]) : undefined,
    hasPendingEdits: Boolean(rawData.hasPendingEdits),
    editStatus: (rawData.editStatus as "idle" | "pending_review" | "approved" | "rejected") || "idle",
    pendingReviewData: (rawData.pendingReviewData as Record<string, unknown>) || null,
    editSubmittedAt: rawData.editSubmittedAt || null,
    createdAt,
    updatedAt,
    publishedAt: rawData.publishedAt || (status === "published" ? updatedAt : null),
    rejectionReason: (rawData.rejectionReason as string) || undefined,
  };
}

/**
 * Fetch all listings owned by the currently authenticated user
 */
export async function getUserListings(): Promise<{ listings: BusinessListing[]; error: string | null }> {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { listings: [], error: "Not authenticated" };
    }

    const listingsRef = collection(db, "listings");
    const listings: BusinessListing[] = [];
    const seenIds = new Set<string>();

    try {
      const q = query(
        listingsRef,
        where("ownerId", "==", user.uid),
        orderBy("createdAt", "desc")
      );
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((docSnap) => {
        seenIds.add(docSnap.id);
        listings.push(normalizeListing(docSnap.id, docSnap.data()));
      });
    } catch {
      // Fallback query without composite ordering
      const q = query(listingsRef, where("ownerId", "==", user.uid));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((docSnap) => {
        seenIds.add(docSnap.id);
        listings.push(normalizeListing(docSnap.id, docSnap.data()));
      });
    }

    // Also check for legacy userId field if no listings found
    if (listings.length === 0) {
      try {
        const qLegacy = query(listingsRef, where("userId", "==", user.uid));
        const legacySnap = await getDocs(qLegacy);
        legacySnap.forEach((docSnap) => {
          if (!seenIds.has(docSnap.id)) {
            seenIds.add(docSnap.id);
            listings.push(normalizeListing(docSnap.id, docSnap.data()));
          }
        });
      } catch {
        // Safe ignore
      }
    }

    // Client-side sort fallback
    listings.sort((a, b) => {
      const timeA = (a.createdAt as { seconds?: number })?.seconds || 0;
      const timeB = (b.createdAt as { seconds?: number })?.seconds || 0;
      return timeB - timeA;
    });

    return { listings, error: null };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return { listings: [], error: error.message || "Failed to fetch user listings." };
  }
}

/**
 * Fetch public published listings (strictly where status == 'published')
 */
export async function getPublishedListings(): Promise<{ listings: BusinessListing[]; error: string | null }> {
  try {
    const listingsRef = collection(db, "listings");
    let querySnapshot;

    try {
      const q = query(
        listingsRef,
        where("status", "==", "published"),
        orderBy("createdAt", "desc")
      );
      querySnapshot = await getDocs(q);
    } catch {
      // Fallback query without composite index requirement
      const q = query(listingsRef, where("status", "==", "published"));
      querySnapshot = await getDocs(q);
    }

    const listings: BusinessListing[] = [];
    querySnapshot.forEach((docSnap) => {
      const normalized = normalizeListing(docSnap.id, docSnap.data());
      if (normalized.status === "published") {
        listings.push(normalized);
      }
    });

    // In-memory sort by createdAt descending (newest first)
    listings.sort((a, b) => {
      const timeA = (a.createdAt as { seconds?: number })?.seconds || 0;
      const timeB = (b.createdAt as { seconds?: number })?.seconds || 0;
      return timeB - timeA;
    });

    return { listings, error: null };
  } catch (err: unknown) {
    const error = err as { message?: string };
    console.error("[getPublishedListings] Error:", error);
    return { listings: [], error: error.message || "Failed to fetch published listings." };
  }
}

/**
 * Fetch a single published listing by ID
 */
export async function getPublishedListingById(
  listingId: string
): Promise<{ listing: BusinessListing | null; error: string | null }> {
  try {
    const docRef = doc(db, "listings", listingId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return { listing: null, error: "Listing not found" };
    }

    const normalized = normalizeListing(docSnap.id, docSnap.data());
    if (normalized.status !== "published") {
      // Only owner or admin can view unpublished
      const user = auth.currentUser;
      if (!user || user.uid !== normalized.ownerId) {
        return { listing: null, error: "Listing is not publicly available." };
      }
    }

    return {
      listing: normalized,
      error: null,
    };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return { listing: null, error: error.message || "Failed to load listing." };
  }
}

/**
 * Admin: Fetch all listings across all users with safe schema normalization.
 * Does NOT filter out listings missing a strict 'pending' field.
 */
export async function getAllListings(
  statusFilter?: ListingStatus | "all"
): Promise<{ listings: BusinessListing[]; error: string | null }> {
  try {
    const listings: BusinessListing[] = [];
    const seenIds = new Set<string>();

    // 1. Primary collection: "listings"
    const listingsRef = collection(db, "listings");
    let querySnapshot;

    try {
      const q = query(listingsRef, orderBy("createdAt", "desc"));
      querySnapshot = await getDocs(q);
    } catch {
      querySnapshot = await getDocs(listingsRef);
    }

    querySnapshot.forEach((docSnap) => {
      seenIds.add(docSnap.id);
      listings.push(normalizeListing(docSnap.id, docSnap.data()));
    });

    // 2. Fallback collections check (in case older opportunities were stored in other collections)
    const fallbackCollections = ["opportunities", "business_listings"];
    for (const colName of fallbackCollections) {
      try {
        const fallbackRef = collection(db, colName);
        const snap = await getDocs(fallbackRef);
        snap.forEach((docSnap) => {
          if (!seenIds.has(docSnap.id)) {
            const data = docSnap.data();
            if (data.title || data.listingTitle || data.businessName || data.name) {
              seenIds.add(docSnap.id);
              listings.push(normalizeListing(docSnap.id, data));
            }
          }
        });
      } catch {
        // Fallback collection does not exist or not readable - safely ignore
      }
    }

    // Sort by createdAt descending
    listings.sort((a, b) => {
      const timeA = (a.createdAt as { seconds?: number })?.seconds || 0;
      const timeB = (b.createdAt as { seconds?: number })?.seconds || 0;
      return timeB - timeA;
    });

    // Apply normalized status filter
    if (statusFilter && statusFilter !== "all") {
      const filtered = listings.filter((item) => item.status === statusFilter);
      return { listings: filtered, error: null };
    }

    return { listings, error: null };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return { listings: [], error: error.message || "Failed to fetch all listings." };
  }
}

/**
 * Fetch a single listing by ID regardless of status (for Owner or Admin inspection)
 */
export async function getListingById(
  listingId: string
): Promise<{ listing: BusinessListing | null; error: string | null }> {
  try {
    const docRef = doc(db, "listings", listingId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      // Check fallback collection "opportunities" safely
      try {
        const oppRef = doc(db, "opportunities", listingId);
        const oppSnap = await getDoc(oppRef);
        if (oppSnap.exists()) {
          return { listing: normalizeListing(oppSnap.id, oppSnap.data()), error: null };
        }
      } catch (oppErr: unknown) {
        const oppError = oppErr as { code?: string; message?: string };
        if (oppError.code === "permission-denied" || oppError.message?.includes("insufficient permissions")) {
          return { listing: null, error: "Access denied. You do not have permission to view this opportunity." };
        }
      }
      return { listing: null, error: "Listing not found." };
    }

    return { listing: normalizeListing(docSnap.id, docSnap.data()), error: null };
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    if (error.code === "permission-denied" || error.message?.includes("insufficient permissions")) {
      return { listing: null, error: "Access denied. You do not have permission to view this listing." };
    }
    return { listing: null, error: error.message || "Failed to fetch listing." };
  }
}

/**
 * Update an existing business listing (Owner or Admin).
 * - Preserves existing Firestore document ID.
 * - If listing is currently published: stores modifications in pendingReviewData so live
 *   public information is not silently overwritten before admin verification.
 * - If listing is pending, rejected, or changes_requested: updates in-place and transitions
 *   status back to 'pending' review, clearing rejection notes.
 * - Preserves existing images/pitch deck files if not replaced.
 */
export async function updateListing(
  listingId: string,
  input: UpdateListingInput
): Promise<{ success: boolean; error: string | null }> {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return { success: false, error: "You must be signed in to edit this listing." };
    }

    const docRef = doc(db, "listings", listingId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return { success: false, error: "Listing not found." };
    }

    const existingData = docSnap.data();

    // Verify ownership or admin privilege (supporting ownerId and legacy userId)
    const isOwner =
      existingData.ownerId === currentUser.uid ||
      existingData.userId === currentUser.uid;
    const isAdminUser =
      currentUser.email === "wentureindia@gmail.com" ||
      currentUser.email === "info@wentureindia.com" ||
      currentUser.email === "payalnkapse1720@gmail.com";

    if (!isOwner && !isAdminUser) {
      return { success: false, error: "Unauthorized: You do not own this listing." };
    }

    const currentStatus: ListingStatus = existingData.status || "pending";
    const existingHistory: ReviewHistoryEntry[] = Array.isArray(existingData.reviewHistory)
      ? existingData.reviewHistory
      : [];

    // Build updated fields payload cleanly
    const updatedPayload: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };

    if (input.title !== undefined) updatedPayload.title = input.title.trim();
    if (input.businessType !== undefined) updatedPayload.businessType = input.businessType?.trim() || null;
    if (input.listingType !== undefined) updatedPayload.listingType = input.listingType;
    if (input.category !== undefined) updatedPayload.category = input.category.trim();
    if (input.sector !== undefined) updatedPayload.sector = input.sector.trim();
    if (input.location !== undefined) updatedPayload.location = input.location.trim();
    if (input.businessStage !== undefined) updatedPayload.businessStage = input.businessStage?.trim() || null;
    if (input.yearsInOperation !== undefined) updatedPayload.yearsInOperation = input.yearsInOperation?.trim() || null;
    if (input.businessModel !== undefined) updatedPayload.businessModel = input.businessModel?.trim() || null;
    if (input.shortDescription !== undefined) updatedPayload.shortDescription = input.shortDescription.trim();
    if (input.description !== undefined) updatedPayload.description = input.description.trim();
    if (input.investmentRange !== undefined) updatedPayload.investmentRange = input.investmentRange;
    if (input.investmentPurpose !== undefined) updatedPayload.investmentPurpose = input.investmentPurpose?.trim() || null;
    if (input.expectedUseOfFunds !== undefined) updatedPayload.expectedUseOfFunds = input.expectedUseOfFunds?.trim() || null;
    if (input.preferredInvestorType !== undefined) updatedPayload.preferredInvestorType = input.preferredInvestorType?.trim() || null;
    if (input.expectedValuation !== undefined) updatedPayload.expectedValuation = input.expectedValuation?.trim() || null;
    if (input.equityOffered !== undefined) updatedPayload.equityOffered = input.equityOffered?.trim() || null;
    if (input.minimumInvestment !== undefined) updatedPayload.minimumInvestment = input.minimumInvestment?.trim() || null;
    if (input.revenue !== undefined) updatedPayload.revenue = input.revenue?.trim() || null;
    if (input.turnover !== undefined) updatedPayload.turnover = input.turnover?.trim() || null;
    if (input.profit !== undefined) updatedPayload.profit = input.profit?.trim() || null;
    if (input.financialYear !== undefined) updatedPayload.financialYear = input.financialYear?.trim() || null;
    if (input.website !== undefined) updatedPayload.website = input.website?.trim() || null;
    if (input.founderName !== undefined) updatedPayload.founderName = input.founderName?.trim() || null;
    if (input.founderBackground !== undefined) updatedPayload.founderBackground = input.founderBackground?.trim() || null;
    if (input.founderExperience !== undefined) updatedPayload.founderExperience = input.founderExperience?.trim() || null;
    if (input.contactPhone !== undefined) updatedPayload.contactPhone = input.contactPhone.trim();
    if (input.contactEmail !== undefined) updatedPayload.contactEmail = input.contactEmail.trim();

    // Preserve existing images unless newly supplied
    if (Array.isArray(input.images) && input.images.length > 0) {
      updatedPayload.images = input.images;
    }

    // Preserve pitch deck references
    const hasPitchDeckChanges =
      input.pitchDeckStoragePath !== undefined ||
      input.pitchDeckUrl !== undefined ||
      input.pitchDeckFileName !== undefined;

    if (hasPitchDeckChanges) {
      if (input.pitchDeckUrl !== undefined) {
        updatedPayload.pitchDeckUrl = input.pitchDeckUrl || null;
      }
      if (input.pitchDeckFileName !== undefined) {
        updatedPayload.pitchDeckFileName = input.pitchDeckFileName || null;
      }
      if (input.pitchDeckStoragePath !== undefined) {
        updatedPayload.pitchDeckStoragePath = input.pitchDeckStoragePath || null;
      }

      const activeStoragePath =
        input.pitchDeckStoragePath !== undefined
          ? input.pitchDeckStoragePath
          : existingData.pitchDeckStoragePath;
      const activeDeckUrl =
        input.pitchDeckUrl !== undefined
          ? input.pitchDeckUrl
          : existingData.pitchDeckUrl;

      updatedPayload.hasPitchDeck = Boolean(activeStoragePath || activeDeckUrl);
    }

    // SCENARIO 1: Published listing
    // Preserve live public data. Stage updates into pendingReviewData for admin verification.
    if (currentStatus === "published") {
      const historyEntry: ReviewHistoryEntry = {
        action: "resubmitted",
        performedBy: currentUser.email || "Entrepreneur",
        timestamp: new Date().toISOString(),
        notes: "Entrepreneur submitted updates to published listing. Awaiting admin review.",
      };

      await updateDoc(docRef, {
        hasPendingEdits: true,
        editStatus: "pending_review",
        pendingReviewData: {
          ...updatedPayload,
          updatedAt: new Date().toISOString(),
        },
        editSubmittedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        reviewHistory: [...existingHistory, historyEntry],
      });
    } else {
      // SCENARIO 2: Pending, Rejected, or Changes_Requested listing
      // Direct in-place field updates. Resets to pending review.
      const isRevision = currentStatus === "rejected" || existingData.approvalStatus === "changes_requested";
      const historyEntry: ReviewHistoryEntry = {
        action: isRevision ? "resubmitted" : "submitted",
        performedBy: currentUser.email || "Entrepreneur",
        timestamp: new Date().toISOString(),
        notes: isRevision
          ? "Entrepreneur revised listing addressing feedback and resubmitted for verification."
          : "Entrepreneur updated listing details.",
      };

      await updateDoc(docRef, {
        ...updatedPayload,
        status: "pending",
        approvalStatus: "pending",
        rejectionReason: null,
        hasPendingEdits: false,
        pendingReviewData: null,
        editStatus: "idle",
        updatedAt: serverTimestamp(),
        reviewHistory: [...existingHistory, historyEntry],
      });
    }

    // Securely update the restricted subcollection if pitch deck was updated or replaced
    const isNewDeck = Boolean(
      (input.pitchDeckStoragePath && input.pitchDeckStoragePath !== existingData.pitchDeckStoragePath) ||
      (input.pitchDeckUrl && input.pitchDeckUrl !== existingData.pitchDeckUrl) ||
      (input.pitchDeckFileName && input.pitchDeckFileName !== existingData.pitchDeckFileName)
    );

    if (isNewDeck) {
      try {
        const finalStoragePath =
          input.pitchDeckStoragePath !== undefined
            ? input.pitchDeckStoragePath
            : (existingData.pitchDeckStoragePath as string) || null;
        const finalDeckUrl =
          input.pitchDeckUrl !== undefined
            ? input.pitchDeckUrl
            : (existingData.pitchDeckUrl as string) || null;
        const finalFileName =
          input.pitchDeckFileName !== undefined
            ? input.pitchDeckFileName
            : (existingData.pitchDeckFileName as string) || null;

        await setDoc(
          doc(db, "listings", listingId, "restricted", "pitchDeck"),
          {
            pitchDeckUrl: finalDeckUrl ? finalDeckUrl.trim() : null,
            pitchDeckFileName: finalFileName ? finalFileName.trim() : null,
            pitchDeckStoragePath: finalStoragePath ? finalStoragePath.trim() : null,
            ownerId: existingData.ownerId || existingData.userId || currentUser.uid,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (deckErr) {
        console.warn("[updateListing] Restricted subcollection write note:", deckErr);
      }
    }

    return { success: true, error: null };
  } catch (err: unknown) {
    const error = err as { message?: string };
    console.error("[updateListing] Error:", error);
    return { success: false, error: error.message || "Failed to update listing." };
  }
}

/**
 * Admin: Approve listing or approve pending revisions
 * Updates the existing document in-place, without creating duplicates.
 */
export async function approveListing(
  listingId: string,
  notes?: string
): Promise<{ error: string | null }> {
  try {
    const currentUser = auth.currentUser;
    const docRef = doc(db, "listings", listingId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return { error: "Listing not found." };
    }

    const data = docSnap.data();
    const existingHistory: ReviewHistoryEntry[] = Array.isArray(data.reviewHistory)
      ? data.reviewHistory
      : [];

    const isApprovingPendingEdits = Boolean(data.hasPendingEdits && data.pendingReviewData);

    const historyEntry: ReviewHistoryEntry = {
      action: isApprovingPendingEdits ? "edits_approved" : "approved",
      performedBy: currentUser?.email || "Admin",
      timestamp: new Date().toISOString(),
      notes: notes || (isApprovingPendingEdits ? "Admin approved submitted revisions." : "Admin approved and published listing."),
    };

    const updatePayload: Record<string, unknown> = {
      status: "published",
      approvalStatus: "approved",
      publishedAt: data.publishedAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
      rejectionReason: null,
      hasPendingEdits: false,
      editStatus: "approved",
      pendingReviewData: null,
      reviewHistory: [...existingHistory, historyEntry],
    };

    // If approving staged revisions on a published listing, merge pendingReviewData into primary fields!
    if (isApprovingPendingEdits && typeof data.pendingReviewData === "object" && data.pendingReviewData !== null) {
      const staged = { ...data.pendingReviewData };
      delete staged.updatedAt; // Use serverTimestamp for primary doc
      Object.assign(updatePayload, staged);
    }

    await updateDoc(docRef, updatePayload);
    return { error: null };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return { error: error.message || "Failed to approve listing." };
  }
}

/**
 * Admin: Reject listing with mandatory reason
 * Updates the existing document in-place, preserving data without deletion.
 */
export async function rejectListing(
  listingId: string,
  rejectionReason: string
): Promise<{ error: string | null }> {
  try {
    if (!rejectionReason.trim()) {
      return { error: "A rejection reason is required." };
    }
    const currentUser = auth.currentUser;
    const docRef = doc(db, "listings", listingId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return { error: "Listing not found." };
    }

    const data = docSnap.data();
    const existingHistory: ReviewHistoryEntry[] = Array.isArray(data.reviewHistory)
      ? data.reviewHistory
      : [];

    const historyEntry: ReviewHistoryEntry = {
      action: "rejected",
      performedBy: currentUser?.email || "Admin",
      timestamp: new Date().toISOString(),
      notes: rejectionReason.trim(),
    };

    await updateDoc(docRef, {
      status: "rejected",
      approvalStatus: "rejected",
      rejectionReason: rejectionReason.trim(),
      hasPendingEdits: false,
      editStatus: "rejected",
      pendingReviewData: null,
      updatedAt: serverTimestamp(),
      reviewHistory: [...existingHistory, historyEntry],
    });

    return { error: null };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return { error: error.message || "Failed to reject listing." };
  }
}

/**
 * Admin: Request Changes from the entrepreneur with specific feedback
 */
export async function requestChangesListing(
  listingId: string,
  feedback: string
): Promise<{ error: string | null }> {
  try {
    if (!feedback.trim()) {
      return { error: "Specific revision feedback is required." };
    }
    const currentUser = auth.currentUser;
    const docRef = doc(db, "listings", listingId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return { error: "Listing not found." };
    }

    const data = docSnap.data();
    const existingHistory: ReviewHistoryEntry[] = Array.isArray(data.reviewHistory)
      ? data.reviewHistory
      : [];

    const historyEntry: ReviewHistoryEntry = {
      action: "changes_requested",
      performedBy: currentUser?.email || "Admin",
      timestamp: new Date().toISOString(),
      notes: feedback.trim(),
    };

    await updateDoc(docRef, {
      status: "rejected",
      approvalStatus: "changes_requested",
      rejectionReason: feedback.trim(),
      hasPendingEdits: false,
      editStatus: "rejected",
      pendingReviewData: null,
      updatedAt: serverTimestamp(),
      reviewHistory: [...existingHistory, historyEntry],
    });

    return { error: null };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return { error: error.message || "Failed to request changes on listing." };
  }
}

/**
 * Admin: Add internal administrator notes
 */
export async function addAdminNotes(
  listingId: string,
  newNote: string
): Promise<{ error: string | null }> {
  try {
    if (!newNote.trim()) {
      return { error: "Note content cannot be empty." };
    }
    const currentUser = auth.currentUser;
    const docRef = doc(db, "listings", listingId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return { error: "Listing not found." };
    }

    const data = docSnap.data();
    const existingHistory: ReviewHistoryEntry[] = Array.isArray(data.reviewHistory)
      ? data.reviewHistory
      : [];
    const existingNotes = data.adminNotes ? `${data.adminNotes}\n` : "";
    const dateStr = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    const formattedNote = `${existingNotes}• [${dateStr} - ${currentUser?.email || "Admin"}]: ${newNote.trim()}`;

    const historyEntry: ReviewHistoryEntry = {
      action: "note_added",
      performedBy: currentUser?.email || "Admin",
      timestamp: new Date().toISOString(),
      notes: newNote.trim(),
    };

    await updateDoc(docRef, {
      adminNotes: formattedNote,
      updatedAt: serverTimestamp(),
      reviewHistory: [...existingHistory, historyEntry],
    });

    return { error: null };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return { error: error.message || "Failed to record internal note." };
  }
}

/**
 * Admin: Toggle or set independent verification status
 */
export async function updateListingVerification(
  listingId: string,
  isVerified: boolean,
  notes?: string
): Promise<{ error: string | null }> {
  try {
    const docRef = doc(db, "listings", listingId);
    await updateDoc(docRef, {
      isVerified,
      verifiedAt: isVerified ? serverTimestamp() : null,
      verificationNotes: notes?.trim() || null,
      updatedAt: serverTimestamp(),
    });

    return { error: null };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return { error: error.message || "Failed to update verification status." };
  }
}

/**
 * Delete listing (Admin or Owner)
 */
export async function deleteListing(listingId: string): Promise<{ error: string | null }> {
  try {
    const docRef = doc(db, "listings", listingId);
    await deleteDoc(docRef);
    return { error: null };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return { error: error.message || "Failed to delete listing." };
  }
}

/**
 * Upload a listing image to Firebase Storage with centralized error handling and pre-validation.
 */
export async function uploadListingImage(
  file: File,
  tempId: string
): Promise<{ url: string | null; error: string | null }> {
  const res = await uploadListingImageFile(file, tempId);
  return { url: res.url, error: res.error };
}

/**
 * Upload a PDF Pitch Deck to Firebase Storage (max 20MB, PDF only) with centralized error handling.
 */
export async function uploadPitchDeck(
  file: File,
  tempId: string
): Promise<{
  url: string | null;
  fileName: string | null;
  storagePath: string | null;
  error: string | null;
}> {
  const res = await uploadPitchDeckFile(file, tempId);
  return {
    url: res.url,
    fileName: res.fileName,
    storagePath: res.storagePath,
    error: res.error,
  };
}

/**
 * Securely fetch the confidential pitch deck URL for an opportunity.
 * Restricted to authenticated users only.
 */
export async function getListingPitchDeck(
  listingId: string
): Promise<{ url: string | null; fileName: string | null; error: string | null }> {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return {
        url: null,
        fileName: null,
        error: "Please sign in to view this pitch deck.",
      };
    }

    // 1. Check restricted subcollection
    try {
      const restrictedRef = doc(db, "listings", listingId, "restricted", "pitchDeck");
      const snap = await getDoc(restrictedRef);
      if (snap.exists()) {
        const data = snap.data();
        const fileName = (data.pitchDeckFileName as string) || null;

        // If a storage path is available in Supabase, generate a short-lived signed URL
        if (data.pitchDeckStoragePath) {
          const signedRes = await getSignedDocumentUrl(data.pitchDeckStoragePath as string, "pitch-deck");
          if (signedRes.signedUrl) {
            return {
              url: signedRes.signedUrl,
              fileName,
              error: null,
            };
          }
        }

        if (data.pitchDeckUrl) {
          return {
            url: data.pitchDeckUrl as string,
            fileName,
            error: null,
          };
        }
      }
    } catch (subErr) {
      console.warn("[getListingPitchDeck] Subcollection check note:", subErr);
    }

    // 2. Fallback to parent document for legacy listings
    try {
      const parentRef = doc(db, "listings", listingId);
      const parentSnap = await getDoc(parentRef);
      if (parentSnap.exists()) {
        const data = parentSnap.data();
        const fileName = (data.pitchDeckFileName as string) || null;

        if (data.pitchDeckStoragePath) {
          const signedRes = await getSignedDocumentUrl(data.pitchDeckStoragePath as string, "pitch-deck");
          if (signedRes.signedUrl) {
            return {
              url: signedRes.signedUrl,
              fileName,
              error: null,
            };
          }
        }

        if (data.pitchDeckUrl) {
          return {
            url: data.pitchDeckUrl as string,
            fileName,
            error: null,
          };
        }
      }
    } catch (parentErr) {
      console.warn("[getListingPitchDeck] Parent doc check note:", parentErr);
    }

    return {
      url: null,
      fileName: null,
      error: "No pitch deck is available for this opportunity.",
    };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return {
      url: null,
      fileName: null,
      error: error.message || "Failed to load pitch deck.",
    };
  }
}
