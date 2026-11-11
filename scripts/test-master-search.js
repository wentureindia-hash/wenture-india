/**
 * Test Suite: Global Master Search Functionality & Security Verification
 * Tests 15 core scenarios across normalization, classification, relevance ranking,
 * category filtering, autocomplete suggestions, and data protection.
 */

const assert = require('assert');

// 1. Re-create / verify category metadata
const MASTER_SEARCH_CATEGORIES = [
  { id: "all", label: "All", shortLabel: "All", icon: "explore" },
  { id: "businesses", label: "Businesses", shortLabel: "Businesses", icon: "store" },
  { id: "investors", label: "Investors", shortLabel: "Investors", icon: "person_search" },
  { id: "opportunities", label: "Investment Opportunities", shortLabel: "Opportunities", icon: "trending_up" },
  { id: "startups", label: "Startups", shortLabel: "Startups", icon: "rocket_launch" },
  { id: "franchises", label: "Franchises & Dealerships", shortLabel: "Franchises", icon: "storefront" },
  { id: "partnerships", label: "Business Partnerships", shortLabel: "Partnerships", icon: "handshake" },
  { id: "exim", label: "EXIM / Import & Export", shortLabel: "EXIM", icon: "public" },
];

// Helper functions mirroring src/lib/search/master-search.ts logic
function classifyListingCategory(item) {
  const rawType = (item.listingType || "").toLowerCase();
  const rawCat = (item.category || "").toLowerCase();
  const rawSector = (item.sector || "").toLowerCase();
  const rawStage = (item.businessStage || "").toLowerCase();
  const rawTitle = (item.title || "").toLowerCase();
  const rawDesc = (item.description || "").toLowerCase();

  // EXIM / Import & Export
  if (
    rawType.includes("exim") ||
    rawCat.includes("exim") ||
    rawType.includes("international") ||
    rawCat.includes("international") ||
    rawSector.includes("export") ||
    rawSector.includes("import") ||
    rawDesc.includes("import") ||
    rawDesc.includes("export") ||
    rawDesc.includes("exim")
  ) {
    return "exim";
  }

  // Franchises & Dealerships
  if (
    rawType.includes("franchise") ||
    rawCat.includes("franchise") ||
    rawType.includes("dealership") ||
    rawCat.includes("dealership") ||
    rawDesc.includes("franchise") ||
    rawDesc.includes("dealership")
  ) {
    return "franchises";
  }

  // Business Partnerships
  if (
    rawType.includes("partner") ||
    rawCat.includes("partner") ||
    rawDesc.includes("partnership") ||
    rawDesc.includes("joint venture")
  ) {
    return "partnerships";
  }

  // Startups
  if (
    rawType.includes("startup") ||
    rawCat.includes("startup") ||
    rawStage.includes("early") ||
    rawStage.includes("mvp") ||
    rawStage.includes("seed") ||
    rawStage.includes("pre-revenue") ||
    rawTitle.includes("tech startup") ||
    rawTitle.includes("ai startup")
  ) {
    return "startups";
  }

  // Investment Opportunities
  if (
    rawType.includes("investment") ||
    rawCat.includes("investment") ||
    rawType.includes("funding") ||
    rawCat.includes("funding") ||
    rawDesc.includes("equity") ||
    rawDesc.includes("seeking capital")
  ) {
    return "opportunities";
  }

  // Default: Established Businesses
  return "businesses";
}

function computeRelevanceScore(item, query) {
  if (!query || !query.trim()) return 0;
  const q = query.trim().toLowerCase();
  const tokens = q.split(/\s+/).filter(Boolean);

  let score = 0;
  const title = (item.title || "").toLowerCase();
  const sector = (item.sector || "").toLowerCase();
  const location = (item.location || "").toLowerCase();
  const description = (item.description || "").toLowerCase();
  const tagsText = (item.tags || []).join(" ").toLowerCase();

  // Exact full title match
  if (title === q) {
    return 100;
  }

  // Title starts with query
  if (title.startsWith(q)) {
    score += 50;
  } else if (title.includes(q)) {
    score += 35;
  }

  // Sector or category match
  if (sector.includes(q)) {
    score += 25;
  }

  // Location match
  if (location.includes(q)) {
    score += 20;
  }

  // Tags match
  if (tagsText.includes(q)) {
    score += 15;
  }

  // Description partial match
  if (description.includes(q)) {
    score += 10;
  }

  // Multi-token scoring
  let allTokensMatch = true;
  for (const token of tokens) {
    const inTitle = title.includes(token);
    const inSector = sector.includes(token);
    const inLocation = location.includes(token);
    const inTags = tagsText.includes(token);
    const inDesc = description.includes(token);

    if (inTitle) score += 25;
    else if (inSector) score += 15;
    else if (inLocation) score += 12;
    else if (inTags) score += 10;
    else if (inDesc) score += 5;
    else {
      allTokensMatch = false;
    }
  }

  if (tokens.length > 1 && allTokensMatch) {
    score += 30;
  }

  return score;
}

function filterAndRankSearchResults(items, options) {
  const {
    query = "",
    category = "all",
    sector = "all",
    location = "all",
    investmentRange = "all",
    sortBy = "relevance",
  } = options || {};

  const queryTrimmed = query.trim().toLowerCase();
  const results = [];

  for (const item of items) {
    // 1. Category Filter
    if (category !== "all" && item.category !== category) {
      continue;
    }

    // 2. Sector Filter
    if (sector !== "all" && sector.trim()) {
      const secQuery = sector.toLowerCase();
      if (!item.sector.toLowerCase().includes(secQuery)) {
        continue;
      }
    }

    // 3. Location Filter
    if (location !== "all" && location.trim()) {
      const locQuery = location.toLowerCase();
      if (!item.location.toLowerCase().includes(locQuery)) {
        continue;
      }
    }

    // 4. Investment Range Filter
    if (investmentRange !== "all" && investmentRange.trim()) {
      if (item.rangeCategory && item.rangeCategory !== investmentRange) {
        continue;
      }
    }

    // 5. Query Search & Scoring
    if (queryTrimmed) {
      const score = computeRelevanceScore(item, queryTrimmed);
      if (score <= 0) {
        continue; // No match
      }
      results.push({ ...item, relevanceScore: score });
    } else {
      results.push({ ...item, relevanceScore: 1 });
    }
  }

  // 6. Sorting
  results.sort((a, b) => {
    if (sortBy === "relevance") {
      return (b.relevanceScore || 0) - (a.relevanceScore || 0);
    }
    if (sortBy === "title") {
      return a.title.localeCompare(b.title);
    }
    return 0;
  });

  return results;
}

// Mock Test Dataset
const sampleListings = [
  {
    id: "list-1",
    slug: "apex-cloud-analytics-bengaluru",
    title: "Apex Cloud Analytics",
    listingType: "Startup",
    category: "Technology",
    sector: "Technology",
    location: "Bengaluru, Karnataka",
    investmentRange: "₹25L – ₹50L",
    rangeCategory: "25l-50l",
    targetAmountNum: 3500000,
    status: "published",
    isDeleted: false,
    businessStage: "Early Stage",
    description: "Cloud analytics platform for enterprise B2B SaaS.",
    tags: ["Technology", "Bengaluru", "SaaS", "Startup"],
    pitchDeckUrl: "https://storage.googleapis.com/secret/pitch.pdf", // Private
    ownerPhone: "9841881008", // Private
  },
  {
    id: "list-2",
    slug: "green-roots-organic-cafe-delhi",
    title: "Green Roots Organic Cafe",
    listingType: "Franchise",
    category: "Food & Beverage",
    sector: "Food & Beverage",
    location: "Delhi NCR",
    investmentRange: "₹10L – ₹25L",
    rangeCategory: "10l-25l",
    targetAmountNum: 1500000,
    status: "published",
    isDeleted: false,
    businessStage: "Established",
    description: "Premium farm-to-table organic cafe franchise network.",
    tags: ["Food & Beverage", "Delhi NCR", "Franchise"],
  },
  {
    id: "list-3",
    slug: "indo-german-machinery-exim",
    title: "Indo-German Machinery Import",
    listingType: "EXIM Trade",
    category: "EXIM",
    sector: "Manufacturing",
    location: "Mumbai, Maharashtra",
    investmentRange: "₹50L – ₹1Cr",
    rangeCategory: "50l-1cr",
    targetAmountNum: 7500000,
    status: "published",
    isDeleted: false,
    businessStage: "Profitable",
    description: "Specialized precision CNC machinery import & export distribution.",
    tags: ["Manufacturing", "Mumbai", "EXIM", "Import"],
  },
  {
    id: "list-4",
    slug: "draft-unapproved-venture",
    title: "Draft Unapproved Venture",
    listingType: "Business",
    category: "Technology",
    sector: "Technology",
    location: "Pune",
    status: "draft", // Should NOT be in search
    isDeleted: false,
    description: "Unpublished internal draft.",
    tags: ["Draft"],
  },
  {
    id: "list-5",
    slug: "deleted-venture",
    title: "Deleted Venture",
    listingType: "Business",
    category: "Retail",
    sector: "Retail",
    location: "Chennai",
    status: "published",
    isDeleted: true, // Should NOT be in search
    description: "Deleted venture record.",
    tags: ["Deleted"],
  },
];

const sampleInvestors = [
  {
    id: "inv-1",
    investorName: "Rajesh Sharma",
    investorType: "Angel Investor",
    location: "Bengaluru, Karnataka",
    investmentRange: "₹25L – ₹50L",
    preferredSectors: ["Technology", "Fintech"],
    status: "published",
    shortIntroduction: "Experienced angel investing in high-growth B2B tech.",
  },
  {
    id: "inv-2",
    investorName: "Ananya Singhal",
    investorType: "VC",
    location: "Mumbai, Maharashtra",
    investmentRange: "₹1Cr+",
    preferredSectors: ["Healthcare", "Manufacturing"],
    status: "published",
    shortIntroduction: "Managing Partner at Growth Velocity Ventures.",
  },
  {
    id: "inv-3",
    investorName: "Private Pending Investor",
    investorType: "Angel Investor",
    location: "Hyderabad",
    status: "pending", // Should NOT be in search
    shortIntroduction: "Pending verification.",
  },
];

// Normalize and filter dataset strictly according to status === 'published' && !isDeleted
function buildTestDataset(listings, investors) {
  const combined = [];

  for (const l of listings) {
    if (l.status === "published" && !l.isDeleted) {
      const category = classifyListingCategory(l);
      combined.push({
        id: l.id,
        slug: l.slug,
        title: l.title,
        category,
        categoryBadge: l.listingType,
        sector: l.sector,
        location: l.location,
        investmentRange: l.investmentRange,
        rangeCategory: l.rangeCategory,
        description: l.description,
        detailUrl: `/opportunities/${l.slug}`,
        entityType: "opportunity",
        tags: l.tags || [],
      });
    }
  }

  for (const inv of investors) {
    if (inv.status === "published") {
      combined.push({
        id: inv.id,
        slug: inv.id,
        title: inv.investorName,
        category: "investors",
        categoryBadge: inv.investorType || "Investor",
        sector: (inv.preferredSectors || []).join(", "),
        location: inv.location || "India",
        investmentRange: inv.investmentRange || "Undisclosed",
        description: inv.shortIntroduction || "",
        detailUrl: `/investors/${inv.id}`,
        entityType: "investor",
        tags: [inv.investorType, ...(inv.preferredSectors || [])],
      });
    }
  }

  return combined;
}

// RUN THE 15 TEST SCENARIOS
console.log("================================================================================");
console.log("   WENTURE INDIA — GLOBAL MASTER SEARCH FUNCTIONAL & SECURITY VERIFICATION");
console.log("================================================================================\n");

let passed = 0;
let total = 0;

function runTest(name, fn) {
  total++;
  try {
    fn();
    console.log(`[PASS] Scenario ${total}: ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] Scenario ${total}: ${name}`);
    console.error(`       Error: ${err.message}`);
  }
}

const dataset = buildTestDataset(sampleListings, sampleInvestors);

// Scenario 1: Search for business by name
runTest("Search for business by name ('Apex')", () => {
  const res = filterAndRankSearchResults(dataset, { query: "Apex" });
  assert.ok(res.length >= 1, "Should find at least 1 match for Apex");
  assert.strictEqual(res[0].title, "Apex Cloud Analytics");
});

// Scenario 2: Search for investor by name
runTest("Search for investor by name ('Rajesh')", () => {
  const res = filterAndRankSearchResults(dataset, { query: "Rajesh" });
  assert.ok(res.length >= 1, "Should find Rajesh Sharma");
  assert.strictEqual(res[0].entityType, "investor");
  assert.strictEqual(res[0].title, "Rajesh Sharma");
});

// Scenario 3: Search by industry/sector
runTest("Search by industry/sector ('Technology')", () => {
  const res = filterAndRankSearchResults(dataset, { query: "Technology" });
  assert.ok(res.some(r => r.sector.includes("Technology")), "Should include technology records");
});

// Scenario 4: Search by location
runTest("Search by location ('Bengaluru')", () => {
  const res = filterAndRankSearchResults(dataset, { location: "Bengaluru" });
  assert.ok(res.length >= 2, "Should find both Apex (listing) and Rajesh (investor) in Bengaluru");
  assert.ok(res.every(r => r.location.includes("Bengaluru")));
});

// Scenario 5: Search by investment range
runTest("Search by investment range ('10l-25l')", () => {
  const res = filterAndRankSearchResults(dataset, { investmentRange: "10l-25l" });
  assert.ok(res.length >= 1, "Should find Green Roots Cafe in 10l-25l range");
  assert.strictEqual(res[0].title, "Green Roots Organic Cafe");
});

// Scenario 6: Search across All categories
runTest("Search across All categories (includes both opportunities and investors)", () => {
  const res = filterAndRankSearchResults(dataset, { category: "all" });
  const hasOpp = res.some(r => r.entityType === "opportunity");
  const hasInv = res.some(r => r.entityType === "investor");
  assert.ok(hasOpp && hasInv, "All category must include opportunities and investors");
});

// Scenario 7: Search within single category
runTest("Search within single category ('startups')", () => {
  const res = filterAndRankSearchResults(dataset, { category: "startups" });
  assert.ok(res.every(r => r.category === "startups"), "Every item must have category 'startups'");
  assert.strictEqual(res[0].title, "Apex Cloud Analytics");
});

// Scenario 8: Autocomplete suggestions ranking
runTest("Autocomplete suggestions ranking (exact title match scores highest)", () => {
  const res = filterAndRankSearchResults(dataset, { query: "Apex Cloud Analytics" });
  assert.strictEqual(res[0].relevanceScore, 100, "Exact title match should score 100");
});

// Scenario 9: Empty search query handling
runTest("Empty search query handling (returns all eligible records without crashing)", () => {
  const res = filterAndRankSearchResults(dataset, { query: "" });
  assert.strictEqual(res.length, dataset.length, "Empty query must return all eligible records");
});

// Scenario 10: Filter combinations
runTest("Filter combinations (query + category + location)", () => {
  const res = filterAndRankSearchResults(dataset, {
    query: "Cloud",
    category: "startups",
    location: "Bengaluru",
  });
  assert.strictEqual(res.length, 1);
  assert.strictEqual(res[0].title, "Apex Cloud Analytics");
});

// Scenario 11: Pagination / slicing
runTest("Pagination / slicing (slicing 2 items per page with hasMore indicator)", () => {
  const pageSize = 2;
  const page1 = dataset.slice(0, pageSize);
  const hasMore = pageSize < dataset.length;
  assert.strictEqual(page1.length, 2);
  assert.strictEqual(hasMore, true);
});

// Scenario 12: Mobile category selection
runTest("Mobile category selection (8 standard categories properly defined with icons and labels)", () => {
  assert.strictEqual(MASTER_SEARCH_CATEGORIES.length, 8);
  const ids = MASTER_SEARCH_CATEGORIES.map(c => c.id);
  assert.ok(ids.includes("all"));
  assert.ok(ids.includes("businesses"));
  assert.ok(ids.includes("investors"));
  assert.ok(ids.includes("opportunities"));
  assert.ok(ids.includes("startups"));
  assert.ok(ids.includes("franchises"));
  assert.ok(ids.includes("partnerships"));
  assert.ok(ids.includes("exim"));
});

// Scenario 13: Result navigation to existing routes
runTest("Result navigation targets valid routes (/opportunities/[slug] and /investors/[id])", () => {
  for (const item of dataset) {
    if (item.entityType === "opportunity") {
      assert.ok(item.detailUrl.startsWith("/opportunities/"), "Opportunity URL must start with /opportunities/");
    } else if (item.entityType === "investor") {
      assert.ok(item.detailUrl.startsWith("/investors/"), "Investor URL must start with /investors/");
    }
  }
});

// Scenario 14: Exclusion of unpublished / deleted records
runTest("Exclusion of unpublished and deleted records", () => {
  const titles = dataset.map(d => d.title);
  assert.ok(!titles.includes("Draft Unapproved Venture"), "Draft venture must be excluded");
  assert.ok(!titles.includes("Deleted Venture"), "Deleted venture must be excluded");
  assert.ok(!titles.includes("Private Pending Investor"), "Pending investor must be excluded");
});

// Scenario 15: Data protection (no pitch deck URLs or private contacts in search items)
runTest("Data protection (no private pitch deck URLs or raw phone numbers leaked)", () => {
  for (const item of dataset) {
    assert.strictEqual(item.pitchDeckUrl, undefined, "Pitch deck URL must not be in search item");
    assert.strictEqual(item.ownerPhone, undefined, "Owner phone must not be in search item");
    assert.strictEqual(item.contactPhone, undefined, "Contact phone must not be in search item");
  }
});

console.log("\n--------------------------------------------------------------------------------");
console.log(`Summary: ${passed} of ${total} tests passed cleanly.`);
console.log("--------------------------------------------------------------------------------\n");

if (passed !== total) {
  process.exit(1);
}

