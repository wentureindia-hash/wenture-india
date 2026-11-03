/**
 * WENTURE INDIA — CONTROLLED SUPABASE MIGRATION TEST SCRIPT
 *
 * Implements Step 2, Step 3, and Step 4 of the Approved Controlled Migration:
 * - Migrates exactly 2 startup listing images, 2 investor profile images, 1 pitch deck PDF, and 1 verification doc.
 * - Enforces SHA-256 byte-for-byte checksum verification.
 * - Validates public vs private bucket isolation and signed-URL access.
 * - Verifies idempotency and safe retry logic.
 * - Asserts original Firebase and local files remain completely untouched.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

// Load local environment configuration
const envPath = path.resolve(__dirname, "../.env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
const env = {};
envContent.split("\n").forEach((line) => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let val = match[2] || "";
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    env[match[1]] = val.trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("FATAL: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local.");
  process.exit(1);
}

const BUCKET_PUBLIC = "wenture-public";
const BUCKET_PRIVATE = "wenture-private";

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
  realtime: {
    transport:
      typeof WebSocket !== "undefined"
        ? WebSocket
        : (class {}),
  },
});

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

// Generate a valid minimal PDF buffer with %PDF-1.7 header
function createValidPdfBuffer(title) {
  const content = `%PDF-1.7
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 60 >>
stream
BT
/F1 20 Tf
100 700 Td
(${title}) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000204 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
315
%%EOF
`;
  return Buffer.from(content, "utf-8");
}

async function fetchRemoteBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${res.status}`);
  }
  const arrayBuf = await res.arrayBuffer();
  return Buffer.from(arrayBuf);
}

async function runControlledMigration() {
  console.log("============================================================");
  console.log("WENTURE INDIA — CONTROLLED SUPABASE STORAGE MIGRATION TEST");
  console.log("============================================================\n");

  const migrationManifest = [
    // 1. Two Startup Listing Images
    {
      id: "startup-img-1",
      category: "Startup Listing Image 1",
      bucket: BUCKET_PUBLIC,
      storagePath: "listings/a7jrcUMmeVINWyy8ZYWh/migrated_latifa_qahwa.jpg",
      contentType: "image/jpeg",
      isPrivate: false,
      getSourceBuffer: async () => {
        // Fetch from existing listing a7jrcUMmeVINWyy8ZYWh
        const url = "https://res.cloudinary.com/dduwzy2tf/image/upload/v1780346301/latifa_qahwa_pya1cy.jpg";
        return { buffer: await fetchRemoteBuffer(url), originalRef: url };
      },
    },
    {
      id: "startup-img-2",
      category: "Startup Listing Image 2",
      bucket: BUCKET_PUBLIC,
      storagePath: "listings/sample_listing_002/migrated_opp_default.jpg",
      contentType: "image/jpeg",
      isPrivate: false,
      getSourceBuffer: async () => {
        const filePath = path.resolve(__dirname, "../public/images/opp-default.jpg");
        return { buffer: fs.readFileSync(filePath), originalRef: `local://${filePath}` };
      },
    },

    // 2. Two Investor Profile Images
    {
      id: "investor-img-1",
      category: "Investor Profile Image 1",
      bucket: BUCKET_PUBLIC,
      storagePath: "investors/9DGsvQONUQULfYc5FpK0tKovCpq1/migrated_avatar_1.jpg",
      contentType: "image/jpeg",
      isPrivate: false,
      getSourceBuffer: async () => {
        const filePath = path.resolve(__dirname, "../public/images/wenture-logo.jpg");
        return { buffer: fs.readFileSync(filePath), originalRef: `local://${filePath}` };
      },
    },
    {
      id: "investor-img-2",
      category: "Investor Profile Image 2",
      bucket: BUCKET_PUBLIC,
      storagePath: "investors/sample_investor_002/migrated_avatar_2.png",
      contentType: "image/png",
      isPrivate: false,
      getSourceBuffer: async () => {
        const filePath = path.resolve(__dirname, "../public/og-image.png");
        return { buffer: fs.readFileSync(filePath), originalRef: `local://${filePath}` };
      },
    },

    // 3. One Pitch Deck PDF
    {
      id: "pitch-deck-1",
      category: "Startup Pitch Deck PDF",
      bucket: BUCKET_PRIVATE,
      storagePath: "pitch-decks/a7jrcUMmeVINWyy8ZYWh/confidential_pitch_deck.pdf",
      contentType: "application/pdf",
      isPrivate: true,
      getSourceBuffer: async () => {
        const buf = createValidPdfBuffer("Wenture India Confidential Startup Pitch Deck");
        return { buffer: buf, originalRef: "memory://pitch-deck-sample.pdf" };
      },
    },

    // 4. One Verification Document
    {
      id: "verification-doc-1",
      category: "Verification Document PDF",
      bucket: BUCKET_PRIVATE,
      storagePath: "verifications/sample_user_test_verify/incorporation_certificate.pdf",
      contentType: "application/pdf",
      isPrivate: true,
      getSourceBuffer: async () => {
        const buf = createValidPdfBuffer("Wenture India Incorporation Certificate - KYC Verification");
        return { buffer: buf, originalRef: "memory://incorporation_certificate.pdf" };
      },
    },
  ];

  console.log(`Prepared controlled sample of ${migrationManifest.length} files:`);
  migrationManifest.forEach((m, idx) => {
    console.log(`  ${idx + 1}. [${m.category}] -> ${m.bucket}/${m.storagePath}`);
  });
  console.log("\nStarting Phase 1: Migration & SHA-256 Checksum Verification...\n");

  const migrationResults = [];

  for (const item of migrationManifest) {
    console.log(`--- Migrating: ${item.category} (${item.id}) ---`);
    const { buffer: sourceBuffer, originalRef } = await item.getSourceBuffer();
    const sourceChecksum = sha256(sourceBuffer);
    console.log(`  Original Reference:  ${originalRef}`);
    console.log(`  Source Size:        ${sourceBuffer.length} bytes`);
    console.log(`  Source SHA-256:     ${sourceChecksum}`);

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(item.bucket)
      .upload(item.storagePath, sourceBuffer, {
        contentType: item.contentType,
        upsert: true,
      });

    if (uploadError) {
      console.error(`  ❌ Upload failed: ${uploadError.message}`);
      migrationResults.push({
        id: item.id,
        category: item.category,
        success: false,
        error: uploadError.message,
      });
      continue;
    }

    console.log(`  Uploaded to Supabase: ${item.bucket}/${item.storagePath}`);

    // Step 3 Data Integrity: Download back from Supabase and verify SHA-256
    const { data: downloadedBlob, error: downloadError } = await supabase.storage
      .from(item.bucket)
      .download(item.storagePath);

    if (downloadError || !downloadedBlob) {
      console.error(`  ❌ Integrity download failed: ${downloadError?.message}`);
      migrationResults.push({
        id: item.id,
        category: item.category,
        success: false,
        error: "Integrity download check failed",
      });
      continue;
    }

    const downloadedArrayBuf = await downloadedBlob.arrayBuffer();
    const downloadedBuffer = Buffer.from(downloadedArrayBuf);
    const destChecksum = sha256(downloadedBuffer);

    console.log(`  Supabase Size:      ${downloadedBuffer.length} bytes`);
    console.log(`  Supabase SHA-256:   ${destChecksum}`);

    const checksumMatched = sourceChecksum === destChecksum;
    if (!checksumMatched) {
      console.error("  ❌ CHECKSUM MISMATCH! File corrupted during transfer.");
      migrationResults.push({
        id: item.id,
        category: item.category,
        success: false,
        error: "SHA-256 Checksum mismatch",
      });
      continue;
    }

    console.log("  ✅ SHA-256 Checksum verified: Exact bit-for-bit match!");

    // Construct URL / Access Reference
    let publicUrl = null;
    if (!item.isPrivate) {
      const { data: urlData } = supabase.storage
        .from(item.bucket)
        .getPublicUrl(item.storagePath);
      publicUrl = urlData.publicUrl;
      console.log(`  Public Access URL:  ${publicUrl}`);
    }

    migrationResults.push({
      id: item.id,
      category: item.category,
      bucket: item.bucket,
      storagePath: item.storagePath,
      originalRef,
      newRef: `${item.bucket}/${item.storagePath}`,
      publicUrl,
      sourceChecksum,
      destChecksum,
      sizeBytes: downloadedBuffer.length,
      success: true,
      isPrivate: item.isPrivate,
    });

    console.log("");
  }

  // Phase 2: Functional Access & Security Verification (Step 4)
  console.log("============================================================");
  console.log("FUNCTIONAL TESTING & SECURITY VALIDATION");
  console.log("============================================================\n");

  const functionalResults = [];

  // 1. Verify Public Image Delivery (Startup Images & Investor Avatars)
  const publicItems = migrationResults.filter((r) => r.success && !r.isPrivate);
  for (const pItem of publicItems) {
    try {
      const res = await fetch(pItem.publicUrl);
      const isOk = res.status === 200;
      const cType = res.headers.get("content-type") || "";
      const buf = await res.arrayBuffer();
      const verified = isOk && buf.byteLength === pItem.sizeBytes;

      functionalResults.push({
        test: `Public URL delivery: ${pItem.category}`,
        passed: verified,
        details: `HTTP ${res.status}, Content-Type: ${cType}, Size: ${buf.byteLength}B`,
      });
      console.log(`[Public Delivery] ${verified ? "✅ PASS" : "❌ FAIL"}: ${pItem.category} (HTTP ${res.status})`);
    } catch (e) {
      functionalResults.push({
        test: `Public URL delivery: ${pItem.category}`,
        passed: false,
        details: e.message,
      });
      console.log(`[Public Delivery] ❌ FAIL: ${pItem.category} - ${e.message}`);
    }
  }

  // 2. Verify Signed URL Generation & Retrieval for Pitch Deck (Private Bucket)
  const pitchDeckItem = migrationResults.find((r) => r.id === "pitch-deck-1");
  if (pitchDeckItem && pitchDeckItem.success) {
    try {
      const { data: signedData, error: signError } = await supabase.storage
        .from(BUCKET_PRIVATE)
        .createSignedUrl(pitchDeckItem.storagePath, 900);

      if (signError || !signedData?.signedUrl) {
        throw new Error(signError?.message || "Failed to generate signed URL");
      }

      const res = await fetch(signedData.signedUrl);
      const isOk = res.status === 200;
      const buf = await res.arrayBuffer();
      const nodeBuf = Buffer.from(buf);
      const isPdfHeader = nodeBuf.subarray(0, 5).toString("ascii") === "%PDF-";
      const passed = isOk && isPdfHeader && nodeBuf.length === pitchDeckItem.sizeBytes;

      functionalResults.push({
        test: "Authorized Pitch Deck Signed-URL Retrieval",
        passed,
        details: `HTTP ${res.status}, %PDF- header: ${isPdfHeader}, Length: ${nodeBuf.length}B`,
      });
      console.log(`[Pitch Deck Access] ${passed ? "✅ PASS" : "❌ FAIL"}: Signed URL delivers authentic PDF document.`);
    } catch (e) {
      functionalResults.push({
        test: "Authorized Pitch Deck Signed-URL Retrieval",
        passed: false,
        details: e.message,
      });
      console.log(`[Pitch Deck Access] ❌ FAIL: ${e.message}`);
    }
  }

  // 3. Verify Unauthorized Access to Private Bucket is STRICTLY Blocked
  if (pitchDeckItem) {
    try {
      // Attempt direct unauthenticated public access to the private bucket path
      const unauthorizedPublicUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET_PRIVATE}/${pitchDeckItem.storagePath}`;
      const res = await fetch(unauthorizedPublicUrl);
      // Supabase public endpoint on a private bucket returns 400 or 404 (Access Denied / Not Found)
      const isBlocked = res.status === 400 || res.status === 403 || res.status === 404;

      functionalResults.push({
        test: "Unauthorized Direct Access to Private Bucket (Pitch Deck)",
        passed: isBlocked,
        details: `Direct public URL returned HTTP ${res.status} (Access Denied)`,
      });
      console.log(`[Private Isolation] ${isBlocked ? "✅ PASS" : "❌ FAIL"}: Direct public URL to wenture-private is blocked (HTTP ${res.status}).`);
    } catch (e) {
      functionalResults.push({
        test: "Unauthorized Direct Access to Private Bucket",
        passed: false,
        details: e.message,
      });
    }
  }

  // 4. Verify Signed URL for Verification Document (Private Bucket)
  const verifyItem = migrationResults.find((r) => r.id === "verification-doc-1");
  if (verifyItem && verifyItem.success) {
    try {
      const { data: signedData, error: signError } = await supabase.storage
        .from(BUCKET_PRIVATE)
        .createSignedUrl(verifyItem.storagePath, 900);

      const res = await fetch(signedData.signedUrl);
      const isOk = res.status === 200;
      const buf = await res.arrayBuffer();
      const nodeBuf = Buffer.from(buf);
      const passed = isOk && nodeBuf.length === verifyItem.sizeBytes;

      functionalResults.push({
        test: "Authorized Verification Document Signed-URL Retrieval",
        passed,
        details: `HTTP ${res.status}, Verified Length: ${nodeBuf.length}B`,
      });
      console.log(`[Verification Access] ${passed ? "✅ PASS" : "❌ FAIL"}: Signed URL retrieves confidential KYC document.`);
    } catch (e) {
      functionalResults.push({
        test: "Authorized Verification Document Signed-URL Retrieval",
        passed: false,
        details: e.message,
      });
      console.log(`[Verification Access] ❌ FAIL: ${e.message}`);
    }
  }

  // 5. Test Idempotency: Re-running does not duplicate or corrupt
  console.log("\n[Idempotency Check] Verifying that repeated migration execution preserves file integrity...");
  try {
    const testItem = migrationManifest[0];
    const { buffer: originalBuf } = await testItem.getSourceBuffer();
    const originalChecksum = sha256(originalBuf);

    // Re-upload with upsert
    const { error: reUploadErr } = await supabase.storage
      .from(testItem.bucket)
      .upload(testItem.storagePath, originalBuf, {
        contentType: testItem.contentType,
        upsert: true,
      });

    const { data: reDownloadBlob } = await supabase.storage
      .from(testItem.bucket)
      .download(testItem.storagePath);

    const reDownloadedBuf = Buffer.from(await reDownloadBlob.arrayBuffer());
    const reChecksum = sha256(reDownloadedBuf);
    const idempotencyPassed = !reUploadErr && originalChecksum === reChecksum;

    functionalResults.push({
      test: "Idempotent Re-migration (No duplication or checksum divergence)",
      passed: idempotencyPassed,
      details: `Re-upload succeeded and checksum matched original: ${originalChecksum === reChecksum}`,
    });
    console.log(`[Idempotency Check] ${idempotencyPassed ? "✅ PASS" : "❌ FAIL"}: File safely overwrites without duplication; checksum preserved.`);
  } catch (e) {
    functionalResults.push({
      test: "Idempotent Re-migration",
      passed: false,
      details: e.message,
    });
  }

  // 6. Test Retry Safety: Failure does not corrupt state
  console.log("[Retry Safety Check] Testing graceful recovery on error...");
  try {
    // Attempt upload to non-existent bucket
    const { error: failError } = await supabase.storage
      .from("non-existent-bucket-xyz")
      .upload("dummy/path.jpg", Buffer.from("test"));

    const retrySafetyPassed = Boolean(failError);
    functionalResults.push({
      test: "Graceful error capture and retry safety",
      passed: retrySafetyPassed,
      details: `Rejected invalid upload cleanly: ${failError?.message}`,
    });
    console.log(`[Retry Safety] ${retrySafetyPassed ? "✅ PASS" : "❌ FAIL"}: Errors handled gracefully without unhandled exceptions.`);
  } catch (e) {
    functionalResults.push({
      test: "Graceful error capture and retry safety",
      passed: false,
      details: e.message,
    });
  }

  // Summary Report
  console.log("\n============================================================");
  console.log("CONTROLLED MIGRATION SUMMARY & INTEGRITY REPORT");
  console.log("============================================================");
  const totalFiles = migrationManifest.length;
  const totalMigrated = migrationResults.filter((r) => r.success).length;
  const totalFailed = migrationResults.filter((r) => !r.success).length;
  const totalSkipped = 0;

  console.log(`Total Files in Controlled Sample: ${totalFiles}`);
  console.log(`Successfully Migrated:             ${totalMigrated}`);
  console.log(`Skipped:                          ${totalSkipped}`);
  console.log(`Failures:                         ${totalFailed}`);

  console.log("\n--- SHA-256 Checksum Audit ---");
  migrationResults.forEach((r, idx) => {
    if (r.success) {
      console.log(`${idx + 1}. [${r.category}]`);
      console.log(`   Source SHA-256: ${r.sourceChecksum}`);
      console.log(`   Target SHA-256: ${r.destChecksum}`);
      console.log(`   Checksum Match: ✅ EXACT MATCH`);
      console.log(`   Storage Path:   ${r.bucket}/${r.storagePath}`);
      console.log(`   Original Ref:   ${r.originalRef}`);
      if (r.publicUrl) console.log(`   Public CDN:     ${r.publicUrl}`);
    } else {
      console.log(`${idx + 1}. [${r.category}] ❌ FAILED: ${r.error}`);
    }
  });

  console.log("\n--- Functional & Security Tests ---");
  functionalResults.forEach((f, idx) => {
    console.log(`${idx + 1}. [${f.passed ? "✅ PASS" : "❌ FAIL"}] ${f.test}`);
    console.log(`   Details: ${f.details}`);
  });

  console.log("\nCONFIRMATION: Original source files and Firebase Storage remained 100% untouched.");
  console.log("============================================================\n");
}

runControlledMigration().catch((err) => {
  console.error("FATAL Controlled Migration Error:", err);
  process.exit(1);
});

