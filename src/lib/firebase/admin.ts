import * as admin from "firebase-admin";

export interface VerifiedUser {
  uid: string;
  email?: string;
  isAdmin: boolean;
}

export interface FirebaseAdminCredentials {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

export type TokenVerificationError =
  | "missing_token"
  | "invalid_token"
  | "expired_token"
  | "revoked_token"
  | "unconfigured_server"
  | "verification_failed";

export interface TokenVerificationResult {
  user: VerifiedUser | null;
  error?: TokenVerificationError;
  errorMessage?: string;
}

const ADMIN_EMAILS = [
  "wentureindia@gmail.com",
  "info@wentureindia.com",
  "payalnkapse1720@gmail.com",
  ...(process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
];

/**
 * Normalizes PEM RSA private key formatting from environment variables.
 * Handles:
 * - Literal newlines vs escaped '\\n' vs double-escaped '\\\\n'
 * - Wrapping double or single quotes ('"' or "'")
 * - Carriage returns ('\r\n')
 */
export function formatPrivateKey(rawKey: string): string {
  if (!rawKey || typeof rawKey !== "string") {
    return "";
  }

  let key = rawKey.trim();

  // Strip wrapping outer quotes if present (e.g. from .env file or Vercel UI)
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim();
  }

  // Normalize escaped newlines and carriage returns
  key = key
    .replace(/\\\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "");

  // Ensure standard trailing newline for PEM certificate parsing
  if (!key.endsWith("\n")) {
    key += "\n";
  }

  return key;
}

/**
 * Validates that a string has the structural characteristics of a PEM RSA private key.
 */
export function isValidPrivateKey(key: string): boolean {
  if (!key || typeof key !== "string") return false;
  const formatted = formatPrivateKey(key);
  return (
    formatted.includes("-----BEGIN PRIVATE KEY-----") &&
    formatted.includes("-----END PRIVATE KEY-----") &&
    formatted.length > 200
  );
}

/**
 * Validates service-account client email format.
 */
export function isValidClientEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  const trimmed = email.trim().toLowerCase();
  return (
    trimmed.includes("@") &&
    trimmed.includes(".") &&
    (trimmed.endsWith(".iam.gserviceaccount.com") || trimmed.includes("gserviceaccount.com"))
  );
}

/**
 * Resolves Firebase service account credentials from environment variables.
 * Supports:
 * 1. Individual variables: FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, FIREBASE_PROJECT_ID
 * 2. Full JSON string: FIREBASE_SERVICE_ACCOUNT_KEY or FIREBASE_SERVICE_ACCOUNT
 */
export function resolveFirebaseCredentials(): {
  hasCredentials: boolean;
  credentials?: FirebaseAdminCredentials;
  missingFields: string[];
  configSource?: "json_variable" | "individual_variables";
} {
  const missingFields: string[] = [];

  // 1. Check for complete service-account JSON variable
  const jsonBlob =
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
    process.env.FIREBASE_SERVICE_ACCOUNT ||
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  if (jsonBlob && jsonBlob.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(jsonBlob.trim());
      const pKey = formatPrivateKey(parsed.private_key || "");
      const cEmail = (parsed.client_email || "").trim();
      const pId =
        (parsed.project_id || "").trim() ||
        process.env.FIREBASE_PROJECT_ID ||
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
        "wenture-india";

      if (isValidPrivateKey(pKey) && isValidClientEmail(cEmail) && pId) {
        return {
          hasCredentials: true,
          credentials: {
            projectId: pId,
            clientEmail: cEmail,
            privateKey: pKey,
          },
          missingFields: [],
          configSource: "json_variable",
        };
      }
    } catch {
      // JSON parse failed; fall through to individual environment variables
    }
  }

  // 2. Check individual environment variables
  const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY || "";
  const rawClientEmail = process.env.FIREBASE_CLIENT_EMAIL || "";
  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    "wenture-india";

  const formattedKey = formatPrivateKey(rawPrivateKey);
  const trimmedEmail = rawClientEmail.trim();

  if (!isValidClientEmail(trimmedEmail)) {
    missingFields.push("FIREBASE_CLIENT_EMAIL");
  }

  if (!isValidPrivateKey(formattedKey)) {
    missingFields.push("FIREBASE_PRIVATE_KEY");
  }

  if (!projectId) {
    missingFields.push("FIREBASE_PROJECT_ID");
  }

  if (missingFields.length === 0) {
    return {
      hasCredentials: true,
      credentials: {
        projectId,
        clientEmail: trimmedEmail,
        privateKey: formattedKey,
      },
      missingFields: [],
      configSource: "individual_variables",
    };
  }

  return {
    hasCredentials: false,
    missingFields,
  };
}

// Next.js hot-reload safe singleton cache on globalThis
const globalForAdmin = globalThis as unknown as {
  _firebaseAdminApp?: admin.app.App | null;
};

/**
 * Initializes Firebase Admin SDK safely (singleton pattern).
 *
 * IMPORTANT DEFENSE-IN-DEPTH:
 * If explicit service-account credentials (FIREBASE_CLIENT_EMAIL & FIREBASE_PRIVATE_KEY)
 * are not configured, this function returns `null` rather than accidentally falling back
 * to Application Default Credentials (ADC). Accidental ADC initialization causes:
 * "Credential implementation provided to initializeApp() via the 'credential' property failed
 *  to fetch a valid Google OAuth2 access token. Could not load the default credentials."
 */
export function getFirebaseAdminApp(): admin.app.App | null {
  // 1. Return cached instance if already initialized in this process
  if (globalForAdmin._firebaseAdminApp) {
    return globalForAdmin._firebaseAdminApp;
  }

  // 2. Check if Firebase Admin already has initialized apps (across Next.js HMR reloads)
  if (admin.apps.length > 0 && admin.apps[0]) {
    globalForAdmin._firebaseAdminApp = admin.apps[0];
    return admin.apps[0];
  }

  // 3. Resolve explicit credentials
  const { hasCredentials, credentials } = resolveFirebaseCredentials();

  if (!hasCredentials || !credentials) {
    // Return null instead of calling admin.initializeApp() without credentials.
    return null;
  }

  try {
    const app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: credentials.projectId,
        clientEmail: credentials.clientEmail,
        privateKey: credentials.privateKey,
      }),
      projectId: credentials.projectId,
    });

    globalForAdmin._firebaseAdminApp = app;
    return app;
  } catch (err) {
    // If [DEFAULT] app was already initialized during concurrent request
    if (admin.apps.length > 0 && admin.apps[0]) {
      globalForAdmin._firebaseAdminApp = admin.apps[0];
      return admin.apps[0];
    }

    console.error(
      "[Firebase Admin SDK] Failed to initialize with explicit service-account credentials:",
      err instanceof Error ? err.message : "Initialization error"
    );
    return null;
  }
}

/**
 * Detailed verification helper that distinguishes missing credentials from
 * invalid or expired user tokens.
 */
export async function verifyFirebaseTokenDetails(
  req: Request,
  checkRevoked: boolean = false
): Promise<TokenVerificationResult> {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      user: null,
      error: "missing_token",
      errorMessage: "No Bearer token provided in Authorization header.",
    };
  }

  const idToken = authHeader.replace("Bearer ", "").trim();
  if (!idToken) {
    return {
      user: null,
      error: "missing_token",
      errorMessage: "Authorization Bearer token is empty.",
    };
  }

  // 1. Primary Verification: Firebase Admin SDK with Explicit Service Account
  const app = getFirebaseAdminApp();
  if (app) {
    try {
      const decodedToken = await admin.auth(app).verifyIdToken(idToken, checkRevoked);
      const email = decodedToken.email?.toLowerCase();
      const isAdmin = Boolean(
        decodedToken.admin === true ||
        (email && ADMIN_EMAILS.includes(email))
      );

      return {
        user: {
          uid: decodedToken.uid,
          email: decodedToken.email,
          isAdmin,
        },
      };
    } catch (err: unknown) {
      const authErr = err as { code?: string; message?: string };
      const code = authErr.code || "";

      if (code === "auth/id-token-expired") {
        return {
          user: null,
          error: "expired_token",
          errorMessage: "Firebase authentication session has expired. Please sign in again.",
        };
      }
      if (code === "auth/id-token-revoked") {
        return {
          user: null,
          error: "revoked_token",
          errorMessage: "Firebase session was revoked. Please re-authenticate.",
        };
      }
      if (code === "auth/argument-error" || code === "auth/invalid-id-token") {
        return {
          user: null,
          error: "invalid_token",
          errorMessage: "Invalid Firebase ID token supplied.",
        };
      }

      console.warn("[verifyFirebaseRequest] Admin SDK token verification notice:", code || "unknown error");
    }
  }

  // 2. Secondary Verification: Google Identity Toolkit REST API
  // Active when explicit Firebase Admin service-account credentials have not yet been provisioned
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (apiKey) {
    try {
      const verifyRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        }
      );

      if (verifyRes.ok) {
        const data = await verifyRes.json();
        if (data.users && data.users.length > 0) {
          const userObj = data.users[0];
          const email = (userObj.email || "").toLowerCase();
          const isAdmin = Boolean(email && ADMIN_EMAILS.includes(email));

          return {
            user: {
              uid: userObj.localId,
              email: userObj.email,
              isAdmin,
            },
          };
        }
      } else {
        const errorJson = await verifyRes.json().catch(() => null);
        const errMsg = errorJson?.error?.message || "";
        if (errMsg === "INVALID_ID_TOKEN") {
          return {
            user: null,
            error: "invalid_token",
            errorMessage: "Invalid Firebase ID token.",
          };
        }
        if (errMsg === "TOKEN_EXPIRED" || errMsg.includes("EXPIRED")) {
          return {
            user: null,
            error: "expired_token",
            errorMessage: "Firebase ID token has expired. Please sign in again.",
          };
        }
      }
    } catch {
      // Identity toolkit fetch failed
    }
  }

  // 3. Neither method succeeded: distinguish missing credentials from invalid token
  const creds = resolveFirebaseCredentials();
  if (!creds.hasCredentials) {
    return {
      user: null,
      error: "unconfigured_server",
      errorMessage: `Firebase Admin credentials not configured (missing: ${creds.missingFields.join(", ")}).`,
    };
  }

  return {
    user: null,
    error: "verification_failed",
    errorMessage: "Firebase token verification failed.",
  };
}

/**
 * Verifies a Firebase ID token from an incoming HTTP Request.
 * Extracts the token from the "Authorization: Bearer <token>" header.
 *
 * @param req Incoming HTTP Request
 * @param checkRevoked Whether to check if token has been revoked
 */
export async function verifyFirebaseRequest(
  req: Request,
  checkRevoked: boolean = false
): Promise<VerifiedUser | null> {
  const result = await verifyFirebaseTokenDetails(req, checkRevoked);
  return result.user;
}

/**
 * Returns the Firebase Admin Firestore instance if explicit credentials are provisioned,
 * or null if credentials are not configured.
 */
export function getAdminFirestore(): admin.firestore.Firestore | null {
  const app = getFirebaseAdminApp();
  if (!app) {
    return null;
  }
  return admin.firestore(app);
}
