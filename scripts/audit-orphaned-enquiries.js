/**
 * WENTURE INDIA — AUDIT ORPHANED OPPORTUNITY ENQUIRIES
 * Scans `opportunity_enquiries` collection in Firestore to identify and categorize
 * enquiry records:
 *   - valid: References an active, valid opportunity in listings / opportunities / business_listings
 *   - orphaned: Parent document does not exist anywhere in database
 *   - deleted_parent: Parent document is marked deleted or deletion_pending
 *   - ambiguous: References multiple conflicting parents that cannot be confidently resolved
 *
 * Usage:
 *   node scripts/audit-orphaned-enquiries.js                  # Read-only audit
 *   node scripts/audit-orphaned-enquiries.js --cleanup --confirm # Controlled cleanup
 */

const readline = require("readline");

/**
 * Resolves a potential parent ID across listings, opportunities, business_listings collections.
 */
function resolveParentFromMap(candidateId, listings, opportunities, businessListings) {
  if (!candidateId) return null;

  let doc = listings?.get(candidateId);
  let collection = "listings";

  if (!doc) {
    doc = opportunities?.get(candidateId);
    if (doc) collection = "opportunities";
  }

  if (!doc) {
    doc = businessListings?.get(candidateId);
    if (doc) collection = "business_listings";
  }

  if (!doc) return null;

  const isDeleted = doc.isDeleted === true || doc.status === "deleted";
  const isDeletionPending =
    doc.accountStatus === "deletion_pending" || doc.status === "deletion_pending";
  const isActive = !isDeleted && !isDeletionPending;

  return {
    docId: candidateId,
    collection,
    status: doc.status,
    isDeleted,
    isDeletionPending,
    isActive,
  };
}

/**
 * Pure evaluation function for classifying an individual enquiry record.
 */
function classifyEnquiry(enq, listings, opportunities, businessListings) {
  const candidateIds = [];
  const oppId = typeof enq.opportunityId === "string" ? enq.opportunityId.trim() : "";
  const listingId = typeof enq.listingId === "string" ? enq.listingId.trim() : "";
  const snakeId = typeof enq.opportunity_id === "string" ? enq.opportunity_id.trim() : "";

  if (oppId) candidateIds.push(oppId);
  if (listingId) candidateIds.push(listingId);
  if (snakeId) candidateIds.push(snakeId);

  if (candidateIds.length === 0) {
    return {
      classification: "orphaned",
      reason: "Missing all opportunity reference ID fields",
    };
  }

  const uniqueCandidates = Array.from(new Set(candidateIds));
  const resolved = uniqueCandidates.map((id) => ({
    id,
    parent: resolveParentFromMap(id, listings, opportunities, businessListings),
  }));

  const activeParents = resolved.filter((r) => r.parent && r.parent.isActive);
  const deletedParents = resolved.filter(
    (r) => r.parent && (r.parent.isDeleted || r.parent.isDeletionPending)
  );
  const missingParents = resolved.filter((r) => !r.parent);

  // Exactly one active parent resolves -> valid (even if an older legacy reference was invalid)
  if (activeParents.length === 1) {
    const active = activeParents[0].parent;
    return {
      classification: "valid",
      reason: `Parent opportunity exists and is active in '${active.collection}'`,
      resolvedParentId: active.docId,
      resolvedCollection: active.collection,
    };
  }

  // Multiple conflicting active parents -> ambiguous (do not delete)
  if (activeParents.length > 1) {
    return {
      classification: "ambiguous",
      reason: "Multiple conflicting active parent opportunities referenced. Requires manual review.",
    };
  }

  // No active parents: check for deleted parent
  if (deletedParents.length > 0) {
    if (deletedParents.length > 1) {
      return {
        classification: "ambiguous",
        reason: "Multiple conflicting deleted parent references.",
      };
    }
    const del = deletedParents[0].parent;
    return {
      classification: "deleted_parent",
      reason: `Referenced parent opportunity is permanently marked deleted in '${del.collection}'`,
      resolvedParentId: del.docId,
      resolvedCollection: del.collection,
    };
  }

  // No parent found in any collection
  return {
    classification: "orphaned",
    reason: `Referenced opportunity ID(s) [${uniqueCandidates.join(", ")}] do not exist in listings database`,
  };
}

/**
 * In-memory scanner for automated testing
 */
function auditOrphanedEnquiriesInMemory(db) {
  const enquiries = db.collections.opportunity_enquiries || new Map();
  const listings = db.collections.listings || new Map();
  const opportunities = db.collections.opportunities || new Map();
  const businessListings = db.collections.business_listings || new Map();

  const valid = [];
  const orphaned = [];
  const deletedParents = [];
  const ambiguous = [];

  for (const [id, enq] of enquiries.entries()) {
    const result = classifyEnquiry(enq, listings, opportunities, businessListings);
    const item = {
      id,
      enquiry: enq,
      classification: result.classification,
      reason: result.reason,
      resolvedParentId: result.resolvedParentId,
      resolvedCollection: result.resolvedCollection,
    };

    if (result.classification === "valid") valid.push(item);
    else if (result.classification === "orphaned") orphaned.push(item);
    else if (result.classification === "deleted_parent") deletedParents.push(item);
    else if (result.classification === "ambiguous") ambiguous.push(item);
  }

  return {
    totalScanned: enquiries.size,
    validCount: valid.length,
    orphanedCount: orphaned.length,
    deletedParentCount: deletedParents.length,
    ambiguousCount: ambiguous.length,
    skippedCount: valid.length + ambiguous.length,
    valid,
    orphaned,
    deletedParents,
    ambiguous,
  };
}

/**
 * Standalone CLI execution
 */
async function main() {
  const isCleanup = process.argv.includes("--cleanup");
  const isConfirmed = process.argv.includes("--confirm");

  console.log("==================================================================");
  console.log("WENTURE INDIA — OPPORTUNITY ENQUIRIES ORPHAN AUDIT & CLEANUP");
  console.log(`Mode: ${isCleanup ? "CONTROLLED CLEANUP" : "READ-ONLY AUDIT"}`);
  console.log("==================================================================");

  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    "wenture-india";

  if (!privateKey || !clientEmail) {
    console.log("\n[INFO] Local service account credentials not configured.");
    console.log("This audit scanner is also active on the server route:");
    console.log("  GET  /api/admin/enquiries/audit-orphans  (Read-only audit)");
    console.log("  POST /api/admin/enquiries/audit-orphans  (Controlled cleanup)");
    console.log("To run locally against Firestore, set FIREBASE_PRIVATE_KEY and FIREBASE_CLIENT_EMAIL.");
    console.log("==================================================================");
    return;
  }

  const admin = require("firebase-admin");
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, "\n"),
      }),
    });
  }

  const firestore = admin.firestore();
  console.log(`Connecting to Firestore project: ${projectId}...`);

  const [enqSnap, listSnap, oppSnap, blSnap] = await Promise.all([
    firestore.collection("opportunity_enquiries").get(),
    firestore.collection("listings").get(),
    firestore.collection("opportunities").get(),
    firestore.collection("business_listings").get(),
  ]);

  const listMap = new Map();
  listSnap.forEach((d) => listMap.set(d.id, d.data()));

  const oppMap = new Map();
  oppSnap.forEach((d) => oppMap.set(d.id, d.data()));

  const blMap = new Map();
  blSnap.forEach((d) => blMap.set(d.id, d.data()));

  const valid = [];
  const orphaned = [];
  const deletedParents = [];
  const ambiguous = [];

  enqSnap.forEach((docSnap) => {
    const data = docSnap.data();
    const result = classifyEnquiry(data, listMap, oppMap, blMap);
    const record = { id: docSnap.id, ref: docSnap.ref, ...result };

    if (result.classification === "valid") valid.push(record);
    else if (result.classification === "orphaned") orphaned.push(record);
    else if (result.classification === "deleted_parent") deletedParents.push(record);
    else if (result.classification === "ambiguous") ambiguous.push(record);
  });

  console.log("\n------------------------------------------------------------------");
  console.log("AUDIT SUMMARY:");
  console.log(`- Total Enquiries Scanned: ${enqSnap.size}`);
  console.log(`- Valid Active Enquiries:  ${valid.length}`);
  console.log(`- Confirmed Orphaned:      ${orphaned.length}`);
  console.log(`- Deleted Parent Enquiries:${deletedParents.length}`);
  console.log(`- Ambiguous (Preserved):   ${ambiguous.length}`);
  console.log("------------------------------------------------------------------");

  if (orphaned.length > 0) {
    console.log(`\nConfirmed Orphaned Records (${orphaned.length}):`);
    orphaned.slice(0, 10).forEach((o, i) => {
      console.log(`  ${i + 1}. [${o.id}] ${o.reason}`);
    });
    if (orphaned.length > 10) console.log(`  ... and ${orphaned.length - 10} more`);
  }

  if (deletedParents.length > 0) {
    console.log(`\nDeleted Parent Records (${deletedParents.length}):`);
    deletedParents.slice(0, 10).forEach((d, i) => {
      console.log(`  ${i + 1}. [${d.id}] Parent ${d.resolvedParentId} -> ${d.reason}`);
    });
    if (deletedParents.length > 10) console.log(`  ... and ${deletedParents.length - 10} more`);
  }

  if (ambiguous.length > 0) {
    console.log(`\nAmbiguous Records (PRESERVED - Manual Review Required) (${ambiguous.length}):`);
    ambiguous.forEach((a, i) => {
      console.log(`  ${i + 1}. [${a.id}] ${a.reason}`);
    });
  }

  const eligibleForCleanup = [...orphaned, ...deletedParents];

  if (isCleanup) {
    if (eligibleForCleanup.length === 0) {
      console.log("\nNo orphaned or deleted-parent records to clean up.");
      return;
    }

    if (!isConfirmed) {
      console.log("\n⚠️ SAFETY GUARD: Controlled cleanup requested.");
      console.log(`Target Firebase Project: ${projectId}`);
      console.log(`Records to permanently delete: ${eligibleForCleanup.length}`);
      console.log("To confirm deletion, re-run with: --cleanup --confirm");
      return;
    }

    console.log(`\nExecuting batch deletion for ${eligibleForCleanup.length} records...`);
    for (let i = 0; i < eligibleForCleanup.length; i += 400) {
      const chunk = eligibleForCleanup.slice(i, i + 400);
      const batch = firestore.batch();
      chunk.forEach((item) => batch.delete(item.ref));
      await batch.commit();
    }
    console.log(`Successfully purged ${eligibleForCleanup.length} confirmed orphaned records.`);
  } else {
    console.log("\nRun with '--cleanup --confirm' to permanently remove confirmed orphaned records.");
  }
  console.log("==================================================================");
}

if (require.main === module) {
  main().catch((err) => {
    console.error("Audit error:", err);
    process.exit(1);
  });
}

module.exports = {
  classifyEnquiry,
  auditOrphanedEnquiriesInMemory,
};
