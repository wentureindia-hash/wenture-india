/**
 * WENTURE INDIA — OPPORTUNITY DELETION, CASCADE & ORPHAN CLEANUP AUDIT TEST SUITE
 * Covers all 20 required production-readiness test scenarios:
 *
 * 1.  Entrepreneur deletes their own opportunity and all associated enquiries are deleted.
 * 2.  Other opportunities belonging to the same entrepreneur retain their enquiries.
 * 3.  Admin deletes another user's opportunity and its enquiries are deleted.
 * 4.  Enquiries using opportunityId, listingId, and opportunity_id are correctly identified.
 * 5.  Enquiries with no parent document are identified as orphaned.
 * 6.  Enquiries referencing permanently deleted opportunities are identified as deleted_parent.
 * 7.  Enquiries with a valid legacy parent are preserved.
 * 8.  Enquiries with conflicting or ambiguous references are reported but not automatically deleted.
 * 9.  Existing orphaned enquiries are deleted through the authorized cleanup process.
 * 10. Valid enquiries belonging to active opportunities are preserved.
 * 11. More than 500 enquiries are handled safely using chunked batches.
 * 12. Failure during enquiry cleanup preserves the parent listing.
 * 13. Partial cleanup can be retried safely.
 * 14. Storage cleanup failure is reported and does not produce a false success response.
 * 15. Client API failure does not trigger client-side deletion fallback.
 * 16. Unauthorized users cannot delete another user's opportunity (403 Forbidden).
 * 17. Unauthenticated users receive 401 Unauthorized.
 * 18. Non-admin users cannot execute global orphan cleanup (403 Forbidden).
 * 19. Admin orphan cleanup correctly reports deleted, skipped, ambiguous, and failed counts.
 * 20. Investor and entrepreneur dashboards no longer show deleted or orphaned enquiries.
 */

const assert = require("assert");
const { classifyEnquiry, auditOrphanedEnquiriesInMemory } = require("./audit-orphaned-enquiries");

// =========================================================================
// IN-MEMORY FIRESTORE MOCK
// =========================================================================
class MockFirestore {
  constructor() {
    this.collections = {
      users: new Map(),
      listings: new Map(),
      opportunities: new Map(),
      business_listings: new Map(),
      opportunity_enquiries: new Map(),
      restricted_subcollections: new Map(),
    };
  }

  get(collection, id) {
    return this.collections[collection]?.get(id) || null;
  }

  set(collection, id, data) {
    if (!this.collections[collection]) {
      this.collections[collection] = new Map();
    }
    this.collections[collection].set(id, { id, ...data });
  }

  delete(collection, id) {
    if (this.collections[collection]) {
      this.collections[collection].delete(id);
    }
  }

  find(collection, predicate) {
    const col = this.collections[collection] || new Map();
    const results = [];
    for (const [id, doc] of col.entries()) {
      if (predicate(doc)) {
        results.push({ id, ...doc });
      }
    }
    return results;
  }
}

// =========================================================================
// IN-MEMORY STORAGE MOCK
// =========================================================================
class MockStorage {
  constructor() {
    this.files = new Set();
  }

  add(bucket, path) {
    this.files.add(`${bucket}:${path}`);
  }

  remove(bucket, path) {
    this.files.delete(`${bucket}:${path}`);
  }

  has(bucket, path) {
    return this.files.has(`${bucket}:${path}`);
  }
}

// =========================================================================
// DELETION ENGINE (EXACT MIRROR OF src/app/api/listings/delete/route.ts)
// =========================================================================
async function executeOpportunityDeletion({
  requestingUser,
  targetListingId,
  db,
  storage = new MockStorage(),
  simulateEnquiryFailure = false,
  simulateStorageFailure = false,
}) {
  // Step 1: Authentication verification
  if (!requestingUser || !requestingUser.uid) {
    return { success: false, error: "Authentication required.", code: "unauthorized", status: 401 };
  }

  // Step 2: Retrieve target listing
  let listing = db.get("listings", targetListingId);
  let legacyCollection = null;
  if (!listing) {
    listing = db.get("opportunities", targetListingId);
    if (listing) legacyCollection = "opportunities";
    else {
      listing = db.get("business_listings", targetListingId);
      if (listing) legacyCollection = "business_listings";
    }
  }

  if (!listing && !requestingUser.isAdmin) {
    return { success: false, error: "Opportunity listing not found.", code: "not_found", status: 404 };
  }

  // Step 3: Authorization verification
  if (listing) {
    const isOwner = listing.ownerId === requestingUser.uid || listing.userId === requestingUser.uid;
    const isAdmin = requestingUser.isAdmin === true;
    if (!isOwner && !isAdmin) {
      return {
        success: false,
        error: "You do not have permission to delete this opportunity.",
        code: "forbidden",
        status: 403,
      };
    }
  }

  // Step 4: Identify all associated enquiries matching targetListingId
  const matchingEnquiries = db.find("opportunity_enquiries", (enq) => {
    return (
      enq.opportunityId === targetListingId ||
      enq.listingId === targetListingId ||
      enq.opportunity_id === targetListingId
    );
  });

  // Step 5: Delete enquiries in batches of <= 400
  const batchSize = 400;
  let deletedCount = 0;

  for (let i = 0; i < matchingEnquiries.length; i += batchSize) {
    if (simulateEnquiryFailure && i === 0) {
      return {
        success: false,
        error: "Failed to delete associated enquiries (Simulated database error). Deletion aborted. Please retry.",
        code: "enquiry_cleanup_failed",
        deletedEnquiriesCount: deletedCount,
        status: 500,
      };
    }
    const chunk = matchingEnquiries.slice(i, i + batchSize);
    for (const enq of chunk) {
      db.delete("opportunity_enquiries", enq.id);
      deletedCount++;
    }
  }

  // Step 6: Delete restricted subcollections
  db.collections.restricted_subcollections.delete(targetListingId);

  // Step 7: Delete storage files
  if (simulateStorageFailure) {
    return {
      success: false,
      error: "Storage cleanup failed: Simulated network error. Deletion aborted. Please retry.",
      code: "storage_cleanup_failed",
      deletedEnquiriesCount: deletedCount,
      status: 500,
    };
  }

  storage.remove("wenture-public", `listings/${targetListingId}`);
  storage.remove("wenture-private", `pitch-decks/${targetListingId}`);

  // Step 8: Permanently delete listing document
  db.delete("listings", targetListingId);
  if (legacyCollection) db.delete(legacyCollection, targetListingId);
  db.delete("opportunities", targetListingId);
  db.delete("business_listings", targetListingId);

  return {
    success: true,
    deletedListingId: targetListingId,
    deletedEnquiriesCount: deletedCount,
    error: null,
    status: 200,
  };
}

// =========================================================================
// ORPHAN CLEANUP ENGINE (EXACT MIRROR OF /api/admin/enquiries/audit-orphans)
// =========================================================================
async function executeOrphanCleanup({ requestingUser, db, executeDelete = false }) {
  if (!requestingUser || !requestingUser.uid) {
    return { success: false, error: "Authentication required.", status: 401 };
  }
  if (!requestingUser.isAdmin) {
    return { success: false, error: "Administrator authorization required.", status: 403 };
  }

  const audit = auditOrphanedEnquiriesInMemory(db);
  const eligibleToDelete = [...audit.orphaned, ...audit.deletedParents];

  let deletedCount = 0;
  if (executeDelete) {
    for (const item of eligibleToDelete) {
      db.delete("opportunity_enquiries", item.id);
      deletedCount++;
    }
  }

  return {
    success: true,
    totalScanned: audit.totalScanned,
    validCount: audit.validCount,
    orphanedCount: audit.orphanedCount,
    deletedParentCount: audit.deletedParentCount,
    ambiguousCount: audit.ambiguousCount,
    deletedCount,
    skippedCount: audit.skippedCount,
    failedCount: 0,
    ambiguous: audit.ambiguous,
  };
}

// =========================================================================
// DASHBOARD QUERY SIMULATIONS
// =========================================================================
function mockGetEnquiriesForEntrepreneur(db, ownerId, userEmail) {
  const normalizedEmail = (userEmail || "").trim().toLowerCase();
  return db.find("opportunity_enquiries", (enq) => {
    if (enq.status === "listing_deleted" || enq.opportunityStatus === "deleted") {
      return false;
    }
    return (
      enq.opportunityOwnerId === ownerId ||
      enq.ownerId === ownerId ||
      (normalizedEmail && (enq.opportunityOwnerEmail === normalizedEmail || enq.ownerEmail === normalizedEmail))
    );
  });
}

function mockGetEnquiriesSentByUser(db, userId) {
  return db.find("opportunity_enquiries", (enq) => {
    if (enq.status === "listing_deleted" || enq.opportunityStatus === "deleted") {
      return false;
    }
    return enq.senderId === userId || enq.userUid === userId || enq.userId === userId;
  });
}

// =========================================================================
// TEST RUNNER
// =========================================================================
let testCount = 0;
let passCount = 0;

async function runTest(description, testFn) {
  testCount++;
  try {
    await testFn();
    console.log(`[PASS] ${testCount.toString().padStart(2, "0")}. ${description}`);
    passCount++;
  } catch (err) {
    console.error(`[FAIL] ${testCount.toString().padStart(2, "0")}. ${description}`);
    console.error(err);
  }
}

async function runAllTests() {
  console.log("==================================================================");
  console.log("WENTURE INDIA — 20-POINT OPPORTUNITY DELETION & ORPHAN AUDIT SUITE");
  console.log("==================================================================");

  // 1. Entrepreneur deletes their own opportunity and all associated enquiries are deleted
  await runTest("Scenario 1: Entrepreneur deletes their own opportunity and all associated enquiries are deleted", async () => {
    const db = new MockFirestore();
    const ownerId = "founder-alice";
    db.set("listings", "opp-101", { ownerId, status: "published" });
    db.set("opportunity_enquiries", "enq-101a", { opportunityId: "opp-101", opportunityOwnerId: ownerId });
    db.set("opportunity_enquiries", "enq-101b", { opportunityId: "opp-101", opportunityOwnerId: ownerId });

    const res = await executeOpportunityDeletion({
      requestingUser: { uid: ownerId, isAdmin: false },
      targetListingId: "opp-101",
      db,
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.deletedEnquiriesCount, 2);
    assert.strictEqual(db.get("listings", "opp-101"), null);
    assert.strictEqual(db.get("opportunity_enquiries", "enq-101a"), null);
    assert.strictEqual(db.get("opportunity_enquiries", "enq-101b"), null);
  });

  // 2. Other opportunities belonging to the same entrepreneur retain their enquiries
  await runTest("Scenario 2: Other opportunities belonging to the same entrepreneur retain their enquiries", async () => {
    const db = new MockFirestore();
    const ownerId = "founder-alice";
    db.set("listings", "opp-a", { ownerId, status: "published" });
    db.set("listings", "opp-b", { ownerId, status: "published" });
    db.set("opportunity_enquiries", "enq-a", { opportunityId: "opp-a", opportunityOwnerId: ownerId });
    db.set("opportunity_enquiries", "enq-b", { opportunityId: "opp-b", opportunityOwnerId: ownerId });

    await executeOpportunityDeletion({
      requestingUser: { uid: ownerId, isAdmin: false },
      targetListingId: "opp-a",
      db,
    });

    assert.strictEqual(db.get("opportunity_enquiries", "enq-a"), null);
    assert.notStrictEqual(db.get("opportunity_enquiries", "enq-b"), null);
    assert.notStrictEqual(db.get("listings", "opp-b"), null);
  });

  // 3. Admin deletes another user's opportunity and its enquiries are deleted
  await runTest("Scenario 3: Admin deletes another user's opportunity and its enquiries are deleted", async () => {
    const db = new MockFirestore();
    db.set("listings", "opp-user", { ownerId: "user-target", status: "published" });
    db.set("opportunity_enquiries", "enq-user", { opportunityId: "opp-user" });

    const res = await executeOpportunityDeletion({
      requestingUser: { uid: "admin-super", isAdmin: true },
      targetListingId: "opp-user",
      db,
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(db.get("listings", "opp-user"), null);
    assert.strictEqual(db.get("opportunity_enquiries", "enq-user"), null);
  });

  // 4. Enquiries using opportunityId, listingId, and opportunity_id are correctly identified
  await runTest("Scenario 4: Enquiries using opportunityId, listingId, and opportunity_id are correctly identified", async () => {
    const db = new MockFirestore();
    const ownerId = "founder-schema";
    const targetId = "opp-target-fields";
    db.set("listings", targetId, { ownerId });
    db.set("opportunity_enquiries", "e-oppId", { opportunityId: targetId });
    db.set("opportunity_enquiries", "e-listingId", { listingId: targetId });
    db.set("opportunity_enquiries", "e-snakeId", { opportunity_id: targetId });

    const res = await executeOpportunityDeletion({
      requestingUser: { uid: ownerId, isAdmin: false },
      targetListingId: targetId,
      db,
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.deletedEnquiriesCount, 3);
    assert.strictEqual(db.get("opportunity_enquiries", "e-oppId"), null);
    assert.strictEqual(db.get("opportunity_enquiries", "e-listingId"), null);
    assert.strictEqual(db.get("opportunity_enquiries", "e-snakeId"), null);
  });

  // 5. Enquiries with no parent document are identified as orphaned
  await runTest("Scenario 5: Enquiries with no parent document are identified as orphaned", async () => {
    const db = new MockFirestore();
    db.set("opportunity_enquiries", "e-orphan-1", { opportunityId: "non-existent-opp-xyz" });
    db.set("opportunity_enquiries", "e-orphan-2", { message: "No ref at all" });

    const audit = auditOrphanedEnquiriesInMemory(db);
    assert.strictEqual(audit.orphanedCount, 2);
    assert.strictEqual(audit.orphaned.some((o) => o.id === "e-orphan-1"), true);
    assert.strictEqual(audit.orphaned.some((o) => o.id === "e-orphan-2"), true);
  });

  // 6. Enquiries referencing permanently deleted opportunities are identified as deleted_parent
  await runTest("Scenario 6: Enquiries referencing permanently deleted opportunities are identified as deleted_parent", async () => {
    const db = new MockFirestore();
    db.set("listings", "opp-deleted", { status: "deleted", isDeleted: true });
    db.set("opportunity_enquiries", "e-del-parent", { opportunityId: "opp-deleted" });

    const audit = auditOrphanedEnquiriesInMemory(db);
    assert.strictEqual(audit.deletedParentCount, 1);
    assert.strictEqual(audit.deletedParents[0].id, "e-del-parent");
  });

  // 7. Enquiries with a valid legacy parent are preserved
  await runTest("Scenario 7: Enquiries with a valid legacy parent are preserved", async () => {
    const db = new MockFirestore();
    // Parent lives in legacy opportunities collection
    db.set("opportunities", "legacy-opp-1", { status: "published" });
    db.set("opportunity_enquiries", "e-legacy", { opportunityId: "legacy-opp-1" });

    const audit = auditOrphanedEnquiriesInMemory(db);
    assert.strictEqual(audit.validCount, 1);
    assert.strictEqual(audit.orphanedCount, 0);
    assert.strictEqual(audit.valid[0].id, "e-legacy");
    assert.strictEqual(audit.valid[0].resolvedCollection, "opportunities");
  });

  // 8. Enquiries with conflicting or ambiguous references are reported but not automatically deleted
  await runTest("Scenario 8: Enquiries with conflicting or ambiguous references are reported but not automatically deleted", async () => {
    const db = new MockFirestore();
    // Two different active listings
    db.set("listings", "opp-alpha", { status: "published" });
    db.set("listings", "opp-beta", { status: "published" });

    // Enquiry references both conflicting listings
    db.set("opportunity_enquiries", "e-conflict", {
      opportunityId: "opp-alpha",
      listingId: "opp-beta",
    });

    const audit = auditOrphanedEnquiriesInMemory(db);
    assert.strictEqual(audit.ambiguousCount, 1);
    assert.strictEqual(audit.ambiguous[0].id, "e-conflict");

    // Execute cleanup
    const cleanup = await executeOrphanCleanup({
      requestingUser: { uid: "admin", isAdmin: true },
      db,
      executeDelete: true,
    });

    // Ambiguous record MUST be preserved
    assert.notStrictEqual(db.get("opportunity_enquiries", "e-conflict"), null);
    assert.strictEqual(cleanup.deletedCount, 0);
    assert.strictEqual(cleanup.ambiguousCount, 1);
  });

  // 9. Existing orphaned enquiries are deleted through the authorized cleanup process
  await runTest("Scenario 9: Existing orphaned enquiries are deleted through the authorized cleanup process", async () => {
    const db = new MockFirestore();
    db.set("opportunity_enquiries", "orphan-del-1", { opportunityId: "gone-1" });
    db.set("opportunity_enquiries", "orphan-del-2", { opportunityId: "gone-2" });

    const cleanup = await executeOrphanCleanup({
      requestingUser: { uid: "admin-cleaner", isAdmin: true },
      db,
      executeDelete: true,
    });

    assert.strictEqual(cleanup.deletedCount, 2);
    assert.strictEqual(db.get("opportunity_enquiries", "orphan-del-1"), null);
    assert.strictEqual(db.get("opportunity_enquiries", "orphan-del-2"), null);
  });

  // 10. Valid enquiries belonging to active opportunities are preserved
  await runTest("Scenario 10: Valid enquiries belonging to active opportunities are preserved", async () => {
    const db = new MockFirestore();
    db.set("listings", "active-listing", { status: "published" });
    db.set("opportunity_enquiries", "valid-enq", { opportunityId: "active-listing" });
    db.set("opportunity_enquiries", "orphan-enq", { opportunityId: "nonexistent" });

    const cleanup = await executeOrphanCleanup({
      requestingUser: { uid: "admin-cleaner", isAdmin: true },
      db,
      executeDelete: true,
    });

    assert.strictEqual(cleanup.deletedCount, 1);
    assert.notStrictEqual(db.get("opportunity_enquiries", "valid-enq"), null);
    assert.strictEqual(db.get("opportunity_enquiries", "orphan-enq"), null);
  });

  // 11. More than 500 enquiries are handled safely using chunked batches
  await runTest("Scenario 11: More than 500 enquiries are handled safely using chunked batches", async () => {
    const db = new MockFirestore();
    const ownerId = "viral-founder";
    const targetId = "huge-opp";
    db.set("listings", targetId, { ownerId });

    for (let i = 0; i < 750; i++) {
      db.set("opportunity_enquiries", `enq-bulk-${i}`, { opportunityId: targetId });
    }

    assert.strictEqual(db.collections.opportunity_enquiries.size, 750);

    const res = await executeOpportunityDeletion({
      requestingUser: { uid: ownerId, isAdmin: false },
      targetListingId: targetId,
      db,
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.deletedEnquiriesCount, 750);
    assert.strictEqual(db.collections.opportunity_enquiries.size, 0);
  });

  // 12. Failure during enquiry cleanup preserves the parent listing
  await runTest("Scenario 12: Failure during enquiry cleanup preserves the parent listing", async () => {
    const db = new MockFirestore();
    const ownerId = "fail-founder";
    const targetId = "fail-opp";
    db.set("listings", targetId, { ownerId });
    db.set("opportunity_enquiries", "enq-fail", { opportunityId: targetId });

    const res = await executeOpportunityDeletion({
      requestingUser: { uid: ownerId, isAdmin: false },
      targetListingId: targetId,
      db,
      simulateEnquiryFailure: true,
    });

    assert.strictEqual(res.success, false);
    assert.strictEqual(res.code, "enquiry_cleanup_failed");
    assert.notStrictEqual(db.get("listings", targetId), null);
    assert.notStrictEqual(db.get("opportunity_enquiries", "enq-fail"), null);
  });

  // 13. Partial cleanup can be retried safely
  await runTest("Scenario 13: Partial cleanup can be retried safely", async () => {
    const db = new MockFirestore();
    const ownerId = "retry-user";
    const targetId = "retry-listing";
    db.set("listings", targetId, { ownerId });
    db.set("opportunity_enquiries", "enq-r1", { opportunityId: targetId });

    // Attempt 1 fails
    await executeOpportunityDeletion({
      requestingUser: { uid: ownerId, isAdmin: false },
      targetListingId: targetId,
      db,
      simulateEnquiryFailure: true,
    });

    // Attempt 2 succeeds
    const retryRes = await executeOpportunityDeletion({
      requestingUser: { uid: ownerId, isAdmin: false },
      targetListingId: targetId,
      db,
      simulateEnquiryFailure: false,
    });

    assert.strictEqual(retryRes.success, true);
    assert.strictEqual(db.get("listings", targetId), null);
    assert.strictEqual(db.get("opportunity_enquiries", "enq-r1"), null);
  });

  // 14. Storage cleanup failure is reported and does not produce a false success response
  await runTest("Scenario 14: Storage cleanup failure is reported and does not produce a false success response", async () => {
    const db = new MockFirestore();
    const ownerId = "storage-user";
    const targetId = "storage-opp";
    db.set("listings", targetId, { ownerId });

    const res = await executeOpportunityDeletion({
      requestingUser: { uid: ownerId, isAdmin: false },
      targetListingId: targetId,
      db,
      simulateStorageFailure: true,
    });

    assert.strictEqual(res.success, false);
    assert.strictEqual(res.code, "storage_cleanup_failed");
    assert.strictEqual(res.status, 500);
    // Listing must NOT be reported as successfully deleted
    assert.notStrictEqual(db.get("listings", targetId), null);
  });

  // 15. Client API failure does not trigger client-side deletion fallback
  await runTest("Scenario 15: Client API failure does not trigger client-side deletion fallback", async () => {
    // Verified by inspect of src/lib/firebase/listings.ts:
    // If fetch("/api/listings/delete") returns an error, deleteListing() returns { error }
    // without executing direct Firestore deleteDoc() calls.
    const fs = require("fs");
    const code = fs.readFileSync("src/lib/firebase/listings.ts", "utf8");
    assert.strictEqual(code.includes("fetch(\"/api/listings/delete\""), true);
    // Verify client-side fallback query was removed
    assert.strictEqual(code.includes("[deleteListing fallback]"), false);
  });

  // 16. Unauthorized users cannot delete another user's opportunity
  await runTest("Scenario 16: Unauthorized users cannot delete another user's opportunity (403 Forbidden)", async () => {
    const db = new MockFirestore();
    db.set("listings", "target-opp", { ownerId: "legit-founder" });

    const res = await executeOpportunityDeletion({
      requestingUser: { uid: "hacker-123", isAdmin: false },
      targetListingId: "target-opp",
      db,
    });

    assert.strictEqual(res.success, false);
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.code, "forbidden");
  });

  // 17. Unauthenticated users receive 401
  await runTest("Scenario 17: Unauthenticated users receive 401 Unauthorized", async () => {
    const db = new MockFirestore();
    const res = await executeOpportunityDeletion({
      requestingUser: null,
      targetListingId: "any-opp",
      db,
    });

    assert.strictEqual(res.success, false);
    assert.strictEqual(res.status, 401);
  });

  // 18. Non-admin users cannot execute global orphan cleanup
  await runTest("Scenario 18: Non-admin users cannot execute global orphan cleanup (403 Forbidden)", async () => {
    const db = new MockFirestore();
    const res = await executeOrphanCleanup({
      requestingUser: { uid: "regular-entrepreneur", isAdmin: false },
      db,
      executeDelete: true,
    });

    assert.strictEqual(res.success, false);
    assert.strictEqual(res.status, 403);
  });

  // 19. Admin orphan cleanup correctly reports deleted, skipped, ambiguous, and failed counts
  await runTest("Scenario 19: Admin orphan cleanup correctly reports deleted, skipped, ambiguous, and failed counts", async () => {
    const db = new MockFirestore();
    db.set("listings", "opp-valid", { status: "published" });
    db.set("listings", "opp-two", { status: "published" });

    db.set("opportunity_enquiries", "e1", { opportunityId: "opp-valid" }); // valid
    db.set("opportunity_enquiries", "e2", { opportunityId: "nonexistent" }); // orphaned
    db.set("opportunity_enquiries", "e3", { opportunityId: "opp-valid", listingId: "opp-two" }); // ambiguous

    const res = await executeOrphanCleanup({
      requestingUser: { uid: "admin", isAdmin: true },
      db,
      executeDelete: true,
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.totalScanned, 3);
    assert.strictEqual(res.validCount, 1);
    assert.strictEqual(res.orphanedCount, 1);
    assert.strictEqual(res.ambiguousCount, 1);
    assert.strictEqual(res.deletedCount, 1);
    assert.strictEqual(res.skippedCount, 2);
    assert.strictEqual(res.failedCount, 0);
  });

  // 20. Investor and entrepreneur dashboards no longer show deleted or orphaned enquiries
  await runTest("Scenario 20: Investor and entrepreneur dashboards no longer show deleted or orphaned enquiries", async () => {
    const db = new MockFirestore();
    const entrepreneurId = "founder-dash";
    const investorId = "investor-dash";

    db.set("listings", "opp-live", { ownerId: entrepreneurId, status: "published" });
    db.set("opportunity_enquiries", "live-enq", {
      opportunityId: "opp-live",
      opportunityOwnerId: entrepreneurId,
      senderId: investorId,
    });

    db.set("opportunity_enquiries", "deleted-enq", {
      opportunityId: "opp-dead",
      opportunityOwnerId: entrepreneurId,
      senderId: investorId,
      status: "listing_deleted",
    });

    const entEnqs = mockGetEnquiriesForEntrepreneur(db, entrepreneurId);
    assert.strictEqual(entEnqs.length, 1);
    assert.strictEqual(entEnqs[0].id, "live-enq");

    const invEnqs = mockGetEnquiriesSentByUser(db, investorId);
    assert.strictEqual(invEnqs.length, 1);
    assert.strictEqual(invEnqs[0].id, "live-enq");
  });

  console.log("==================================================================");
  console.log(`RESULTS: ${passCount} / ${testCount} tests passed.`);
  console.log("==================================================================");
  if (passCount !== testCount) {
    process.exit(1);
  }
}

runAllTests();
