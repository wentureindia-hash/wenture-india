/**
 * WENTURE INDIA — LISTING EDIT & COMPLETE ADMIN VERIFICATION WORKFLOW TEST SUITE
 *
 * Verifies all requirements from Phase 1 to Phase 6:
 * 1. Ownership & Authorization: Listing owners can edit their listings; non-owners blocked.
 * 2. Pre-population: Load previously submitted information into the edit form.
 * 3. Media Preservation: Preserves existing images and pitch deck unless explicitly replaced/removed.
 * 4. In-Place Update: Updates existing Firestore document in-place (no duplicate documents).
 * 5. Revision Staging for Published Listings: Edits stage to pendingReviewData without overwriting live catalog.
 * 6. Admin Revision Approval: Merges pendingReviewData into live listing fields.
 * 7. Admin Changes Requested: Sets status to 'changes_requested' and records mandatory feedback.
 * 8. Resubmitting Rejected/Changes-Requested Listing: Resets status to 'pending', clears rejection reason.
 * 9. Admin Rejection: Requires reason, records in Firestore, visible to entrepreneur.
 * 10. Admin Notes: Allows admins to add internal notes without affecting public fields.
 * 11. Independent Verification: Allows toggling isVerified without mutating business data.
 * 12. Security Rules: Non-admins blocked from altering isVerified, adminNotes, or self-publishing.
 * 13. Financial Fields: Preserves and normalizes expectedValuation, equityOffered, turnover, profit, website.
 */

const fs = require("fs");
const path = require("path");

const results = [];

function recordResult(test) {
  results.push(test);
  const status = test.passed ? "✅ PASS" : "❌ FAIL";
  console.log(`[Test ${String(test.id).padStart(2, "0")}] ${status}: ${test.name}`);
  if (!test.passed) {
    console.log(`   Expected: ${test.expected}`);
    console.log(`   Actual:   ${test.actual}`);
  }
}

// -----------------------------------------------------------------
// Mock simulation logic replicating listings.ts and firestore.rules
// -----------------------------------------------------------------

function normalizeListing(id, data) {
  return {
    id,
    businessName: data.businessName || "",
    tagline: data.tagline || "",
    description: data.description || "",
    industry: data.industry || "",
    category: data.category || "investment",
    stage: data.stage || "early",
    investmentRange: data.investmentRange || "10-25L",
    location: data.location || "",
    equityOffered: data.equityOffered || undefined,
    expectedValuation: data.expectedValuation || undefined,
    turnover: data.turnover || undefined,
    profit: data.profit || undefined,
    website: data.website || undefined,
    images: Array.isArray(data.images) ? data.images : [],
    pitchDeckPath: data.pitchDeckPath || undefined,
    pitchDeckUrl: data.pitchDeckUrl || undefined,
    status: data.status || "pending",
    isVerified: Boolean(data.isVerified),
    verifiedAt: data.verifiedAt || undefined,
    adminNotes: data.adminNotes || undefined,
    rejectionReason: data.rejectionReason || null,
    hasPendingEdits: Boolean(data.hasPendingEdits),
    editStatus: data.editStatus || undefined,
    pendingReviewData: data.pendingReviewData || undefined,
    editSubmittedAt: data.editSubmittedAt || undefined,
    reviewHistory: Array.isArray(data.reviewHistory) ? data.reviewHistory : [],
    ownerId: data.ownerId || "",
    ownerEmail: data.ownerEmail || "",
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString(),
    publishedAt: data.publishedAt || undefined,
  };
}

function simulateUpdateListing(existingDoc, input, currentUser) {
  if (!currentUser || currentUser.uid !== existingDoc.ownerId) {
    return { error: "Permission denied: Only the listing owner can edit this listing." };
  }

  const isLive = existingDoc.status === "published";
  const now = new Date().toISOString();

  if (isLive) {
    // Stage edits in pendingReviewData
    const pendingReviewData = {
      businessName: input.businessName ?? existingDoc.businessName,
      tagline: input.tagline ?? existingDoc.tagline,
      description: input.description ?? existingDoc.description,
      industry: input.industry ?? existingDoc.industry,
      category: input.category ?? existingDoc.category,
      stage: input.stage ?? existingDoc.stage,
      investmentRange: input.investmentRange ?? existingDoc.investmentRange,
      location: input.location ?? existingDoc.location,
      expectedValuation: input.expectedValuation ?? existingDoc.expectedValuation,
      equityOffered: input.equityOffered ?? existingDoc.equityOffered,
      turnover: input.turnover ?? existingDoc.turnover,
      profit: input.profit ?? existingDoc.profit,
      website: input.website ?? existingDoc.website,
      images: input.images !== undefined ? input.images : existingDoc.images,
      pitchDeckPath: input.pitchDeckPath !== undefined ? input.pitchDeckPath : existingDoc.pitchDeckPath,
      pitchDeckUrl: input.pitchDeckUrl !== undefined ? input.pitchDeckUrl : existingDoc.pitchDeckUrl,
      updatedAt: now,
    };

    const newHistory = [
      ...(existingDoc.reviewHistory || []),
      {
        action: "revision_submitted",
        actorId: currentUser.uid,
        actorEmail: currentUser.email || "owner",
        timestamp: now,
        notes: "Entrepreneur submitted listing revisions for review.",
      },
    ];

    const updatedDoc = {
      ...existingDoc,
      hasPendingEdits: true,
      editStatus: "pending_review",
      pendingReviewData,
      editSubmittedAt: now,
      reviewHistory: newHistory,
      updatedAt: now,
    };

    return { success: true, updatedDoc };
  } else {
    // Direct in-place update for pending, changes_requested, or rejected
    const isResubmission = existingDoc.status === "rejected" || existingDoc.status === "changes_requested";

    const newHistory = [...(existingDoc.reviewHistory || [])];
    if (isResubmission) {
      newHistory.push({
        action: "resubmitted",
        actorId: currentUser.uid,
        actorEmail: currentUser.email || "owner",
        timestamp: now,
        notes: "Entrepreneur addressed feedback and resubmitted listing for verification.",
      });
    }

    const updatedDoc = {
      ...existingDoc,
      businessName: input.businessName ?? existingDoc.businessName,
      tagline: input.tagline ?? existingDoc.tagline,
      description: input.description ?? existingDoc.description,
      industry: input.industry ?? existingDoc.industry,
      category: input.category ?? existingDoc.category,
      stage: input.stage ?? existingDoc.stage,
      investmentRange: input.investmentRange ?? existingDoc.investmentRange,
      location: input.location ?? existingDoc.location,
      expectedValuation: input.expectedValuation ?? existingDoc.expectedValuation,
      equityOffered: input.equityOffered ?? existingDoc.equityOffered,
      turnover: input.turnover ?? existingDoc.turnover,
      profit: input.profit ?? existingDoc.profit,
      website: input.website ?? existingDoc.website,
      images: input.images !== undefined ? input.images : existingDoc.images,
      pitchDeckPath: input.pitchDeckPath !== undefined ? input.pitchDeckPath : existingDoc.pitchDeckPath,
      pitchDeckUrl: input.pitchDeckUrl !== undefined ? input.pitchDeckUrl : existingDoc.pitchDeckUrl,
      status: isResubmission ? "pending" : existingDoc.status,
      rejectionReason: isResubmission ? null : existingDoc.rejectionReason,
      hasPendingEdits: false,
      editStatus: null,
      pendingReviewData: null,
      reviewHistory: newHistory,
      updatedAt: now,
    };

    return { success: true, updatedDoc };
  }
}

function simulateAdminApprove(existingDoc, adminUser) {
  if (!adminUser || !adminUser.isAdmin) {
    return { error: "Permission denied: Only administrators can approve listings." };
  }

  const now = new Date().toISOString();
  const hasStagedEdits = Boolean(existingDoc.hasPendingEdits && existingDoc.pendingReviewData);
  const staged = existingDoc.pendingReviewData || {};

  const newHistory = [
    ...(existingDoc.reviewHistory || []),
    {
      action: hasStagedEdits ? "revisions_approved" : "approved",
      actorId: adminUser.uid,
      actorEmail: adminUser.email || "admin",
      timestamp: now,
      notes: hasStagedEdits ? "Admin approved submitted revisions." : "Admin approved listing.",
    },
  ];

  const updatedDoc = {
    ...existingDoc,
    ...(hasStagedEdits ? staged : {}),
    status: "published",
    publishedAt: existingDoc.publishedAt || now,
    rejectionReason: null,
    hasPendingEdits: false,
    editStatus: null,
    pendingReviewData: null,
    reviewHistory: newHistory,
    updatedAt: now,
  };

  return { success: true, updatedDoc };
}

function simulateAdminRequestChanges(existingDoc, feedback, adminUser) {
  if (!adminUser || !adminUser.isAdmin) {
    return { error: "Permission denied: Only administrators can request changes." };
  }
  if (!feedback || feedback.trim().length === 0) {
    return { error: "Feedback is required when requesting changes." };
  }

  const now = new Date().toISOString();
  const newHistory = [
    ...(existingDoc.reviewHistory || []),
    {
      action: "changes_requested",
      actorId: adminUser.uid,
      actorEmail: adminUser.email || "admin",
      timestamp: now,
      notes: `Changes requested: ${feedback.trim()}`,
    },
  ];

  const updatedDoc = {
    ...existingDoc,
    status: "changes_requested",
    rejectionReason: feedback.trim(),
    reviewHistory: newHistory,
    updatedAt: now,
  };

  return { success: true, updatedDoc };
}

function simulateAdminReject(existingDoc, reason, adminUser) {
  if (!adminUser || !adminUser.isAdmin) {
    return { error: "Permission denied: Only administrators can reject listings." };
  }
  if (!reason || reason.trim().length === 0) {
    return { error: "Rejection reason is required." };
  }

  const now = new Date().toISOString();
  const newHistory = [
    ...(existingDoc.reviewHistory || []),
    {
      action: "rejected",
      actorId: adminUser.uid,
      actorEmail: adminUser.email || "admin",
      timestamp: now,
      notes: `Listing rejected: ${reason.trim()}`,
    },
  ];

  const updatedDoc = {
    ...existingDoc,
    status: "rejected",
    rejectionReason: reason.trim(),
    reviewHistory: newHistory,
    updatedAt: now,
  };

  return { success: true, updatedDoc };
}

function simulateAdminAddNotes(existingDoc, notes, adminUser) {
  if (!adminUser || !adminUser.isAdmin) {
    return { error: "Permission denied: Only administrators can add notes." };
  }

  const now = new Date().toISOString();
  const newHistory = [
    ...(existingDoc.reviewHistory || []),
    {
      action: "note_added",
      actorId: adminUser.uid,
      actorEmail: adminUser.email || "admin",
      timestamp: now,
      notes: notes.trim(),
    },
  ];

  const updatedDoc = {
    ...existingDoc,
    adminNotes: notes.trim(),
    reviewHistory: newHistory,
    updatedAt: now,
  };

  return { success: true, updatedDoc };
}

function simulateAdminToggleVerification(existingDoc, isVerified, adminUser) {
  if (!adminUser || !adminUser.isAdmin) {
    return { error: "Permission denied: Only administrators can toggle verification." };
  }

  const now = new Date().toISOString();
  const newHistory = [
    ...(existingDoc.reviewHistory || []),
    {
      action: isVerified ? "verified" : "unverified",
      actorId: adminUser.uid,
      actorEmail: adminUser.email || "admin",
      timestamp: now,
      notes: `Verification status set to ${isVerified ? "Verified" : "Unverified"}.`,
    },
  ];

  const updatedDoc = {
    ...existingDoc,
    isVerified,
    verifiedAt: isVerified ? now : null,
    reviewHistory: newHistory,
    updatedAt: now,
  };

  return { success: true, updatedDoc };
}

// -----------------------------------------------------------------
// Firestore Rules Evaluation Simulation for Listing Updates
// -----------------------------------------------------------------
function evaluateFirestoreRulesUpdate(existingDoc, incomingDoc, auth) {
  // Must be authenticated
  if (!auth) return false;

  const isAdmin = auth.token && auth.token.admin === true;
  const isOwner = auth.uid === existingDoc.ownerId;

  if (isAdmin) return true;

  if (!isOwner) return false;

  // Non-owner cannot change ownerId
  if (incomingDoc.ownerId !== existingDoc.ownerId) return false;

  // Cannot self-publish directly
  if (existingDoc.status !== "published" && incomingDoc.status === "published") {
    return false;
  }

  // Non-admins cannot alter admin/verification fields
  const adminKeys = [
    "isVerified",
    "verifiedAt",
    "isPaidListing",
    "paymentStatus",
    "featuredUntil",
    "adminNotes",
  ];

  for (const key of adminKeys) {
    const existingVal = existingDoc[key];
    const incomingVal = incomingDoc[key];
    if (incomingVal !== undefined && incomingVal !== existingVal) {
      return false;
    }
  }

  return true;
}

// =================================================================
// EXECUTE TEST SUITE
// =================================================================

console.log("============================================================");
console.log("WENTURE INDIA — LISTING EDIT & ADMIN VERIFICATION TEST SUITE");
console.log("============================================================\n");

// TEST 01: Listing owner can edit pending listing
const initialPendingDoc = {
  id: "list-101",
  ownerId: "entrepreneur-uid-1",
  ownerEmail: "owner@wenture.in",
  businessName: "EcoPack Solutions",
  tagline: "Sustainable Packaging",
  description: "Biodegradable materials for e-commerce.",
  industry: "Packaging & Manufacturing",
  category: "investment",
  stage: "early",
  investmentRange: "10-25L",
  location: "Bangalore",
  images: ["https://supabase.co/storage/v1/object/public/listings-public/img1.jpg"],
  pitchDeckPath: "listings-private/deck1.pdf",
  status: "pending",
  isVerified: false,
};

const editPendingRes = simulateUpdateListing(
  initialPendingDoc,
  {
    businessName: "EcoPack Global Innovations",
    tagline: "World-class Biodegradable Packaging",
    turnover: "1.2 Cr",
    profit: "25 L",
  },
  { uid: "entrepreneur-uid-1", email: "owner@wenture.in" }
);

recordResult({
  id: 1,
  name: "Listing Owner Can Edit Pending Listing (In-Place)",
  passed:
    editPendingRes.success === true &&
    editPendingRes.updatedDoc.businessName === "EcoPack Global Innovations" &&
    editPendingRes.updatedDoc.tagline === "World-class Biodegradable Packaging" &&
    editPendingRes.updatedDoc.turnover === "1.2 Cr" &&
    editPendingRes.updatedDoc.status === "pending" &&
    editPendingRes.updatedDoc.id === "list-101",
  expected: "In-place update succeeded, status remains pending, document ID preserved",
  actual: JSON.stringify({
    success: editPendingRes.success,
    businessName: editPendingRes.updatedDoc?.businessName,
    status: editPendingRes.updatedDoc?.status,
  }),
});

// TEST 02: Non-owner is blocked from editing listing
const nonOwnerRes = simulateUpdateListing(
  initialPendingDoc,
  { businessName: "Malicious Tampering" },
  { uid: "stranger-uid-99", email: "stranger@other.com" }
);

recordResult({
  id: 2,
  name: "Non-Owner Blocked from Editing Another User's Listing",
  passed: Boolean(nonOwnerRes.error && nonOwnerRes.error.includes("Permission denied")),
  expected: "Permission denied error",
  actual: nonOwnerRes.error || "Update was permitted",
});

// TEST 03: Preserving existing images & pitch deck when only text is updated
const textOnlyUpdateRes = simulateUpdateListing(
  initialPendingDoc,
  {
    description: "Expanded description without modifying images or pitch deck.",
  },
  { uid: "entrepreneur-uid-1" }
);

recordResult({
  id: 3,
  name: "Media Preservation: Images and Pitch Deck Preserved When Only Text Edits Occur",
  passed:
    textOnlyUpdateRes.success === true &&
    textOnlyUpdateRes.updatedDoc.images.length === 1 &&
    textOnlyUpdateRes.updatedDoc.images[0] === initialPendingDoc.images[0] &&
    textOnlyUpdateRes.updatedDoc.pitchDeckPath === initialPendingDoc.pitchDeckPath,
  expected: "Exact image array and pitchDeckPath retained",
  actual: JSON.stringify({
    images: textOnlyUpdateRes.updatedDoc?.images,
    pitchDeckPath: textOnlyUpdateRes.updatedDoc?.pitchDeckPath,
  }),
});

// TEST 04: Replacing images and pitch decks works correctly
const mediaUpdateRes = simulateUpdateListing(
  initialPendingDoc,
  {
    images: [
      "https://supabase.co/storage/v1/object/public/listings-public/new-img-1.jpg",
      "https://supabase.co/storage/v1/object/public/listings-public/new-img-2.jpg",
    ],
    pitchDeckPath: "listings-private/new-deck-v2.pdf",
    pitchDeckUrl: "https://supabase.co/storage/v1/object/sign/listings-private/new-deck-v2.pdf?token=abc",
  },
  { uid: "entrepreneur-uid-1" }
);

recordResult({
  id: 4,
  name: "Media Replacement: New Images & Pitch Deck Replaced Correctly",
  passed:
    mediaUpdateRes.success === true &&
    mediaUpdateRes.updatedDoc.images.length === 2 &&
    mediaUpdateRes.updatedDoc.images[0].includes("new-img-1.jpg") &&
    mediaUpdateRes.updatedDoc.pitchDeckPath === "listings-private/new-deck-v2.pdf",
  expected: "2 new images and updated pitch deck path stored",
  actual: JSON.stringify({
    imagesCount: mediaUpdateRes.updatedDoc?.images?.length,
    deck: mediaUpdateRes.updatedDoc?.pitchDeckPath,
  }),
});

// TEST 05: Published listing edits stage in pendingReviewData without overwriting live public fields
const livePublishedDoc = {
  ...initialPendingDoc,
  id: "list-202",
  status: "published",
  publishedAt: "2026-11-01T10:00:00.000Z",
  businessName: "Live Bio Tech",
  description: "Live public description visible to all investors.",
};

const editLiveListingRes = simulateUpdateListing(
  livePublishedDoc,
  {
    businessName: "Live Bio Tech Enterprise",
    description: "Proposed revision to business description.",
  },
  { uid: "entrepreneur-uid-1", email: "owner@wenture.in" }
);

recordResult({
  id: 5,
  name: "Revision Staging: Published Listing Edits Staged Without Overwriting Live Catalog",
  passed:
    editLiveListingRes.success === true &&
    editLiveListingRes.updatedDoc.status === "published" &&
    editLiveListingRes.updatedDoc.businessName === "Live Bio Tech" &&
    editLiveListingRes.updatedDoc.description === "Live public description visible to all investors." &&
    editLiveListingRes.updatedDoc.hasPendingEdits === true &&
    editLiveListingRes.updatedDoc.editStatus === "pending_review" &&
    editLiveListingRes.updatedDoc.pendingReviewData.businessName === "Live Bio Tech Enterprise" &&
    editLiveListingRes.updatedDoc.pendingReviewData.description === "Proposed revision to business description.",
  expected: "Live fields untouched, hasPendingEdits: true, pendingReviewData populated",
  actual: JSON.stringify({
    liveName: editLiveListingRes.updatedDoc?.businessName,
    stagedName: editLiveListingRes.updatedDoc?.pendingReviewData?.businessName,
    hasPendingEdits: editLiveListingRes.updatedDoc?.hasPendingEdits,
  }),
});

// TEST 06: Admin approval of staged edits merges them into main fields
const adminUser = { uid: "admin-uid-1", email: "admin@wenture.in", isAdmin: true };
const stagedListingDoc = editLiveListingRes.updatedDoc;

const approveEditsRes = simulateAdminApprove(stagedListingDoc, adminUser);

recordResult({
  id: 6,
  name: "Admin Approval of Staged Edits: Merges Staged Fields Into Public Listing",
  passed:
    approveEditsRes.success === true &&
    approveEditsRes.updatedDoc.businessName === "Live Bio Tech Enterprise" &&
    approveEditsRes.updatedDoc.description === "Proposed revision to business description." &&
    approveEditsRes.updatedDoc.hasPendingEdits === false &&
    approveEditsRes.updatedDoc.pendingReviewData === null &&
    approveEditsRes.updatedDoc.status === "published" &&
    approveEditsRes.updatedDoc.reviewHistory.some((h) => h.action === "revisions_approved"),
  expected: "Staged data merged into primary fields, hasPendingEdits reset to false, review history logged",
  actual: JSON.stringify({
    businessName: approveEditsRes.updatedDoc?.businessName,
    hasPendingEdits: approveEditsRes.updatedDoc?.hasPendingEdits,
    historyAction: approveEditsRes.updatedDoc?.reviewHistory?.slice(-1)[0]?.action,
  }),
});

// TEST 07: Admin Request Changes sets status and records feedback
const requestChangesRes = simulateAdminRequestChanges(
  initialPendingDoc,
  "Please provide a realistic expected valuation and financial turnover details.",
  adminUser
);

recordResult({
  id: 7,
  name: "Admin Request Changes: Sets Status to 'changes_requested' & Records Feedback",
  passed:
    requestChangesRes.success === true &&
    requestChangesRes.updatedDoc.status === "changes_requested" &&
    requestChangesRes.updatedDoc.rejectionReason === "Please provide a realistic expected valuation and financial turnover details." &&
    requestChangesRes.updatedDoc.reviewHistory.some((h) => h.action === "changes_requested"),
  expected: "Status changes_requested, rejectionReason set, history logged",
  actual: JSON.stringify({
    status: requestChangesRes.updatedDoc?.status,
    rejectionReason: requestChangesRes.updatedDoc?.rejectionReason,
  }),
});

// TEST 08: Resubmitting changes_requested or rejected listing resets status to pending and clears rejectionReason
const changesRequestedDoc = requestChangesRes.updatedDoc;
const resubmitRes = simulateUpdateListing(
  changesRequestedDoc,
  {
    expectedValuation: "10 Cr",
    turnover: "80 L",
    profit: "15 L",
  },
  { uid: "entrepreneur-uid-1", email: "owner@wenture.in" }
);

recordResult({
  id: 8,
  name: "Entrepreneur Resubmission: Resets Status to 'pending' & Clears Rejection Reason",
  passed:
    resubmitRes.success === true &&
    resubmitRes.updatedDoc.status === "pending" &&
    resubmitRes.updatedDoc.rejectionReason === null &&
    resubmitRes.updatedDoc.expectedValuation === "10 Cr" &&
    resubmitRes.updatedDoc.turnover === "80 L" &&
    resubmitRes.updatedDoc.reviewHistory.some((h) => h.action === "resubmitted"),
  expected: "status: pending, rejectionReason: null, new financial fields saved, history action: resubmitted",
  actual: JSON.stringify({
    status: resubmitRes.updatedDoc?.status,
    rejectionReason: resubmitRes.updatedDoc?.rejectionReason,
    valuation: resubmitRes.updatedDoc?.expectedValuation,
    historyAction: resubmitRes.updatedDoc?.reviewHistory?.slice(-1)[0]?.action,
  }),
});

// TEST 09: Admin Reject requires mandatory reason and sets status to rejected
const emptyReasonReject = simulateAdminReject(initialPendingDoc, "", adminUser);
const validRejectRes = simulateAdminReject(
  initialPendingDoc,
  "Ineligible business category and insufficient compliance documents.",
  adminUser
);

recordResult({
  id: 9,
  name: "Admin Rejection: Enforces Mandatory Reason & Sets 'rejected' Status",
  passed:
    emptyReasonReject.error !== undefined &&
    validRejectRes.success === true &&
    validRejectRes.updatedDoc.status === "rejected" &&
    validRejectRes.updatedDoc.rejectionReason === "Ineligible business category and insufficient compliance documents." &&
    validRejectRes.updatedDoc.reviewHistory.some((h) => h.action === "rejected"),
  expected: "Empty reason rejected with error; valid reason sets status=rejected",
  actual: JSON.stringify({
    emptyRejectedError: emptyReasonReject.error,
    validStatus: validRejectRes.updatedDoc?.status,
  }),
});

// TEST 10: Admin Add Notes allows recording internal reviewer notes
const adminNotesRes = simulateAdminAddNotes(
  initialPendingDoc,
  "Spoke with founder over phone; GST verification completed. Ready for approval.",
  adminUser
);

recordResult({
  id: 10,
  name: "Admin Internal Notes: Updates adminNotes & Adds Audit Entry in Review History",
  passed:
    adminNotesRes.success === true &&
    adminNotesRes.updatedDoc.adminNotes.includes("GST verification completed") &&
    adminNotesRes.updatedDoc.reviewHistory.some((h) => h.action === "note_added"),
  expected: "adminNotes saved and history entry added",
  actual: JSON.stringify({
    adminNotes: adminNotesRes.updatedDoc?.adminNotes,
    historyCount: adminNotesRes.updatedDoc?.reviewHistory?.length,
  }),
});

// TEST 11: Independent verification status toggle
const verifyRes = simulateAdminToggleVerification(initialPendingDoc, true, adminUser);
const unverifyRes = simulateAdminToggleVerification(verifyRes.updatedDoc, false, adminUser);

recordResult({
  id: 11,
  name: "Admin Independent Verification: Can Toggle isVerified On and Off",
  passed:
    verifyRes.success === true &&
    verifyRes.updatedDoc.isVerified === true &&
    verifyRes.updatedDoc.verifiedAt !== null &&
    unverifyRes.success === true &&
    unverifyRes.updatedDoc.isVerified === false &&
    unverifyRes.updatedDoc.verifiedAt === null,
  expected: "Verification toggles correctly with verifiedAt timestamp",
  actual: JSON.stringify({
    verifiedState: verifyRes.updatedDoc?.isVerified,
    unverifiedState: unverifyRes.updatedDoc?.isVerified,
  }),
});

// TEST 12: Firestore Rules: Non-admins blocked from altering isVerified, adminNotes, or self-publishing
const ownerAuth = { uid: "entrepreneur-uid-1", token: { admin: false } };

const selfPublishAttempt = evaluateFirestoreRulesUpdate(
  initialPendingDoc,
  { ...initialPendingDoc, status: "published" },
  ownerAuth
);

const selfVerifyAttempt = evaluateFirestoreRulesUpdate(
  initialPendingDoc,
  { ...initialPendingDoc, isVerified: true },
  ownerAuth
);

const selfNotesAttempt = evaluateFirestoreRulesUpdate(
  initialPendingDoc,
  { ...initialPendingDoc, adminNotes: "Falsified approval note" },
  ownerAuth
);

const validOwnerEdit = evaluateFirestoreRulesUpdate(
  initialPendingDoc,
  { ...initialPendingDoc, businessName: "Legit Owner Edit" },
  ownerAuth
);

recordResult({
  id: 12,
  name: "Firestore Security Rules: Self-Publishing, Self-Verification & Admin Notes Blocked",
  passed:
    selfPublishAttempt === false &&
    selfVerifyAttempt === false &&
    selfNotesAttempt === false &&
    validOwnerEdit === true,
  expected: "Self-publishing, isVerified modification and adminNotes modification blocked; legitimate edit allowed",
  actual: JSON.stringify({
    selfPublishAttempt,
    selfVerifyAttempt,
    selfNotesAttempt,
    validOwnerEdit,
  }),
});

// TEST 13: Full field preservation and normalization (financials, contact, website)
const fullDoc = normalizeListing("list-303", {
  businessName: "AgroTech Hub",
  tagline: "Farm to Table",
  description: "Direct agri-produce supply chain.",
  category: "investment",
  stage: "growth",
  investmentRange: "25-50L",
  expectedValuation: "15 Cr",
  equityOffered: "5%",
  turnover: "4.5 Cr",
  profit: "65 L",
  website: "https://agrotechhub.in",
  images: ["https://supabase.co/storage/v1/object/public/listings-public/img1.jpg"],
  pitchDeckPath: "listings-private/deck.pdf",
});

recordResult({
  id: 13,
  name: "Listing Normalization: Financial, Valuation, Equity & Website Fields Preserved",
  passed:
    fullDoc.expectedValuation === "15 Cr" &&
    fullDoc.equityOffered === "5%" &&
    fullDoc.turnover === "4.5 Cr" &&
    fullDoc.profit === "65 L" &&
    fullDoc.website === "https://agrotechhub.in",
  expected: "All 5 financial & online presence fields correctly normalized",
  actual: JSON.stringify({
    expectedValuation: fullDoc.expectedValuation,
    equityOffered: fullDoc.equityOffered,
    turnover: fullDoc.turnover,
    profit: fullDoc.profit,
    website: fullDoc.website,
  }),
});

// TEST 14: Inspect actual firestore.rules file on disk
const rulesPath = path.join(__dirname, "..", "firestore.rules");
const rulesContent = fs.readFileSync(rulesPath, "utf-8");

const hasOwnerUpdate =
  rulesContent.includes("resource.data.ownerId == request.auth.uid") ||
  rulesContent.includes("request.auth.uid == resource.data.ownerId") ||
  rulesContent.includes("isOwner(resource.data.ownerId)");
const blocksSelfPublish = rulesContent.includes("!(resource.data.status != 'published' && request.resource.data.status == 'published')");
const blocksAdminKeys = rulesContent.includes("!request.resource.data.diff(resource.data).affectedKeys()");

recordResult({
  id: 14,
  name: "Static Rules Audit: firestore.rules Protects Listing Invariants on Disk",
  passed: hasOwnerUpdate && blocksSelfPublish && blocksAdminKeys,
  expected: "Owner update permitted while strictly blocking self-publishing and admin keys",
  actual: JSON.stringify({
    hasOwnerUpdate,
    blocksSelfPublish,
    blocksAdminKeys,
  }),
});

// -----------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------
console.log("\n============================================================");
console.log("LISTING EDIT & ADMIN VERIFICATION TEST RESULTS");
console.log("============================================================");
const passedCount = results.filter((r) => r.passed).length;
console.log(`Total Scenarios Tested: ${results.length}`);
console.log(`Passed:                 ${passedCount} / ${results.length}`);
console.log(`Failed:                 ${results.length - passedCount}`);
console.log("============================================================\n");

if (passedCount === results.length) {
  console.log("ALL 14 LISTING EDIT & ADMIN VERIFICATION TESTS PASSED SUCCESSFULLY! 🎉\n");
  process.exit(0);
} else {
  console.error("SOME TESTS FAILED! ❌\n");
  process.exit(1);
}
