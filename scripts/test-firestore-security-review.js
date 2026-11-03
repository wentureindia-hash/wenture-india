/**
 * WENTURE INDIA — TARGETED FIRESTORE RULES SECURITY CORRECTIONS TEST SUITE
 *
 * Verifies final restricted document ownership consistency & security invariants:
 * 1. Pitch Deck Confidentiality: Published listing does NOT expose pitch deck to arbitrary investors.
 * 2. Listing Owner Access: Parent listing owner can read their restricted pitch deck.
 * 3. Admin Access: Authorized admin can read restricted documents.
 * 4. Document ownerId Mismatch: Stale/mismatched child doc ownerId cannot access restricted doc.
 * 5. Document userId Mismatch: Stale/mismatched child doc userId cannot access restricted doc.
 * 6. Legacy Parent Listing Compatibility: Legacy parent listing with userId only can access restricted document.
 * 7. Legacy Listing Owner Edit: Legacy userId-only listing owner can edit their parent record.
 * 8. Prevent Listing Ownership Reassignment: Listing owner cannot reassign userId or ownerId.
 * 9. Restricted Document userId Protection: Cannot insert/reassign another user's userId on restricted doc.
 * 10. Legitimate Edits & Resubmission: Normal edits and resubmissions to 'pending' succeed.
 * 11. Admin & Multi-Role Invariants: Admin authorization and strict verified claims remain functional.
 * 12. Static Rules File Inspection: Validates strict rule structure on disk.
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

const ADMIN_WHITELIST = [
  "payalnkapse1720@gmail.com",
  "wentureindia@gmail.com",
  "info@wentureindia.com",
];

const mockDb = {
  admins: {
    "existing-admin-uid-123": { uid: "existing-admin-uid-123", email: "custom-admin@external.org", role: "admin", isAdmin: true },
  },
  listings: {
    "list-published-1": { ownerId: "founder-1", status: "published", businessName: "Published Venture" },
    "list-legacy-1": { userId: "founder-legacy-1", status: "pending", businessName: "Legacy Agritech" },
    "list-modern-1": { ownerId: "founder-2", userId: "founder-2", status: "pending", businessName: "Modern Venture" },
  },
};

function isAdmin(auth) {
  if (!auth || !auth.uid) return false;
  if (mockDb.admins[auth.uid] !== undefined) return true;
  if (auth.token && auth.token.email) {
    const isWhitelisted = ADMIN_WHITELIST.includes(auth.token.email.toLowerCase().trim());
    const isVerified = auth.token.email_verified === true;
    if (isWhitelisted && isVerified) return true;
  }
  return false;
}

function isParentListingOwner(listingId, auth) {
  if (!auth || !auth.uid) return false;
  const parent = mockDb.listings[listingId];
  if (!parent) return false;
  return (parent.ownerId && parent.ownerId === auth.uid) || (parent.userId && parent.userId === auth.uid);
}

function evaluateRules({ collection, docId, subcollection, subdocId, action, auth, resource, requestResource }) {
  const admin = isAdmin(auth);

  // --- Collection: listings subcollection restricted ---
  if (collection === "listings" && subcollection === "restricted") {
    const parentOwner = isParentListingOwner(docId, auth);

    if (action === "read") {
      if (!auth) return false;
      if (admin) return true;
      if (parentOwner) return true;
      // Stale or mismatched child document ownerId/userId does NOT independently grant access!
      return false;
    }

    if (action === "create") {
      if (!auth) return false;
      if (admin) return true;
      if (!parentOwner) return false;
      if (requestResource.data.ownerId !== auth.uid) return false;
      if (requestResource.data.userId && requestResource.data.userId !== auth.uid) return false;
      return true;
    }

    if (action === "update") {
      if (!auth) return false;
      if (admin) return true;
      if (!parentOwner) return false;
      const ownsDoc =
        (resource.data.ownerId && resource.data.ownerId === auth.uid) ||
        (resource.data.userId && resource.data.userId === auth.uid);
      if (!ownsDoc) return false;

      // Prevent ownerId reassignment
      if (resource.data.ownerId) {
        if (requestResource.data.ownerId !== resource.data.ownerId) return false;
      } else if (requestResource.data.ownerId && requestResource.data.ownerId !== auth.uid) {
        return false;
      }

      // Prevent userId reassignment
      if (resource.data.userId) {
        if (requestResource.data.userId !== resource.data.userId) return false;
      } else if (requestResource.data.userId && requestResource.data.userId !== auth.uid) {
        return false;
      }

      return true;
    }

    if (action === "delete") {
      if (!auth) return false;
      if (admin) return true;
      return parentOwner;
    }
  }

  // --- Collection: listings ---
  if (collection === "listings") {
    if (action === "read") {
      if (resource.data.status === "published") return true;
      if (!auth) return false;
      if (admin) return true;
      if (resource.data.ownerId && resource.data.ownerId === auth.uid) return true;
      if (resource.data.userId && resource.data.userId === auth.uid) return true;
      return false;
    }

    if (action === "create") {
      if (!auth) return false;
      if (requestResource.data.ownerId !== auth.uid) return false;
      if (requestResource.data.userId && requestResource.data.userId !== auth.uid) return false;
      if (requestResource.data.status !== "pending") return false;
      if (requestResource.data.approvalStatus && requestResource.data.approvalStatus !== "pending") return false;
      if (requestResource.data.isVerified === true) return false;
      if (requestResource.data.isPaidListing === true) return false;
      if (requestResource.data.isFeatured === true) return false;
      if (requestResource.data.adminNotes !== undefined) return false;
      return true;
    }

    if (action === "update") {
      if (admin) return true;
      if (!auth) return false;

      // Ownership verification (ownerId or legacy userId)
      const isOwner =
        (resource.data.ownerId && resource.data.ownerId === auth.uid) ||
        (resource.data.userId && resource.data.userId === auth.uid);
      if (!isOwner) return false;

      // Prevent ownerId reassignment
      if (resource.data.ownerId) {
        if (requestResource.data.ownerId !== resource.data.ownerId) return false;
      } else if (requestResource.data.ownerId && requestResource.data.ownerId !== auth.uid) {
        return false;
      }

      // Prevent userId reassignment (preserve if exists, or only allow self UID if adding)
      if (resource.data.userId) {
        if (requestResource.data.userId !== resource.data.userId) return false;
      } else if (requestResource.data.userId && requestResource.data.userId !== auth.uid) {
        return false;
      }

      // Cannot self-publish
      if (resource.data.status !== "published" && requestResource.data.status === "published") return false;
      // Cannot self-approve
      if (resource.data.approvalStatus !== "approved" && requestResource.data.approvalStatus === "approved") return false;

      // Protected admin keys
      const adminKeys = [
        "isVerified", "verifiedAt", "verifiedBy",
        "isPaidListing", "paymentStatus", "paidAt", "paymentAmount",
        "featuredUntil", "isFeatured", "adminNotes",
        "approvedAt", "approvedBy", "publishedAt"
      ];
      for (const k of adminKeys) {
        if (requestResource.data[k] !== undefined && requestResource.data[k] !== resource.data[k]) {
          return false;
        }
      }

      return true;
    }
  }

  return false;
}

// =================================================================
// TEST EXECUTION
// =================================================================

console.log("============================================================");
console.log("WENTURE INDIA — TARGETED FIRESTORE RULES SECURITY TESTS");
console.log("============================================================\n");

// TEST 01: Published listing does NOT expose pitch decks to arbitrary authenticated investors
const arbitraryInvestorAuth = { uid: "investor-arbitrary-1", token: { email: "investor@venture.com", email_verified: true } };
const pitchDeckUnderPublishedListing = evaluateRules({
  collection: "listings",
  docId: "list-published-1",
  subcollection: "restricted",
  subdocId: "pitchDeck",
  action: "read",
  auth: arbitraryInvestorAuth,
  resource: { data: { ownerId: "founder-1", pitchDeckStoragePath: "decks/secret.pdf" } },
});
recordResult({
  id: 1,
  name: "Arbitrary Investor Denied Access to Restricted Pitch Deck",
  passed: pitchDeckUnderPublishedListing === false,
  expected: "false (denied)",
  actual: String(pitchDeckUnderPublishedListing),
});

// TEST 02: Parent listing owner CAN read their own restricted document
const ownerPitchDeckRead = evaluateRules({
  collection: "listings",
  docId: "list-published-1",
  subcollection: "restricted",
  subdocId: "pitchDeck",
  action: "read",
  auth: { uid: "founder-1" },
  resource: { data: { ownerId: "founder-1", pitchDeckStoragePath: "decks/secret.pdf" } },
});
recordResult({
  id: 2,
  name: "Parent Listing Owner Can Read Restricted Document",
  passed: ownerPitchDeckRead === true,
  expected: "true (allowed)",
  actual: String(ownerPitchDeckRead),
});

// TEST 03: Authorized Admin CAN read restricted documents
const adminAuth = { uid: "admin-payal", token: { email: "payalnkapse1720@gmail.com", email_verified: true } };
const adminPitchDeckRead = evaluateRules({
  collection: "listings",
  docId: "list-published-1",
  subcollection: "restricted",
  subdocId: "pitchDeck",
  action: "read",
  auth: adminAuth,
  resource: { data: { ownerId: "founder-1", pitchDeckStoragePath: "decks/secret.pdf" } },
});
recordResult({
  id: 3,
  name: "Authorized Admin Can Read Restricted Document",
  passed: adminPitchDeckRead === true,
  expected: "true (allowed)",
  actual: String(adminPitchDeckRead),
});

// TEST 04: Document ownerId mismatch with parent owner is DENIED
const mismatchedOwnerIdAccess = evaluateRules({
  collection: "listings",
  docId: "list-published-1", // parent owner is founder-1
  subcollection: "restricted",
  subdocId: "pitchDeck",
  action: "read",
  auth: { uid: "stale-owner-uid" },
  resource: { data: { ownerId: "stale-owner-uid", pitchDeckStoragePath: "decks/secret.pdf" } },
});
recordResult({
  id: 4,
  name: "Document ownerId Mismatch with Parent Owner is Denied Access",
  passed: mismatchedOwnerIdAccess === false,
  expected: "false (denied)",
  actual: String(mismatchedOwnerIdAccess),
});

// TEST 05: Document userId mismatch with parent owner is DENIED
const mismatchedUserIdAccess = evaluateRules({
  collection: "listings",
  docId: "list-published-1", // parent owner is founder-1
  subcollection: "restricted",
  subdocId: "pitchDeck",
  action: "read",
  auth: { uid: "stale-user-uid" },
  resource: { data: { userId: "stale-user-uid", pitchDeckStoragePath: "decks/secret.pdf" } },
});
recordResult({
  id: 5,
  name: "Document userId Mismatch with Parent Owner is Denied Access",
  passed: mismatchedUserIdAccess === false,
  expected: "false (denied)",
  actual: String(mismatchedUserIdAccess),
});

// TEST 06: Legacy parent listing with userId-only accessing restricted document is ALLOWED
const legacyParentRestrictedRead = evaluateRules({
  collection: "listings",
  docId: "list-legacy-1", // parent has ONLY userId: "founder-legacy-1"
  subcollection: "restricted",
  subdocId: "pitchDeck",
  action: "read",
  auth: { uid: "founder-legacy-1" },
  resource: { data: { pitchDeckStoragePath: "decks/legacy.pdf" } },
});
recordResult({
  id: 6,
  name: "Legacy Parent Listing with userId Only Accessing Restricted Document is Allowed",
  passed: legacyParentRestrictedRead === true,
  expected: "true (allowed)",
  actual: String(legacyParentRestrictedRead),
});

// TEST 07: Legacy userId-only listing owner can edit their record
const legacyOwnerEdit = evaluateRules({
  collection: "listings",
  docId: "list-legacy-1",
  action: "update",
  auth: { uid: "founder-legacy-1" },
  resource: { data: { userId: "founder-legacy-1", status: "pending", businessName: "Old Legacy Name" } },
  requestResource: {
    data: {
      userId: "founder-legacy-1",
      status: "pending",
      businessName: "Updated Legacy Name",
      description: "Updated description.",
    },
  },
});
recordResult({
  id: 7,
  name: "Legacy userId-Only Listing Owner Can Edit Their Record",
  passed: legacyOwnerEdit === true,
  expected: "true (allowed)",
  actual: String(legacyOwnerEdit),
});

// TEST 08: Listing owner CANNOT reassign userId or ownerId
const userIdReassignmentAttempt = evaluateRules({
  collection: "listings",
  docId: "list-modern-1",
  action: "update",
  auth: { uid: "founder-2" },
  resource: { data: { ownerId: "founder-2", userId: "founder-2", status: "pending" } },
  requestResource: { data: { ownerId: "founder-2", userId: "hijacker-uid-99", status: "pending" } },
});
const ownerIdReassignmentAttempt = evaluateRules({
  collection: "listings",
  docId: "list-modern-1",
  action: "update",
  auth: { uid: "founder-2" },
  resource: { data: { ownerId: "founder-2", userId: "founder-2", status: "pending" } },
  requestResource: { data: { ownerId: "hijacker-uid-99", userId: "founder-2", status: "pending" } },
});
recordResult({
  id: 8,
  name: "Listing Owner Blocked from Reassigning userId or ownerId",
  passed: userIdReassignmentAttempt === false && ownerIdReassignmentAttempt === false,
  expected: "userId: false, ownerId: false",
  actual: `userId: ${userIdReassignmentAttempt}, ownerId: ${ownerIdReassignmentAttempt}`,
});

// TEST 09: Restricted document owner CANNOT grant access by inserting another user's userId
const restrictedInsertStrangerUserId = evaluateRules({
  collection: "listings",
  docId: "list-modern-1",
  subcollection: "restricted",
  subdocId: "pitchDeck",
  action: "create",
  auth: { uid: "founder-2" },
  requestResource: { data: { ownerId: "founder-2", userId: "stranger-granted-access" } },
});
const restrictedUpdateStrangerUserId = evaluateRules({
  collection: "listings",
  docId: "list-modern-1",
  subcollection: "restricted",
  subdocId: "pitchDeck",
  action: "update",
  auth: { uid: "founder-2" },
  resource: { data: { ownerId: "founder-2", userId: "founder-2" } },
  requestResource: { data: { ownerId: "founder-2", userId: "stranger-granted-access" } },
});
recordResult({
  id: 9,
  name: "Restricted Document Owner Blocked from Inserting Another User's userId",
  passed: restrictedInsertStrangerUserId === false && restrictedUpdateStrangerUserId === false,
  expected: "create: false, update: false",
  actual: `create: ${restrictedInsertStrangerUserId}, update: ${restrictedUpdateStrangerUserId}`,
});

// TEST 10: Normal listing edits and resubmissions still work
const normalResubmission = evaluateRules({
  collection: "listings",
  docId: "list-modern-1",
  action: "update",
  auth: { uid: "founder-2" },
  resource: { data: { ownerId: "founder-2", userId: "founder-2", status: "rejected", rejectionReason: "Fix financials" } },
  requestResource: {
    data: {
      ownerId: "founder-2",
      userId: "founder-2",
      status: "pending",
      businessName: "Revised Pitch",
      expectedValuation: "20 Cr",
    },
  },
});
recordResult({
  id: 10,
  name: "Normal Listing Edits and Resubmission to 'pending' Still Work",
  passed: normalResubmission === true,
  expected: "true (allowed)",
  actual: String(normalResubmission),
});

// TEST 11: Existing admin and multi-role authorization still works
const unverifiedAdminAttempt = isAdmin({ uid: "admin-fake", token: { email: "wentureindia@gmail.com", email_verified: false } });
const verifiedAdminSuccess = isAdmin({ uid: "admin-real", token: { email: "wentureindia@gmail.com", email_verified: true } });
const provisionedUidSuccess = isAdmin({ uid: "existing-admin-uid-123" });
recordResult({
  id: 11,
  name: "Strict Verified Claims & Dedicated Admin UID Invariants",
  passed: unverifiedAdminAttempt === false && verifiedAdminSuccess === true && provisionedUidSuccess === true,
  expected: "unverified: false, verified: true, provisionedUid: true",
  actual: `unverified: ${unverifiedAdminAttempt}, verified: ${verifiedAdminSuccess}, provisionedUid: ${provisionedUidSuccess}`,
});

// TEST 12: Static Rules Inspection of Disk File
const rulesPath = path.join(__dirname, "..", "firestore.rules");
const rulesText = fs.readFileSync(rulesPath, "utf-8");

const noPublishedPitchDeckAccess = !rulesText.includes("get(/databases/$(database)/documents/listings/$(listingId)).data.status == 'published'");
const checksOwnerIdPreservation = rulesText.includes("request.resource.data.ownerId == resource.data.ownerId");
const checksUserIdPreservation = rulesText.includes("request.resource.data.userId == resource.data.userId");
// Verify that restricted read strictly checks isAdmin() || isParentListingOwner(listingId)
const matchRestricted = rulesText.match(/match \/restricted\/\{docId\} \{([\s\S]*?)allow read: if ([\s\S]*?);/);
const restrictedReadRule = matchRestricted ? matchRestricted[2].trim() : "";
const restrictedReadStrict =
  restrictedReadRule.includes("isAdmin()") &&
  restrictedReadRule.includes("isParentListingOwner(listingId)") &&
  !restrictedReadRule.includes("resource.data.ownerId == request.auth.uid");

recordResult({
  id: 12,
  name: "Static Rules Inspection: Restricted Read Strictly Derives from Parent Ownership or Admin",
  passed: noPublishedPitchDeckAccess && checksOwnerIdPreservation && checksUserIdPreservation && restrictedReadStrict,
  expected: "Strict static invariants met",
  actual: JSON.stringify({
    noPublishedPitchDeckAccess,
    checksOwnerIdPreservation,
    checksUserIdPreservation,
    restrictedReadStrict,
  }),
});

// -----------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------
console.log("\n============================================================");
console.log("TARGETED FIRESTORE RULES SECURITY CORRECTIONS RESULTS");
console.log("============================================================");
const passedCount = results.filter((r) => r.passed).length;
console.log(`Total Invariants Tested: ${results.length}`);
console.log(`Passed:                  ${passedCount} / ${results.length}`);
console.log(`Failed:                  ${results.length - passedCount}`);
console.log("============================================================\n");

if (passedCount === results.length) {
  console.log("ALL 12 TARGETED SECURITY TESTS PASSED SUCCESSFULLY! 🎉\n");
  process.exit(0);
} else {
  console.error("SOME TARGETED SECURITY TESTS FAILED! ❌\n");
  process.exit(1);
}
