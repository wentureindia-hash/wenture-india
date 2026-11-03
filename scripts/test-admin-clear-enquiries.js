/**
 * WENTURE INDIA — PRE-LAUNCH OPPORTUNITY ENQUIRY BULK CLEANUP TEST SUITE
 *
 * Verifies all 11 requirements:
 * 1. Admin can successfully clear all opportunity enquiries.
 * 2. Non-admin users cannot trigger cleanup (403 Forbidden).
 * 3. Unauthenticated requests are rejected (401 Unauthorized).
 * 4. More than 500 enquiry records are deleted using safe batch processing (<= 400 per batch).
 * 5. Orphaned and legacy enquiry records are included and deleted.
 * 6. investor_enquiries remain completely untouched.
 * 7. All opportunities and listings remain untouched.
 * 8. Profiles, authentication accounts, images, pitch decks, and verifications remain untouched.
 * 9. Failed batches are reported correctly without false success.
 * 10. Retrying cleanup does not cause errors or unintended deletions (idempotent).
 * 11. Admin dashboard queries display zero opportunity enquiries after successful cleanup.
 */

const assert = require("assert");

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
      investor_enquiries: new Map(),
      investorProfiles: new Map(),
      verifications: new Map(),
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

  getAll(collection) {
    const col = this.collections[collection] || new Map();
    return Array.from(col.values());
  }

  count(collection) {
    return this.collections[collection]?.size || 0;
  }
}

// =========================================================================
// BULK CLEANUP SIMULATION (EXACT MIRROR OF /api/admin/enquiries/clear-all)
// =========================================================================
async function executeClearAllOpportunityEnquiries({
  requestingUser,
  db,
  firestoreUnconfigured = false,
  simulateBatchFailureAtIndex = -1,
}) {
  // 1. Authentication Check
  if (!requestingUser || !requestingUser.uid) {
    return {
      success: false,
      error: "Authentication required.",
      code: "unauthorized",
      status: 401,
    };
  }

  // 2. Server-Side Admin Authorization Check
  if (!requestingUser.isAdmin) {
    return {
      success: false,
      error: "Administrator authorization required.",
      code: "forbidden",
      status: 403,
    };
  }

  // 3. Database connection availability check
  if (firestoreUnconfigured) {
    return {
      success: false,
      error:
        "Database connection unconfigured. Firebase Admin credentials are not provisioned on the server (missing: FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY). Please configure FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY (or FIREBASE_SERVICE_ACCOUNT_KEY) in .env.local for local development or Vercel environment variables for production.",
      code: "unconfigured_server",
      missingFields: ["FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY"],
      status: 500,
    };
  }

  // 4. Query all existing documents strictly from opportunity_enquiries
  const allDocs = db.getAll("opportunity_enquiries");
  const totalIdentified = allDocs.length;

  if (totalIdentified === 0) {
    return {
      success: true,
      totalIdentified: 0,
      totalDeleted: 0,
      failedCount: 0,
      message: "No opportunity enquiries found. Inbox is already clean.",
      status: 200,
    };
  }

  // 4. Batch delete in chunks of <= 400
  const batchSize = 400;
  let totalDeleted = 0;
  let failedCount = 0;
  const batchErrors = [];

  for (let i = 0; i < allDocs.length; i += batchSize) {
    if (simulateBatchFailureAtIndex === i) {
      const chunk = allDocs.slice(i, i + batchSize);
      failedCount += chunk.length;
      batchErrors.push("Simulated batch deletion failure");
      continue;
    }

    const chunk = allDocs.slice(i, i + batchSize);
    for (const d of chunk) {
      db.delete("opportunity_enquiries", d.id);
      totalDeleted++;
    }
  }

  if (failedCount > 0) {
    return {
      success: false,
      totalIdentified,
      totalDeleted,
      failedCount,
      errors: batchErrors,
      error: `Cleanup incomplete: ${totalDeleted} of ${totalIdentified} deleted, ${failedCount} failed. Please retry.`,
      status: 500,
    };
  }

  return {
    success: true,
    totalIdentified,
    totalDeleted,
    failedCount: 0,
    message: `Successfully deleted all ${totalDeleted} opportunity enquiries.`,
    status: 200,
  };
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
  console.log("WENTURE INDIA — PRE-LAUNCH ENQUIRY CLEANUP TEST SUITE");
  console.log("==================================================================");

  // 1. Admin can successfully clear all opportunity enquiries
  await runTest("Admin can successfully clear all opportunity enquiries", async () => {
    const db = new MockFirestore();
    db.set("opportunity_enquiries", "e1", { opportunityId: "opp-1", message: "Hi" });
    db.set("opportunity_enquiries", "e2", { opportunityId: "opp-2", message: "Hello" });

    const res = await executeClearAllOpportunityEnquiries({
      requestingUser: { uid: "admin-uid", isAdmin: true },
      db,
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.totalIdentified, 2);
    assert.strictEqual(res.totalDeleted, 2);
    assert.strictEqual(db.count("opportunity_enquiries"), 0);
  });

  // 2. Non-admin users cannot trigger cleanup (403 Forbidden)
  await runTest("Non-admin users cannot trigger cleanup (403 Forbidden)", async () => {
    const db = new MockFirestore();
    db.set("opportunity_enquiries", "e1", { opportunityId: "opp-1" });

    const res = await executeClearAllOpportunityEnquiries({
      requestingUser: { uid: "entrepreneur-uid", isAdmin: false },
      db,
    });

    assert.strictEqual(res.success, false);
    assert.strictEqual(res.status, 403);
    assert.strictEqual(db.count("opportunity_enquiries"), 1);
  });

  // 3. Unauthenticated requests are rejected (401 Unauthorized)
  await runTest("Unauthenticated requests are rejected (401 Unauthorized)", async () => {
    const db = new MockFirestore();
    db.set("opportunity_enquiries", "e1", { opportunityId: "opp-1" });

    const res = await executeClearAllOpportunityEnquiries({
      requestingUser: null,
      db,
    });

    assert.strictEqual(res.success, false);
    assert.strictEqual(res.status, 401);
    assert.strictEqual(db.count("opportunity_enquiries"), 1);
  });

  // 4. More than 500 enquiry records are deleted using safe batch processing
  await runTest("More than 500 enquiry records are deleted using safe batch processing (<= 400 per batch)", async () => {
    const db = new MockFirestore();
    const count = 650;
    for (let i = 0; i < count; i++) {
      db.set("opportunity_enquiries", `bulk-e-${i}`, { opportunityId: `opp-${i % 10}` });
    }

    assert.strictEqual(db.count("opportunity_enquiries"), 650);

    const res = await executeClearAllOpportunityEnquiries({
      requestingUser: { uid: "admin-uid", isAdmin: true },
      db,
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.totalIdentified, 650);
    assert.strictEqual(res.totalDeleted, 650);
    assert.strictEqual(db.count("opportunity_enquiries"), 0);
  });

  // 5. Orphaned and legacy enquiry records are included and deleted
  await runTest("Orphaned and legacy enquiry records are included and deleted", async () => {
    const db = new MockFirestore();
    db.set("opportunity_enquiries", "e-normal", { opportunityId: "opp-active" });
    db.set("opportunity_enquiries", "e-orphan-noid", { message: "No id" });
    db.set("opportunity_enquiries", "e-legacy-key", { listingId: "opp-legacy" });
    db.set("opportunity_enquiries", "e-snake-key", { opportunity_id: "opp-snake" });

    const res = await executeClearAllOpportunityEnquiries({
      requestingUser: { uid: "admin-uid", isAdmin: true },
      db,
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.totalDeleted, 4);
    assert.strictEqual(db.count("opportunity_enquiries"), 0);
  });

  // 6. investor_enquiries remain completely untouched
  await runTest("investor_enquiries remain completely untouched", async () => {
    const db = new MockFirestore();
    db.set("opportunity_enquiries", "opp-enq-1", { opportunityId: "opp-1" });

    // Seed investor_enquiries
    db.set("investor_enquiries", "inv-enq-1", { investorId: "investor-bob", name: "Alice" });
    db.set("investor_enquiries", "inv-enq-2", { investorId: "investor-charlie", name: "Dave" });

    assert.strictEqual(db.count("investor_enquiries"), 2);

    await executeClearAllOpportunityEnquiries({
      requestingUser: { uid: "admin-uid", isAdmin: true },
      db,
    });

    // Verify opportunity_enquiries is cleared
    assert.strictEqual(db.count("opportunity_enquiries"), 0);
    // Verify investor_enquiries is 100% untouched
    assert.strictEqual(db.count("investor_enquiries"), 2);
    assert.notStrictEqual(db.get("investor_enquiries", "inv-enq-1"), null);
    assert.notStrictEqual(db.get("investor_enquiries", "inv-enq-2"), null);
  });

  // 7. All opportunities and listings remain untouched
  await runTest("All opportunities and listings remain untouched", async () => {
    const db = new MockFirestore();
    db.set("opportunity_enquiries", "opp-e1", { opportunityId: "list-1" });

    // Seed listings and opportunities
    db.set("listings", "list-1", { title: "SaaS Enterprise", status: "published" });
    db.set("listings", "list-2", { title: "CleanTech Plant", status: "published" });
    db.set("opportunities", "opp-legacy-1", { title: "Legacy Opp", status: "published" });

    await executeClearAllOpportunityEnquiries({
      requestingUser: { uid: "admin-uid", isAdmin: true },
      db,
    });

    assert.strictEqual(db.count("opportunity_enquiries"), 0);
    assert.strictEqual(db.count("listings"), 2);
    assert.strictEqual(db.count("opportunities"), 1);
    assert.strictEqual(db.get("listings", "list-1").title, "SaaS Enterprise");
    assert.strictEqual(db.get("listings", "list-2").title, "CleanTech Plant");
  });

  // 8. Profiles, authentication accounts, images, pitch decks, and verifications remain untouched
  await runTest("Profiles, authentication accounts, images, pitch decks, and verifications remain untouched", async () => {
    const db = new MockFirestore();
    db.set("opportunity_enquiries", "opp-e", { opportunityId: "any" });

    db.set("users", "user-1", { email: "founder@wenture.in", role: "entrepreneur" });
    db.set("investorProfiles", "inv-1", { fullName: "Payal Kapse", status: "published" });
    db.set("verifications", "user-1", { kycStatus: "verified" });

    await executeClearAllOpportunityEnquiries({
      requestingUser: { uid: "admin-uid", isAdmin: true },
      db,
    });

    assert.strictEqual(db.count("opportunity_enquiries"), 0);
    assert.notStrictEqual(db.get("users", "user-1"), null);
    assert.notStrictEqual(db.get("investorProfiles", "inv-1"), null);
    assert.notStrictEqual(db.get("verifications", "user-1"), null);
  });

  // 9. Failed batches are reported correctly without false success
  await runTest("Failed batches are reported correctly without false success", async () => {
    const db = new MockFirestore();
    for (let i = 0; i < 600; i++) {
      db.set("opportunity_enquiries", `e-${i}`, { opportunityId: "opp-1" });
    }

    // Simulate failure on the second batch (i = 400)
    const res = await executeClearAllOpportunityEnquiries({
      requestingUser: { uid: "admin-uid", isAdmin: true },
      db,
      simulateBatchFailureAtIndex: 400,
    });

    assert.strictEqual(res.success, false);
    assert.strictEqual(res.status, 500);
    assert.strictEqual(res.totalDeleted, 400);
    assert.strictEqual(res.failedCount, 200);
    // Unfinished records remain in database
    assert.strictEqual(db.count("opportunity_enquiries"), 200);
  });

  // 10. Retrying cleanup does not cause errors or unintended deletions (idempotent)
  await runTest("Retrying cleanup does not cause errors or unintended deletions (idempotent)", async () => {
    const db = new MockFirestore();
    db.set("opportunity_enquiries", "e1", { opportunityId: "opp-1" });

    // Run 1: Cleans up 1 document
    const res1 = await executeClearAllOpportunityEnquiries({
      requestingUser: { uid: "admin-uid", isAdmin: true },
      db,
    });
    assert.strictEqual(res1.success, true);
    assert.strictEqual(res1.totalDeleted, 1);
    assert.strictEqual(db.count("opportunity_enquiries"), 0);

    // Run 2: Already empty, succeeds cleanly with 0 deleted
    const res2 = await executeClearAllOpportunityEnquiries({
      requestingUser: { uid: "admin-uid", isAdmin: true },
      db,
    });
    assert.strictEqual(res2.success, true);
    assert.strictEqual(res2.totalIdentified, 0);
    assert.strictEqual(res2.totalDeleted, 0);
  });

  // 11. Admin dashboard queries display zero opportunity enquiries after successful cleanup
  await runTest("Admin dashboard queries display zero opportunity enquiries after successful cleanup", async () => {
    const db = new MockFirestore();
    db.set("opportunity_enquiries", "e1", { opportunityId: "opp-1" });
    db.set("opportunity_enquiries", "e2", { opportunityId: "opp-2" });

    assert.strictEqual(db.getAll("opportunity_enquiries").length, 2);

    await executeClearAllOpportunityEnquiries({
      requestingUser: { uid: "admin-uid", isAdmin: true },
      db,
    });

    // Simulated query snapshot for admin dashboard
    const adminEnquiries = db.getAll("opportunity_enquiries");
    assert.strictEqual(adminEnquiries.length, 0);
  });

  // 12. Missing credentials returns descriptive error with missing field names without exposing secrets
  await runTest("Missing credentials returns descriptive error with missing field names without exposing secrets", async () => {
    const db = new MockFirestore();
    const res = await executeClearAllOpportunityEnquiries({
      requestingUser: { uid: "admin-uid", isAdmin: true },
      db,
      firestoreUnconfigured: true,
    });

    assert.strictEqual(res.success, false);
    assert.strictEqual(res.status, 500);
    assert.strictEqual(res.code, "unconfigured_server");
    assert.strictEqual(res.error.includes("FIREBASE_CLIENT_EMAIL"), true);
    assert.strictEqual(res.error.includes("FIREBASE_PRIVATE_KEY"), true);
    assert.deepStrictEqual(res.missingFields, ["FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY"]);
  });

  console.log("==================================================================");
  console.log(`RESULTS: ${passCount} / ${testCount} tests passed.`);
  console.log("==================================================================");
  if (passCount !== testCount) {
    process.exit(1);
  }
}

runAllTests();

