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

    // 2. Parse request payload
    const body = await req.json().catch(() => ({}));
    const targetId: string | undefined = body.id || body.enquiryId;
    const rawType: string = (body.type || body.collection || "").toLowerCase();

    if (!targetId || typeof targetId !== "string" || !targetId.trim()) {
      return NextResponse.json(
        {
          error: "Enquiry ID is required for deletion.",
          code: "missing_id",
        },
        { status: 400 }
      );
    }

    // Target collection determination: either contact_inquiries or opportunity_enquiries
    const targetCollection =
      rawType === "contact" ||
      rawType === "contact_inquiries" ||
      rawType === "contact_submission"
        ? "contact_inquiries"
        : "opportunity_enquiries";

    const firestore = getAdminFirestore();
    if (!firestore) {
      const creds = resolveFirebaseCredentials();
      const missingList =
        creds.missingFields.length > 0
          ? creds.missingFields.join(", ")
          : "FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY";

      return NextResponse.json(
        {
          error: `Database connection unconfigured. Missing: ${missingList}`,
          code: "unconfigured_server",
        },
        { status: 500 }
      );
    }

    // 3. Perform document deletion
    const docRef = firestore.collection(targetCollection).doc(targetId.trim());
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({
        success: true,
        alreadyDeleted: true,
        message: "Enquiry does not exist or has already been removed.",
        deletedId: targetId.trim(),
        collection: targetCollection,
      });
    }

    await docRef.delete();

    // Revalidate admin cache
    revalidatePath("/admin/enquiries");

    return NextResponse.json({
      success: true,
      message: `Enquiry successfully deleted from ${targetCollection}.`,
      deletedId: targetId.trim(),
      collection: targetCollection,
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[api/admin/enquiries/delete] Exception:", error);
    return NextResponse.json(
      {
        error: error.message || "Internal server error deleting enquiry.",
        code: "internal_error",
      },
      { status: 500 }
    );
  }
}

