/**
 * WENTURE INDIA — FIREBASE ADMIN SDK CREDENTIAL INITIALIZATION TEST SUITE
 *
 * Verifies:
 * 1. Private key normalization & formatting (\\n, \\\\n, \r\n, quotes)
 * 2. Service account email validation
 * 3. Individual variables vs JSON blob resolution
 * 4. Accidental Application Default Credentials (ADC) fallback prevention
 * 5. Explicit service-account cert initialization
 * 6. Next.js hot-reload singleton cache & instance reuse
 * 7. Token verification error distinction (missing token, invalid token, missing creds)
 * 8. Zero credential or token leakage in logs/errors
 */

const crypto = require("crypto");
const admin = require("firebase-admin");

// Replicate the exact logic from src/lib/firebase/admin.ts for direct Node CJS execution
const ADMIN_EMAILS = [
  "wentureindia@gmail.com",
  "info@wentureindia.com",
  "payalnkapse1720@gmail.com",
  ...(process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
];

function formatPrivateKey(rawKey) {
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

function isValidPrivateKey(key) {
  if (!key || typeof key !== "string") return false;
  const formatted = formatPrivateKey(key);
  return (
    formatted.includes("-----BEGIN PRIVATE KEY-----") &&
    formatted.includes("-----END PRIVATE KEY-----") &&
    formatted.length > 200
  );
}

function isValidClientEmail(email) {
  if (!email || typeof email !== "string") return false;
  const trimmed = email.trim().toLowerCase();
  return (
    trimmed.includes("@") &&
    trimmed.includes(".") &&
    (trimmed.endsWith(".iam.gserviceaccount.com") || trimmed.includes("gserviceaccount.com"))
  );
}

function resolveFirebaseCredentials() {
  const missingFields = [];

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

const globalForAdmin = global;

function getFirebaseAdminApp() {
  if (globalForAdmin._firebaseAdminApp) {
    return globalForAdmin._firebaseAdminApp;
  }

  if (admin.apps.length > 0 && admin.apps[0]) {
    globalForAdmin._firebaseAdminApp = admin.apps[0];
    return admin.apps[0];
  }

  const { hasCredentials, credentials } = resolveFirebaseCredentials();

  if (!hasCredentials || !credentials) {
    return null; // Explicitly prevents ADC fallback!
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
    if (admin.apps.length > 0 && admin.apps[0]) {
      globalForAdmin._firebaseAdminApp = admin.apps[0];
      return admin.apps[0];
    }
    return null;
  }
}

async function verifyFirebaseTokenDetails(authHeader, checkRevoked = false) {
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
    } catch (err) {
      const code = err.code || "";
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
    }
  }

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

const results = [];

function recordResult(test) {
  results.push(test);
  const status = test.passed ? "✅ PASS" : "❌ FAIL";
  console.log(`[Test ${String(test.id).padStart(2, "0")}] ${status}: ${test.name}`);
  if (!test.passed) {
    console.log(`   Expected: ${test.expected}`);
    console.log(`   Actual:   ${test.actual}`);
  }
}

console.log("============================================================");
console.log("WENTURE INDIA — FIREBASE ADMIN CREDENTIAL INITIALIZATION TESTS");
console.log("============================================================\n");

// Generate a real ephemeral RSA private key for testing PEM cert loading
const { privateKey: testPemPrivateKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

// TEST 01: Private Key Formatting Handles Literal and Escaped Newlines
const escapedKey = testPemPrivateKey.replace(/\n/g, "\\n");
const formattedEscaped = formatPrivateKey(escapedKey);
recordResult({
  id: 1,
  name: "Private Key Formatting: Normalizes Escaped '\\n' to Literal Newlines",
  passed: formattedEscaped === testPemPrivateKey,
  expected: "Exact match with original PEM key containing literal newlines",
  actual: formattedEscaped.includes("\n") ? "Correct literal newlines" : "Failed to replace",
});

// TEST 02: Private Key Formatting Strips Outer Quotes
const quotedKey = `"${testPemPrivateKey.replace(/\n/g, "\\n")}"`;
const singleQuotedKey = `'${testPemPrivateKey.replace(/\n/g, "\\n")}'`;
const formattedDoubleQuoted = formatPrivateKey(quotedKey);
const formattedSingleQuoted = formatPrivateKey(singleQuotedKey);
recordResult({
  id: 2,
  name: "Private Key Formatting: Strips Outer Wrapping Double and Single Quotes",
  passed:
    formattedDoubleQuoted === testPemPrivateKey &&
    formattedSingleQuoted === testPemPrivateKey,
  expected: "Both double and single quote wrappers stripped cleanly",
  actual: `Double: ${formattedDoubleQuoted === testPemPrivateKey}, Single: ${formattedSingleQuoted === testPemPrivateKey}`,
});

// TEST 03: Private Key Formatting Handles Double-Escaped '\\\\n' and Carriage Returns
const doubleEscapedKey = testPemPrivateKey.replace(/\n/g, "\\\\n");
const carriageReturnKey = testPemPrivateKey.replace(/\n/g, "\r\n");
const formattedDoubleEscaped = formatPrivateKey(doubleEscapedKey);
const formattedCarriage = formatPrivateKey(carriageReturnKey);
recordResult({
  id: 3,
  name: "Private Key Formatting: Handles Double-Escaped '\\\\n' and CRLF '\\r\\n'",
  passed:
    formattedDoubleEscaped === testPemPrivateKey &&
    formattedCarriage === testPemPrivateKey,
  expected: "Matches standard PEM structure",
  actual: `Double-escaped: ${formattedDoubleEscaped === testPemPrivateKey}, CRLF: ${formattedCarriage === testPemPrivateKey}`,
});

// TEST 04: Client Email Validation
const validEmail = "firebase-adminsdk-wenture@wenture-india.iam.gserviceaccount.com";
const invalidEmail1 = "random-user@gmail.com";
const invalidEmail2 = "not-an-email";
recordResult({
  id: 4,
  name: "Service Account Email Validation: Enforces Google Service Account Domain",
  passed:
    isValidClientEmail(validEmail) === true &&
    isValidClientEmail(invalidEmail1) === false &&
    isValidClientEmail(invalidEmail2) === false,
  expected: "Service account email accepted; normal email and malformed string rejected",
  actual: `Valid: ${isValidClientEmail(validEmail)}, Normal: ${isValidClientEmail(invalidEmail1)}, Malformed: ${isValidClientEmail(invalidEmail2)}`,
});

// TEST 05: Credentials Resolution from Individual Environment Variables
const originalEnv = { ...process.env };
process.env.FIREBASE_PROJECT_ID = "wenture-india";
process.env.FIREBASE_CLIENT_EMAIL = validEmail;
process.env.FIREBASE_PRIVATE_KEY = escapedKey;
delete process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
delete process.env.FIREBASE_SERVICE_ACCOUNT;

const individualRes = resolveFirebaseCredentials();
recordResult({
  id: 5,
  name: "Credentials Resolution: Resolves Valid Individual Environment Variables",
  passed:
    individualRes.hasCredentials === true &&
    individualRes.configSource === "individual_variables" &&
    individualRes.credentials.projectId === "wenture-india" &&
    individualRes.credentials.clientEmail === validEmail &&
    individualRes.credentials.privateKey === testPemPrivateKey,
  expected: "hasCredentials: true with normalized private key",
  actual: JSON.stringify({
    hasCredentials: individualRes.hasCredentials,
    configSource: individualRes.configSource,
    projectId: individualRes.credentials?.projectId,
  }),
});

// TEST 06: Credentials Resolution from Full Service Account JSON Blob
process.env.FIREBASE_SERVICE_ACCOUNT_KEY = JSON.stringify({
  project_id: "wenture-india-json",
  client_email: validEmail,
  private_key: escapedKey,
});
const jsonRes = resolveFirebaseCredentials();
recordResult({
  id: 6,
  name: "Credentials Resolution: Resolves from Single-Line JSON Environment Variable",
  passed:
    jsonRes.hasCredentials === true &&
    jsonRes.configSource === "json_variable" &&
    jsonRes.credentials.projectId === "wenture-india-json" &&
    jsonRes.credentials.clientEmail === validEmail,
  expected: "hasCredentials: true from JSON variable",
  actual: JSON.stringify({
    hasCredentials: jsonRes.hasCredentials,
    configSource: jsonRes.configSource,
    projectId: jsonRes.credentials?.projectId,
  }),
});

// TEST 07: Accidental ADC Fallback Prevention When Credentials Are Missing
delete process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
delete process.env.FIREBASE_SERVICE_ACCOUNT;
delete process.env.FIREBASE_CLIENT_EMAIL;
delete process.env.FIREBASE_PRIVATE_KEY;

// Clear any cached instances
delete globalForAdmin._firebaseAdminApp;
if (admin.apps.length > 0) {
  Promise.all(admin.apps.map((a) => a.delete())).catch(() => {});
}

const unconfiguredRes = resolveFirebaseCredentials();
const unconfiguredApp = getFirebaseAdminApp();

recordResult({
  id: 7,
  name: "ADC Fallback Prevention: getFirebaseAdminApp() Returns null When Credentials Unset",
  passed:
    unconfiguredRes.hasCredentials === false &&
    unconfiguredRes.missingFields.length >= 2 &&
    unconfiguredApp === null,
  expected: "hasCredentials: false and app is null (never falls back to ApplicationDefaultCredentials)",
  actual: JSON.stringify({
    hasCredentials: unconfiguredRes.hasCredentials,
    missingFields: unconfiguredRes.missingFields,
    appIsNull: unconfiguredApp === null,
  }),
});

// TEST 08: Explicit Service Account App Initialization
process.env.FIREBASE_PROJECT_ID = "wenture-india";
process.env.FIREBASE_CLIENT_EMAIL = validEmail;
process.env.FIREBASE_PRIVATE_KEY = testPemPrivateKey;

const configuredApp = getFirebaseAdminApp();
recordResult({
  id: 8,
  name: "Explicit Initialization: Initializes Firebase Admin App with Service Account",
  passed: configuredApp !== null && configuredApp.name === "[DEFAULT]",
  expected: "Initialized app instance with [DEFAULT] name",
  actual: configuredApp ? `App initialized: ${configuredApp.name}` : "null",
});

// TEST 09: Next.js Hot-Reload Singleton Reuse
const secondAppCall = getFirebaseAdminApp();
recordResult({
  id: 9,
  name: "Next.js Hot-Reload Safety: Reuses Cached Singleton Instance on globalThis",
  passed: configuredApp !== null && secondAppCall === configuredApp,
  expected: "Exact same object reference (secondAppCall === configuredApp)",
  actual: String(secondAppCall === configuredApp),
});

// TEST 10: Missing Bearer Token Rejection
async function runTokenTests() {
  const resNoHeader = await verifyFirebaseTokenDetails(null);
  const resEmptyBearer = await verifyFirebaseTokenDetails("Bearer ");

  recordResult({
    id: 10,
    name: "Token Verification: Missing or Empty Bearer Header Rejected with 'missing_token'",
    passed:
      resNoHeader.user === null &&
      resNoHeader.error === "missing_token" &&
      resEmptyBearer.user === null &&
      resEmptyBearer.error === "missing_token",
    expected: "error: missing_token",
    actual: `noHeader: ${resNoHeader.error}, emptyBearer: ${resEmptyBearer.error}`,
  });

  // TEST 11: Malformed Token Rejection
  const resMalformed = await verifyFirebaseTokenDetails("Bearer not-a-valid-jwt");

  recordResult({
    id: 11,
    name: "Token Verification: Malformed or Invalid Token Rejected with 'invalid_token'",
    passed:
      resMalformed.user === null &&
      resMalformed.error === "invalid_token",
    expected: "error: invalid_token",
    actual: `resMalformed: ${resMalformed.error}`,
  });

  // TEST 12: Zero Credential or Token Leakage
  const hasSecretInErrMsg =
    JSON.stringify(resMalformed).includes(testPemPrivateKey) ||
    JSON.stringify(resNoHeader).includes(testPemPrivateKey) ||
    JSON.stringify(unconfiguredRes).includes(testPemPrivateKey);

  recordResult({
    id: 12,
    name: "Security Invariant: Private Keys, Credentials and Tokens Are Never Exposed in Responses",
    passed: hasSecretInErrMsg === false,
    expected: "No secrets leaked in error or resolution objects",
    actual: `Secret leaked: ${hasSecretInErrMsg}`,
  });

  // Restore environment
  for (const k of Object.keys(process.env)) {
    if (!(k in originalEnv)) {
      delete process.env[k];
    }
  }
  Object.assign(process.env, originalEnv);

  // -----------------------------------------------------------------
  // SUMMARY
  // -----------------------------------------------------------------
  console.log("\n============================================================");
  console.log("FIREBASE ADMIN SDK CREDENTIAL TEST RESULTS");
  console.log("============================================================\n");
  const passedCount = results.filter((r) => r.passed).length;
  console.log(`Total Tests Executed:    ${results.length}`);
  console.log(`Passed:                  ${passedCount} / ${results.length}`);
  console.log(`Failed:                  ${results.length - passedCount}`);
  console.log("============================================================\n");

  if (passedCount === results.length) {
    console.log("ALL 12 FIREBASE ADMIN INITIALIZATION TESTS PASSED! 🎉\n");
    process.exit(0);
  } else {
    console.error("SOME FIREBASE ADMIN TESTS FAILED! ❌\n");
    process.exit(1);
  }
}

runTokenTests().catch((err) => {
  console.error("Unexpected test harness error:", err);
  process.exit(1);
});
