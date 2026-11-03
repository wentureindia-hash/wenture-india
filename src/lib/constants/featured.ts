export interface FeaturedItem {
  id: string;
  name: string;
  category: "Featured Business" | "Featured Startup" | "Featured Franchise" | "Featured Dealership" | "Featured EXIM";
  type: string;
  sector: string;
  location: string;
  investmentRange: string;
  shortDescription: string;
  opportunityType: string;
  slug?: string;
  imageUrl: string;
  tag?: string;
}

export const FEATURED_DATA: Record<string, FeaturedItem[]> = {
  businesses: [],
  startups: [],
  franchises: [],
  dealerships: [],
  exim: [],
};
