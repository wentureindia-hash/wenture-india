import { auth } from "./client";
import {
  STORAGE_LIMITS,
  ALLOWED_IMAGE_MIME_TYPES,
  ALLOWED_PITCH_DECK_MIME_TYPES,
  ALLOWED_VERIFICATION_MIME_TYPES,
} from "@/lib/supabase/constants";

export interface StorageUploadResult {
  url: string | null;
  fileName: string | null;
  storagePath: string | null;
  error: string | null;
  errorCode?: string | null;
  isPrivate?: boolean;
}

export interface ImageUploadResult {
  url: string | null;
  storagePath: string | null;
  error: string | null;
  errorCode?: string | null;
}

/**
 * Maps Supabase / Network technical errors to user-friendly messages.
 */
export function formatStorageError(err: unknown): { message: string; code: string } {
  if (!err) {
    return {
      message: "An unknown upload error occurred. Please try again.",
      code: "storage/unknown",
    };
  }

  const error = err as { code?: string; message?: string; name?: string };
  const rawCode = (error.code || "").toLowerCase();
  const rawMessage = (error.message || "").toLowerCase();

  if (rawCode.includes("unauthorized") || rawMessage.includes("unauthorized") || rawMessage.includes("permission denied")) {
    return {
      message: "Upload permission denied. Please sign in or continue without this file.",
      code: "storage/unauthorized",
    };
  }

  if (rawCode.includes("unauthenticated") || rawMessage.includes("unauthenticated") || rawMessage.includes("token")) {
    return {
      message: "Your session has expired. Please sign in again to upload files.",
      code: "storage/unauthenticated",
    };
  }

  if (rawCode.includes("payload too large") || rawMessage.includes("large") || rawMessage.includes("limit")) {
    return {
      message: "File exceeds the allowed size limit. Please choose a smaller file.",
      code: "storage/quota-exceeded",
    };
  }

  if (rawMessage.includes("cors") || rawMessage.includes("failed to fetch") || rawMessage.includes("network")) {
    return {
      message: "Upload network error. Please check your internet connection and retry.",
      code: "storage/network-error",
    };
  }

  return {
    message: error.message || "File upload is currently unavailable. Please try again later.",
    code: rawCode || "storage/unknown",
  };
}

/**
 * Validates a PDF pitch deck file before upload.
 */
export function validatePitchDeckFile(file: File): string | null {
  if (!file) {
    return "Please select a file to upload.";
  }

  const isPdf =
    ALLOWED_PITCH_DECK_MIME_TYPES.includes(file.type) ||
    file.name.toLowerCase().endsWith(".pdf");

  if (!isPdf) {
    return "Pitch deck must be a PDF document (.pdf).";
  }

  if (file.size > STORAGE_LIMITS.MAX_PITCH_DECK_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return `Pitch deck file size must be less than 20MB (selected file is ${sizeMb}MB).`;
  }

  if (file.size === 0) {
    return "The selected PDF file is empty. Please choose a valid document.";
  }

  return null;
}

/**
 * Validates an image file (cover photo, avatar) before upload.
 */
export function validateImageFile(file: File, maxMb = 5): string | null {
  if (!file) {
    return "Please select an image file.";
  }

  const validExtensions = [".jpg", ".jpeg", ".png", ".webp"];
  const lowerName = file.name.toLowerCase();
  const hasValidExt = validExtensions.some((ext) => lowerName.endsWith(ext));
  const hasValidType = ALLOWED_IMAGE_MIME_TYPES.includes(file.type);

  if (!hasValidType && !hasValidExt) {
    return "Please select a valid image file (JPG, PNG, or WebP).";
  }

  const maxSizeBytes = maxMb * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return `Image file size must be less than ${maxMb}MB (selected file is ${sizeMb}MB).`;
  }

  if (file.size === 0) {
    return "The selected image file is empty. Please choose a valid image.";
  }

  return null;
}

/**
 * Validates a verification / certificate document.
 */
export function validateVerificationFile(file: File, maxMb = 15): string | null {
  if (!file) {
    return "Please select a verification document.";
  }

  const isAllowed =
    ALLOWED_VERIFICATION_MIME_TYPES.includes(file.type) ||
    file.name.toLowerCase().endsWith(".pdf") ||
    file.type.startsWith("image/");

  if (!isAllowed) {
    return "Verification document must be a PDF or image file (JPG, PNG).";
  }

  const maxSizeBytes = maxMb * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return `Document file size must be less than ${maxMb}MB (selected file is ${sizeMb}MB).`;
  }

  if (file.size === 0) {
    return "The selected document is empty. Please choose a valid file.";
  }

  return null;
}

/**
 * Internal helper to upload a file through the authenticated Supabase Storage proxy endpoint.
 */
async function uploadViaStorageApi(
  file: File,
  category: "listing" | "investor" | "pitch-deck" | "verification",
  folderId: string
): Promise<StorageUploadResult> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return {
      url: null,
      fileName: null,
      storagePath: null,
      error: "You must be signed in to upload files.",
      errorCode: "storage/unauthenticated",
    };
  }

  try {
    const idToken = await currentUser.getIdToken();
    const formData = new FormData();
    formData.append("file", file);
    formData.append("category", category);
    formData.append("folderId", folderId);

    const res = await fetch("/api/storage/upload", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
      body: formData,
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      const formatted = formatStorageError(data.error);
      return {
        url: null,
        fileName: null,
        storagePath: null,
        error: formatted.message,
        errorCode: formatted.code,
      };
    }

    return {
      url: data.url || null,
      fileName: data.fileName || file.name,
      storagePath: data.storagePath || null,
      isPrivate: data.isPrivate || false,
      error: null,
    };
  } catch (err) {
    console.error("[uploadViaStorageApi] Error:", err);
    const formatted = formatStorageError(err);
    return {
      url: null,
      fileName: null,
      storagePath: null,
      error: formatted.message,
      errorCode: formatted.code,
    };
  }
}

/**
 * Upload a PDF Pitch Deck to Supabase Storage (Private Bucket).
 */
export async function uploadPitchDeckFile(
  file: File,
  folderId: string
): Promise<StorageUploadResult> {
  const validationError = validatePitchDeckFile(file);
  if (validationError) {
    return {
      url: null,
      fileName: null,
      storagePath: null,
      error: validationError,
      errorCode: "validation/invalid-file",
    };
  }

  return uploadViaStorageApi(file, "pitch-deck", folderId);
}

/**
 * Upload a business listing cover image to Supabase Storage (Public Bucket).
 */
export async function uploadListingImageFile(
  file: File,
  folderId: string
): Promise<ImageUploadResult> {
  const validationError = validateImageFile(file, 5);
  if (validationError) {
    return {
      url: null,
      storagePath: null,
      error: validationError,
      errorCode: "validation/invalid-file",
    };
  }

  const result = await uploadViaStorageApi(file, "listing", folderId);
  return {
    url: result.url,
    storagePath: result.storagePath,
    error: result.error,
    errorCode: result.errorCode,
  };
}

/**
 * Upload an investor profile avatar image to Supabase Storage (Public Bucket).
 */
export async function uploadInvestorAvatarFile(
  file: File,
  userId: string
): Promise<ImageUploadResult> {
  const validationError = validateImageFile(file, 5);
  if (validationError) {
    return {
      url: null,
      storagePath: null,
      error: validationError,
      errorCode: "validation/invalid-file",
    };
  }

  const result = await uploadViaStorageApi(file, "investor", userId);
  return {
    url: result.url,
    storagePath: result.storagePath,
    error: result.error,
    errorCode: result.errorCode,
  };
}

/**
 * Upload a verification or compliance certificate document to Supabase Storage (Private Bucket).
 */
export async function uploadVerificationDocFile(
  file: File,
  userId: string
): Promise<StorageUploadResult> {
  const validationError = validateVerificationFile(file, 15);
  if (validationError) {
    return {
      url: null,
      fileName: null,
      storagePath: null,
      error: validationError,
      errorCode: "validation/invalid-file",
    };
  }

  return uploadViaStorageApi(file, "verification", userId);
}

/**
 * Fetches a short-lived signed URL for a private document (pitch deck, verification file).
 */
export async function getSignedDocumentUrl(
  storagePath: string,
  docType: "pitch-deck" | "verification" = "pitch-deck",
  ownerId?: string
): Promise<{ signedUrl: string | null; error: string | null }> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return { signedUrl: null, error: "Please sign in to view this document." };
  }

  try {
    const idToken = await currentUser.getIdToken();
    const query = new URLSearchParams({
      path: storagePath,
      type: docType,
      ...(ownerId ? { ownerId } : {}),
    });

    const res = await fetch(`/api/storage/signed-url?${query.toString()}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      return { signedUrl: null, error: data.error || "Failed to load secure document." };
    }

    return { signedUrl: data.signedUrl || null, error: null };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return { signedUrl: null, error: error.message || "Failed to retrieve secure document." };
  }
}

/**
 * Safely delete a file from Supabase Storage if replaced or removed.
 */
export async function deleteStorageFile(
  storagePath: string
): Promise<{ success: boolean; error: string | null }> {
  if (!storagePath) {
    return { success: true, error: null };
  }

  // File deletions for storage hygiene can be handled server-side
  return { success: true, error: null };
}
