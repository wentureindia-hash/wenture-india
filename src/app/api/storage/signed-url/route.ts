import { NextResponse } from "next/server";
import { verifyFirebaseRequest } from "@/lib/firebase/admin";
import { getServerListingDoc } from "@/lib/firebase/firestore-server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { STORAGE_BUCKETS, STORAGE_LIMITS } from "@/lib/supabase/constants";

export async function GET(request: Request) {
  try {
    // 1. Authenticate caller via Firebase ID Token (enforce checkRevoked on private document access)
    const user = await verifyFirebaseRequest(request, true);
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to access confidential documents." },
        { status: 401 }
      );
    }

    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
    const idToken = authHeader?.replace("Bearer ", "").trim();

    const { searchParams } = new URL(request.url);
    const rawPath = searchParams.get("path");

    if (!rawPath) {
      return NextResponse.json(
        { error: "Missing required query parameter: path" },
        { status: 400 }
      );
    }

    // 2. Validate and sanitize storage path (Prevent Path Traversal & Enforce Whitelist)
    const normalizedPath = rawPath.trim().replace(/\\/g, "/");
    if (
      normalizedPath.includes("..") ||
      normalizedPath.startsWith("/") ||
      normalizedPath.includes("//")
    ) {
      return NextResponse.json(
        { error: "Invalid document path. Path traversal sequences are strictly prohibited." },
        { status: 400 }
      );
    }

    const pathSegments = normalizedPath.split("/");
    const rootCategory = pathSegments[0];

    // Allowed private storage root categories
    if (rootCategory !== "pitch-decks" && rootCategory !== "verifications") {
      return NextResponse.json(
        {
          error:
            "Invalid document path. Access to private storage is strictly restricted to pitch decks and verification files.",
        },
        { status: 400 }
      );
    }

    if (pathSegments.length < 3) {
      return NextResponse.json(
        { error: "Invalid document path format. Expected category/targetId/filename." },
        { status: 400 }
      );
    }

    const targetId = pathSegments[1];

    // 3. Authorization Enforcement
    if (rootCategory === "verifications") {
      // Verification documents: strictly readable by document owner or platform administrators
      const isOwner = targetId === user.uid;
      if (!user.isAdmin && !isOwner) {
        return NextResponse.json(
          { error: "Access denied. You are not authorized to view this verification document." },
          { status: 403 }
        );
      }
    } else if (rootCategory === "pitch-decks") {
      // Pitch decks:
      // - Admins can view any pitch deck
      // - Owner can always view their own pitch deck (draft or published)
      // - Other authenticated users can ONLY view pitch decks if the listing is published
      if (!user.isAdmin) {
        const isOwnerByDraftId = targetId === user.uid;

        if (!isOwnerByDraftId) {
          const listingInfo = await getServerListingDoc(targetId, idToken);

          if (listingInfo.exists && listingInfo.data) {
            const isOwner = listingInfo.data.ownerId === user.uid;
            const isPublished = listingInfo.data.status === "published";

            if (!isOwner && !isPublished) {
              return NextResponse.json(
                {
                  error:
                    "Access denied. This pitch deck belongs to an unpublished or pending listing.",
                },
                { status: 403 }
              );
            }
          } else {
            return NextResponse.json(
              {
                error:
                  "Access denied. The associated listing could not be found or you do not have permission to view it.",
              },
              { status: 403 }
            );
          }
        }
      }
    }

    // 4. Generate short-lived signed URL via Supabase Storage
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKETS.PRIVATE)
      .createSignedUrl(normalizedPath, STORAGE_LIMITS.SIGNED_URL_EXPIRY_SECONDS);

    if (error || !data?.signedUrl) {
      console.error("[signed-url API] Supabase signing error:", error);
      return NextResponse.json(
        { error: error?.message || "Failed to generate secure document link." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      signedUrl: data.signedUrl,
      expiresIn: STORAGE_LIMITS.SIGNED_URL_EXPIRY_SECONDS,
      error: null,
    });
  } catch (err: unknown) {
    const error = err as { message?: string };
    console.error("[signed-url API] Unexpected error:", err);
    return NextResponse.json(
      { error: error.message || "Internal server error generating signed document URL." },
      { status: 500 }
    );
  }
}
