import { getFirebaseAdminApp, getAdminFirestore } from "./admin";

export interface ServerListingData {
  ownerId?: string;
  status?: string;
  [key: string]: unknown;
}

/**
 * Retrieves a listing document server-side.
 * Uses Firebase Admin Firestore if service credentials exist;
 * otherwise falls back to Firestore REST API with the user's ID token.
 */
export async function getServerListingDoc(
  listingId: string,
  idToken?: string
): Promise<{ exists: boolean; data?: ServerListingData }> {
  if (!listingId) {
    return { exists: false };
  }

  // 1. Try Firebase Admin SDK if service account credentials are provided
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  if (privateKey && clientEmail) {
    try {
      const db = getAdminFirestore();
      if (db) {
        const snap = await db.collection("listings").doc(listingId).get();
        if (snap.exists) {
          return { exists: true, data: snap.data() as ServerListingData };
        }
        return { exists: false };
      }
    } catch (adminErr) {
      console.warn("[getServerListingDoc] Admin SDK lookup note:", adminErr);
    }
  }

  // 2. Fallback to Firestore REST API
  const projectId =
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.FIREBASE_PROJECT_ID ||
    "wenture-india";
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/listings/${listingId}${
    apiKey ? `?key=${apiKey}` : ""
  }`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (idToken) {
    headers["Authorization"] = `Bearer ${idToken}`;
  }

  try {
    const res = await fetch(url, { headers });
    if (!res.ok) {
      return { exists: false };
    }

    const json = await res.json();
    if (!json.fields) {
      return { exists: false };
    }

    // Convert Firestore REST format fields to simple key-value object
    const data: ServerListingData = {};
    for (const [key, valObj] of Object.entries(json.fields as Record<string, Record<string, unknown>>)) {
      if ("stringValue" in valObj) data[key] = valObj.stringValue as string;
      else if ("booleanValue" in valObj) data[key] = valObj.booleanValue as boolean;
      else if ("integerValue" in valObj) data[key] = Number(valObj.integerValue);
      else if ("doubleValue" in valObj) data[key] = Number(valObj.doubleValue);
      else if ("nullValue" in valObj) data[key] = null;
    }

    return { exists: true, data };
  } catch (err) {
    console.warn("[getServerListingDoc] REST lookup note:", err);
    return { exists: false };
  }
}

