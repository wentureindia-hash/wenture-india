/**
 * WENTURE INDIA — SINGLE ENQUIRY DELETION TEST SUITE
 *
 * Verifies:
 * 1. Admin can delete an individual opportunity enquiry from opportunity_enquiries.
 * 2. Admin can delete an individual general contact message from contact_inquiries.
 * 3. Deleting a single enquiry preserves all other enquiries in the collection.
 * 4. Deleting a single enquiry does not affect parent opportunities, listings, users, or other collections.
 * 5. Non-admin requests are rejected with 403 Forbidden.
 * 6. Unauthenticated requests are rejected with 401 Unauthorized.
 * 7. Requests with missing or empty enquiry IDs are rejected with 400 Bad Request.
 * 8. Deleting a non-existent enquiry returns graceful handling (idempotent).
 * 9. Both collection types (opportunity_enquiries & contact_inquiries) correctly route and isolate deletions.
 */

const assert = require("assert");

// In-Memory Mock Database
class MockDB {
  constructor() {
    this.opportunity_enquiries = new Map();
    this.contact_inquiries = new Map();
    this.listings = new Map();
    this.users = new Map();
  }

  reset() {
    this.opportunity_enquiries.clear();
    this.contact_inquiries.clear();
    this.listings.clear();
    this.users.clear();
  }
}

const mockDb = new MockDB();

// Mock handler simulating /api/admin/enquiries/delete
function simulateDeleteEnquiryRoute(reqBody, authContext) {
  // 1. Authentication check
  if (!authContext || !authContext.user) {
    return {
      status: 401,
      body: { error: "Authentication required.", code: "unauthorized" },
    };
  }

  // 2. Admin authorization check
  if (!authContext.user.isAdmin) {
    return {
      status: 403,
      body: { error: "Administrator authorization required.", code: "forbidden" },
    };
  }

  // 3. Body parsing & validation
  const targetId = reqBody.id || reqBody.enquiryId;
  const rawType = (reqBody.type || reqBody.collection || "").toLowerCase();

  if (!targetId || typeof targetId !== "string" || !targetId.trim()) {
    return {
      status: 400,
      body: { error: "Enquiry ID is required for deletion.", code: "missing_id" },
    };
  }

  const targetCollection =
    rawType === "contact" ||
    rawType === "contact_inquiries" ||
    rawType === "contact_submission"
      ? "contact_inquiries"
      : "opportunity_enquiries";

  const collectionMap = mockDb[targetCollection];
  if (!collectionMap) {
    return {
      status: 500,
      body: { error: `Invalid collection: ${targetCollection}`, code: "invalid_collection" },
    };
  }

  const trimmedId = targetId.trim();
  if (!collectionMap.has(trimmedId)) {
    return {
      status: 200,
      body: {
        success: true,
        alreadyDeleted: true,
        message: "Enquiry does not exist or has already been removed.",
        deletedId: trimmedId,
        collection: targetCollection,
      },
    };
  }

  collectionMap.delete(trimmedId);

  return {
    status: 200,
    body: {
      success: true,
      message: `Enquiry successfully deleted from ${targetCollection}.`,
      deletedId: trimmedId,
      collection: targetCollection,
    },
  };
}

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    mockDb.reset();
    fn();
    console.log(`  PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  FAIL: ${name}`);
    console.error(`        ${err.message}`);
    failed++;
  }
}

console.log("\n--- Testing Single Enquiry Deletion ---\n");

// Test 1: Admin successfully deletes single opportunity enquiry
runTest("Admin successfully deletes a single opportunity enquiry", () => {
  mockDb.opportunity_enquiries.set("enq_1", { id: "enq_1", opportunityTitle: "Tech Startup", message: "Interested" });
  mockDb.opportunity_enquiries.set("enq_2", { id: "enq_2", opportunityTitle: "Retail Chain", message: "Details please" });

  const auth = { user: { uid: "admin_1", email: "admin@wenture.in", isAdmin: true } };
  const res = simulateDeleteEnquiryRoute({ id: "enq_1", type: "opportunity" }, auth);

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.strictEqual(res.body.deletedId, "enq_1");
  assert.strictEqual(res.body.collection, "opportunity_enquiries");

  // enq_1 deleted, enq_2 preserved
  assert.strictEqual(mockDb.opportunity_enquiries.has("enq_1"), false);
  assert.strictEqual(mockDb.opportunity_enquiries.has("enq_2"), true);
  assert.strictEqual(mockDb.opportunity_enquiries.size, 1);
});

// Test 2: Admin successfully deletes single general contact inquiry
runTest("Admin successfully deletes a single general contact inquiry", () => {
  mockDb.contact_inquiries.set("cnt_1", { id: "cnt_1", fullName: "John Doe", subject: "Partnership" });
  mockDb.contact_inquiries.set("cnt_2", { id: "cnt_2", fullName: "Jane Smith", subject: "Support" });

  const auth = { user: { uid: "admin_1", email: "admin@wenture.in", isAdmin: true } };
  const res = simulateDeleteEnquiryRoute({ id: "cnt_1", type: "contact" }, auth);

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.strictEqual(res.body.deletedId, "cnt_1");
  assert.strictEqual(res.body.collection, "contact_inquiries");

  // cnt_1 deleted, cnt_2 preserved
  assert.strictEqual(mockDb.contact_inquiries.has("cnt_1"), false);
  assert.strictEqual(mockDb.contact_inquiries.has("cnt_2"), true);
  assert.strictEqual(mockDb.contact_inquiries.size, 1);
});

// Test 3: Cross-collection isolation
runTest("Deleting from opportunity_enquiries does NOT touch contact_inquiries or listings", () => {
  mockDb.opportunity_enquiries.set("enq_1", { id: "enq_1", opportunityId: "opp_99" });
  mockDb.contact_inquiries.set("cnt_1", { id: "cnt_1", subject: "General Inquiry" });
  mockDb.listings.set("opp_99", { id: "opp_99", title: "Original Opportunity" });
  mockDb.users.set("usr_1", { id: "usr_1", email: "user@example.com" });

  const auth = { user: { uid: "admin_1", email: "admin@wenture.in", isAdmin: true } };
  const res = simulateDeleteEnquiryRoute({ id: "enq_1", type: "opportunity" }, auth);

  assert.strictEqual(res.status, 200);
  assert.strictEqual(mockDb.opportunity_enquiries.has("enq_1"), false);
  assert.strictEqual(mockDb.contact_inquiries.has("cnt_1"), true);
  assert.strictEqual(mockDb.listings.has("opp_99"), true);
  assert.strictEqual(mockDb.users.has("usr_1"), true);
});

// Test 4: Unauthenticated rejection (401)
runTest("Unauthenticated request is rejected with 401", () => {
  mockDb.opportunity_enquiries.set("enq_1", { id: "enq_1" });
  const res = simulateDeleteEnquiryRoute({ id: "enq_1", type: "opportunity" }, null);

  assert.strictEqual(res.status, 401);
  assert.strictEqual(res.body.code, "unauthorized");
  assert.strictEqual(mockDb.opportunity_enquiries.has("enq_1"), true);
});

// Test 5: Non-admin rejection (403)
runTest("Non-admin request is rejected with 403 Forbidden", () => {
  mockDb.opportunity_enquiries.set("enq_1", { id: "enq_1" });
  const auth = { user: { uid: "user_1", email: "user@example.com", isAdmin: false } };
  const res = simulateDeleteEnquiryRoute({ id: "enq_1", type: "opportunity" }, auth);

  assert.strictEqual(res.status, 403);
  assert.strictEqual(res.body.code, "forbidden");
  assert.strictEqual(mockDb.opportunity_enquiries.has("enq_1"), true);
});

// Test 6: Missing ID validation (400)
runTest("Missing or empty enquiry ID is rejected with 400 Bad Request", () => {
  const auth = { user: { uid: "admin_1", email: "admin@wenture.in", isAdmin: true } };
  const res1 = simulateDeleteEnquiryRoute({}, auth);
  assert.strictEqual(res1.status, 400);
  assert.strictEqual(res1.body.code, "missing_id");

  const res2 = simulateDeleteEnquiryRoute({ id: "   " }, auth);
  assert.strictEqual(res2.status, 400);
  assert.strictEqual(res2.body.code, "missing_id");
});

// Test 7: Non-existent enquiry handling (idempotent 200)
runTest("Deleting non-existent enquiry returns idempotent 200 success", () => {
  const auth = { user: { uid: "admin_1", email: "admin@wenture.in", isAdmin: true } };
  const res = simulateDeleteEnquiryRoute({ id: "non_existent", type: "opportunity" }, auth);

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.strictEqual(res.body.alreadyDeleted, true);
});

// Test 8: Alternate payload keys supported (enquiryId, collection)
runTest("Alternate parameter names (enquiryId, collection) are supported", () => {
  mockDb.contact_inquiries.set("cnt_test", { id: "cnt_test", message: "Test" });
  const auth = { user: { uid: "admin_1", email: "admin@wenture.in", isAdmin: true } };
  const res = simulateDeleteEnquiryRoute({ enquiryId: "cnt_test", collection: "contact_inquiries" }, auth);

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.deletedId, "cnt_test");
  assert.strictEqual(mockDb.contact_inquiries.has("cnt_test"), false);
});

console.log(`\nResults: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) process.exit(1);
