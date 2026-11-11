/**
 * WENTURE INDIA — GLOBAL MASTER SEARCH SERVICE
 *
 * Unified discovery engine querying real published listings and investor profiles from Firestore.
 * Supports:
 * - 8 distinct business categories
 * - Multi-word & partial text matching
 * - Relevance-based ranking
 * - Advanced facet filtering (Category, Sector, Location, Investment Range, Type)
 * - Strict exclusion of draft, pending, rejected, and deleted records
 */

import { Opportunity, InvestmentRangeCategory, INVESTMENT_RANGES } from "@/lib/constants/opportunities";
import { InvestorProfile } from "@/lib/firebase/investors";
import { BusinessListing, convertListingToOpportunity } from "@/lib/firebase/listings";
import { getPublishedListings } from "@/lib/firebase/listings";
import { getPublishedInvestors } from "@/lib/firebase/investors";

export type MasterSearchCategory =
  | "all"
  | "businesses"
  | "investors"
  | "opportunities"
  | "startups"
  | "franchises"
  | "partnerships"
  | "exim";

export interface MasterCategoryConfig {
  id: MasterSearchCategory;
  label: string;
  shortLabel: string;
  icon: string;
  description: string;
}

export const MASTER_SEARCH_CATEGORIES: MasterCategoryConfig[] = [
  {
    id: "all",
    label: "All Categories",
    shortLabel: "All",
    icon: "grid_view",
    description: "Search across all businesses, investors, startups, and opportunities.",
  },
  {
    id: "businesses",
    label: "Businesses",
    shortLabel: "Businesses",
    icon: "storefront",
    description: "Established commercial businesses, traditional enterprises, and acquisitions.",
  },
  {
    id: "investors",
    label: "Investors",
    shortLabel: "Investors",
    icon: "badge",
    description: "Verified angel investors, venture funds, family offices, and capital partners.",
  },
  {
    id: "opportunities",
    label: "Investment Opportunities",
    shortLabel: "Opportunities",
    icon: "trending_up",
    description: "Equity funding, capital raises, and commercial growth opportunities.",
  },
  {
    id: "startups",
    label: "Startups",
    shortLabel: "Startups",
    icon: "rocket_launch",
    description: "Innovative high-growth technology, seed, and venture-backed startups.",
  },
  {
    id: "franchises",
    label: "Franchises & Dealerships",
    shortLabel: "Franchises",
    icon: "store",
    description: "Proven brand franchises, master dealership rights, and retail expansions.",
  },
  {
    id: "partnerships",
    label: "Business Partnerships",
    shortLabel: "Partnerships",
    icon: "handshake",
    description: "Strategic joint ventures, co-founding, and equity alliances.",
  },
  {
    id: "exim",
    label: "EXIM / Import & Export",
    shortLabel: "EXIM",
    icon: "public",
    description: "International trading, commodity distribution, and global export/import ventures.",
  },
];

export interface UnifiedSearchResult {
  id: string;
  slug: string;
  title: string;
  category: MasterSearchCategory;
  categoryBadge: string;
  sector: string;
  location: string;
  investmentRange: string;
  rangeCategory?: InvestmentRangeCategory;
  description: string;
  imageUrl?: string;
  detailUrl: string;
  entityType: "opportunity" | "investor";
  rawOpportunity?: Opportunity;
  rawInvestor?: InvestorProfile;
  relevanceScore?: number;
  tags: string[];
}

/**
 * Categorize a BusinessListing / Opportunity into one of the 8 Master Search categories
 */
export function classifyListingCategory(item: BusinessListing): MasterSearchCategory {
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
    rawStage.includes("seed") ||
    rawStage.includes("idea") ||
    rawStage.includes("early") ||
    rawTitle.includes("startup") ||
    rawDesc.includes("startup")
  ) {
    return "startups";
  }

  // Investment Opportunities
  if (
    rawType.includes("invest") ||
    rawCat.includes("invest") ||
    rawDesc.includes("equity offered") ||
    rawDesc.includes("fundraise")
  ) {
    return "opportunities";
  }

  // Default to General Businesses
  return "businesses";
}

/**
 * Normalizes a BusinessListing into a UnifiedSearchResult
 */
export function normalizeListingToResult(listing: BusinessListing): UnifiedSearchResult {
  const opp = convertListingToOpportunity(listing);
  const category = classifyListingCategory(listing);

  let categoryBadge = "Business";
  if (category === "startups") categoryBadge = "Startup";
  else if (category === "franchises") categoryBadge = listing.listingType?.includes("Dealership") ? "Dealership" : "Franchise";
  else if (category === "partnerships") categoryBadge = "Partnership";
  else if (category === "exim") categoryBadge = "EXIM Trade";
  else if (category === "opportunities") categoryBadge = "Investment";

  const tags: string[] = [
    categoryBadge,
    opp.sector,
    opp.location,
    listing.businessType || "",
    listing.businessStage || "",
  ].filter(Boolean);

  return {
    id: opp.id,
    slug: opp.slug,
    title: opp.title,
    category,
    categoryBadge,
    sector: opp.sector,
    location: opp.location,
    investmentRange: opp.investmentRange,
    rangeCategory: opp.rangeCategory,
    description: opp.shortDescription || opp.overview || opp.businessDescription || "Verified business listing on Wenture India.",
    imageUrl: opp.imageUrl,
    detailUrl: `/opportunities/${opp.slug}`,
    entityType: "opportunity",
    rawOpportunity: opp,
    tags,
  };
}

/**
 * Normalizes an InvestorProfile into a UnifiedSearchResult
 */
export function normalizeInvestorToResult(investor: InvestorProfile): UnifiedSearchResult {
  const tags: string[] = [
    "Investor",
    investor.investorType || "Verified Investor",
    investor.location || "India",
    ...(investor.preferredSectors || []).slice(0, 2),
  ].filter(Boolean);

  return {
    id: investor.id,
    slug: investor.id,
    title: investor.investorName,
    category: "investors",
    categoryBadge: investor.investorType || "Investor",
    sector: investor.preferredSectors && investor.preferredSectors.length > 0 ? investor.preferredSectors.join(", ") : "Multi-Sector",
    location: investor.location || "India",
    investmentRange: investor.investmentRange || "Flexible Range",
    description: investor.shortIntroduction || investor.experience || "Verified investor reviewing high-growth business opportunities.",
    imageUrl: investor.profileImage,
    detailUrl: `/investors/${investor.id}`,
    entityType: "investor",
    rawInvestor: investor,
    tags,
  };
}

/**
 * Calculates a search relevance score for a given item and query.
 * Returns 0 if item does not match query.
 */
export function computeRelevanceScore(item: UnifiedSearchResult, queryStr: string): number {
  if (!queryStr || !queryStr.trim()) return 1;

  const q = queryStr.trim().toLowerCase();
  const tokens = q.split(/\s+/).filter(Boolean);

  let score = 0;
  const title = (item.title || "").toLowerCase();
  const sector = (item.sector || "").toLowerCase();
  const location = (item.location || "").toLowerCase();
  const categoryBadge = (item.categoryBadge || "").toLowerCase();
  const description = (item.description || "").toLowerCase();
  const tagsText = item.tags.join(" ").toLowerCase();

  // Full exact phrase match in title
  if (title === q) {
    score += 150;
  } else if (title.startsWith(q)) {
    score += 100;
  } else if (title.includes(q)) {
    score += 70;
  }

  // Exact phrase match in sector or location
  if (sector.includes(q)) score += 40;
  if (location.includes(q)) score += 35;
  if (categoryBadge.includes(q)) score += 30;
  if (description.includes(q)) score += 20;

  // Individual token matches
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

  // Bonus for matching all tokens in a multi-word search
  if (tokens.length > 1 && allTokensMatch) {
    score += 30;
  }

  return score;
}

/**
 * In-memory search & filter execution over loaded published records
 */
export function filterAndRankSearchResults(
  items: UnifiedSearchResult[],
  options: {
    query?: string;
    category?: MasterSearchCategory;
    sector?: string;
    location?: string;
    investmentRange?: string;
    sortBy?: "relevance" | "newest" | "title" | "range-low-high" | "range-high-low";
  }
): UnifiedSearchResult[] {
  const {
    query = "",
    category = "all",
    sector = "all",
    location = "all",
    investmentRange = "all",
    sortBy = "relevance",
  } = options;

  const queryTrimmed = query.trim().toLowerCase();

  const results: UnifiedSearchResult[] = [];

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
        // If rangeCategory is known, match directly
        const rangeMeta = INVESTMENT_RANGES.find((r) => r.id === investmentRange);
        if (rangeMeta && !item.investmentRange.toLowerCase().includes(investmentRange)) {
          continue;
        }
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
    if (sortBy === "range-low-high") {
      const amtA = a.rawOpportunity?.targetAmountNum || 0;
      const amtB = b.rawOpportunity?.targetAmountNum || 0;
      return amtA - amtB;
    }
    if (sortBy === "range-high-low") {
      const amtA = a.rawOpportunity?.targetAmountNum || 0;
      const amtB = b.rawOpportunity?.targetAmountNum || 0;
      return amtB - amtA;
    }
    if (sortBy === "newest") {
      // Prefer createdAt timestamp if available, fallback to id comparison
      const timeA = (a.rawOpportunity as unknown as { createdAt?: { seconds?: number } })?.createdAt?.seconds || 0;
      const timeB = (b.rawOpportunity as unknown as { createdAt?: { seconds?: number } })?.createdAt?.seconds || 0;
      if (timeA && timeB) return timeB - timeA;
      return b.id.localeCompare(a.id);
    }
    return 0; // Default order
  });

  return results;
}

/**
 * Cache container to prevent unnecessary refetches during active browsing
 */
let cachedDataset: {
  results: UnifiedSearchResult[];
  timestamp: number;
} | null = null;

const CACHE_TTL_MS = 60 * 1000; // 1 minute in-memory client cache

/**
 * Fetch all published listings & investors and combine into unified search collection
 */
export async function getMasterSearchDataset(forceRefresh = false): Promise<{
  data: UnifiedSearchResult[];
  error: string | null;
}> {
  const now = Date.now();
  if (!forceRefresh && cachedDataset && now - cachedDataset.timestamp < CACHE_TTL_MS) {
    return { data: cachedDataset.results, error: null };
  }

  try {
    const [listingsRes, investorsRes] = await Promise.all([
      getPublishedListings(),
      getPublishedInvestors(),
    ]);

    const combined: UnifiedSearchResult[] = [];

    // 1. Process published listings (strictly status === 'published' && !isDeleted)
    if (listingsRes.listings && listingsRes.listings.length > 0) {
      for (const listing of listingsRes.listings) {
        if (listing.status === "published" && !listing.isDeleted) {
          combined.push(normalizeListingToResult(listing));
        }
      }
    }

    // 2. Process published investors (strictly status === 'published' && !isDeleted)
    if (investorsRes.investors && investorsRes.investors.length > 0) {
      for (const inv of investorsRes.investors) {
        if (inv.status === "published") {
          combined.push(normalizeInvestorToResult(inv));
        }
      }
    }

    cachedDataset = {
      results: combined,
      timestamp: now,
    };

    return { data: combined, error: null };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return { data: [], error: error.message || "Failed to load master search records." };
  }
}
