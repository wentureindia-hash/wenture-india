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

export const OPPORTUNITIES: Opportunity[] = [
  // --- TOP INVESTMENT OPPORTUNITIES ---
  {
    id: "opp-1",
    slug: "ecovolt-solutions",
    title: "EcoVolt Energy Storage",
    category: "Investment",
    sector: "CleanTech",
    location: "Bengaluru, Karnataka",
    investmentRange: "₹50L – ₹1Cr",
    rangeCategory: "50l-1cr",
    targetRaise: "₹75 Lakhs",
    targetAmountNum: 7500000,
    type: "Growth Capital",
    stageBadge: "Growth",
    isFeatured: true,
    topOpportunity: true,
    shortDescription: "Modular battery storage systems and intelligent microgrid control units designed for commercial complexes.",
    overview:
      "EcoVolt develops modular energy storage systems and intelligent microgrid equipment for industrial and commercial buildings seeking power backup resilience.",
    businessDescription:
      "Operating from Bengaluru, EcoVolt manufactures high-density battery packs integrated with proprietary battery management firmware to optimize energy consumption during peak grid hours.",
    opportunityDetails: [
      "Modular scalable capacity from 50 kWh to 500 kWh units",
      "Pilot installations running in commercial buildings in Karnataka",
      "Domestic assembly with established supply chain partners",
      "Seeking expansion capital for assembly line automation",
    ],
    keyInformation: [
      { label: "Business Category", value: "CleanTech & Energy Storage" },
      { label: "Operational Hub", value: "Bengaluru, India" },
      { label: "Capital Structure", value: "Direct Growth Investment" },
      { label: "Target Deployment", value: "Manufacturing Expansion" },
    ],
    imageUrl: "https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "opp-2",
    slug: "ledgerflow-software",
    title: "LedgerFlow Enterprise Reconciliation",
    category: "Investment",
    sector: "Technology",
    location: "Mumbai, Maharashtra",
    investmentRange: "₹25L – ₹50L",
    rangeCategory: "25l-50l",
    targetRaise: "₹40 Lakhs",
    targetAmountNum: 4000000,
    type: "Seed Investment",
    stageBadge: "Seed",
    isFeatured: true,
    topOpportunity: true,
    shortDescription: "Automated transaction reconciliation and compliance software built for fintechs and financial institutions.",
    overview:
      "LedgerFlow streamlines multi-party financial reconciliation for banks, payment aggregators, and corporate enterprises.",
    businessDescription:
      "LedgerFlow offers a secure cloud engine that maps diverse banking formats, detects transaction anomalies, and creates audit-ready settlement reports in real-time.",
    opportunityDetails: [
      "Processes high-volume transaction feeds with rules engine",
      "Used by 8 pilot enterprises across fintech and retail sectors",
      "ISO compliant cloud security architecture",
      "Seeking funding for developer team and sales outreach",
    ],
    keyInformation: [
      { label: "Sector", value: "FinTech / Enterprise Software" },
      { label: "Location", value: "Mumbai, India" },
      { label: "Stage", value: "Seed Round" },
      { label: "Use of Funds", value: "Product Development & Sales" },
    ],
    imageUrl: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80",
  },

  // --- TOP BUSINESS OPPORTUNITIES ---
  {
    id: "opp-3",
    slug: "apex-cnc-manufacturing",
    title: "Apex Precision Tooling & Machining",
    category: "Business",
    sector: "Manufacturing",
    location: "Pune, Maharashtra",
    investmentRange: "₹50L – ₹1Cr",
    rangeCategory: "50l-1cr",
    targetRaise: "₹80 Lakhs",
    targetAmountNum: 8000000,
    type: "Business Expansion",
    stageBadge: "Established",
    isFeatured: true,
    topOpportunity: true,
    shortDescription: "Established precision machining unit supplying components to automotive and industrial equipment clients.",
    overview:
      "Apex Precision has operated for over a decade, manufacturing high-tolerance turned and milled parts with a dedicated team of engineers.",
    businessDescription:
      "The company operates 6 CNC centers and 3 VMC units with in-house quality inspection. Looking for an expansion partner to add heavy-duty 5-axis machines for defense component orders.",
    opportunityDetails: [
      "10+ years established operating track record in Pune industrial corridor",
      "Recurring B2B orders with regional original equipment manufacturers",
      "Fully equipped quality lab with CMM measurement tools",
      "Expansion opportunity into high-precision aerospace components",
    ],
    keyInformation: [
      { label: "Established Since", value: "2014" },
      { label: "Location", value: "Bhosari MIDC, Pune" },
      { label: "Opportunity Type", value: "Active Business Expansion" },
      { label: "Asset Backing", value: "Machinery & Tooling Assets" },
    ],
    imageUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "opp-4",
    slug: "medvantage-health-clinics",
    title: "MedVantage Diagnostic Centers",
    category: "Business",
    sector: "Healthcare",
    location: "Hyderabad, Telangana",
    investmentRange: "₹25L – ₹50L",
    rangeCategory: "25l-50l",
    targetRaise: "₹35 Lakhs",
    targetAmountNum: 3500000,
    type: "Clinic Cluster Expansion",
    stageBadge: "Expansion",
    isFeatured: false,
    topOpportunity: true,
    shortDescription: "Neighborhood pathology collection centers and digital radiology diagnostic clinic expansion.",
    overview:
      "MedVantage operates diagnostic touchpoints offering routine blood tests, ultrasound, ECG, and specialty health packages.",
    businessDescription:
      "With 3 existing profitable collection centers, MedVantage is expanding to 4 new residential suburbs with centralized lab testing to keep operating overhead low.",
    opportunityDetails: [
      "Centralized testing hub with digital reporting infrastructure",
      "Doctor tie-ups across primary healthcare clinics",
      "Turnkey clinic interior design and medical equipment support",
      "Strong demand for convenient neighborhood diagnostics",
    ],
    keyInformation: [
      { label: "Industry", value: "Healthcare & Diagnostics" },
      { label: "Target City", value: "Hyderabad & Secunderabad" },
      { label: "Model", value: "Hub & Spoke Diagnostic Network" },
      { label: "Requirement", value: "Clinic Fitout & Equipment" },
    ],
    imageUrl: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80",
  },

  // --- TOP FRANCHISE OPPORTUNITIES ---
  {
    id: "opp-5",
    slug: "urban-brew-specialty-cafe",
    title: "Urban Brew Artisanal Coffee",
    category: "Franchise",
    sector: "Food & Beverage",
    location: "Pan-India (Tier-1 & Tier-2)",
    investmentRange: "₹10L – ₹25L",
    rangeCategory: "10l-25l",
    targetRaise: "₹18 – 22 Lakhs / Unit",
    targetAmountNum: 2000000,
    type: "Unit & Multi-Unit Franchise",
    stageBadge: "Franchise",
    isFeatured: true,
    topOpportunity: true,
    shortDescription: "Gourmet coffee and quick-service cafe franchise with full training, interior design, and ingredient supply support.",
    overview:
      "Urban Brew is a fast-growing contemporary cafe concept catering to urban professionals, students, and specialty coffee enthusiasts.",
    businessDescription:
      "The franchise package includes comprehensive barista training, proprietary roast bean supply, cloud POS software, marketing collateral, and full site-selection advisory.",
    opportunityDetails: [
      "18 active locations operating across major metro cities",
      "Kiosk (200 sq ft) and Dine-In Cafe (800 sq ft) models available",
      "Standardized menu with high-margin coffee and bakery items",
      "End-to-end supply chain support from centralized roasting plant",
    ],
    keyInformation: [
      { label: "Franchise Model", value: "FOFO (Franchise Owned Franchise Operated)" },
      { label: "Space Requirement", value: "250 – 800 sq ft" },
      { label: "Training Provided", value: "Full Staff & Barista Training" },
      { label: "Agreement Term", value: "5 Years Renewable" },
    ],
    imageUrl: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "opp-6",
    slug: "littlesprouts-preschool",
    title: "LittleSprouts Early Learning Academy",
    category: "Franchise",
    sector: "Education",
    location: "North & West India",
    investmentRange: "₹10L – ₹25L",
    rangeCategory: "10l-25l",
    targetRaise: "₹15 Lakhs",
    targetAmountNum: 1500000,
    type: "Preschool Franchise",
    stageBadge: "Franchise",
    isFeatured: false,
    topOpportunity: true,
    shortDescription: "Child-centric preschool and daycare franchise offering proprietary play-based learning curriculum.",
    overview:
      "LittleSprouts provides early childhood education with a structured, engaging syllabus and complete teacher enablement kits.",
    businessDescription:
      "Franchise partners receive complete classroom kits, teacher training manuals, branded learning toys, admission campaign materials, and child-safe interior guidelines.",
    opportunityDetails: [
      "Over 25 preschool centers currently in operation",
      "Integrated daycare and after-school activity module",
      "Low royalty model with extensive academic audit support",
      "Ideal for passionate educators and home-based entrepreneurs",
    ],
    keyInformation: [
      { label: "Space Required", value: "1,500 – 2,500 sq ft (Ground Floor Preferred)" },
      { label: "Format", value: "Playgroup, Nursery, LKG, UKG & Daycare" },
      { label: "Support", value: "Curriculum, Toys, Teacher Hiring & Marketing" },
      { label: "Brand History", value: "8+ Years of Academic Excellence" },
    ],
    imageUrl: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=800&q=80",
  },

  // --- TOP DEALERSHIP OPPORTUNITIES ---
  {
    id: "opp-7",
    slug: "electravolt-ev-dealership",
    title: "ElectraVolt EV Two-Wheeler Dealership",
    category: "Dealership",
    sector: "EV & Mobility",
    location: "District & State Level Rights",
    investmentRange: "₹10L – ₹25L",
    rangeCategory: "10l-25l",
    targetRaise: "₹15 – 25 Lakhs",
    targetAmountNum: 2000000,
    type: "Authorized Dealership",
    stageBadge: "Dealership",
    isFeatured: true,
    topOpportunity: true,
    shortDescription: "Authorized commercial dealership for high-speed electric scooters with showroom design and spare parts supply.",
    overview:
      "ElectraVolt manufactures smart ARAI-certified electric two-wheelers for urban commuters and commercial delivery riders.",
    businessDescription:
      "Dealership partners obtain exclusive city/district territory rights to retail vehicles, battery swap subscriptions, and authorized service support with attractive margins.",
    opportunityDetails: [
      "ARAI certified high-speed and low-speed model portfolio",
      "Showroom layout planning, signage, and visual branding provided",
      "Digital lead routing from brand website to local dealer",
      "Dedicated spare parts distribution and technician certification",
    ],
    keyInformation: [
      { label: "Territory", value: "Exclusive District / City Zone" },
      { label: "Showroom Size", value: "600 – 1,200 sq ft" },
      { label: "Margin Structure", value: "Vehicle Margin + Service & Spares" },
      { label: "Stock Support", value: "First Batch Display & Demonstration Units" },
    ],
    imageUrl: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "opp-8",
    slug: "aquapure-water-dealership",
    title: "AquaPure Commercial Filtration Distribution",
    category: "Dealership",
    sector: "Business Services",
    location: "Statewide Territories",
    investmentRange: "₹5L – ₹10L",
    rangeCategory: "5l-10l",
    targetRaise: "₹8 Lakhs",
    targetAmountNum: 800000,
    type: "Authorized Distributorship",
    stageBadge: "Dealership",
    isFeatured: false,
    topOpportunity: true,
    shortDescription: "Authorized distribution rights for commercial reverse osmosis plants and drinking water systems.",
    overview:
      "AquaPure supplies commercial drinking water filtration systems, UV sterilizers, and industrial softener units to institutions.",
    businessDescription:
      "Distributors supply hospitals, schools, factories, hotels, and office parks with water treatment systems and consumable replacement cartridges.",
    opportunityDetails: [
      "B2B institutional client target market with recurring cartridge sales",
      "Full installation training and marketing catalog support",
      "Low initial inventory requirement with fast stock turnover",
      "Established brand with ISI and CE certified product range",
    ],
    keyInformation: [
      { label: "Investment Range", value: "₹5L – ₹10L" },
      { label: "Product Category", value: "Commercial Water Treatment" },
      { label: "Target Clients", value: "Schools, Hospitals, Factories, Commercial Spaces" },
      { label: "Territory", value: "Assigned District Exclusivity" },
    ],
    imageUrl: "https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&w=800&q=80",
  },

  // --- TOP PARTNERSHIP OPPORTUNITIES ---
  {
    id: "opp-9",
    slug: "route-optimize-logistics",
    title: "RouteOptimize Logistics Network",
    category: "Partnership",
    sector: "Logistics",
    location: "Delhi NCR & North Hubs",
    investmentRange: "₹10L – ₹25L",
    rangeCategory: "10l-25l",
    targetRaise: "₹20 Lakhs",
    targetAmountNum: 2000000,
    type: "Joint Venture Hub Partner",
    stageBadge: "Partnership",
    isFeatured: true,
    topOpportunity: true,
    shortDescription: "Mid-mile logistics and hub-management joint venture for automated e-commerce package sorting and transit.",
    overview:
      "RouteOptimize partners with regional warehouse operators and fleet managers to manage automated transit sorting centers.",
    businessDescription:
      "The partnership combines proprietary dispatch routing algorithms with local warehouse infrastructure to process regional freight efficiently.",
    opportunityDetails: [
      "Cloud routing software provided with automated barcode sorting",
      "Pre-arranged logistics volume from e-commerce client contracts",
      "Revenue share on processed parcel volumes",
      "Standard operating procedures and fleet management integration",
    ],
    keyInformation: [
      { label: "Partnership Nature", value: "Regional Logistics Hub Joint Venture" },
      { label: "Partner Role", value: "Facility Management & Local Fleet Supervision" },
      { label: "Tech Provided", value: "Sorting Software, Mobile Driver App & Tracking" },
      { label: "Target Cities", value: "Delhi, Gurugram, Jaipur, Chandigarh" },
    ],
    imageUrl: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "opp-10",
    slug: "krishibridge-farming",
    title: "KrishiBridge Agro Cluster Partnership",
    category: "Partnership",
    sector: "Agriculture",
    location: "Maharashtra & Gujarat",
    investmentRange: "₹5L – ₹10L",
    rangeCategory: "5l-10l",
    targetRaise: "₹10 Lakhs",
    targetAmountNum: 1000000,
    type: "Agro Sourcing Partnership",
    stageBadge: "Partnership",
    isFeatured: false,
    topOpportunity: true,
    shortDescription: "Direct farm aggregation and collection center partnership for high-value horticulture crops.",
    overview:
      "KrishiBridge creates farmer-producer partnerships with rural entrepreneurs managing aggregation centers for fresh vegetables and fruits.",
    businessDescription:
      "Partners manage local collection points, grade harvested produce, and coordinate dispatch to urban wholesale distribution networks.",
    opportunityDetails: [
      "Weighing, grading, and crate inventory infrastructure provided",
      "Direct digital payments to farmers via mobile app",
      "Guaranteed purchase agreement for qualified produce",
      "Low capital requirement with active local community involvement",
    ],
    keyInformation: [
      { label: "Partner Profile", value: "Rural & Semi-Urban Agricultural Entrepreneurs" },
      { label: "Focus Crops", value: "Pomegranate, Grapes, Onions, Green Vegetables" },
      { label: "Investment Requirement", value: "Collection Center Setup & Working Capital" },
      { label: "Duration", value: "3 Years Renewable" },
    ],
    imageUrl: "https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?auto=format&fit=crop&w=800&q=80",
  },

  // --- TOP INTERNATIONAL OPPORTUNITIES ---
  {
    id: "opp-11",
    slug: "kinetics-industrial-automation",
    title: "Kinetics Industrial Robotic Workcells",
    category: "International",
    sector: "Manufacturing",
    location: "Europe & India Expansion",
    investmentRange: "₹1Cr+",
    rangeCategory: "1cr-plus",
    targetRaise: "₹1.5 Crores",
    targetAmountNum: 15000000,
    type: "Cross-Border Technology JV",
    stageBadge: "International",
    isFeatured: true,
    topOpportunity: true,
    shortDescription: "Modular robotic vision automation workcells for precision manufacturing and assembly lines.",
    overview:
      "Kinetics develops vision-guided robotic systems designed to automate CNC loading, inspection, and assembly in manufacturing plants.",
    businessDescription:
      "Seeking Indian manufacturing and integration partners to assemble, customize, and support robotics hardware for domestic automotive and engineering plants.",
    opportunityDetails: [
      "Proven deployments across European manufacturing facilities",
      "Patented vision calibration system with fast setup time",
      "Technology transfer and assembly licensing framework",
      "High demand across Indian industrial manufacturing hubs",
    ],
    keyInformation: [
      { label: "Technology Origin", value: "Munich, Germany" },
      { label: "Indian Partner Role", value: "Assembly, Integration & Client Support" },
      { label: "Target Sectors", value: "Auto-Components, Electronics & Precision Engineering" },
      { label: "Opportunity Structure", value: "Technology Licensing & Distribution" },
    ],
    imageUrl: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "opp-12",
    slug: "aether-financial-algo",
    title: "Aether Financial Algorithmic Systems",
    category: "International",
    sector: "Technology",
    location: "London, UK (Global Access)",
    investmentRange: "₹1Cr+",
    rangeCategory: "1cr-plus",
    targetRaise: "₹2.0 Crores",
    targetAmountNum: 20000000,
    type: "International Co-Investment",
    stageBadge: "International",
    isFeatured: false,
    topOpportunity: true,
    shortDescription: "Algorithmic trading and risk infrastructure software built for cross-border asset managers.",
    overview:
      "Aether delivers low-latency connectivity, algorithmic execution routing, and multi-market risk management software.",
    businessDescription:
      "Aether is expanding its Asian connectivity infrastructure to provide institutional algorithmic execution pipelines for quantitative desks.",
    opportunityDetails: [
      "High-throughput architecture with multi-exchange connectivity",
      "Proprietary hardware acceleration modules",
      "International institutional customer base",
      "Seeking strategic Asian expansion capital",
    ],
    keyInformation: [
      { label: "Headquarters", value: "London, United Kingdom" },
      { label: "Target Market", value: "Institutional Trading & Asset Management" },
      { label: "Deal Structure", value: "Equity Co-Investment" },
      { label: "Core Product", value: "Low-Latency Execution Engine" },
    ],
    imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
  },

  // --- TOP EXIM OPPORTUNITIES ---
  {
    id: "opp-13",
    slug: "indospice-organic-export",
    title: "IndoSpice Certified Organic Spices Export",
    category: "EXIM",
    sector: "EXIM",
    location: "Kochi, Kerala (Global Distribution)",
    investmentRange: "₹25L – ₹50L",
    rangeCategory: "25l-50l",
    targetRaise: "₹35 Lakhs",
    targetAmountNum: 3500000,
    type: "Export Trade Partnership",
    stageBadge: "EXIM",
    isFeatured: true,
    topOpportunity: true,
    shortDescription: "Processing, grading, and bulk export of certified organic Indian spices for European and Middle Eastern supermarket chains.",
    overview:
      "IndoSpice sources high-grade black pepper, cardamom, turmeric, and ginger directly from certified organic cultivators in Kerala and Karnataka.",
    businessDescription:
      "With confirmed export purchase orders from overseas buyers, IndoSpice seeks trade financing and working capital partners to expand procurement volumes and automated vacuum packaging lines.",
    opportunityDetails: [
      "FSSAI and EU-Bio certified processing and testing facilities",
      "Direct aggregation network with 400+ organic cultivators",
      "Confirmed repeat purchase orders with established overseas buyers",
      "Backed by international Letters of Credit (LC) on export shipments",
    ],
    keyInformation: [
      { label: "Commodity Focus", value: "Organic Black Pepper, Cardamom, Ginger & Turmeric" },
      { label: "Export Destinations", value: "Germany, UK, Netherlands & UAE" },
      { label: "Requirement", value: "Procurement Working Capital & Packaging Line" },
      { label: "Trade Security", value: "Irrevocable Export Letters of Credit" },
    ],
    imageUrl: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "opp-14",
    slug: "vedic-handloom-export",
    title: "Vedic Handloom & Silk Apparel Export",
    category: "EXIM",
    sector: "Fashion",
    location: "Surat, Gujarat",
    investmentRange: "₹10L – ₹25L",
    rangeCategory: "10l-25l",
    targetRaise: "₹20 Lakhs",
    targetAmountNum: 2000000,
    type: "Apparel Export Consortium",
    stageBadge: "EXIM",
    isFeatured: false,
    topOpportunity: true,
    shortDescription: "Export consortium for handwoven artisan silk fabrics, scarves, and ethnic garments servicing overseas retail boutiques.",
    overview:
      "Vedic Silk aggregates artisanal weaving clusters in Gujarat and Varanasi, producing export-ready sustainable ethnic garments.",
    businessDescription:
      "Supplying boutique fashion retailers in the US, UK, and Canada, the export consortium is expanding sampling capacity and digital B2B catalog distribution.",
    opportunityDetails: [
      "Handcrafted authentic textiles with high export market demand",
      "Direct partnership with artisan weaving cooperative societies",
      "Eco-friendly vegetable dyeing and sustainable packaging certification",
      "Seeking working capital partner for export seasonal production batches",
    ],
    keyInformation: [
      { label: "Export Focus", value: "Silk Stoles, Handloom Fabrics & Designer Ethnic Wear" },
      { label: "Manufacturing Base", value: "Surat & Varanasi Weaving Hubs" },
      { label: "Destination Markets", value: "USA, Canada, UK, Australia" },
      { label: "Investment Range", value: "₹10L – ₹25L" },
    ],
    imageUrl: "https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?auto=format&fit=crop&w=800&q=80",
  },
];
