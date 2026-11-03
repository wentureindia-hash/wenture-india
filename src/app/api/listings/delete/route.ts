import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import * as admin from "firebase-admin";
import {
  verifyFirebaseTokenDetails,
  getAdminFirestore,
} from "@/lib/firebase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { STORAGE_BUCKETS, STORAGE_FOLDERS } from "@/lib/supabase/constants";

/**
 * Safely removes all files within a specific folder prefix in a Supabase Storage bucket.
 */
async function cleanSupabaseStorageFolder(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  bucket: string,
  folderPath: string
): Promise<{ deletedCount: number; errors: string[] }> {
  let deletedCount = 0;
  const errors: string[] = [];

  try {
    const { data: items, error: listError } = await supabase.storage
      .from(bucket)
      .list(folderPath, { limit: 100, offset: 0 });

    if (listError) {
      if (!listError.message?.toLowerCase().includes("not found")) {
        errors.push(`[${bucket}/${folderPath}] List failed: ${listError.message}`);
      }
      return { deletedCount, errors };
    }

    if (!items || items.length === 0) {
      return { deletedCount, errors };
    }

    const filesToDelete: string[] = [];
    const subfolders: string[] = [];

    for (const item of items) {
      if (item.name === ".emptyFolderPlaceholder") {
        filesToDelete.push(`${folderPath}/${item.name}`);
        continue;
      }
      if (item.id === null || !item.metadata) {
        subfolders.push(`${folderPath}/${item.name}`);
      } else {
        filesToDelete.push(`${folderPath}/${item.name}`);
      }
    }

    for (const sub of subfolders) {
      const subResult = await cleanSupabaseStorageFolder(supabase, bucket, sub);
      deletedCount += subResult.deletedCount;
      errors.push(...subResult.errors);
    }

    if (filesToDelete.length > 0) {
      const { error: removeError } = await supabase.storage
        .from(bucket)
        .remove(filesToDelete);

      if (removeError) {
        errors.push(`[${bucket}/${folderPath}] Remove failed: ${removeError.message}`);
      } else {
        deletedCount += filesToDelete.length;
      }
    }
  } catch (err: unknown) {
    const error = err as { message?: string };
    errors.push(`[${bucket}/${folderPath}] Exception: ${error.message || "Unknown error"}`);
  }

  return { deletedCount, errors };
}

/**
 * Extract storage file path from full public or signed Supabase URLs
 */
function extractStoragePathFromUrl(urlStr: string, bucket: string): string | null {
  if (!urlStr || typeof urlStr !== "string") return null;
  try {
    const pattern = new RegExp(`/${bucket}/(.+)$`);
    const match = urlStr.match(pattern);
    if (match && match[1]) {
      return decodeURIComponent(match[1].split("?")[0]);
    }
  } catch {}
  return null;
}

export async function POST(req: Request) {
  try {
    // 1. Verify Authentication
    const tokenResult = await verifyFirebaseTokenDetails(req);
    if (!tokenResult.user) {
      return NextResponse.json(
        {
          error: tokenResult.errorMessage || "Authentication required.",
          code: tokenResult.error || "unauthorized",
        },
        { status: 401 }
      );
    }

    const requestingUser = tokenResult.user;

    // 2. Validate Request Body
    let body: { listingId?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body.", code: "bad_request" },
        { status: 400 }
      );
    }

    const listingId = body.listingId?.trim();
    if (!listingId) {
      return NextResponse.json(
        { error: "Opportunity/listing ID is required.", code: "missing_listing_id" },
        { status: 400 }
      );
    }

    const firestore = getAdminFirestore();
    if (!firestore) {
      return NextResponse.json(
        {
          error: "Server database connection is currently unavailable.",
          code: "unconfigured_server",
        },
        { status: 500 }
      );
    }

    // 3. Retrieve Listing & Verify Ownership / Admin Privileges
    const listingRef = firestore.collection("listings").doc(listingId);
    let listingSnap = await listingRef.get();
    let legacyCollection: string | null = null;

    if (!listingSnap.exists) {
      const oppRef = firestore.collection("opportunities").doc(listingId);
      const oppSnap = await oppRef.get();
      if (oppSnap.exists) {
        listingSnap = oppSnap;
        legacyCollection = "opportunities";
      } else {
        const blRef = firestore.collection("business_listings").doc(listingId);
        const blSnap = await blRef.get();
        if (blSnap.exists) {
          listingSnap = blSnap;
          legacyCollection = "business_listings";
        }
      }
    }

    if (!listingSnap.exists) {
      // If neither exists, check if caller is admin wishing to purge any lingering enquiries
      if (!requestingUser.isAdmin) {
        return NextResponse.json(
          { error: "Opportunity listing not found.", code: "not_found" },
          { status: 404 }
        );
      }
    }

    const listingData = listingSnap.exists ? listingSnap.data() || {} : {};
    const isOwner =
      listingData.ownerId === requestingUser.uid ||
      listingData.userId === requestingUser.uid;
    const isAdmin = requestingUser.isAdmin;

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        {
          error: "You do not have permission to delete this opportunity.",
          code: "forbidden",
        },
        { status: 403 }
      );
    }

    // =========================================================================
    // STEP 1: IDENTIFY ALL ASSOCIATED ENQUIRIES FOR THIS SPECIFIC OPPORTUNITY
    // =========================================================================
    // Matches opportunityId, listingId, and opportunity_id strictly equal to listingId.
    // Does NOT delete enquiries belonging to any other opportunity owned by this user.
    const enquiriesMap = new Map<string, admin.firestore.DocumentSnapshot>();

    try {
      const q1 = await firestore
        .collection("opportunity_enquiries")
        .where("opportunityId", "==", listingId)
        .get();
      q1.forEach((d) => enquiriesMap.set(d.id, d));
    } catch (e) {
      console.warn("[listings/delete] Query opportunityId error:", e);
    }

    try {
      const q2 = await firestore
        .collection("opportunity_enquiries")
        .where("listingId", "==", listingId)
        .get();
      q2.forEach((d) => enquiriesMap.set(d.id, d));
    } catch (e) {
      console.warn("[listings/delete] Query listingId error:", e);
    }

    try {
      const q3 = await firestore
        .collection("opportunity_enquiries")
        .where("opportunity_id", "==", listingId)
        .get();
      q3.forEach((d) => enquiriesMap.set(d.id, d));
    } catch (e) {
      console.warn("[listings/delete] Query opportunity_id error:", e);
    }

    // =========================================================================
    // STEP 2: BATCH DELETE ASSOCIATED ENQUIRIES (RETRY-SAFE & BATCH-LIMIT SAFE)
    // =========================================================================
    // If any enquiry deletion fails, we ABORT the deletion and DO NOT remove the listing.
    const enquiriesToDelete = Array.from(enquiriesMap.values());
    let deletedEnquiriesCount = 0;

    for (let i = 0; i < enquiriesToDelete.length; i += 400) {
      const chunk = enquiriesToDelete.slice(i, i + 400);
      const batch = firestore.batch();
      chunk.forEach((docSnap) => batch.delete(docSnap.ref));

      try {
        await batch.commit();
        deletedEnquiriesCount += chunk.length;
      } catch (batchErr: unknown) {
        const error = batchErr as { message?: string };
        console.error("[listings/delete] Failed to commit enquiry batch deletion:", error);
        return NextResponse.json(
          {
            success: false,
            error: `Failed to delete associated enquiries (${error.message || "database error"}). Deletion aborted to prevent orphaned records. Please retry.`,
            code: "enquiry_cleanup_failed",
            deletedEnquiriesCount,
          },
          { status: 500 }
        );
      }
    }

    // =========================================================================
    // STEP 3: DELETE RESTRICTED SUBCOLLECTION DOCUMENTS
    // =========================================================================
    try {
      const restrictedSnap = await listingRef.collection("restricted").get();
      if (!restrictedSnap.empty) {
        const subBatch = firestore.batch();
        restrictedSnap.forEach((docSnap) => subBatch.delete(docSnap.ref));
        await subBatch.commit();
      }
    } catch (subErr) {
      console.warn("[listings/delete] Restricted subcollection cleanup warning:", subErr);
    }

    // =========================================================================
    // STEP 4: DELETE STORAGE ASSETS (PITCH DECKS & IMAGES)
    // =========================================================================
    const storageErrors: string[] = [];
    try {
      const supabase = getSupabaseServerClient();
      const resPublic = await cleanSupabaseStorageFolder(
        supabase,
        STORAGE_BUCKETS.PUBLIC,
        `${STORAGE_FOLDERS.LISTINGS}/${listingId}`
      );
      if (resPublic.errors.length > 0) storageErrors.push(...resPublic.errors);

      const resPrivate = await cleanSupabaseStorageFolder(
        supabase,
        STORAGE_BUCKETS.PRIVATE,
        `${STORAGE_FOLDERS.PITCH_DECKS}/${listingId}`
      );
      if (resPrivate.errors.length > 0) storageErrors.push(...resPrivate.errors);

      const rawPaths: { bucket: string; path: string }[] = [];
      if (Array.isArray(listingData.images)) {
        for (const img of listingData.images) {
          const p = extractStoragePathFromUrl(img, STORAGE_BUCKETS.PUBLIC);
          if (p) rawPaths.push({ bucket: STORAGE_BUCKETS.PUBLIC, path: p });
        }
      }
      if (listingData.pitchDeckStoragePath) {
        rawPaths.push({
          bucket: STORAGE_BUCKETS.PRIVATE,
          path: listingData.pitchDeckStoragePath as string,
        });
      } else if (listingData.pitchDeckUrl) {
        const p = extractStoragePathFromUrl(
          listingData.pitchDeckUrl as string,
          STORAGE_BUCKETS.PRIVATE
        );
        if (p) rawPaths.push({ bucket: STORAGE_BUCKETS.PRIVATE, path: p });
      }

      for (const item of rawPaths) {
        try {
          const { error: removeErr } = await supabase.storage.from(item.bucket).remove([item.path]);
          if (removeErr) storageErrors.push(`[${item.bucket}/${item.path}] Remove error: ${removeErr.message}`);
        } catch (rawErr: unknown) {
          storageErrors.push(`[${item.bucket}/${item.path}] Remove error: ${(rawErr as Error).message}`);
        }
      }
    } catch (storageErr: unknown) {
      storageErrors.push(`Storage client exception: ${(storageErr as Error).message}`);
    }

    if (storageErrors.length > 0) {
      console.error("[listings/delete] Storage cleanup failed:", storageErrors);
      return NextResponse.json(
        {
          success: false,
          error: `Storage cleanup failed: ${storageErrors.join("; ")}. Deletion aborted to prevent inconsistent asset state. Please retry.`,
          code: "storage_cleanup_failed",
          deletedEnquiriesCount,
        },
        { status: 500 }
      );
    }

    // =========================================================================
    // STEP 5: PERMANENTLY DELETE THE LISTING DOCUMENT
    // =========================================================================
    if (listingSnap.exists) {
      await listingRef.delete();
      if (legacyCollection) {
        try {
          await firestore.collection(legacyCollection).doc(listingId).delete();
        } catch {}
      }
    }

    // Also check and delete legacy opportunities/business_listings doc if exists
    try {
      await firestore.collection("opportunities").doc(listingId).delete();
    } catch {}
    try {
      await firestore.collection("business_listings").doc(listingId).delete();
    } catch {}

    // =========================================================================
    // STEP 6: REVALIDATE NEXT.JS PATHS
    // =========================================================================
    try {
      revalidatePath("/opportunities");
      revalidatePath("/for-investors");
      revalidatePath("/admin/listings");
      revalidatePath("/admin/enquiries");
      revalidatePath("/profile/listings");
      revalidatePath("/profile");
    } catch {}

    return NextResponse.json({
      success: true,
      deletedListingId: listingId,
      deletedEnquiriesCount,
      error: null,
    });
  } catch (err: unknown) {
    const error = err as { message?: string };
    console.error("[listings/delete] Unhandled error:", err);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to permanently delete opportunity listing.",
        code: "internal_error",
      },
      { status: 500 }
    );
  }
}

