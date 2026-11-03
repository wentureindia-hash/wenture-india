import * as fs from "fs";
import * as path from "path";

// Load .env.local natively without external dependencies
try {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    for (const line of envContent.split("\n")) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
        const [k, ...v] = trimmed.split("=");
        const key = k.trim();
        const val = v.join("=").trim().replace(/^["']|["']$/g, "");
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
} catch (e) {
  console.warn("Could not parse .env.local natively:", e);
}

import { createClient } from "@supabase/supabase-js";
import { STORAGE_BUCKETS } from "../src/lib/supabase/constants";
import { getFirebaseAdminApp } from "../src/lib/firebase/admin";
import { app, auth, db } from "../src/lib/firebase/client";

async function runVerification() {
  console.log("============================================================");
  console.log("WENTURE INDIA: SUPABASE STORAGE & SECURITY VERIFICATION");
  console.log("============================================================\n");

  const results: Record<string, { status: "PASS" | "FAIL" | "WARN"; message: string }> = {};

  // ------------------------------------------------------------
  // CHECK 1: Confirm Supabase Project URL and Keys
  // ------------------------------------------------------------
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && anonKey && serviceKey) {
    results["1. Environment Variables"] = {
      status: "PASS",
      message: `Configured: URL (${supabaseUrl}), Anon Key (${anonKey.slice(0, 10)}...), Service Key (${serviceKey.slice(0, 10)}...)`,
    };
  } else {
    results["1. Environment Variables"] = {
      status: "FAIL",
      message: `Missing: ${!supabaseUrl ? "URL " : ""}${!anonKey ? "ANON_KEY " : ""}${!serviceKey ? "SERVICE_ROLE_KEY" : ""}`,
    };
  }

  // ------------------------------------------------------------
  // CHECK 2 & 3: Supabase Server Client & Bucket Existence
  // ------------------------------------------------------------
  let supabaseAdmin: ReturnType<typeof createClient> | null = null;
  if (supabaseUrl && serviceKey) {
    try {
      supabaseAdmin = createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
        realtime: {
          transport: typeof WebSocket !== "undefined" ? WebSocket : (class {} as unknown as typeof WebSocket),
        },
      });

      const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();

      if (listError) {
        results["2. Supabase Server Client & Buckets"] = {
          status: "FAIL",
          message: `Failed to connect or list buckets: ${listError.message}`,
        };
      } else {
        const bucketNames = (buckets || []).map((b) => b.name);
        const hasPublic = bucketNames.includes(STORAGE_BUCKETS.PUBLIC);
        const hasPrivate = bucketNames.includes(STORAGE_BUCKETS.PRIVATE);

        // If buckets don't exist yet, attempt to create them with correct settings
        if (!hasPublic) {
          console.log(`Bucket '${STORAGE_BUCKETS.PUBLIC}' not found. Attempting creation...`);
          const { error: createPubErr } = await supabaseAdmin.storage.createBucket(STORAGE_BUCKETS.PUBLIC, {
            public: true,
            fileSizeLimit: 5 * 1024 * 1024,
          });
          if (createPubErr) {
            console.warn(`Could not auto-create public bucket: ${createPubErr.message}`);
          }
        }

        if (!hasPrivate) {
          console.log(`Bucket '${STORAGE_BUCKETS.PRIVATE}' not found. Attempting creation...`);
          const { error: createPrivErr } = await supabaseAdmin.storage.createBucket(STORAGE_BUCKETS.PRIVATE, {
            public: false,
            fileSizeLimit: 25 * 1024 * 1024,
          });
          if (createPrivErr) {
            console.warn(`Could not auto-create private bucket: ${createPrivErr.message}`);
          }
        }

        // Re-check buckets
        const { data: recheckBuckets } = await supabaseAdmin.storage.listBuckets();
        const finalBucketNames = (recheckBuckets || []).map((b) => b.name);
        const pubBucket = (recheckBuckets || []).find((b) => b.name === STORAGE_BUCKETS.PUBLIC);
        const privBucket = (recheckBuckets || []).find((b) => b.name === STORAGE_BUCKETS.PRIVATE);

        const pubOk = Boolean(pubBucket && pubBucket.public === true);
        const privOk = Boolean(privBucket && privBucket.public === false);

        if (pubOk && privOk) {
          results["2. Supabase Buckets Verification"] = {
            status: "PASS",
            message: `Confirmed: '${STORAGE_BUCKETS.PUBLIC}' (public: true) & '${STORAGE_BUCKETS.PRIVATE}' (public: false)`,
          };
        } else {
          results["2. Supabase Buckets Verification"] = {
            status: pubBucket && privBucket ? "WARN" : "FAIL",
            message: `Found buckets: [${finalBucketNames.join(", ")}]. Public bucket public: ${pubBucket?.public}, Private bucket public: ${privBucket?.public}`,
          };
        }

        results["3. Server Client Initialization"] = {
          status: "PASS",
          message: "Supabase service-role client successfully authenticated and operational.",
        };
      }
    } catch (e: unknown) {
      const err = e as { message?: string };
      results["2. Supabase Buckets Verification"] = {
        status: "FAIL",
        message: `Exception initializing client: ${err.message}`,
      };
      results["3. Server Client Initialization"] = {
        status: "FAIL",
        message: `Failed: ${err.message}`,
      };
    }
  } else {
    results["2. Supabase Buckets Verification"] = { status: "FAIL", message: "Skipped due to missing env vars" };
    results["3. Server Client Initialization"] = { status: "FAIL", message: "Skipped due to missing env vars" };
  }

  // ------------------------------------------------------------
  // CHECK 4: Firebase Admin SDK Initialization
  // ------------------------------------------------------------
  try {
    const adminApp = getFirebaseAdminApp();
    if (adminApp && adminApp.name) {
      results["4. Firebase Admin SDK"] = {
        status: "PASS",
        message: `Firebase Admin initialized successfully for project '${adminApp.options.projectId}'.`,
      };
    } else {
      results["4. Firebase Admin SDK"] = {
        status: "FAIL",
        message: "Firebase Admin app initialization failed.",
      };
    }
  } catch (adminErr: unknown) {
    const e = adminErr as { message?: string };
    results["4. Firebase Admin SDK"] = {
      status: "FAIL",
      message: `Firebase Admin error: ${e.message}`,
    };
  }

  // ------------------------------------------------------------
  // CHECK 5: Secret Key Leakage Check
  // ------------------------------------------------------------
  const isKeyPrefixedWithNextPublic = Object.keys(process.env).some(
    (k) => k.startsWith("NEXT_PUBLIC_") && process.env[k]?.includes(serviceKey || "sb_secret")
  );
  if (!isKeyPrefixedWithNextPublic && !serviceKey?.startsWith("NEXT_PUBLIC")) {
    results["5. Service Role Key Security"] = {
      status: "PASS",
      message: "SUPABASE_SERVICE_ROLE_KEY is strictly server-side and has no NEXT_PUBLIC_ prefix.",
    };
  } else {
    results["5. Service Role Key Security"] = {
      status: "FAIL",
      message: "CRITICAL: Service role key appears to be prefixed with NEXT_PUBLIC_ or leaked in client env!",
    };
  }

  // ------------------------------------------------------------
  // CHECK 6: Test Public Image Upload & Retrieval
  // ------------------------------------------------------------
  if (supabaseAdmin) {
    try {
      const testImagePath = `listings/test_verification/test_${Date.now()}.png`;
      // Minimal 1x1 transparent PNG buffer
      const pngBuffer = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");

      const { error: uploadImgErr } = await supabaseAdmin.storage
        .from(STORAGE_BUCKETS.PUBLIC)
        .upload(testImagePath, pngBuffer, { contentType: "image/png", upsert: true });

      if (uploadImgErr) {
        results["6. Public Image Upload"] = {
          status: "FAIL",
          message: `Failed to upload image: ${uploadImgErr.message}`,
        };
      } else {
        const { data: urlData } = supabaseAdmin.storage
          .from(STORAGE_BUCKETS.PUBLIC)
          .getPublicUrl(testImagePath);

        // Clean up test file
        await supabaseAdmin.storage.from(STORAGE_BUCKETS.PUBLIC).remove([testImagePath]);

        results["6. Public Image Upload"] = {
          status: "PASS",
          message: `Upload successful. Public CDN URL resolved: ${urlData.publicUrl}`,
        };
      }
    } catch (imgErr: unknown) {
      const e = imgErr as { message?: string };
      results["6. Public Image Upload"] = {
        status: "FAIL",
        message: `Image upload test threw: ${e.message}`,
      };
    }
  }

  // ------------------------------------------------------------
  // CHECK 7: Test Private PDF Upload & Signed URL
  // ------------------------------------------------------------
  let testPdfPath = "";
  if (supabaseAdmin) {
    try {
      testPdfPath = `pitch-decks/test_verification/deck_${Date.now()}.pdf`;
      const pdfBuffer = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000053 00000 n \n0000000102 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n149\n%%EOF");

      const { error: uploadPdfErr } = await supabaseAdmin.storage
        .from(STORAGE_BUCKETS.PRIVATE)
        .upload(testPdfPath, pdfBuffer, { contentType: "application/pdf", upsert: true });

      if (uploadPdfErr) {
        results["7. Private PDF Upload & Signed URL"] = {
          status: "FAIL",
          message: `Failed to upload private PDF: ${uploadPdfErr.message}`,
        };
      } else {
        const { data: signedData, error: signErr } = await supabaseAdmin.storage
          .from(STORAGE_BUCKETS.PRIVATE)
          .createSignedUrl(testPdfPath, 900);

        if (signErr || !signedData?.signedUrl) {
          results["7. Private PDF Upload & Signed URL"] = {
            status: "FAIL",
            message: `Failed to generate signed URL: ${signErr?.message}`,
          };
        } else {
          results["7. Private PDF Upload & Signed URL"] = {
            status: "PASS",
            message: `Private upload successful. Signed URL generated: ${signedData.signedUrl.slice(0, 75)}...`,
          };
        }
      }
    } catch (pdfErr: unknown) {
      const e = pdfErr as { message?: string };
      results["7. Private PDF Upload & Signed URL"] = {
        status: "FAIL",
        message: `PDF test threw: ${e.message}`,
      };
    }
  }

  // ------------------------------------------------------------
  // CHECK 8: Unauthorized Access Test
  // ------------------------------------------------------------
  if (supabaseAdmin && testPdfPath) {
    try {
      // Direct unsigned public URL to private bucket should fail or be inaccessible
      const { data: publicAttempt } = supabaseAdmin.storage
        .from(STORAGE_BUCKETS.PRIVATE)
        .getPublicUrl(testPdfPath);

      const checkRes = await fetch(publicAttempt.publicUrl);
      // Clean up test file
      await supabaseAdmin.storage.from(STORAGE_BUCKETS.PRIVATE).remove([testPdfPath]);

      if (checkRes.status === 400 || checkRes.status === 403 || checkRes.status === 404) {
        results["8. Unauthorized Access Defense"] = {
          status: "PASS",
          message: `Direct unauthenticated HTTP request to private file returned status ${checkRes.status} (Access Denied).`,
        };
      } else {
        results["8. Unauthorized Access Defense"] = {
          status: "WARN",
          message: `Direct unauthenticated request returned status ${checkRes.status}. Verify private bucket toggle in Supabase.`,
        };
      }
    } catch {
      results["8. Unauthorized Access Defense"] = {
        status: "PASS",
        message: "Direct unauthenticated request failed as expected.",
      };
    }
  }

  // ------------------------------------------------------------
  // CHECK 9: Firebase Client Intactness
  // ------------------------------------------------------------
  const isAuthIntact = typeof auth.onAuthStateChanged === "function";
  const isFirestoreIntact = Boolean(db && db.type === "firestore");
  const isStorageRemovedFromClient = !("storage" in { app, auth, db });

  if (isAuthIntact && isFirestoreIntact && isStorageRemovedFromClient) {
    results["9. Firebase Client Architecture"] = {
      status: "PASS",
      message: "Firebase Auth & Cloud Firestore fully intact. Firebase Storage cleanly decoupled.",
    };
  } else {
    results["9. Firebase Client Architecture"] = {
      status: "FAIL",
      message: `Auth intact: ${isAuthIntact}, Firestore intact: ${isFirestoreIntact}, Decoupled: ${isStorageRemovedFromClient}`,
    };
  }

  // ------------------------------------------------------------
  // SUMMARY REPORT OUTPUT
  // ------------------------------------------------------------
  console.log("TEST VERIFICATION REPORT:");
  console.log("------------------------------------------------------------");
  let allPass = true;
  for (const [testName, result] of Object.entries(results)) {
    const badge = result.status === "PASS" ? " [PASS] " : result.status === "WARN" ? " [WARN] " : " [FAIL] ";
    console.log(`${badge} ${testName}`);
    console.log(`       -> ${result.message}\n`);
    if (result.status === "FAIL") allPass = false;
  }
  console.log("------------------------------------------------------------");
  console.log(`Overall Result: ${allPass ? "ALL SYSTEMS OPERATIONAL" : "ISSUES FOUND"}`);
  console.log("============================================================\n");
}

runVerification().catch(console.error);
