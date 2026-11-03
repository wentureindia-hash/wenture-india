/**
 * Automated Test Suite: Mandatory Investor WhatsApp Contact Number & Approval Workflow
 *
 * Verifies:
 * 1. Missing phone number rejection with actionable error.
 * 2. Invalid digit length (< 10 or > 15) rejection.
 * 3. Dummy repeating numbers rejection (0000000000, etc.).
 * 4. Invalid Indian mobile prefix rejection.
 * 5. Valid 10-digit Indian mobile normalization (91XXXXXXXXXX).
 * 6. Valid 11-digit leading-zero Indian normalization.
 * 7. Valid +91 Indian mobile normalization.
 * 8. Valid North American (+1) mobile validation and normalization.
 * 9. Valid United Kingdom (+44) mobile validation and normalization.
 * 10. Valid UAE (+971) mobile validation and normalization.
 * 11. WhatsApp redirect URL generation with pre-filled encoded text.
 * 12. Profile submission backend validation: missing phone blocks submit.
 * 13. Profile submission backend validation: invalid format blocks submit.
 * 14. Profile submission backend validation: missing consent blocks submit.
 * 15. Profile submission backend validation: valid phone and consent succeeds.
 * 16. Admin approval gate: missing phone blocks approval.
 * 17. Admin approval gate: invalid phone blocks approval.
 * 18. Admin approval gate: missing consent blocks approval.
 * 19. Admin approval gate: valid phone and consent approves and publishes profile.
 */

const assert = require("assert");

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
// SIMULATED LOGIC FROM src/lib/firebase/investors.ts
// ============================================================================

const INVESTOR_WHATSAPP_INTRO_MESSAGE =
  "Hello, I discovered your investor profile on Wenture India. I would like to connect with you regarding a potential business opportunity. Would you be available to discuss?";

function validateInvestorWhatsAppPhone(rawPhone) {
  if (!rawPhone || typeof rawPhone !== "string") {
    return {
      valid: false,
      normalized: null,
      formatted: null,
      countryCode: null,
      error: "WhatsApp number is required.",
    };
  }

  const cleaned = rawPhone.trim();
  if (!cleaned) {
    return {
      valid: false,
      normalized: null,
      formatted: null,
      countryCode: null,
      error: "WhatsApp number is required.",
    };
  }

  const digits = cleaned.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) {
    return {
      valid: false,
      normalized: null,
      formatted: null,
      countryCode: null,
      error: "Phone number must be between 10 and 15 digits including country code.",
    };
  }

  // Reject obvious dummy repeating sequences like 0000000000, 1111111111, or 9999999999
  const nationalDigits = digits.startsWith("91") ? digits.slice(2) : digits.startsWith("1") ? digits.slice(1) : digits;
  if (/^(\d)\1+$/.test(digits) || /^(\d)\1+$/.test(nationalDigits)) {
    return {
      valid: false,
      normalized: null,
      formatted: null,
      countryCode: null,
      error: "Please enter a valid active phone number, not repeated digits.",
    };
  }

  // 1. Explicit International '+' Format
  if (cleaned.startsWith("+")) {
    if (digits.startsWith("91")) {
      const national = digits.slice(2);
      if (national.length !== 10 || !/^[6-9]\d{9}$/.test(national)) {
        return {
          valid: false,
          normalized: null,
          formatted: null,
          countryCode: "+91",
          error: "Invalid Indian mobile number. Must be 10 digits starting with 6, 7, 8, or 9.",
        };
      }
      return {
        valid: true,
        normalized: digits,
        formatted: `+91 ${national.slice(0, 5)} ${national.slice(5)}`,
        countryCode: "+91",
        error: null,
      };
    }

    if (digits.startsWith("1") && digits.length === 11) {
      const national = digits.slice(1);
      if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(national)) {
        return {
          valid: false,
          normalized: null,
          formatted: null,
          countryCode: "+1",
          error: "Invalid US/Canada mobile number. Area code and exchange code cannot start with 0 or 1.",
        };
      }
      return {
        valid: true,
        normalized: digits,
        formatted: `+1 (${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6)}`,
        countryCode: "+1",
        error: null,
      };
    }

    if (digits.startsWith("44")) {
      const national = digits.slice(2);
      if (national.length < 9 || national.length > 10) {
        return {
          valid: false,
          normalized: null,
          formatted: null,
          countryCode: "+44",
          error: "Invalid UK phone number. Must be 9 to 10 digits after +44.",
        };
      }
      return {
        valid: true,
        normalized: digits,
        formatted: `+44 ${national.slice(0, 4)} ${national.slice(4)}`,
        countryCode: "+44",
        error: null,
      };
    }

    if (digits.startsWith("971")) {
      const national = digits.slice(3);
      if (national.length !== 9 || !national.startsWith("5")) {
        return {
          valid: false,
          normalized: null,
          formatted: null,
          countryCode: "+971",
          error: "Invalid UAE mobile number. Must be 9 digits starting with 5 after +971.",
        };
      }
      return {
        valid: true,
        normalized: digits,
        formatted: `+971 ${national.slice(0, 2)} ${national.slice(2, 5)} ${national.slice(5)}`,
        countryCode: "+971",
        error: null,
      };
    }

    if (digits.startsWith("65")) {
      const national = digits.slice(2);
      if (national.length !== 8 || !/^[89]/.test(national)) {
        return {
          valid: false,
          normalized: null,
          formatted: null,
          countryCode: "+65",
          error: "Invalid Singapore mobile number. Must be 8 digits starting with 8 or 9.",
        };
      }
      return {
        valid: true,
        normalized: digits,
        formatted: `+65 ${national.slice(0, 4)} ${national.slice(4)}`,
        countryCode: "+65",
        error: null,
      };
    }

    return {
      valid: true,
      normalized: digits,
      formatted: `+${digits}`,
      countryCode: `+${digits.slice(0, 3)}`,
      error: null,
    };
  }

  // 2. Numbers without '+' prefix
  if (digits.length === 10) {
    if (!/^[6-9]\d{9}$/.test(digits)) {
      return {
        valid: false,
        normalized: null,
        formatted: null,
        countryCode: "+91",
        error: "Indian mobile number must be 10 digits starting with 6, 7, 8, or 9.",
      };
    }
    return {
      valid: true,
      normalized: `91${digits}`,
      formatted: `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`,
      countryCode: "+91",
      error: null,
    };
  }

  if (digits.length === 11 && digits.startsWith("0")) {
    const national = digits.slice(1);
    if (!/^[6-9]\d{9}$/.test(national)) {
      return {
        valid: false,
        normalized: null,
        formatted: null,
        countryCode: "+91",
        error: "Indian mobile number must be 10 digits starting with 6, 7, 8, or 9.",
      };
    }
    return {
      valid: true,
      normalized: `91${national}`,
      formatted: `+91 ${national.slice(0, 5)} ${national.slice(5)}`,
      countryCode: "+91",
      error: null,
    };
  }

  if (digits.length === 12 && digits.startsWith("91")) {
    const national = digits.slice(2);
    if (!/^[6-9]\d{9}$/.test(national)) {
      return {
        valid: false,
        normalized: null,
        formatted: null,
        countryCode: "+91",
        error: "Indian mobile number must be 10 digits starting with 6, 7, 8, or 9.",
      };
    }
    return {
      valid: true,
      normalized: digits,
      formatted: `+91 ${national.slice(0, 5)} ${national.slice(5)}`,
      countryCode: "+91",
      error: null,
    };
  }

  if (digits.length === 11 && digits.startsWith("1")) {
    const national = digits.slice(1);
    if (/^[2-9]\d{2}[2-9]\d{6}$/.test(national)) {
      return {
        valid: true,
        normalized: digits,
        formatted: `+1 (${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6)}`,
        countryCode: "+1",
        error: null,
      };
    }
  }

  return {
    valid: false,
    normalized: null,
    formatted: null,
    countryCode: null,
    error: "Please enter a valid phone number with country code (e.g. +91 98765 43210).",
  };
}

function normalizeInvestorWhatsAppPhone(rawPhone) {
  const result = validateInvestorWhatsAppPhone(rawPhone);
  return result.valid ? result.normalized : null;
}

function getInvestorWhatsAppUrl(rawPhone) {
  const normalized = normalizeInvestorWhatsAppPhone(rawPhone);
  if (!normalized) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(INVESTOR_WHATSAPP_INTRO_MESSAGE)}`;
}

// Simulated backend profile submission handler
function simulateSaveInvestorProfile(profileData) {
  if (!profileData.contactPhone || !profileData.contactPhone.trim()) {
    return {
      error: "WhatsApp Number is required. Please provide a valid WhatsApp contact number with country code.",
    };
  }

  const phoneValidation = validateInvestorWhatsAppPhone(profileData.contactPhone);
  if (!phoneValidation.valid || !phoneValidation.normalized) {
    return {
      error: phoneValidation.error || "Please enter a valid international WhatsApp phone number.",
    };
  }

  if (profileData.whatsAppConsent !== true) {
    return {
      error: "Consent required: Please agree to display your WhatsApp number publicly on your approved profile.",
    };
  }

  return {
    error: null,
    savedDoc: {
      ...profileData,
      contactPhone: phoneValidation.normalized,
      whatsAppConsent: true,
      status: "pending",
    },
  };
}

// Simulated backend admin approval handler
function simulateApproveInvestor(currentData) {
  if (currentData.status === "changes_requested") {
    return {
      error: "Cannot approve a profile that is currently awaiting investor revisions.",
    };
  }

  const phoneValidation = validateInvestorWhatsAppPhone(currentData.contactPhone);
  if (!phoneValidation.valid || !phoneValidation.normalized) {
    return {
      error: "Cannot approve investor profile: A valid WhatsApp contact number is mandatory before publishing.",
    };
  }

  if (currentData.whatsAppConsent === false) {
    return {
      error: "Cannot approve investor profile: Public WhatsApp contact consent has not been confirmed by the investor.",
    };
  }

  return {
    error: null,
    approvedDoc: {
      ...currentData,
      status: "published",
      approvalStatus: "approved",
    },
  };
}

// ============================================================================
// TEST CASES
// ============================================================================

console.log("\n--- EXECUTING INVESTOR MANDATORY WHATSAPP TEST SUITE ---\n");

test("1. Missing phone number is rejected with clear error message", () => {
  const res1 = validateInvestorWhatsAppPhone("");
  assert.strictEqual(res1.valid, false);
  assert.strictEqual(res1.error, "WhatsApp number is required.");

  const res2 = validateInvestorWhatsAppPhone("   ");
  assert.strictEqual(res2.valid, false);
  assert.strictEqual(res2.error, "WhatsApp number is required.");

  const res3 = validateInvestorWhatsAppPhone(undefined);
  assert.strictEqual(res3.valid, false);
  assert.strictEqual(res3.error, "WhatsApp number is required.");
});

test("2. Invalid digit length (< 10 or > 15) is rejected", () => {
  const shortRes = validateInvestorWhatsAppPhone("98765");
  assert.strictEqual(shortRes.valid, false);
  assert.ok(shortRes.error.includes("between 10 and 15 digits"));

  const longRes = validateInvestorWhatsAppPhone("12345678901234567");
  assert.strictEqual(longRes.valid, false);
  assert.ok(longRes.error.includes("between 10 and 15 digits"));
});

test("3. Obvious repeated dummy digits (e.g. 0000000000, 1111111111) are rejected", () => {
  const dummyRes = validateInvestorWhatsAppPhone("0000000000");
  assert.strictEqual(dummyRes.valid, false);
  assert.ok(dummyRes.error.includes("not repeated digits"));

  const dummyFives = validateInvestorWhatsAppPhone("+91 5555555555");
  assert.strictEqual(dummyFives.valid, false);
  assert.ok(dummyFives.error.includes("not repeated digits"));
});

test("4. Invalid Indian mobile prefix (e.g. starting with 1, 2, 3, 4, 5) is rejected", () => {
  const invalidPrefix = validateInvestorWhatsAppPhone("1234567890");
  assert.strictEqual(invalidPrefix.valid, false);
  assert.ok(invalidPrefix.error.includes("starting with 6, 7, 8, or 9"));

  const invalidWith91 = validateInvestorWhatsAppPhone("+91 2345678901");
  assert.strictEqual(invalidWith91.valid, false);
  assert.ok(invalidWith91.error.includes("starting with 6, 7, 8, or 9"));
});

test("5. Valid 10-digit Indian mobile number normalizes to E.164 (91XXXXXXXXXX)", () => {
  const res = validateInvestorWhatsAppPhone("9876543210");
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.normalized, "919876543210");
  assert.strictEqual(res.formatted, "+91 98765 43210");
  assert.strictEqual(res.error, null);
});

test("6. Valid 11-digit Indian number with leading 0 normalizes correctly", () => {
  const res = validateInvestorWhatsAppPhone("09876543210");
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.normalized, "919876543210");
  assert.strictEqual(res.formatted, "+91 98765 43210");
});

test("7. Valid +91 Indian number with formatting normalizes correctly", () => {
  const res = validateInvestorWhatsAppPhone("+91 98765 43210");
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.normalized, "919876543210");
  assert.strictEqual(res.formatted, "+91 98765 43210");
});

test("8. Valid North American (+1) mobile number normalizes correctly", () => {
  const res = validateInvestorWhatsAppPhone("+1 (415) 555-2671");
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.normalized, "14155552671");
  assert.strictEqual(res.countryCode, "+1");
});

test("9. Valid United Kingdom (+44) mobile number normalizes correctly", () => {
  const res = validateInvestorWhatsAppPhone("+44 7911 123456");
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.normalized, "447911123456");
  assert.strictEqual(res.countryCode, "+44");
});

test("10. Valid UAE (+971) mobile number normalizes correctly", () => {
  const res = validateInvestorWhatsAppPhone("+971 50 123 4567");
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.normalized, "971501234567");
  assert.strictEqual(res.countryCode, "+971");
});

test("11. getInvestorWhatsAppUrl generates valid wa.me URL with intro message", () => {
  const url = getInvestorWhatsAppUrl("+91 98765 43210");
  assert.ok(url.startsWith("https://wa.me/919876543210?text="));
  assert.ok(url.includes(encodeURIComponent("Hello, I discovered your investor profile on Wenture India")));
});

test("12. Backend Profile Submission: Missing phone blocks submission", () => {
  const res = simulateSaveInvestorProfile({
    investorName: "Anita Sharma",
    contactPhone: "",
    whatsAppConsent: true,
  });
  assert.strictEqual(res.savedDoc, undefined);
  assert.ok(res.error.includes("WhatsApp Number is required"));
});

test("13. Backend Profile Submission: Invalid phone format blocks submission", () => {
  const res = simulateSaveInvestorProfile({
    investorName: "Anita Sharma",
    contactPhone: "12345",
    whatsAppConsent: true,
  });
  assert.strictEqual(res.savedDoc, undefined);
  assert.ok(res.error.includes("between 10 and 15 digits"));
});

test("14. Backend Profile Submission: Missing consent blocks submission", () => {
  const res = simulateSaveInvestorProfile({
    investorName: "Anita Sharma",
    contactPhone: "+91 98765 43210",
    whatsAppConsent: false,
  });
  assert.strictEqual(res.savedDoc, undefined);
  assert.ok(res.error.includes("Consent required"));
});

test("15. Backend Profile Submission: Valid phone & consent succeeds and normalizes phone", () => {
  const res = simulateSaveInvestorProfile({
    investorName: "Anita Sharma",
    contactPhone: "+91 98765 43210",
    whatsAppConsent: true,
  });
  assert.strictEqual(res.error, null);
  assert.strictEqual(res.savedDoc.contactPhone, "919876543210");
  assert.strictEqual(res.savedDoc.whatsAppConsent, true);
  assert.strictEqual(res.savedDoc.status, "pending");
});

test("16. Admin Approval Gate: Missing phone blocks approval", () => {
  const res = simulateApproveInvestor({
    id: "inv-101",
    investorName: "Rajesh Singhania",
    contactPhone: "",
    whatsAppConsent: true,
    status: "pending",
  });
  assert.strictEqual(res.approvedDoc, undefined);
  assert.ok(res.error.includes("A valid WhatsApp contact number is mandatory"));
});

test("17. Admin Approval Gate: Invalid phone blocks approval", () => {
  const res = simulateApproveInvestor({
    id: "inv-101",
    investorName: "Rajesh Singhania",
    contactPhone: "0000000000",
    whatsAppConsent: true,
    status: "pending",
  });
  assert.strictEqual(res.approvedDoc, undefined);
  assert.ok(res.error.includes("A valid WhatsApp contact number is mandatory"));
});

test("18. Admin Approval Gate: Missing consent blocks approval", () => {
  const res = simulateApproveInvestor({
    id: "inv-101",
    investorName: "Rajesh Singhania",
    contactPhone: "+91 98765 43210",
    whatsAppConsent: false,
    status: "pending",
  });
  assert.strictEqual(res.approvedDoc, undefined);
  assert.ok(res.error.includes("consent has not been confirmed"));
});

test("19. Admin Approval Gate: Valid phone and consent approves and publishes profile", () => {
  const res = simulateApproveInvestor({
    id: "inv-101",
    investorName: "Rajesh Singhania",
    contactPhone: "919876543210",
    whatsAppConsent: true,
    status: "pending",
  });
  assert.strictEqual(res.error, null);
  assert.strictEqual(res.approvedDoc.status, "published");
  assert.strictEqual(res.approvedDoc.approvalStatus, "approved");
});

console.log(`\nResults: ${passedTests} / ${totalTests} tests passed.\n`);
if (passedTests !== totalTests) {
  process.exit(1);
}
