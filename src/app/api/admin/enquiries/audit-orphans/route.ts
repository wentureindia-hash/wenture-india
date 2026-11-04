import { NextResponse } from "next/server";
import {
  verifyFirebaseTokenDetails,
  getAdminFirestore,
} from "@/lib/firebase/admin";
import {
  classifyEnquiryRecord,
  type AuditReportItem,
} from "@/lib/firebase/enquiry-orphan-utils";

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
