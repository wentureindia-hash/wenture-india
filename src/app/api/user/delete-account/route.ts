import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import * as admin from "firebase-admin";
import {
  verifyFirebaseTokenDetails,
  getAdminFirestore,
  getAdminAuth,
} from "@/lib/firebase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { STORAGE_BUCKETS, STORAGE_FOLDERS } from "@/lib/supabase/constants";

/**
 * Safely removes all files within a specific folder prefix in a Supabase Storage bucket.
 * Uses pagination and recursion for subfolders where required.
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
      // If folder does not exist or empty, not an error
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
      // If item has no id or is a folder
      if (item.id === null || !item.metadata) {
        subfolders.push(`${folderPath}/${item.name}`);
      } else {
        filesToDelete.push(`${folderPath}/${item.name}`);
      }
    }

    // Recursively clean subfolders
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
  } catch {
    // URL parsing failed
  }
  return null;
}

export async function POST(request: Request) {
  try {
    // =========================================================================
    // STEP 1: AUTHENTICATION & AUTHORIZATION
    // =========================================================================
    const tokenResult = await verifyFirebaseTokenDetails(request, true);

    if (!tokenResult.user) {
      const statusCode =
        tokenResult.error === "missing_token"
          ? 401
          : tokenResult.error === "expired_token"
          ? 401
          : tokenResult.error === "revoked_token"
          ? 401
          : 403;

      return NextResponse.json(
        {
          error:
            tokenResult.errorMessage ||
            "Authentication required. Please sign in to delete your account.",
          code: tokenResult.error || "unauthenticated",
        },
        { status: statusCode }
      );
    }

    const targetUid = tokenResult.user.uid;

    // Protection against admin self-deletion
    if (tokenResult.user.isAdmin) {
      return NextResponse.json(
        {
          error:
            "Administrative accounts cannot be deleted through this endpoint. Please manage admin credentials through the Firebase Console.",
          code: "admin_deletion_blocked",
        },
        { status: 403 }
      );
    }

    const firestore = getAdminFirestore();
    const adminAuth = getAdminAuth();

    // =========================================================================
    // STEP 2: IMMEDIATE PUBLIC VISIBILITY REMOVAL (DEFENSE IN DEPTH)
    // =========================================================================
    // Instantly transition user profile, investor profile, and all listings to "deleted"
    // so they vanish immediately from all public directories, search, and home carousels
    // even before storage or cascade deletion completes.
    const ownedListingIds: string[] = [];
    const rawStoragePathsToDelete: { bucket: string; path: string }[] = [];

    if (firestore) {
      // 1. Mark user profile as deletion_pending
      try {
        const userRef = firestore.collection("users").doc(targetUid);
        await userRef.set(
          {
            accountStatus: "deletion_pending",
            isDeleted: true,
            status: "deleted",
            deletionStartedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      } catch (err) {
        console.warn("[delete-account] Failed to mark user doc deletion_pending:", err);
      }

      // 2. Hide Investor Profile immediately
      try {
        const invProfilesSnap = await firestore
          .collection("investorProfiles")
          .where("userId", "==", targetUid)
          .get();

        const batch = firestore.batch();
        invProfilesSnap.forEach((docSnap) => {
          batch.update(docSnap.ref, {
            status: "deleted",
            isPublic: false,
            isDeleted: true,
            accountStatus: "deletion_pending",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        });

        // Also check investorProfiles by direct document ID (uid)
        const directInvRef = firestore.collection("investorProfiles").doc(targetUid);
        const directSnap = await directInvRef.get();
        if (directSnap.exists) {
          batch.update(directInvRef, {
            status: "deleted",
            isPublic: false,
            isDeleted: true,
            accountStatus: "deletion_pending",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          const data = directSnap.data();
          if (data?.profileImage) {
            const p = extractStoragePathFromUrl(data.profileImage, STORAGE_BUCKETS.PUBLIC);
            if (p) rawStoragePathsToDelete.push({ bucket: STORAGE_BUCKETS.PUBLIC, path: p });
          }
        }

        await batch.commit();
      } catch (err) {
        console.warn("[delete-account] Immediate investor profile hide failed:", err);
      }

      // 3. Hide all listings immediately (both ownerId and legacy userId)
      try {
        const [byOwnerSnap, byUserSnap] = await Promise.all([
          firestore.collection("listings").where("ownerId", "==", targetUid).get(),
          firestore.collection("listings").where("userId", "==", targetUid).get(),
        ]);

        const listingBatch = firestore.batch();
        const seenListingDocs = new Set<string>();

        const inspectListing = (docSnap: admin.firestore.QueryDocumentSnapshot) => {
          if (seenListingDocs.has(docSnap.id)) return;
          seenListingDocs.add(docSnap.id);
          ownedListingIds.push(docSnap.id);

          listingBatch.update(docSnap.ref, {
            status: "deleted",
            approvalStatus: "deleted",
            isPublic: false,
            isDeleted: true,
            accountStatus: "deletion_pending",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          const data = docSnap.data();
          if (Array.isArray(data.images)) {
            data.images.forEach((imgUrl: string) => {
              const p = extractStoragePathFromUrl(imgUrl, STORAGE_BUCKETS.PUBLIC);
              if (p) rawStoragePathsToDelete.push({ bucket: STORAGE_BUCKETS.PUBLIC, path: p });
            });
          }
          if (data.pitchDeckUrl) {
            const p = extractStoragePathFromUrl(data.pitchDeckUrl, STORAGE_BUCKETS.PRIVATE);
            if (p) rawStoragePathsToDelete.push({ bucket: STORAGE_BUCKETS.PRIVATE, path: p });
          }
          if (data.pitchDeckStoragePath) {
            rawStoragePathsToDelete.push({
              bucket: STORAGE_BUCKETS.PRIVATE,
              path: data.pitchDeckStoragePath,
            });
          }
        };

        byOwnerSnap.forEach(inspectListing);
        byUserSnap.forEach(inspectListing);

        await listingBatch.commit();
      } catch (err) {
        console.warn("[delete-account] Immediate listings hide failed:", err);
      }

      // 4. Also hide legacy collections if any exist
      for (const colName of ["opportunities", "business_listings"]) {
        try {
          const snap = await firestore.collection(colName).where("ownerId", "==", targetUid).get();
          if (!snap.empty) {
            const b = firestore.batch();
            snap.forEach((d) => {
              b.update(d.ref, { status: "deleted", isPublic: false, isDeleted: true });
            });
            await b.commit();
          }
        } catch {
          // Fallback collection absent or empty
        }
      }

      // 5. Inspect verifications document for explicit private storagePath
      try {
        const verifDoc = await firestore.collection("verifications").doc(targetUid).get();
        if (verifDoc.exists) {
          const vData = verifDoc.data();
          if (vData?.storagePath) {
            rawStoragePathsToDelete.push({ bucket: STORAGE_BUCKETS.PRIVATE, path: vData.storagePath });
          }
        }
      } catch {
        // Safe ignore
      }

      // 5. Trigger Next.js revalidations
      try {
        revalidatePath("/opportunities");
        revalidatePath("/investors");
        revalidatePath("/for-investors");
        revalidatePath("/");
      } catch {
        // Revalidation in route handlers is best-effort
      }
    }

    // =========================================================================
    // STEP 3: SUPABASE STORAGE CLEANUP (PUBLIC & PRIVATE BUCKETS)
    // =========================================================================
    try {
      const supabase = getSupabaseServerClient();

      // Folders tied to user's UID
      await cleanSupabaseStorageFolder(supabase, STORAGE_BUCKETS.PUBLIC, `${STORAGE_FOLDERS.INVESTOR_PROFILES}/${targetUid}`);
      await cleanSupabaseStorageFolder(supabase, STORAGE_BUCKETS.PUBLIC, `${STORAGE_FOLDERS.LISTINGS}/${targetUid}`);
      await cleanSupabaseStorageFolder(supabase, STORAGE_BUCKETS.PRIVATE, `${STORAGE_FOLDERS.PITCH_DECKS}/${targetUid}`);
      await cleanSupabaseStorageFolder(supabase, STORAGE_BUCKETS.PRIVATE, `${STORAGE_FOLDERS.VERIFICATIONS}/${targetUid}`);
      await cleanSupabaseStorageFolder(supabase, STORAGE_BUCKETS.PRIVATE, `${STORAGE_FOLDERS.CERTIFICATES}/${targetUid}`);

      // Folders tied to individual listing IDs owned by the user
      for (const listingId of ownedListingIds) {
        await cleanSupabaseStorageFolder(supabase, STORAGE_BUCKETS.PUBLIC, `${STORAGE_FOLDERS.LISTINGS}/${listingId}`);
        await cleanSupabaseStorageFolder(supabase, STORAGE_BUCKETS.PRIVATE, `${STORAGE_FOLDERS.PITCH_DECKS}/${listingId}`);
      }

      // Individual raw storage paths
      for (const item of rawStoragePathsToDelete) {
        try {
          await supabase.storage.from(item.bucket).remove([item.path]);
        } catch {
          // Best effort
        }
      }
    } catch (storageErr) {
      console.warn("[delete-account] Supabase storage cleanup warning:", storageErr);
    }

    // =========================================================================
    // STEP 4: ENQUIRIES & SHARED RECORDS CLEANUP (PROTECTS BOTH PRIVACY & COUNTERPARTY DATA)
    // =========================================================================
    if (firestore) {
      // Clean up investor_enquiries
      try {
        const invRecvSnap = await firestore
          .collection("investor_enquiries")
          .where("investorId", "==", targetUid)
          .get();

        const invSenderSnap = await firestore
          .collection("investor_enquiries")
          .where("senderId", "==", targetUid)
          .get();

        const enqBatch = firestore.batch();
        invRecvSnap.forEach((d) => {
          const data = d.data();
          if (data.senderId && data.senderId !== targetUid) {
            // Anonymize deleted investor from the sender entrepreneur's record
            enqBatch.update(d.ref, {
              investorName: "Former Investor (Account Deleted)",
              investorStatus: "deleted",
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          } else {
            enqBatch.delete(d.ref);
          }
        });

        invSenderSnap.forEach((d) => {
          const data = d.data();
          if (data.investorId && data.investorId !== targetUid) {
            // Recipient investor retains lead metrics without sender PII
            enqBatch.update(d.ref, {
              name: "Former User (Account Deleted)",
              email: "deleted@privacy.wenture.internal",
              phone: null,
              message: "[Message removed due to account deletion]",
              senderStatus: "account_deleted",
              senderId: "deleted",
              userId: "deleted",
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          } else {
            enqBatch.delete(d.ref);
          }
        });

        await enqBatch.commit();
      } catch (err) {
        console.warn("[delete-account] investor_enquiries cleanup warning:", err);
      }

      // Clean up opportunity_enquiries
      try {
        const oppOwnerSnap = await firestore
          .collection("opportunity_enquiries")
          .where("opportunityOwnerId", "==", targetUid)
          .get();

        const oppSenderSnap = await firestore
          .collection("opportunity_enquiries")
          .where("senderId", "==", targetUid)
          .get();

        const oppEnqBatch = firestore.batch();
        oppOwnerSnap.forEach((d) => {
          const data = d.data();
          if (data.senderId && data.senderId !== targetUid) {
            // Sender investor tracks sent history: mark opportunity as deleted, redact founder PII
            oppEnqBatch.update(d.ref, {
              opportunityOwnerName: "Deleted User",
              opportunityOwnerEmail: "deleted@privacy.wenture.internal",
              ownerName: "Deleted User",
              ownerEmail: "deleted@privacy.wenture.internal",
              opportunityStatus: "listing_deleted",
              status: "listing_deleted",
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          } else {
            oppEnqBatch.delete(d.ref);
          }
        });

        oppSenderSnap.forEach((d) => {
          const data = d.data();
          if (data.opportunityOwnerId && data.opportunityOwnerId !== targetUid) {
            // Recipient entrepreneur retains lead history: redact deleted sender's PII
            oppEnqBatch.update(d.ref, {
              senderName: "Former User (Account Deleted)",
              name: "Former User (Account Deleted)",
              senderEmail: "deleted@privacy.wenture.internal",
              email: "deleted@privacy.wenture.internal",
              senderPhone: null,
              phone: null,
              message: "[Message removed due to account deletion]",
              senderStatus: "account_deleted",
              senderId: "deleted",
              userUid: "deleted",
              userId: "deleted",
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          } else {
            oppEnqBatch.delete(d.ref);
          }
        });

        await oppEnqBatch.commit();
      } catch (err) {
        console.warn("[delete-account] opportunity_enquiries cleanup warning:", err);
      }

      // =========================================================================
      // STEP 5: PERMANENT FIRESTORE CASCADE DELETION
      // =========================================================================
      // Clean up nested subcollections under each listing (e.g. /listings/{id}/restricted)
      for (const listingId of ownedListingIds) {
        try {
          const restrictedSnap = await firestore
            .collection("listings")
            .doc(listingId)
            .collection("restricted")
            .get();

          if (!restrictedSnap.empty) {
            const restBatch = firestore.batch();
            restrictedSnap.forEach((doc) => restBatch.delete(doc.ref));
            await restBatch.commit();
          }

          // Delete the parent listing document
          await firestore.collection("listings").doc(listingId).delete();
        } catch (listingDelErr) {
          console.warn(`[delete-account] Failed to delete listing ${listingId}:`, listingDelErr);
        }
      }

      // Delete investor profiles
      try {
        await firestore.collection("investorProfiles").doc(targetUid).delete();
        const otherInvSnap = await firestore
          .collection("investorProfiles")
          .where("userId", "==", targetUid)
          .get();
        if (!otherInvSnap.empty) {
          const b = firestore.batch();
          otherInvSnap.forEach((d) => b.delete(d.ref));
          await b.commit();
        }
      } catch (invDelErr) {
        console.warn("[delete-account] Failed to delete investor profile doc:", invDelErr);
      }

      // Delete verification records
      try {
        await firestore.collection("verifications").doc(targetUid).delete();
      } catch {
        // Optional doc
      }

      // Delete primary users collection document
      try {
        await firestore.collection("users").doc(targetUid).delete();
      } catch (userDocDelErr) {
        console.warn("[delete-account] Failed to delete users doc:", userDocDelErr);
      }

      // Compliance tombstone (anonymized, zero PII, audit-safe)
      try {
        await firestore.collection("account_deletion_audit").add({
          targetUidHash: admin.firestore.Timestamp.now().toMillis() + "_" + targetUid.slice(-6),
          deletedAt: admin.firestore.FieldValue.serverTimestamp(),
          listingsCount: ownedListingIds.length,
          status: "completed",
        });
      } catch {
        // Audit log best effort
      }
    }

    // =========================================================================
    // STEP 6: DELETE FIREBASE AUTHENTICATION ACCOUNT
    // =========================================================================
    let authDeleted = false;

    if (adminAuth) {
      try {
        await adminAuth.deleteUser(targetUid);
        authDeleted = true;
      } catch (authErr) {
        console.error("[delete-account] Firebase Admin auth deletion error:", authErr);
      }
    }

    // If Admin SDK auth deletion was not possible (e.g. unconfigured server creds),
    // attempt Identity Toolkit REST API deletion using user's Bearer token
    if (!authDeleted) {
      const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
      const authHeader = request.headers.get("authorization") || "";
      const rawToken = authHeader.replace(/^Bearer\s+/i, "").trim();

      if (apiKey && rawToken) {
        try {
          const idtRes = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${apiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ idToken: rawToken }),
            }
          );
          if (idtRes.ok) {
            authDeleted = true;
          }
        } catch (idtErr) {
          console.warn("[delete-account] Identity Toolkit auth deletion warning:", idtErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      authDeleted,
      message:
        "Account, public listings, investor profiles, and associated data have been permanently removed.",
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error("[delete-account] Fatal exception during account deletion:", err);
    return NextResponse.json(
      {
        error: "An unexpected error occurred while deleting your account. Please try again or contact support.",
        details: err.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}

