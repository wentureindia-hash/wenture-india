import { NextResponse } from "next/server";
import { verifyFirebaseRequest } from "@/lib/firebase/admin";
import { getServerListingDoc } from "@/lib/firebase/firestore-server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  STORAGE_BUCKETS,
  STORAGE_LIMITS,
  STORAGE_FOLDERS,
  ALLOWED_IMAGE_MIME_TYPES,
  ALLOWED_PITCH_DECK_MIME_TYPES,
  ALLOWED_VERIFICATION_MIME_TYPES,
} from "@/lib/supabase/constants";

const VALID_CATEGORIES = ["listing", "investor", "pitch-deck", "verification"] as const;
type StorageCategory = (typeof VALID_CATEGORIES)[number];

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9.-]/g, "_").slice(0, 100);
}

/**
 * Inspects buffer header bytes to ensure content truly matches declared type.
 * Prevents malicious executable or script disguises.
 */
function validateFileMagicBytes(
  buffer: Buffer,
  category: StorageCategory,
  fileName: string,
  declaredMime: string
): { isValid: boolean; error?: string } {
  if (buffer.length < 4) {
    return { isValid: false, error: "Uploaded file is corrupted or empty." };
  }

  // 1. PDF Magic: %PDF- (0x25 0x50 0x44 0x46 0x2D)
  const isPdfMagic =
    buffer.length >= 5 &&
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46 &&
    buffer[4] === 0x2d;

  // 2. JPEG Magic: FF D8 FF
  const isJpegMagic =
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff;

  // 3. PNG Magic: 89 50 4E 47 0D 0A 1A 0A
  const isPngMagic =
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a;

  // 4. WebP Magic: 'RIFF' ... 'WEBP'
  const isWebpMagic =
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP";

  // 5. SVG check - explicitly disabled unless dedicated sanitizer is present
  const isSvg =
    declaredMime === "image/svg+xml" || fileName.toLowerCase().endsWith(".svg");

  if (isSvg) {
    return {
      isValid: false,
      error: "SVG image uploads are disabled for security reasons. Please upload JPG, PNG, or WebP images.",
    };
  }

  if (category === "pitch-deck") {
    if (!isPdfMagic) {
      return {
        isValid: false,
        error: "File content validation failed. The pitch deck file is not a valid PDF document.",
      };
    }
    return { isValid: true };
  }

  if (category === "listing" || category === "investor") {
    if (!isJpegMagic && !isPngMagic && !isWebpMagic) {
      return {
        isValid: false,
        error: "File content validation failed. Image must be a valid JPEG, PNG, or WebP file.",
      };
    }
    return { isValid: true };
  }

  if (category === "verification") {
    if (!isPdfMagic && !isJpegMagic && !isPngMagic && !isWebpMagic) {
      return {
        isValid: false,
        error:
          "File content validation failed. Verification file must be a valid PDF, JPEG, PNG, or WebP document.",
      };
    }
    return { isValid: true };
  }

  return { isValid: true };
}

export async function POST(request: Request) {
  try {
    // 1. Authenticate caller via Firebase ID Token (enforce checkRevoked on storage mutations)
    const user = await verifyFirebaseRequest(request, true);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required to upload files." },
        { status: 401 }
      );
    }

    const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
    const idToken = authHeader?.replace("Bearer ", "").trim();
    const contentType = request.headers.get("content-type") || "";

    // 2. Handle Direct Signed Upload URL Generation
    if (contentType.includes("application/json")) {
      const body = await request.json();
      const { category, fileName, folderId } = body;

      if (!category || !fileName) {
        return NextResponse.json(
          { error: "Missing required parameters: category and fileName." },
          { status: 400 }
        );
      }

      if (!VALID_CATEGORIES.includes(category as StorageCategory)) {
        return NextResponse.json({ error: "Invalid upload category." }, { status: 400 });
      }

      const rawFolderId = folderId ? String(folderId).trim() : user.uid;
      if (!/^[a-zA-Z0-9_-]+$/.test(rawFolderId)) {
        return NextResponse.json(
          { error: "Invalid folder identifier. Path traversal sequences are not allowed." },
          { status: 400 }
        );
      }

      let targetFolderId = rawFolderId;

      // Ownership enforcement
      if (category === "investor" || category === "verification") {
        if (!user.isAdmin && targetFolderId !== user.uid) {
          return NextResponse.json(
            { error: "Forbidden: You are not authorized to upload documents for another user profile." },
            { status: 403 }
          );
        }
        targetFolderId = user.isAdmin ? targetFolderId : user.uid;
      } else if (category === "listing" || category === "pitch-deck") {
        if (!user.isAdmin && targetFolderId !== user.uid) {
          const listingInfo = await getServerListingDoc(targetFolderId, idToken);
          const docOwner = listingInfo.data?.ownerId || listingInfo.data?.userId;
          if (listingInfo.exists && docOwner && docOwner !== user.uid) {
            return NextResponse.json(
              { error: "Forbidden: You are not authorized to upload assets for this listing." },
              { status: 403 }
            );
          }
        }
      }

      const isPrivate = category === "pitch-deck" || category === "verification";
      const bucketName = isPrivate ? STORAGE_BUCKETS.PRIVATE : STORAGE_BUCKETS.PUBLIC;

      let subfolder: string = STORAGE_FOLDERS.LISTINGS;
      if (category === "pitch-deck") subfolder = STORAGE_FOLDERS.PITCH_DECKS;
      else if (category === "investor") subfolder = STORAGE_FOLDERS.INVESTOR_PROFILES;
      else if (category === "verification") subfolder = STORAGE_FOLDERS.VERIFICATIONS;

      const timestamp = Date.now();
      const safeName = sanitizeFileName(fileName);
      const storagePath = `${subfolder}/${targetFolderId}/${timestamp}_${safeName}`;

      const supabase = getSupabaseServerClient();
      const { data, error } = await supabase.storage
        .from(bucketName)
        .createSignedUploadUrl(storagePath);

      if (error || !data) {
        console.error("[upload API] Error creating signed upload URL:", error);
        return NextResponse.json(
          { error: error?.message || "Failed to create signed upload URL." },
          { status: 500 }
        );
      }

      return NextResponse.json({
        signedUploadUrl: data.signedUrl,
        token: data.token,
        storagePath,
        bucketName,
        isPrivate,
        error: null,
      });
    }

    // 3. Handle Multipart Form-Data Upload (Standard buffered upload)
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      const rawCategory = (formData.get("category") as string) || "listing";
      const rawFolderIdParam = (formData.get("folderId") as string) || user.uid;

      if (!file) {
        return NextResponse.json({ error: "No file provided in upload request." }, { status: 400 });
      }

      if (!VALID_CATEGORIES.includes(rawCategory as StorageCategory)) {
        return NextResponse.json({ error: "Invalid upload category." }, { status: 400 });
      }

      const category = rawCategory as StorageCategory;

      // Ownership and folderId sanitization
      const rawFolderId = rawFolderIdParam ? String(rawFolderIdParam).trim() : user.uid;
      if (!/^[a-zA-Z0-9_-]+$/.test(rawFolderId)) {
        return NextResponse.json(
          { error: "Invalid folder identifier. Path traversal sequences are not allowed." },
          { status: 400 }
        );
      }

      let targetFolderId = rawFolderId;

      if (category === "investor" || category === "verification") {
        if (!user.isAdmin && targetFolderId !== user.uid) {
          return NextResponse.json(
            { error: "Forbidden: You are not authorized to upload documents for another user profile." },
            { status: 403 }
          );
        }
        targetFolderId = user.isAdmin ? targetFolderId : user.uid;
      } else if (category === "listing" || category === "pitch-deck") {
        if (!user.isAdmin && targetFolderId !== user.uid) {
          const listingInfo = await getServerListingDoc(targetFolderId, idToken);
          const docOwner = listingInfo.data?.ownerId || listingInfo.data?.userId;
          if (listingInfo.exists && docOwner && docOwner !== user.uid) {
            return NextResponse.json(
              { error: "Forbidden: You are not authorized to upload assets for this listing." },
              { status: 403 }
            );
          }
        }
      }

      // 4. File Size & Declared MIME Validation
      if (category === "listing" || category === "investor") {
        if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type)) {
          return NextResponse.json(
            { error: "Invalid image format. Allowed formats: JPG, PNG, WebP." },
            { status: 400 }
          );
        }
        if (file.size > STORAGE_LIMITS.MAX_IMAGE_BYTES) {
          return NextResponse.json(
            { error: "Image file exceeds maximum limit of 5MB." },
            { status: 400 }
          );
        }
      } else if (category === "pitch-deck") {
        const isPdf =
          ALLOWED_PITCH_DECK_MIME_TYPES.includes(file.type) ||
          file.name.toLowerCase().endsWith(".pdf");

        if (!isPdf) {
          return NextResponse.json(
            { error: "Invalid document format. Pitch deck must be a PDF document." },
            { status: 400 }
          );
        }
        if (file.size > STORAGE_LIMITS.MAX_PITCH_DECK_BYTES) {
          return NextResponse.json(
            { error: "Pitch deck file exceeds maximum limit of 20MB." },
            { status: 400 }
          );
        }
      } else if (category === "verification") {
        const isAllowed =
          ALLOWED_VERIFICATION_MIME_TYPES.includes(file.type) ||
          file.name.toLowerCase().endsWith(".pdf") ||
          file.type.startsWith("image/");

        if (!isAllowed) {
          return NextResponse.json(
            { error: "Invalid verification file. Allowed: PDF, JPG, PNG, WebP." },
            { status: 400 }
          );
        }
        if (file.size > STORAGE_LIMITS.MAX_VERIFICATION_BYTES) {
          return NextResponse.json(
            { error: "Verification document exceeds maximum limit of 15MB." },
            { status: 400 }
          );
        }
      }

      // 5. Binary Content Magic Bytes Inspection (VULN-05)
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const magicCheck = validateFileMagicBytes(buffer, category, file.name, file.type);
      if (!magicCheck.isValid) {
        return NextResponse.json({ error: magicCheck.error }, { status: 400 });
      }

      // 6. Select Bucket and Construct Path
      const isPrivate = category === "pitch-deck" || category === "verification";
      const bucketName = isPrivate ? STORAGE_BUCKETS.PRIVATE : STORAGE_BUCKETS.PUBLIC;

      let subfolder: string = STORAGE_FOLDERS.LISTINGS;
      if (category === "pitch-deck") subfolder = STORAGE_FOLDERS.PITCH_DECKS;
      else if (category === "investor") subfolder = STORAGE_FOLDERS.INVESTOR_PROFILES;
      else if (category === "verification") subfolder = STORAGE_FOLDERS.VERIFICATIONS;

      const timestamp = Date.now();
      const safeName = sanitizeFileName(file.name);
      const storagePath = `${subfolder}/${targetFolderId}/${timestamp}_${safeName}`;

      // 7. Upload to Supabase Storage
      const supabase = getSupabaseServerClient();
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(storagePath, buffer, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });

      if (uploadError) {
        console.error("[upload API] Supabase upload failed:", uploadError);
        return NextResponse.json(
          { error: uploadError.message || "Failed to upload file to storage." },
          { status: 500 }
        );
      }

      // 8. Generate Return Payload
      let publicUrl: string | null = null;
      if (!isPrivate) {
        const { data: urlData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(storagePath);
        publicUrl = urlData.publicUrl;
      }

      return NextResponse.json({
        url: publicUrl,
        storagePath,
        fileName: file.name,
        bucketName,
        isPrivate,
        error: null,
      });
    }

    return NextResponse.json({ error: "Unsupported request content type." }, { status: 400 });
  } catch (err: unknown) {
    const error = err as { message?: string };
    console.error("[upload API] Unexpected error:", err);
    return NextResponse.json(
      { error: error.message || "Internal server error during file upload." },
      { status: 500 }
    );
  }
}
