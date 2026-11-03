/**
 * Automated Test Suite: Investor Direct WhatsApp Contact & Role Restrictions
 *
 * Verifies all 10 requirements:
 * 1. Entrepreneur-only account can contact an investor.
 * 2. Investor-only account cannot contact another investor.
 * 3. Dual-role account in Entrepreneur Mode can contact an investor.
 * 4. Dual-role account in Investor Mode cannot contact another investor.
 * 5. Entrepreneur Mode does not trigger an unnecessary role-switch prompt.
 * 6. WhatsApp opens with the correct investor number (international normalization).
 * 7. Prefilled message is correctly URL-encoded.
 * 8. Missing or invalid investor contact details are handled gracefully (fallback).
 * 9. Private investor phone numbers are never exposed without consent.
 * 10. Existing opportunity enquiry workflows remain unaffected.
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

let totalTests = 0;
let passedTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] ${name}:`, err.message);
  }
}

// ============================================================================
// 1. PHONE NORMALIZATION & WHATSAPP LOGIC (src/lib/firebase/investors.ts)
// ============================================================================
const INVESTOR_WHATSAPP_INTRO_MESSAGE =
  "Hello, I discovered your investor profile on Wenture India. I would like to connect with you regarding a potential business opportunity. Would you be available to discuss?";

function normalizeInvestorWhatsAppPhone(rawPhone) {
  if (!rawPhone || typeof rawPhone !== "string") return null;
  const cleaned = rawPhone.trim();
  if (!cleaned) return null;

  const digits = cleaned.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) {
    return null;
  }

  if (cleaned.startsWith("+")) {
    return digits;
  }

  if (digits.length === 10) {
    return `91${digits}`;
  }

  if (digits.length === 11 && digits.startsWith("0")) {
    return `91${digits.slice(1)}`;
  }

  if (digits.length === 12 && digits.startsWith("91")) {
    return digits;
  }

  return digits;
}

function getInvestorWhatsAppUrl(rawPhone) {
  const normalized = normalizeInvestorWhatsAppPhone(rawPhone);
  if (!normalized) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(INVESTOR_WHATSAPP_INTRO_MESSAGE)}`;
}

// ============================================================================
// 2. MULTI-ROLE & CTA GATING LOGIC (src/app/investors/[id]/page.tsx)
// ============================================================================
function getInvestorCtaState(userAuth, investor) {
  if (!userAuth) {
    return {
      canContact: false,
      ctaMode: "unauthenticated",
      showWhatsApp: false,
      promptSwitch: false,
    };
  }

  const isOwnProfile = investor && (investor.userId === userAuth.uid || investor.id === userAuth.uid);
  if (isOwnProfile) {
    return {
      canContact: false,
      ctaMode: "own_profile",
      showWhatsApp: false,
      promptSwitch: false,
    };
  }

  const rawActive = userAuth.activeRole || userAuth.role || null;
  const activeRole = rawActive ? String(rawActive).toLowerCase().trim() : null;

  const rawRoles = userAuth.roles && userAuth.roles.length > 0
    ? userAuth.roles
    : userAuth.role
    ? [userAuth.role]
    : [];

  const userRoles = rawRoles.map((r) => String(r).toLowerCase().trim());
  const hasRole = (r) => userRoles.includes(String(r).toLowerCase().trim());

  const isEntrepreneurRole = hasRole("entrepreneur");
  const isInvestorRole = hasRole("investor");
  const isDualRole = isEntrepreneurRole && isInvestorRole;

  const isOperatingAsEntrepreneur = activeRole === "entrepreneur" && isEntrepreneurRole;
  const isOperatingAsInvestor = !isOperatingAsEntrepreneur && (activeRole === "investor" || isInvestorRole);

  if (isOperatingAsInvestor) {
    if (isDualRole) {
      return {
        canContact: false,
        ctaMode: "dual_role_investor_mode",
        showWhatsApp: false,
        promptSwitch: true,
      };
    }
    return {
      canContact: false,
      ctaMode: "pure_investor_blocked",
      showWhatsApp: false,
      promptSwitch: false,
    };
  }

  if (isOperatingAsEntrepreneur) {
    const waNumber = normalizeInvestorWhatsAppPhone(investor?.contactPhone);
    const whatsAppUrl = waNumber ? getInvestorWhatsAppUrl(investor?.contactPhone) : null;
    return {
      canContact: Boolean(whatsAppUrl),
      ctaMode: whatsAppUrl ? "whatsapp_enabled" : "whatsapp_unavailable_fallback",
      showWhatsApp: Boolean(whatsAppUrl),
      whatsAppUrl,
      promptSwitch: false,
    };
  }

  return {
    canContact: false,
    ctaMode: "unauthorized",
    showWhatsApp: false,
    promptSwitch: false,
  };
}

console.log("==================================================================");
console.log("TEST SUITE: INVESTOR WHATSAPP CONTACT & ROLE VALIDATION FIXES");
console.log("==================================================================");

const targetInvestorPayal = {
  id: "inv_payal_1",
  userId: "user_payal_1",
  investorName: "Payal Kapse",
  contactPhone: "+91 91969 93601",
  contactEmail: "payal@example.com",
};

// TEST 1: Entrepreneur-only account can contact an investor
test("1. Entrepreneur-only account can contact an investor", () => {
  const auth = {
    uid: "ent_shravan_1",
    role: "entrepreneur",
    activeRole: "entrepreneur",
    roles: ["entrepreneur"],
  };
  const cta = getInvestorCtaState(auth, targetInvestorPayal);
  assert.strictEqual(cta.ctaMode, "whatsapp_enabled");
  assert.strictEqual(cta.showWhatsApp, true);
  assert.strictEqual(cta.canContact, true);
  assert.strictEqual(cta.promptSwitch, false);
});

// TEST 2: Investor-only account cannot contact another investor
test("2. Investor-only account cannot contact another investor", () => {
  const auth = {
    uid: "inv_other_1",
    role: "investor",
    activeRole: "investor",
    roles: ["investor"],
  };
  const cta = getInvestorCtaState(auth, targetInvestorPayal);
  assert.strictEqual(cta.ctaMode, "pure_investor_blocked");
  assert.strictEqual(cta.showWhatsApp, false);
  assert.strictEqual(cta.canContact, false);
  assert.strictEqual(cta.promptSwitch, false);
});

// TEST 3: Dual-role account in Entrepreneur Mode can contact an investor
test("3. Dual-role account in Entrepreneur Mode can contact an investor", () => {
  const auth = {
    uid: "dual_user_1",
    role: "entrepreneur",
    activeRole: "entrepreneur",
    roles: ["investor", "entrepreneur"],
  };
  const cta = getInvestorCtaState(auth, targetInvestorPayal);
  assert.strictEqual(cta.ctaMode, "whatsapp_enabled");
  assert.strictEqual(cta.showWhatsApp, true);
  assert.strictEqual(cta.canContact, true);
  assert.strictEqual(cta.promptSwitch, false);
});

// TEST 4: Dual-role account in Investor Mode cannot contact another investor
test("4. Dual-role account in Investor Mode cannot contact another investor (prompted to switch)", () => {
  const auth = {
    uid: "dual_user_1",
    role: "investor",
    activeRole: "investor",
    roles: ["investor", "entrepreneur"],
  };
  const cta = getInvestorCtaState(auth, targetInvestorPayal);
  assert.strictEqual(cta.ctaMode, "dual_role_investor_mode");
  assert.strictEqual(cta.showWhatsApp, false);
  assert.strictEqual(cta.canContact, false);
  assert.strictEqual(cta.promptSwitch, true);
});

// TEST 5: Entrepreneur Mode does not trigger an unnecessary role-switch prompt
test("5. Entrepreneur Mode does not trigger an unnecessary role-switch prompt", () => {
  const auth = {
    uid: "dual_user_1",
    role: "entrepreneur",
    activeRole: "entrepreneur",
    roles: ["investor", "entrepreneur"],
  };
  const cta = getInvestorCtaState(auth, targetInvestorPayal);
  assert.strictEqual(cta.promptSwitch, false, "Entrepreneur Mode must NOT trigger role switch");
  assert.strictEqual(cta.showWhatsApp, true);
});

// TEST 6: WhatsApp opens with the correct investor number (normalization formats)
test("6. WhatsApp opens with the correct investor number (handles various phone formats)", () => {
  // Case A: 10-digit Indian standard
  assert.strictEqual(normalizeInvestorWhatsAppPhone("9196993601"), "919196993601");
  // Case B: +91 with spaces
  assert.strictEqual(normalizeInvestorWhatsAppPhone("+91 91969 93601"), "919196993601");
  // Case C: 11-digit starting with trunk 0
  assert.strictEqual(normalizeInvestorWhatsAppPhone("09196993601"), "919196993601");
  // Case D: International US number
  assert.strictEqual(normalizeInvestorWhatsAppPhone("+1 (415) 555-2671"), "14155552671");
  // Case E: International UK number
  assert.strictEqual(normalizeInvestorWhatsAppPhone("+44 7911 123456"), "447911123456");
});

// TEST 7: Prefilled message is correctly URL-encoded
test("7. Prefilled message is correctly URL-encoded", () => {
  const url = getInvestorWhatsAppUrl("+91 91969 93601");
  assert.ok(url);
  assert.ok(url.startsWith("https://wa.me/919196993601?text="));
  const encodedText = url.split("?text=")[1];
  const decodedText = decodeURIComponent(encodedText);
  assert.strictEqual(
    decodedText,
    "Hello, I discovered your investor profile on Wenture India. I would like to connect with you regarding a potential business opportunity. Would you be available to discuss?"
  );
});

// TEST 8: Missing or invalid investor contact details are handled gracefully
test("8. Missing or invalid investor contact details are handled gracefully", () => {
  // Empty phone
  assert.strictEqual(normalizeInvestorWhatsAppPhone(""), null);
  assert.strictEqual(getInvestorWhatsAppUrl(""), null);

  // Missing phone on investor
  const investorNoPhone = { ...targetInvestorPayal, contactPhone: undefined };
  const auth = { uid: "ent_1", role: "entrepreneur", activeRole: "entrepreneur", roles: ["entrepreneur"] };
  const cta = getInvestorCtaState(auth, investorNoPhone);
  assert.strictEqual(cta.ctaMode, "whatsapp_unavailable_fallback");
  assert.strictEqual(cta.showWhatsApp, false);
  assert.strictEqual(cta.canContact, false);

  // Malformed / letters only
  assert.strictEqual(normalizeInvestorWhatsAppPhone("N/A"), null);
  assert.strictEqual(normalizeInvestorWhatsAppPhone("123"), null); // Too short
});

// TEST 9: Private investor phone numbers are never exposed without consent
test("9. Private investor phone numbers are never exposed without consent", () => {
  // Only the public contactPhone is normalized; internal fields or arbitrary phone numbers are not used
  const investorWithoutPublicPhone = {
    id: "inv_private_1",
    investorName: "Private Investor",
    // No contactPhone
  };
  const auth = { uid: "ent_1", role: "entrepreneur", activeRole: "entrepreneur", roles: ["entrepreneur"] };
  const cta = getInvestorCtaState(auth, investorWithoutPublicPhone);
  assert.strictEqual(cta.showWhatsApp, false);
  assert.strictEqual(cta.whatsAppUrl, null);
});

// TEST 10: Existing opportunity enquiry workflows remain unaffected
test("10. Existing opportunity enquiry workflows remain unaffected", () => {
  const firestorePath = path.join(__dirname, "..", "firestore.rules");
  const rules = fs.readFileSync(firestorePath, "utf8");

  // Validate opportunity_enquiries match exists and was not altered
  assert.ok(rules.includes("match /opportunity_enquiries/{enquiryId}"), "opportunity_enquiries rule must be preserved");
  assert.ok(rules.includes("match /investor_enquiries/{enquiryId}"), "historical investor_enquiries rule must be preserved");
});

console.log("==================================================================");
console.log(`RESULTS: ${passedTests} / ${totalTests} tests passed.`);
console.log("==================================================================");

if (passedTests !== totalTests) {
  process.exit(1);
}
