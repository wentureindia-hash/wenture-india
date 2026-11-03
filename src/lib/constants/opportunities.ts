export type OpportunityCategory =
  | "Investment"
  | "Business"
  | "Franchise"
  | "Dealership"
  | "Partnership"
  | "International"
  | "EXIM";

export type InvestmentRangeCategory =
  | "1l-5l"
  | "5l-10l"
  | "10l-25l"
  | "25l-50l"
  | "50l-1cr"
  | "1cr-plus";

export interface Opportunity {
  id: string;
  slug: string;
  title: string;
  category: OpportunityCategory;
  sector: string;
  location: string;
  investmentRange: string;
  rangeCategory: InvestmentRangeCategory;
  targetRaise: string;
  targetAmountNum: number;
  type: string;
  stageBadge?: string;
  isFeatured?: boolean;
  topOpportunity?: boolean;
  shortDescription: string;
  overview: string;
  businessDescription: string;
  opportunityDetails: string[];
  keyInformation: {
    label: string;
    value: string;
  }[];
  imageUrl: string;
  isDemo?: boolean;
  ownerId?: string;
  ownerName?: string;
  ownerEmail?: string;
  contactPhone?: string;
  contactEmail?: string;
  whatsappNumber?: string;
  hasPitchDeck?: boolean;
  pitchDeckUrl?: string;
  pitchDeckFileName?: string;
}

export function formatWhatsAppNumber(phone?: string, defaultNumber: string = "919841881008"): string {
  if (!phone) return defaultNumber;
  const digits = phone.replace(/[^0-9]/g, "");
  if (!digits) return defaultNumber;
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  return digits;
}

export const INVESTMENT_RANGES = [
  { id: "all", label: "All Ranges" },
  { id: "1l-5l", label: "₹1L – ₹5L", min: 100000, max: 500000 },
  { id: "5l-10l", label: "₹5L – ₹10L", min: 500000, max: 1000000 },
  { id: "10l-25l", label: "₹10L – ₹25L", min: 1000000, max: 2500000 },
  { id: "25l-50l", label: "₹25L – ₹50L", min: 2500000, max: 5000000 },
  { id: "50l-1cr", label: "₹50L – ₹1Cr", min: 5000000, max: 10000000 },
  { id: "1cr-plus", label: "₹1Cr+", min: 10000000, max: 999999999 },
];

export const OPPORTUNITY_CATEGORIES: OpportunityCategory[] = [
  "Investment",
  "Business",
  "Franchise",
  "Dealership",
  "Partnership",
  "International",
  "EXIM",
];

export const OPPORTUNITIES: Opportunity[] = [];
