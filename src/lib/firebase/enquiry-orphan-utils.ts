import type { firestore } from "firebase-admin";

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
export function resolveParentFromCaches(
  candidateId: string,
  listingsMap: Map<string, firestore.DocumentData>,
  oppsMap: Map<string, firestore.DocumentData>,
  blMap: Map<string, firestore.DocumentData>
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
  enqData: firestore.DocumentData,
  listingsMap: Map<string, firestore.DocumentData>,
  oppsMap: Map<string, firestore.DocumentData>,
  blMap: Map<string, firestore.DocumentData>
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

