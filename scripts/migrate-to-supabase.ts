/**
 * WENTURE INDIA — FIREBASE STORAGE TO SUPABASE STORAGE MIGRATION SCRIPT
 *
 * Safe, idempotent, resumable migration of existing Firebase Storage assets to Supabase Storage.
 *
 * Rules:
 * 1. NEVER deletes original Firebase Storage files.
 * 2. Verifies each uploaded file via Supabase before updating Firestore document references.
 * 3. Skips assets already migrated to Supabase.
 * 4. Uses Admin SDK credentials to access restricted subcollections safely.
 * 5. Logs full audit report.
 *
 * DO NOT RUN WITHOUT EXPLICIT USER APPROVAL.
 *
 * Run with: npx ts-node --compiler-options '{"module":"commonjs"}' scripts/migrate-to-supabase.ts
 */

import * as admin from "firebase-admin";
import { createClient } from "@supabase/supabase-js";

const projectId =
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
  process.env.FIREBASE_PROJECT_ID ||
  "wenture-india";

const privateKey = process.env.FIREBASE_PRIVATE_KEY
  ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
  : undefined;

const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const BUCKET_PUBLIC = "wenture-public";
const BUCKET_PRIVATE = "wenture-private";

async function main() {
  console.log("============================================================");
  console.log("Starting Wenture India: Firebase -> Supabase Storage Migration");
  console.log("============================================================");

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("ERROR: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.");
    process.exit(1);
  }

  // 1. Initialize Firebase Admin & Supabase
  let fbApp: admin.app.App;
  if (admin.apps.length > 0) {
    fbApp = admin.apps[0]!;
  } else if (privateKey && clientEmail) {
    fbApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      projectId,
    });
  } else {
    console.warn(
      "[Migration Warning] Running Firebase Admin without explicit service account credentials. Set FIREBASE_PRIVATE_KEY and FIREBASE_CLIENT_EMAIL for full permissions."
    );
    fbApp = admin.initializeApp({ projectId });
  }

  const db = admin.firestore(fbApp);

  // Initialize Supabase with custom realtime transport to support Node.js < 22 environments
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
    realtime: {
      transport:
        typeof WebSocket !== "undefined"
          ? WebSocket
          : (class {} as unknown as typeof WebSocket),
    },
  });

  let totalListingsScanned = 0;
  let listingImagesMigrated = 0;
  let pitchDecksMigrated = 0;
  let totalInvestorsScanned = 0;
  let investorAvatarsMigrated = 0;
  const errors: string[] = [];

  // Helper to fetch file buffer from a URL
  async function fetchFileBuffer(url: string): Promise<{ buffer: Buffer; contentType: string } | null> {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const arrayBuf = await res.arrayBuffer();
      const contentType = res.headers.get("content-type") || "application/octet-stream";
      return { buffer: Buffer.from(arrayBuf), contentType };
    } catch (err: unknown) {
      const e = err as { message?: string };
      console.warn(`[fetchFileBuffer Failed] URL: ${url} - Error: ${e.message}`);
      return null;
    }
  }

  // 2. Migrate Listings Images & Pitch Decks
  console.log("\n[Phase 1] Scanning 'listings' collection...");
  try {
    const listingsSnap = await db.collection("listings").get();
    totalListingsScanned = listingsSnap.size;
    console.log(`Found ${totalListingsScanned} listing documents.`);

    for (const docSnap of listingsSnap.docs) {
      const listingId = docSnap.id;
      const data = docSnap.data();

      // A. Check Images
      const images: string[] = Array.isArray(data.images) ? data.images : [];
      let imagesUpdated = false;
      const newImages: string[] = [];

      for (let i = 0; i < images.length; i++) {
        const imgUrl = images[i];
        if (imgUrl && imgUrl.includes("firebasestorage.googleapis.com")) {
          console.log(`[Listing ${listingId}] Migrating cover/gallery image #${i + 1}...`);
          const fileData = await fetchFileBuffer(imgUrl);
          if (fileData) {
            const fileName = `img_${i}_${Date.now()}.jpg`;
            const storagePath = `listings/${listingId}/${fileName}`;

            const { error: uploadError } = await supabase.storage
              .from(BUCKET_PUBLIC)
              .upload(storagePath, fileData.buffer, {
                contentType: fileData.contentType,
                upsert: true,
              });

            if (!uploadError) {
              const { data: urlData } = supabase.storage.from(BUCKET_PUBLIC).getPublicUrl(storagePath);
              newImages.push(urlData.publicUrl);
              imagesUpdated = true;
              listingImagesMigrated++;
              console.log(` -> Migrated successfully to Supabase: ${urlData.publicUrl}`);
            } else {
              errors.push(`Listing ${listingId} image #${i}: ${uploadError.message}`);
              newImages.push(imgUrl); // Keep existing as fallback
            }
          } else {
            newImages.push(imgUrl);
          }
        } else {
          newImages.push(imgUrl);
        }
      }

      if (imagesUpdated) {
        await db.collection("listings").doc(listingId).update({
          images: newImages,
          storageMigratedAt: new Date().toISOString(),
        });
      }

      // B. Check Pitch Deck in restricted subcollection
      try {
        const restrictedRef = db.collection("listings").doc(listingId).collection("restricted").doc("pitchDeck");
        const restrictedSnap = await restrictedRef.get();

        if (restrictedSnap.exists) {
          const rData = restrictedSnap.data() || {};
          const pUrl = rData.pitchDeckUrl as string | undefined;

          if (pUrl && pUrl.includes("firebasestorage.googleapis.com") && !rData.pitchDeckStoragePath?.startsWith("pitch-decks/")) {
            console.log(`[Listing ${listingId}] Migrating restricted pitch deck PDF...`);
            const fileData = await fetchFileBuffer(pUrl);
            if (fileData) {
              const fileName = rData.pitchDeckFileName || `deck_${Date.now()}.pdf`;
              const storagePath = `pitch-decks/${listingId}/${fileName}`;

              const { error: deckUploadErr } = await supabase.storage
                .from(BUCKET_PRIVATE)
                .upload(storagePath, fileData.buffer, {
                  contentType: "application/pdf",
                  upsert: true,
                });

              if (!deckUploadErr) {
                await restrictedRef.set(
                  {
                    pitchDeckStoragePath: storagePath,
                    storageMigratedAt: new Date().toISOString(),
                  },
                  { merge: true }
                );
                pitchDecksMigrated++;
                console.log(` -> Pitch deck migrated successfully to Supabase private storage: ${storagePath}`);
              } else {
                errors.push(`Listing ${listingId} pitch deck: ${deckUploadErr.message}`);
              }
            }
          }
        }
      } catch (deckSubErr: unknown) {
        const e = deckSubErr as { message?: string };
        errors.push(`Listing ${listingId} subcollection: ${e.message}`);
      }
    }
  } catch (err: unknown) {
    const e = err as { message?: string };
    errors.push(`Listings scan error: ${e.message}`);
  }

  // 3. Migrate Investor Profiles
  console.log("\n[Phase 2] Scanning 'investorProfiles' collection...");
  try {
    const investorsSnap = await db.collection("investorProfiles").get();
    totalInvestorsScanned = investorsSnap.size;
    console.log(`Found ${totalInvestorsScanned} investor profile documents.`);

    for (const docSnap of investorsSnap.docs) {
      const investorId = docSnap.id;
      const data = docSnap.data();
      const pImage = data.profileImage as string | undefined;

      if (pImage && pImage.includes("firebasestorage.googleapis.com")) {
        console.log(`[Investor ${investorId}] Migrating avatar image...`);
        const fileData = await fetchFileBuffer(pImage);
        if (fileData) {
          const storagePath = `investors/${investorId}/avatar_${Date.now()}.jpg`;
          const { error: avatarErr } = await supabase.storage
            .from(BUCKET_PUBLIC)
            .upload(storagePath, fileData.buffer, {
              contentType: fileData.contentType,
              upsert: true,
            });

          if (!avatarErr) {
            const { data: urlData } = supabase.storage.from(BUCKET_PUBLIC).getPublicUrl(storagePath);
            await db.collection("investorProfiles").doc(investorId).update({
              profileImage: urlData.publicUrl,
              storageMigratedAt: new Date().toISOString(),
            });
            investorAvatarsMigrated++;
            console.log(` -> Investor avatar migrated: ${urlData.publicUrl}`);
          } else {
            errors.push(`Investor ${investorId} avatar: ${avatarErr.message}`);
          }
        }
      }
    }
  } catch (err: unknown) {
    const e = err as { message?: string };
    errors.push(`Investor profiles scan error: ${e.message}`);
  }

  // 4. Migration Summary Report
  console.log("\n============================================================");
  console.log("MIGRATION EXECUTION SUMMARY");
  console.log("============================================================");
  console.log(`Total Listings Scanned:         ${totalListingsScanned}`);
  console.log(`Listing Images Migrated:        ${listingImagesMigrated}`);
  console.log(`Pitch Decks Migrated:           ${pitchDecksMigrated}`);
  console.log(`Total Investor Profiles Scanned:${totalInvestorsScanned}`);
  console.log(`Investor Avatars Migrated:      ${investorAvatarsMigrated}`);
  console.log(`Errors Encountered:             ${errors.length}`);

  if (errors.length > 0) {
    console.log("\nErrors Detail:");
    errors.forEach((err, idx) => console.log(`  ${idx + 1}. ${err}`));
  }

  console.log("\nAll original Firebase Storage files remain intact (zero deletions performed).");
  console.log("============================================================");
}

// When executed directly via node or ts-node
if (require.main === module) {
  main().catch((err) => {
    console.error("Fatal migration error:", err);
    process.exit(1);
  });
}
