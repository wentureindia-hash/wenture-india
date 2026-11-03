import { NextResponse } from "next/server";
import * as admin from "firebase-admin";
import {
  verifyFirebaseTokenDetails,
  getAdminFirestore,
} from "@/lib/firebase/admin";

export type EnquiryClassification = "valid" | "orphaned" | "deleted_parent" | "ambiguous";

export interface AuditReportItem {
  enquiryId: string;
  classification: EnquiryClassification;
  reason: string;
  opportunityTitle?: string;
  opportunityOwnerId?: string;
  senderId?: string;
  candidateIds: {
    opportunityId?: string;
    listingId?: string;
    opportunity_id?: string;
  };
  resolvedParentId?: string;
  resolvedCollection?: string;
  createdAt?: unknown;
}

export interface ParentResolutionResult {
  docId: string;
  collection: "listings" | "opportunities" | "business_listings";
  status?: string;
  isDeleted: boolean;
  isDeletionPending: boolean;
  isActive: boolean;
}

/**
 * Resolves a potential parent document ID across listings, opportunities, and business_listings collections.
 */
function resolveParentFromCaches(
  candidateId: string,
  listingsMap: Map<string, FirebaseFirestore.DocumentData>,
  oppsMap: Map<string, FirebaseFirestore.DocumentData>,
  blMap: Map<string, FirebaseFirestore.DocumentData>
): ParentResolutionResult | null {
  if (!candidateId) return null;

  // 1. Primary: listings
  let data = listingsMap.get(candidateId);
  let collection: "listings" | "opportunities" | "business_listings" = "listings";

  // 2. Fallback: opportunities
  if (!data) {
    data = oppsMap.get(candidateId);
    if (data) collection = "opportunities";
  }

  // 3. Fallback: business_listings
  if (!data) {
    data = blMap.get(candidateId);
    if (data) collection = "business_listings";
  }

  if (!data) return null;

  const isDeleted = data.isDeleted === true || data.status === "deleted";
  const isDeletionPending =
    data.accountStatus === "deletion_pending" || data.status === "deletion_pending";
  const isActive = !isDeleted && !isDeletionPending;

  return {
    docId: candidateId,
    collection,
    status: data.status,
    isDeleted,
    isDeletionPending,
    isActive,
  };
}

/**
 * Classifies an opportunity_enquiries document according to strict multi-field parent resolution rules.
 */
export function classifyEnquiryRecord(
  enquiryId: string,
  enqData: FirebaseFirestore.DocumentData,
  listingsMap: Map<string, FirebaseFirestore.DocumentData>,
  oppsMap: Map<string, FirebaseFirestore.DocumentData>,
  blMap: Map<string, FirebaseFirestore.DocumentData>
): {
  classification: EnquiryClassification;
  reason: string;
  resolvedParentId?: string;
  resolvedCollection?: string;
} {
  const candidateIds: { key: string; id: string }[] = [];

  const oppId = typeof enqData.opportunityId === "string" ? enqData.opportunityId.trim() : "";
  const listingId = typeof enqData.listingId === "string" ? enqData.listingId.trim() : "";
  const snakeId = typeof enqData.opportunity_id === "string" ? enqData.opportunity_id.trim() : "";

  if (oppId) candidateIds.push({ key: "opportunityId", id: oppId });
  if (listingId) candidateIds.push({ key: "listingId", id: listingId });
  if (snakeId) candidateIds.push({ key: "opportunity_id", id: snakeId });

  // Rule 1: Missing all reference fields
  if (candidateIds.length === 0) {
    return {
      classification: "orphaned",
      reason: "Missing all opportunity reference ID fields (opportunityId, listingId, opportunity_id)",
    };
  }

  // Resolve each unique candidate ID across listings, opportunities, business_listings
  const uniqueCandidateIds = Array.from(new Set(candidateIds.map((c) => c.id)));
  const resolvedCandidates = uniqueCandidateIds.map((id) => {
    return {
      id,
      parent: resolveParentFromCaches(id, listingsMap, oppsMap, blMap),
    };
  });

  const activeParents = resolvedCandidates.filter((r) => r.parent && r.parent.isActive);
  const deletedParents = resolvedCandidates.filter(
    (r) => r.parent && (r.parent.isDeleted || r.parent.isDeletionPending)
  );
  const missingCandidates = resolvedCandidates.filter((r) => !r.parent);

  // Rule 2: Exactly one candidate resolves to an active, valid parent opportunity
  // Even if an older legacy ID is missing or deleted, if a valid parent reference exists, preserve as valid!
  if (activeParents.length === 1) {
    const active = activeParents[0].parent!;
    return {
      classification: "valid",
      reason: `Parent opportunity exists and is active in '${active.collection}'`,
      resolvedParentId: active.docId,
      resolvedCollection: active.collection,
    };
  }

  // Rule 3: Conflicting active parents
  // If multiple distinct candidate IDs resolve to DIFFERENT active parent opportunities, mark as ambiguous
  if (activeParents.length > 1) {
    const parentList = activeParents.map((a) => `${a.parent!.collection}/${a.id}`).join(", ");
    return {
      classification: "ambiguous",
      reason: `Conflicting active parent references detected (${parentList}). Requires manual review.`,
    };
  }

  // Rule 4: No active parents exist.
  // Check if parents are confirmed deleted vs completely non-existent
  if (deletedParents.length > 0) {
    if (deletedParents.length === 1 && missingCandidates.length === 0) {
      const del = deletedParents[0].parent!;
      return {
        classification: "deleted_parent",
        reason: `Referenced parent opportunity is permanently marked deleted in '${del.collection}'`,
        resolvedParentId: del.docId,
        resolvedCollection: del.collection,
      };
    }

    if (deletedParents.length > 1) {
      return {
        classification: "ambiguous",
        reason: "Multiple conflicting deleted parent references. Requires manual review.",
      };
    }

    const del = deletedParents[0].parent!;
    return {
      classification: "deleted_parent",
      reason: `Referenced parent opportunity is permanently marked deleted in '${del.collection}'`,
      resolvedParentId: del.docId,
      resolvedCollection: del.collection,
    };
  }

  // Rule 5: None of the candidate IDs exist in any parent collection
  return {
    classification: "orphaned",
    reason: `Referenced parent opportunity ID(s) [${uniqueCandidateIds.join(", ")}] do not exist in listings database`,
  };
}

/**
 * Scans the database and audits opportunity_enquiries against current and legacy collections.
 */
async function performOrphanAudit(firestore: ReturnType<typeof getAdminFirestore>) {
  if (!firestore) {
    return { error: "Database unconfigured", totalScanned: 0, items: [] };
  }

  const enquiriesSnap = await firestore.collection("opportunity_enquiries").get();
  const listingsSnap = await firestore.collection("listings").get();
  const oppsSnap = await firestore.collection("opportunities").get();
  const blSnap = await firestore.collection("business_listings").get();

  const listingsMap = new Map<string, FirebaseFirestore.DocumentData>();
  listingsSnap.forEach((d) => listingsMap.set(d.id, d.data()));

  const oppsMap = new Map<string, FirebaseFirestore.DocumentData>();
  oppsSnap.forEach((d) => oppsMap.set(d.id, d.data()));

  const blMap = new Map<string, FirebaseFirestore.DocumentData>();
  blSnap.forEach((d) => blMap.set(d.id, d.data()));

  const items: (AuditReportItem & { ref: FirebaseFirestore.DocumentReference })[] = [];

  enquiriesSnap.forEach((docSnap) => {
    const data = docSnap.data();
    const result = classifyEnquiryRecord(docSnap.id, data, listingsMap, oppsMap, blMap);

    items.push({
      enquiryId: docSnap.id,
      ref: docSnap.ref,
      classification: result.classification,
      reason: result.reason,
      opportunityTitle: data.opportunityTitle || data.title,
      opportunityOwnerId: data.opportunityOwnerId || data.ownerId,
      senderId: data.senderId || data.userId,
      candidateIds: {
        opportunityId: data.opportunityId,
        listingId: data.listingId,
        opportunity_id: data.opportunity_id,
      },
      resolvedParentId: result.resolvedParentId,
      resolvedCollection: result.resolvedCollection,
      createdAt: data.createdAt,
    });
  });

  return {
    error: null,
    totalScanned: enquiriesSnap.size,
    items,
  };
}

/**
 * GET: Read-only orphan audit report (Admin only)
 */
export async function GET(req: Request) {
  try {
    const tokenResult = await verifyFirebaseTokenDetails(req);
    if (!tokenResult.user || !tokenResult.user.isAdmin) {
      return NextResponse.json(
        { error: "Administrator authorization required.", code: "forbidden" },
        { status: 403 }
      );
    }

    const firestore = getAdminFirestore();
    if (!firestore) {
      return NextResponse.json(
        { error: "Database connection unconfigured.", code: "unconfigured_server" },
        { status: 500 }
      );
    }

    const audit = await performOrphanAudit(firestore);
    if (audit.error) {
      return NextResponse.json({ error: audit.error }, { status: 500 });
    }

    const validItems = audit.items.filter((i) => i.classification === "valid");
    const orphanedItems = audit.items.filter((i) => i.classification === "orphaned");
    const deletedParentItems = audit.items.filter((i) => i.classification === "deleted_parent");
    const ambiguousItems = audit.items.filter((i) => i.classification === "ambiguous");

    const sanitize = (list: typeof audit.items) =>
      list.map(({ ref, ...item }) => item);

    return NextResponse.json({
      success: true,
      totalScanned: audit.totalScanned,
      validCount: validItems.length,
      orphanedCount: orphanedItems.length,
      deletedParentCount: deletedParentItems.length,
      ambiguousCount: ambiguousItems.length,
      skippedCount: validItems.length + ambiguousItems.length,
      orphaned: sanitize(orphanedItems),
      deletedParents: sanitize(deletedParentItems),
      ambiguous: sanitize(ambiguousItems),
    });
  } catch (err: unknown) {
    const error = err as { message?: string };
    console.error("[audit-orphans GET] Error:", err);
    return NextResponse.json(
      { error: error.message || "Audit failed.", code: "internal_error" },
      { status: 500 }
    );
  }
}

/**
 * POST: Controlled orphan cleanup (Admin only with explicit cleanup: true)
 */
export async function POST(req: Request) {
  try {
    const tokenResult = await verifyFirebaseTokenDetails(req);
    if (!tokenResult.user || !tokenResult.user.isAdmin) {
      return NextResponse.json(
        { error: "Administrator authorization required.", code: "forbidden" },
        { status: 403 }
      );
    }

    const firestore = getAdminFirestore();
    if (!firestore) {
      return NextResponse.json(
        { error: "Database connection unconfigured.", code: "unconfigured_server" },
        { status: 500 }
      );
    }

    let body: { cleanup?: boolean } = {};
    try {
      body = await req.json();
    } catch {}

    const audit = await performOrphanAudit(firestore);
    if (audit.error) {
      return NextResponse.json({ error: audit.error }, { status: 500 });
    }

    const validItems = audit.items.filter((i) => i.classification === "valid");
    const orphanedItems = audit.items.filter((i) => i.classification === "orphaned");
    const deletedParentItems = audit.items.filter((i) => i.classification === "deleted_parent");
    const ambiguousItems = audit.items.filter((i) => i.classification === "ambiguous");

    // Only confirmed orphaned and deleted_parent records are eligible for deletion.
    // Ambiguous and valid records are strictly preserved (skipped).
    const eligibleToDelete = [...orphanedItems, ...deletedParentItems];

    let deletedCount = 0;
    let failedCount = 0;

    if (body.cleanup === true && eligibleToDelete.length > 0) {
      for (let i = 0; i < eligibleToDelete.length; i += 400) {
        const chunk = eligibleToDelete.slice(i, i + 400);
        const batch = firestore.batch();
        chunk.forEach((item) => batch.delete(item.ref));

        try {
          await batch.commit();
          deletedCount += chunk.length;
        } catch (batchErr) {
          console.error("[audit-orphans POST] Batch commit failed:", batchErr);
          failedCount += chunk.length;
        }
      }
    }

    const sanitize = (list: typeof audit.items) =>
      list.map(({ ref, ...item }) => item);

    return NextResponse.json({
      success: failedCount === 0,
      cleanupExecuted: body.cleanup === true,
      totalScanned: audit.totalScanned,
      validCount: validItems.length,
      orphanedCount: orphanedItems.length,
      deletedParentCount: deletedParentItems.length,
      ambiguousCount: ambiguousItems.length,
      deletedCount,
      skippedCount: validItems.length + ambiguousItems.length,
      failedCount,
      ambiguous: sanitize(ambiguousItems),
    });
  } catch (err: unknown) {
    const error = err as { message?: string };
    console.error("[audit-orphans POST] Error:", err);
    return NextResponse.json(
      { error: error.message || "Cleanup failed.", code: "internal_error" },
      { status: 500 }
    );
  }
}
