import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  verifyFirebaseTokenDetails,
  getAdminFirestore,
  resolveFirebaseCredentials,
} from "@/lib/firebase/admin";

export async function POST(req: Request) {
  try {
    // 1. Verify Authentication & Server-Side Admin Privileges
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

    if (!tokenResult.user.isAdmin) {
      return NextResponse.json(
        {
          error: "Administrator authorization required.",
          code: "forbidden",
        },
        { status: 403 }
      );
    }

    const firestore = getAdminFirestore();
    if (!firestore) {
      const creds = resolveFirebaseCredentials();
      const missingList =
        creds.missingFields.length > 0
          ? creds.missingFields.join(", ")
          : "FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY";

      return NextResponse.json(
        {
          error: `Database connection unconfigured. Firebase Admin credentials are not provisioned on the server (missing: ${missingList}). Please configure FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY (or FIREBASE_SERVICE_ACCOUNT_KEY) in .env.local for local development or Vercel environment variables for production.`,
          code: "unconfigured_server",
          missingFields: creds.missingFields,
        },
        { status: 500 }
      );
    }

    // 2. Query all existing documents strictly from opportunity_enquiries
    const enquiriesSnap = await firestore.collection("opportunity_enquiries").get();
    const totalIdentified = enquiriesSnap.size;

    if (totalIdentified === 0) {
      return NextResponse.json({
        success: true,
        totalIdentified: 0,
        totalDeleted: 0,
        failedCount: 0,
        message: "No opportunity enquiries found. Inbox is already clean.",
      });
    }

    // 3. Batch delete in chunks of no more than 400 operations per batch
    const docs = enquiriesSnap.docs;
    const batchSize = 400;
    let totalDeleted = 0;
    let failedCount = 0;
    const batchErrors: string[] = [];

    for (let i = 0; i < docs.length; i += batchSize) {
      const chunk = docs.slice(i, i + batchSize);
      const batch = firestore.batch();
      chunk.forEach((docSnap) => batch.delete(docSnap.ref));

      try {
        await batch.commit();
        totalDeleted += chunk.length;
      } catch (batchErr: unknown) {
        const error = batchErr as Error;
        console.error(`[clear-all enquiries] Batch commit failed at index ${i}:`, error);
        failedCount += chunk.length;
        batchErrors.push(error.message || "Batch write failure");
      }
    }

    // 4. Revalidate cache
    try {
      revalidatePath("/admin/enquiries");
      revalidatePath("/profile/listings");
      revalidatePath("/profile");
    } catch {}

    if (failedCount > 0) {
      return NextResponse.json(
        {
          success: false,
          totalIdentified,
          totalDeleted,
          failedCount,
          errors: batchErrors,
          error: `Cleanup incomplete: ${totalDeleted} of ${totalIdentified} deleted, ${failedCount} failed. Please retry.`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      totalIdentified,
      totalDeleted,
      failedCount: 0,
      message: `Successfully deleted all ${totalDeleted} opportunity enquiries.`,
    });
  } catch (err: unknown) {
    const error = err as { message?: string };
    console.error("[clear-all enquiries] Unhandled error:", err);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to clear opportunity enquiries.",
        code: "internal_error",
      },
      { status: 500 }
    );
  }
}

