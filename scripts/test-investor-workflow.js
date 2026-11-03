/**
 * Automated Test Suite: Investor Listing Visibility, Status Normalization & Revision Tracking
 */

const assert = require("assert");

// Simulating normalizeInvestorProfile logic
function normalizeInvestorProfile(id, raw) {
  const rawStatus = (raw.status || "pending").toString().toLowerCase().trim();
  let status = "pending";
  if (rawStatus === "published" || rawStatus === "approved") {
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
    ? raw.preferredSectors
    : typeof raw.preferredSectors === "string"
    ? raw.preferredSectors.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const preferredLocations = Array.isArray(raw.preferredLocations)
    ? raw.preferredLocations
    : typeof raw.preferredLocations === "string"
    ? raw.preferredLocations.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const areasOfExpertise = Array.isArray(raw.areasOfExpertise)
    ? raw.areasOfExpertise
    : typeof raw.areasOfExpertise === "string"
    ? raw.areasOfExpertise.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const reviewHistory = Array.isArray(raw.reviewHistory)
    ? raw.reviewHistory
    : undefined;

  return {
    id,
    userId: raw.userId || id,
    investorName: raw.investorName || raw.name || "Private Investor",
    investorType: raw.investorType || "Angel Investor",
    location: raw.location || "India",
    contactEmail: raw.contactEmail || undefined,
    contactPhone: raw.contactPhone || undefined,
    contactLinkedin: raw.contactLinkedin || undefined,
    investmentRange: raw.investmentRange || "₹25L – ₹50L",
    typicalInvestmentSize: raw.typicalInvestmentSize || undefined,
    preferredSectors: preferredSectors.length > 0 ? preferredSectors : ["Technology", "Healthcare"],
    investmentStage: raw.investmentStage || "Seed / Early Stage",
    preferredLocations: preferredLocations.length > 0 ? preferredLocations : undefined,
    areasOfExpertise: areasOfExpertise.length > 0 ? areasOfExpertise : ["Strategy", "Scaling"],
    investmentExperience: raw.investmentExperience || undefined,
    previousInvestments: raw.previousInvestments || undefined,
    professionalBackground: raw.professionalBackground || undefined,
    shortIntroduction: raw.shortIntroduction || "Experienced investor backing high-growth opportunities.",
    experience: raw.experience || raw.investmentExperience || raw.shortIntroduction || "",
    profileImage: raw.profileImage || undefined,
    status,
    approvalStatus: raw.approvalStatus || undefined,
    rejectionReason: raw.rejectionReason || undefined,
    revisionFeedback: raw.revisionFeedback || raw.changeRequests || undefined,
    adminNotes: raw.adminNotes || undefined,
    reviewHistory,
    editStatus: raw.editStatus || undefined,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    publishedAt: raw.publishedAt,
  };
}

let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] ${name}:`, err.message);
  }
}

console.log("============================================================");
console.log("WENTURE INDIA — INVESTOR WORKFLOW & VISIBILITY TEST SUITE");
console.log("============================================================");

// TEST 1: Status normalization - changes_requested
test("Status normalization preserves 'changes_requested'", () => {
  const norm = normalizeInvestorProfile("inv1", {
    status: "changes_requested",
    revisionFeedback: "Please upload LinkedIn profile",
  });
  assert.strictEqual(norm.status, "changes_requested");
  assert.strictEqual(norm.revisionFeedback, "Please upload LinkedIn profile");
});

// TEST 2: Status normalization - alternate aliases for changes_requested
test("Status normalization aliases for revisions", () => {
  const n1 = normalizeInvestorProfile("inv1", { status: "revision_requested" });
  assert.strictEqual(n1.status, "changes_requested");

  const n2 = normalizeInvestorProfile("inv2", { status: "needs_revision" });
  assert.strictEqual(n2.status, "changes_requested");
});

// TEST 3: Status normalization - under_review
test("Status normalization preserves 'under_review'", () => {
  const norm = normalizeInvestorProfile("inv1", { status: "under_review" });
  assert.strictEqual(norm.status, "under_review");
});

// TEST 4: Status normalization - published / approved
test("Status normalization handles 'published' and 'approved'", () => {
  const n1 = normalizeInvestorProfile("inv1", { status: "published" });
  assert.strictEqual(n1.status, "published");

  const n2 = normalizeInvestorProfile("inv2", { status: "approved" });
  assert.strictEqual(n2.status, "published");
});

// TEST 5: Status normalization - rejected / declined
test("Status normalization handles 'rejected' and 'declined'", () => {
  const n1 = normalizeInvestorProfile("inv1", { status: "rejected", rejectionReason: "Invalid data" });
  assert.strictEqual(n1.status, "rejected");
  assert.strictEqual(n1.rejectionReason, "Invalid data");

  const n2 = normalizeInvestorProfile("inv2", { status: "declined" });
  assert.strictEqual(n2.status, "rejected");
});

// TEST 6: Admin Query Filtering - all tab includes all profiles
test("Admin Query: 'all' tab includes profiles of every status", () => {
  const mockDataset = [
    { id: "1", status: "pending" },
    { id: "2", status: "published" },
    { id: "3", status: "rejected" },
    { id: "4", status: "changes_requested" },
    { id: "5", status: "under_review" },
  ].map((d) => normalizeInvestorProfile(d.id, d));

  assert.strictEqual(mockDataset.length, 5);
  const changes = mockDataset.filter((i) => i.status === "changes_requested");
  assert.strictEqual(changes.length, 1);
  assert.strictEqual(changes[0].id, "4");
});

// TEST 7: Review History Array Preservation
test("Review history trail preserves audit actions", () => {
  const history = [
    { action: "submitted", performedBy: "investor@test.com", timestamp: "2026-11-01T10:00:00Z" },
    { action: "changes_requested", performedBy: "admin@wenture.in", timestamp: "2026-11-02T10:00:00Z", notes: "Add LinkedIn" },
    { action: "resubmitted", performedBy: "investor@test.com", timestamp: "2026-11-03T10:00:00Z" },
  ];
  const norm = normalizeInvestorProfile("inv1", { reviewHistory: history });
  assert.strictEqual(norm.reviewHistory.length, 3);
  assert.strictEqual(norm.reviewHistory[1].action, "changes_requested");
  assert.strictEqual(norm.reviewHistory[1].notes, "Add LinkedIn");
});

// TEST 8: Admin Notes Preservation
test("Admin internal notes preserved on profile", () => {
  const norm = normalizeInvestorProfile("inv1", {
    adminNotes: "Accredited angel investor via Mumbai Angels",
  });
  assert.strictEqual(norm.adminNotes, "Accredited angel investor via Mumbai Angels");
});

// TEST 9: Validation: Revision Feedback is mandatory
test("Revision request requires non-empty feedback", () => {
  function validateFeedback(feedback) {
    if (!feedback || !feedback.trim()) {
      return { error: "Revision feedback is required." };
    }
    return { error: null };
  }

  assert.strictEqual(validateFeedback("").error, "Revision feedback is required.");
  assert.strictEqual(validateFeedback("   ").error, "Revision feedback is required.");
  assert.strictEqual(validateFeedback("Please verify phone number").error, null);
});

// TEST 10: Validation: Rejection Reason is mandatory
test("Rejection requires non-empty reason", () => {
  function validateRejection(reason) {
    if (!reason || !reason.trim()) {
      return { error: "A rejection reason is required." };
    }
    return { error: null };
  }

  assert.strictEqual(validateRejection("").error, "A rejection reason is required.");
  assert.strictEqual(validateRejection("Profile incomplete").error, null);
});

// SIMULATION OF END-TO-END REVISION WORKFLOW
class MockFirestore {
  constructor() {
    this.profiles = new Map();
  }

  set(id, data) {
    this.profiles.set(id, { ...this.profiles.get(id), ...data, id });
  }

  get(id) {
    return this.profiles.get(id) || null;
  }
}

const mockDb = new MockFirestore();

// Backend functions matching src/lib/firebase/investors.ts
function simRequestChangesInvestor(uid, feedback, adminEmail = "admin@wenture.in") {
  if (!feedback || !feedback.trim()) {
    return { error: "Revision feedback is required." };
  }
  const current = mockDb.get(uid);
  if (!current) return { error: "Not found" };

  const reviewHistory = Array.isArray(current.reviewHistory) ? [...current.reviewHistory] : [];
  reviewHistory.push({
    action: "changes_requested",
    performedBy: adminEmail,
    timestamp: new Date().toISOString(),
    notes: feedback.trim(),
  });

  mockDb.set(uid, {
    status: "changes_requested",
    approvalStatus: "changes_requested",
    isResubmitted: false,
    revisionFeedback: feedback.trim(),
    reviewHistory,
  });
  return { error: null };
}

function simApproveInvestor(uid, adminEmail = "admin@wenture.in") {
  const current = mockDb.get(uid);
  if (!current) return { error: "Investor profile not found." };
  if (current.status === "changes_requested") {
    return {
      error:
        "Cannot approve a profile that is currently awaiting investor revisions. The investor must review feedback, update requested fields, and resubmit their profile first.",
    };
  }
  const reviewHistory = Array.isArray(current.reviewHistory) ? [...current.reviewHistory] : [];
  reviewHistory.push({
    action: "approved",
    performedBy: adminEmail,
    timestamp: new Date().toISOString(),
    notes: "Approved and published to directory.",
  });
  mockDb.set(uid, {
    status: "published",
    approvalStatus: "approved",
    isResubmitted: false,
    rejectionReason: null,
    revisionFeedback: null,
    reviewHistory,
  });
  return { error: null };
}

function simRejectInvestor(uid, reason, adminEmail = "admin@wenture.in") {
  if (!reason || !reason.trim()) {
    return { error: "A rejection reason is required." };
  }
  const current = mockDb.get(uid);
  if (!current) return { error: "Investor profile not found." };
  if (current.status === "changes_requested") {
    return {
      error:
        "Cannot reject a profile that is currently awaiting investor revisions. The investor must review feedback, update requested fields, and resubmit their profile first.",
    };
  }
  const reviewHistory = Array.isArray(current.reviewHistory) ? [...current.reviewHistory] : [];
  reviewHistory.push({
    action: "rejected",
    performedBy: adminEmail,
    timestamp: new Date().toISOString(),
    notes: reason.trim(),
  });
  mockDb.set(uid, {
    status: "rejected",
    approvalStatus: "rejected",
    isResubmitted: false,
    rejectionReason: reason.trim(),
    reviewHistory,
  });
  return { error: null };
}

function simSaveInvestorProfile(uid, profileData, userEmail = "investor@example.com") {
  const current = mockDb.get(uid);
  const isNew = !current;
  let isResubmission = false;
  let reviewHistory = [];

  if (!isNew) {
    if (current.status === "pending") {
      return {
        error:
          "Your investor profile is currently under administrative review. Submissions are paused until review is complete.",
      };
    }
    if (current.status === "changes_requested" || current.status === "rejected") {
      isResubmission = true;
    }
    if (Array.isArray(current.reviewHistory)) {
      reviewHistory = [...current.reviewHistory];
    }
  }

  reviewHistory.push({
    action: isNew ? "submitted" : "resubmitted",
    performedBy: userEmail,
    timestamp: new Date().toISOString(),
    notes: isNew
      ? "Initial profile submitted for review."
      : "Profile updated and resubmitted by investor for admin review.",
  });

  mockDb.set(uid, {
    ...profileData,
    status: "pending",
    approvalStatus: isResubmission ? "resubmitted" : "pending",
    isResubmitted: isResubmission,
    rejectionReason: null,
    revisionFeedback: current?.revisionFeedback || null,
    reviewHistory,
  });
  return { error: null };
}

// TEST 11: End-to-end workflow - Initial submission
test("Workflow: Initial submission sets status to pending", () => {
  mockDb.set("inv_flow", null);
  const res = simSaveInvestorProfile("inv_flow", {
    investorName: "Angel Sarah",
    investmentRange: "₹25L – ₹50L",
  });
  assert.strictEqual(res.error, null);
  const doc = mockDb.get("inv_flow");
  assert.strictEqual(doc.status, "pending");
  assert.strictEqual(doc.isResubmitted, false);
});

// TEST 12: Admin requests revision
test("Workflow: Admin requests revision, status becomes changes_requested", () => {
  const res = simRequestChangesInvestor("inv_flow", "Please specify your typical ticket size.");
  assert.strictEqual(res.error, null);
  const doc = mockDb.get("inv_flow");
  assert.strictEqual(doc.status, "changes_requested");
  assert.strictEqual(doc.revisionFeedback, "Please specify your typical ticket size.");
  assert.strictEqual(doc.isResubmitted, false);
});

// TEST 13: Backend blocks approval while changes_requested
test("Workflow: Backend blocks approval while status is changes_requested", () => {
  const res = simApproveInvestor("inv_flow");
  assert.ok(res.error);
  assert.ok(res.error.includes("Cannot approve a profile that is currently awaiting investor revisions"));
  const doc = mockDb.get("inv_flow");
  assert.strictEqual(doc.status, "changes_requested"); // Status remains unchanged
});

// TEST 14: Backend blocks rejection while changes_requested
test("Workflow: Backend blocks rejection while status is changes_requested", () => {
  const res = simRejectInvestor("inv_flow", "No longer interested");
  assert.ok(res.error);
  assert.ok(res.error.includes("Cannot reject a profile that is currently awaiting investor revisions"));
  const doc = mockDb.get("inv_flow");
  assert.strictEqual(doc.status, "changes_requested"); // Status remains unchanged
});

// TEST 15: Investor edits fields and resubmits
test("Workflow: Investor edits fields and resubmits successfully", () => {
  const res = simSaveInvestorProfile("inv_flow", {
    investorName: "Angel Sarah",
    investmentRange: "₹25L – ₹50L",
    typicalInvestmentSize: "₹15 Lakhs",
  });
  assert.strictEqual(res.error, null);
  const doc = mockDb.get("inv_flow");
  assert.strictEqual(doc.status, "pending");
  assert.strictEqual(doc.approvalStatus, "resubmitted");
  assert.strictEqual(doc.isResubmitted, true);
  assert.strictEqual(doc.typicalInvestmentSize, "₹15 Lakhs");
  // Review history has 3 entries: submitted -> changes_requested -> resubmitted
  assert.strictEqual(doc.reviewHistory.length, 3);
  assert.strictEqual(doc.reviewHistory[2].action, "resubmitted");
});

// TEST 16: Admin can now approve the resubmitted profile
test("Workflow: Admin can approve resubmitted profile", () => {
  const res = simApproveInvestor("inv_flow");
  assert.strictEqual(res.error, null);
  const doc = mockDb.get("inv_flow");
  assert.strictEqual(doc.status, "published");
  assert.strictEqual(doc.approvalStatus, "approved");
  assert.strictEqual(doc.isResubmitted, false);
  assert.strictEqual(doc.reviewHistory.length, 4);
  assert.strictEqual(doc.reviewHistory[3].action, "approved");
});

console.log("============================================================");
console.log(`RESULTS: ${passedTests} / ${totalTests} tests passed.`);
console.log("============================================================");

if (passedTests !== totalTests) {
  process.exit(1);
}
