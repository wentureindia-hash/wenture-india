"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useAuth } from "@/lib/firebase/auth-context";
import {
  createListing,
  updateListing,
  getUserListings,
  deleteListing,
  uploadListingImage,
  uploadPitchDeck,
  getListingPitchDeck,
  BusinessListing,
  ListingType,
} from "@/lib/firebase/listings";
import {
  OpportunityEnquiry,
  getEnquiriesForEntrepreneur,
  updateEnquiryStatus,
  EnquiryStatus,
} from "@/lib/firebase/firestore";
import { formatWhatsAppNumber } from "@/lib/constants/opportunities";
import { SECTORS } from "@/lib/constants/sectors";
import { motion, AnimatePresence } from "framer-motion";
import {
  InvestorContactModal,
  formatEnquiryWhatsAppText,
  formatEnquiryEmailSubject,
  formatEnquiryEmailBody,
} from "@/components/enquiries/investor-contact-modal";
import { FileUploadField, UploadStatus } from "@/components/ui/file-upload-field";
import { RoleSwitchModal } from "@/components/profile/role-switch-modal";

const LISTING_TYPES: ListingType[] = [
  "Investment",
  "Business",
  "Franchise",
  "Dealership",
  "Partnership",
  "International",
  "EXIM",
];

const INVESTMENT_RANGES = [
  "₹1L – ₹5L",
  "₹5L – ₹10L",
  "₹10L – ₹25L",
  "₹25L – ₹50L",
  "₹50L – ₹1Cr",
  "₹1Cr+",
];

const BUSINESS_TYPES = [
  "Private Limited (Pvt Ltd)",
  "Limited Liability Partnership (LLP)",
  "Sole Proprietorship",
  "Partnership Firm",
  "Startup / Pre-Incorporation",
  "Public Limited",
];

const BUSINESS_STAGES = [
  "Idea / Proof of Concept",
  "Early Traction / MVP",
  "Revenue Generating / Operational",
  "Profitable / Growth Stage",
  "Established Enterprise",
];

const YEARS_IN_OPERATION = [
  "Less than 1 Year",
  "1 – 3 Years",
  "3 – 5 Years",
  "5 – 10 Years",
  "10+ Years",
];

const BUSINESS_MODELS = [
  "B2B (Business to Business)",
  "B2C (Business to Consumer)",
  "D2C (Direct to Consumer)",
  "B2B2C",
  "Marketplace / Platform",
  "Manufacturing & Distribution",
  "Franchise & Dealership",
  "SaaS & Software",
  "Services & Consulting",
];

const INVESTMENT_PURPOSES = [
  "Working Capital & Operations",
  "Marketing & Customer Acquisition",
  "Product R&D & Engineering",
  "Machinery, Tech & Infrastructure",
  "Geographic & Retail Expansion",
  "Strategic Partnership & Scale",
];

const PREFERRED_INVESTOR_TYPES = [
  "Angel Investor",
  "Active Mentor / Strategic Partner",
  "Venture Capital / Institutional",
  "Silent Financier",
  "Any Suitable Investor",
];

export default function EntrepreneurListingsPage() {
  const router = useRouter();
  const {
    user,
    profile,
    role,
    roles,
    activeRole,
    isEntrepreneur,
    isAdmin,
    loading,
    isAuthenticated,
  } = useAuth();

  const [listings, setListings] = useState<BusinessListing[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingListing, setEditingListing] = useState<BusinessListing | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Tab & Enquiries state
  const [activeTab, setActiveTab] = useState<"listings" | "enquiries">("listings");
  const [enquiries, setEnquiries] = useState<OpportunityEnquiry[]>([]);
  const [loadingEnquiries, setLoadingEnquiries] = useState(false);
  const [updatingEnquiryId, setUpdatingEnquiryId] = useState<string | null>(null);
  const [selectedContactEnquiry, setSelectedContactEnquiry] = useState<OpportunityEnquiry | null>(null);

  // Section 1: Business Information
  const [title, setTitle] = useState("");
  const [businessType, setBusinessType] = useState(BUSINESS_TYPES[0]);
  const [listingType, setListingType] = useState<ListingType>("Investment");
  const [category, setCategory] = useState("Direct Business Opportunity");
  const [sector, setSector] = useState(SECTORS[0]?.name || "Technology & AI");
  const [location, setLocation] = useState("");
  const [businessStage, setBusinessStage] = useState(BUSINESS_STAGES[2]);
  const [yearsInOperation, setYearsInOperation] = useState(YEARS_IN_OPERATION[1]);
  const [businessModel, setBusinessModel] = useState(BUSINESS_MODELS[0]);
  const [description, setDescription] = useState("");

  // Section 2: Investment & Financial Information
  const [investmentRange, setInvestmentRange] = useState(INVESTMENT_RANGES[2]);
  const [investmentPurpose, setInvestmentPurpose] = useState(INVESTMENT_PURPOSES[0]);
  const [expectedUseOfFunds, setExpectedUseOfFunds] = useState("");
  const [preferredInvestorType, setPreferredInvestorType] = useState(PREFERRED_INVESTOR_TYPES[0]);
  const [expectedValuation, setExpectedValuation] = useState("");
  const [equityOffered, setEquityOffered] = useState("");
  const [turnover, setTurnover] = useState("");
  const [profit, setProfit] = useState("");

  // Section 3: Founder / Owner Information
  const [founderName, setFounderName] = useState("");
  const [founderBackground, setFounderBackground] = useState("");
  const [founderExperience, setFounderExperience] = useState("");
  const [website, setWebsite] = useState("");

  // Section 4: Business Presentation & Pitch Deck
  const [shortDescription, setShortDescription] = useState("");
  const [pitchDeckFile, setPitchDeckFile] = useState<File | null>(null);
  const [pitchDeckUrl, setPitchDeckUrl] = useState("");
  const [pitchDeckFileName, setPitchDeckFileName] = useState("");
  const [pitchDeckStoragePath, setPitchDeckStoragePath] = useState<string | null>(null);
  const [pitchDeckUploadStatus, setPitchDeckUploadStatus] = useState<UploadStatus>("idle");
  const [pitchDeckError, setPitchDeckError] = useState<string | null>(null);

  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUploadStatus, setImageUploadStatus] = useState<UploadStatus>("idle");
  const [imageError, setImageError] = useState<string | null>(null);

  // Section 5: Contact Details
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  // Fetch listings
  const loadUserListings = useCallback(async () => {
    setLoadingListings(true);
    const res = await getUserListings();
    if (!res.error) {
      setListings(res.listings);
    }
    setLoadingListings(false);
  }, []);

  // Fetch enquiries received for this entrepreneur's opportunities
  const loadEnquiries = useCallback(async () => {
    if (!user?.uid) return;
    setLoadingEnquiries(true);
    const res = await getEnquiriesForEntrepreneur(user.uid, user.email);
    if (!res.error) {
      setEnquiries(res.enquiries);
    }
    setLoadingEnquiries(false);
  }, [user?.uid, user?.email]);

  const handleEnquiryStatusUpdate = async (enquiryId?: string, newStatus?: EnquiryStatus) => {
    if (!enquiryId || !newStatus) return;
    setUpdatingEnquiryId(enquiryId);
    await updateEnquiryStatus("opportunity_enquiries", enquiryId, newStatus);
    setEnquiries((prev) =>
      prev.map((item) => (item.id === enquiryId ? { ...item, status: newStatus } : item))
    );
    setUpdatingEnquiryId(null);
  };

  const formatEnquiryDate = (createdAt: unknown) => {
    if (!createdAt) return "Recent";
    if (typeof createdAt === "object" && "seconds" in (createdAt as { seconds: number })) {
      return new Date((createdAt as { seconds: number }).seconds * 1000).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
    return "Recent";
  };

  // User is restricted if their role is not entrepreneur (or assigned entrepreneur) and not admin
  const hasEntrepreneurAccess = isEntrepreneur || role === "entrepreneur" || (roles && roles.includes("entrepreneur")) || isAdmin;
  const isRestricted =
    !loading &&
    isAuthenticated &&
    !hasEntrepreneurAccess;

  // Multi-role check: user has entrepreneur role, but their current activeRole is "investor"
  const isMultiRoleNeedingSwitch =
    !loading &&
    isAuthenticated &&
    !isAdmin &&
    hasEntrepreneurAccess &&
    activeRole === "investor";

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push("/login?redirect=/profile/listings");
      } else if (!isRestricted && !isMultiRoleNeedingSwitch && hasEntrepreneurAccess) {
        loadUserListings();
        loadEnquiries();
        if (user?.email) {
          setContactEmail(user.email);
        }
        if (profile?.fullName || profile?.name) {
          setFounderName(profile.fullName || profile.name || "");
        }
        if (profile?.phone) {
          setContactPhone(profile.phone);
        }
      }
    }
  }, [
    loading,
    isAuthenticated,
    isRestricted,
    isMultiRoleNeedingSwitch,
    hasEntrepreneurAccess,
    isEntrepreneur,
    role,
    isAdmin,
    router,
    user,
    profile,
    loadUserListings,
    loadEnquiries,
  ]);

  // Calculate form completeness percentage
  const calculateCompleteness = () => {
    const items = [
      Boolean(title.trim()),
      Boolean(businessType),
      Boolean(sector),
      Boolean(location.trim()),
      Boolean(shortDescription.trim()),
      Boolean(description.trim()),
      Boolean(investmentRange),
      Boolean(investmentPurpose),
      Boolean(expectedUseOfFunds.trim()),
      Boolean(founderName.trim()),
      Boolean(founderBackground.trim()),
      Boolean(pitchDeckFile || pitchDeckUrl),
      Boolean(contactPhone.trim()),
      Boolean(contactEmail.trim()),
    ];
    const completed = items.filter(Boolean).length;
    return Math.round((completed / items.length) * 100);
  };

  const scrollToListingTarget = (targetId: string) => {
    setTimeout(() => {
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        if ("focus" in el && typeof (el as HTMLElement).focus === "function") {
          (el as HTMLElement).focus();
        }
      } else {
        const modalBody = document.getElementById("create-listing-modal-body");
        if (modalBody) {
          modalBody.scrollTo({ top: 0, behavior: "smooth" });
        }
      }
    }, 50);
  };

  const handleOpenCreateModal = () => {
    setEditingListing(null);
    setTitle("");
    setBusinessType(BUSINESS_TYPES[0]);
    setListingType("Investment");
    setCategory("Direct Business Opportunity");
    setSector(SECTORS[0]?.name || "Technology & AI");
    setLocation("");
    setBusinessStage(BUSINESS_STAGES[2]);
    setYearsInOperation(YEARS_IN_OPERATION[1]);
    setBusinessModel(BUSINESS_MODELS[0]);
    setDescription("");
    setInvestmentRange(INVESTMENT_RANGES[2]);
    setInvestmentPurpose(INVESTMENT_PURPOSES[0]);
    setExpectedUseOfFunds("");
    setPreferredInvestorType(PREFERRED_INVESTOR_TYPES[0]);
    setExpectedValuation("");
    setEquityOffered("");
    setTurnover("");
    setProfit("");
    setWebsite("");
    setFounderName(profile?.fullName || profile?.name || "");
    setFounderBackground("");
    setFounderExperience("");
    setShortDescription("");
    setImageUrl("");
    setImageFile(null);
    setImageUploadStatus("idle");
    setImageError(null);
    setPitchDeckFile(null);
    setPitchDeckUrl("");
    setPitchDeckFileName("");
    setPitchDeckStoragePath(null);
    setPitchDeckUploadStatus("idle");
    setPitchDeckError(null);
    setContactPhone(profile?.phone || "");
    setContactEmail(user?.email || "");
    setFormError(null);
    setFormSuccess(null);
    setShowCreateModal(true);
  };

  const handleStartEdit = (listing: BusinessListing) => {
    setEditingListing(listing);
    // If published listing has pending review data, load from staged data so entrepreneur sees their pending draft
    const rawStaged = listing.hasPendingEdits && listing.pendingReviewData
      ? (listing.pendingReviewData as Record<string, unknown>)
      : null;

    setTitle((rawStaged?.title as string) || listing.title || "");
    setBusinessType((rawStaged?.businessType as string) || listing.businessType || BUSINESS_TYPES[0]);
    setListingType((rawStaged?.listingType as ListingType) || listing.listingType || "Investment");
    setCategory((rawStaged?.category as string) || listing.category || "Direct Business Opportunity");
    setSector((rawStaged?.sector as string) || listing.sector || SECTORS[0]?.name || "Technology & AI");
    setLocation((rawStaged?.location as string) || listing.location || "");
    setBusinessStage((rawStaged?.businessStage as string) || listing.businessStage || BUSINESS_STAGES[2]);
    setYearsInOperation((rawStaged?.yearsInOperation as string) || listing.yearsInOperation || YEARS_IN_OPERATION[1]);
    setBusinessModel((rawStaged?.businessModel as string) || listing.businessModel || BUSINESS_MODELS[0]);
    setDescription((rawStaged?.description as string) || listing.description || "");
    setInvestmentRange((rawStaged?.investmentRange as string) || listing.investmentRange || INVESTMENT_RANGES[2]);
    setInvestmentPurpose((rawStaged?.investmentPurpose as string) || listing.investmentPurpose || INVESTMENT_PURPOSES[0]);
    setExpectedUseOfFunds((rawStaged?.expectedUseOfFunds as string) || listing.expectedUseOfFunds || "");
    setPreferredInvestorType((rawStaged?.preferredInvestorType as string) || listing.preferredInvestorType || PREFERRED_INVESTOR_TYPES[0]);
    setExpectedValuation((rawStaged?.expectedValuation as string) || listing.expectedValuation || "");
    setEquityOffered((rawStaged?.equityOffered as string) || listing.equityOffered || "");
    setTurnover((rawStaged?.turnover as string) || listing.turnover || "");
    setProfit((rawStaged?.profit as string) || listing.profit || "");
    setWebsite((rawStaged?.website as string) || listing.website || "");
    setFounderName((rawStaged?.founderName as string) || listing.founderName || "");
    setFounderBackground((rawStaged?.founderBackground as string) || listing.founderBackground || "");
    setFounderExperience((rawStaged?.founderExperience as string) || listing.founderExperience || "");
    setShortDescription((rawStaged?.shortDescription as string) || listing.shortDescription || "");

    const existingImages = Array.isArray(rawStaged?.images) ? (rawStaged?.images as string[]) : listing.images;
    setImageUrl(existingImages && existingImages.length > 0 ? existingImages[0] : "");
    setImageFile(null);
    setImageUploadStatus(existingImages && existingImages.length > 0 ? "success" : "idle");
    setImageError(null);

    setPitchDeckFile(null);
    const existingDeckUrl = (rawStaged?.pitchDeckUrl as string) || listing.pitchDeckUrl || "";
    const existingDeckFileName = (rawStaged?.pitchDeckFileName as string) || listing.pitchDeckFileName || "";
    const existingStoragePath = (rawStaged?.pitchDeckStoragePath as string) || listing.pitchDeckStoragePath || null;
    setPitchDeckUrl(existingDeckUrl);
    setPitchDeckFileName(existingDeckFileName);
    setPitchDeckStoragePath(existingStoragePath);
    const hasExistingDeck = Boolean(
      existingDeckUrl ||
      existingStoragePath ||
      existingDeckFileName ||
      listing.hasPitchDeck
    );
    setPitchDeckUploadStatus(hasExistingDeck ? "success" : "idle");
    setPitchDeckError(null);

    // Asynchronously retrieve secure preview signed URL if pitch deck is stored in Supabase private storage
    if (!existingDeckUrl && (existingStoragePath || listing.hasPitchDeck) && listing.id) {
      getListingPitchDeck(listing.id)
        .then((deckRes) => {
          if (deckRes.url) {
            setPitchDeckUrl(deckRes.url);
          }
        })
        .catch(() => {});
    }

    setContactPhone((rawStaged?.contactPhone as string) || listing.contactPhone || "");
    setContactEmail((rawStaged?.contactEmail as string) || listing.contactEmail || user?.email || "");
    setFormError(null);
    setFormSuccess(null);
    setShowCreateModal(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!title.trim()) {
      setFormError("Business / Opportunity Name is required.");
      scrollToListingTarget("create-listing-title");
      return;
    }
    if (!location.trim()) {
      setFormError("Business Location is required.");
      scrollToListingTarget("create-listing-location");
      return;
    }
    if (!shortDescription.trim()) {
      setFormError("Short business summary is required.");
      scrollToListingTarget("create-listing-short-description");
      return;
    }
    if (!description.trim()) {
      setFormError("Detailed business description is required.");
      scrollToListingTarget("create-listing-description");
      return;
    }
    if (!contactPhone.trim() || !contactEmail.trim()) {
      setFormError("Both contact phone and contact email are required.");
      scrollToListingTarget(!contactPhone.trim() ? "create-listing-phone" : "create-listing-email");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) {
      setFormError("Please enter a valid contact email address.");
      scrollToListingTarget("create-listing-email");
      return;
    }

    setSubmitting(true);

    const tempId = `listing_${Date.now()}`;
    const folderId = editingListing?.id || tempId;
    let finalPitchDeckUrl = pitchDeckUrl;
    let finalPitchDeckFileName = pitchDeckFileName;
    let finalPitchDeckStoragePath = pitchDeckStoragePath;

    // 1. Handle pitch deck upload if a new file is pending upload
    if (pitchDeckFile) {
      setPitchDeckUploadStatus("uploading");
      setPitchDeckError(null);
      const pitchRes = await uploadPitchDeck(pitchDeckFile, folderId);

      if (pitchRes.error) {
        setPitchDeckUploadStatus("error");
        setPitchDeckError(pitchRes.error);
        setSubmitting(false);
        setFormError(pitchRes.error);
        scrollToListingTarget("field-pitch-deck-container");
        return;
      }

      setPitchDeckUploadStatus("success");
      finalPitchDeckUrl = pitchRes.url || "";
      finalPitchDeckFileName = pitchRes.fileName || pitchDeckFile.name;
      finalPitchDeckStoragePath = pitchRes.storagePath;
      setPitchDeckUrl(finalPitchDeckUrl);
      setPitchDeckFileName(finalPitchDeckFileName);
      setPitchDeckStoragePath(finalPitchDeckStoragePath);
    }

    // 2. Handle image upload if a new file is pending upload
    let finalImages: string[] = [];
    if (imageUrl.trim()) {
      finalImages.push(imageUrl.trim());
    }

    if (imageFile) {
      setImageUploadStatus("uploading");
      setImageError(null);
      const uploadRes = await uploadListingImage(imageFile, tempId);

      if (uploadRes.error) {
        setImageUploadStatus("error");
        setImageError(uploadRes.error);
        setSubmitting(false);
        setFormError(uploadRes.error);
        scrollToListingTarget("field-cover-image-container");
        return;
      }

      setImageUploadStatus("success");
      if (uploadRes.url) {
        finalImages.unshift(uploadRes.url);
      }
    }

    if (finalImages.length === 0) {
      finalImages.push("/images/opp-default.jpg");
    }

    // BRANCH: EDIT EXISTING LISTING
    if (editingListing?.id) {
      const updateRes = await updateListing(editingListing.id, {
        title: title.trim(),
        businessType,
        listingType,
        category: category.trim(),
        sector: sector.trim(),
        location: location.trim(),
        businessStage,
        yearsInOperation,
        businessModel,
        shortDescription: shortDescription.trim(),
        description: description.trim(),
        investmentRange,
        investmentPurpose,
        expectedUseOfFunds: expectedUseOfFunds.trim() || undefined,
        preferredInvestorType,
        expectedValuation: expectedValuation.trim() || undefined,
        equityOffered: equityOffered.trim() || undefined,
        turnover: turnover.trim() || undefined,
        profit: profit.trim() || undefined,
        website: website.trim() || undefined,
        founderName: founderName.trim() || undefined,
        founderBackground: founderBackground.trim() || undefined,
        founderExperience: founderExperience.trim() || undefined,
        pitchDeckUrl: finalPitchDeckUrl ? finalPitchDeckUrl.trim() : null,
        pitchDeckFileName: finalPitchDeckFileName ? finalPitchDeckFileName.trim() : null,
        pitchDeckStoragePath: finalPitchDeckStoragePath ? finalPitchDeckStoragePath.trim() : null,
        contactPhone: contactPhone.trim(),
        contactEmail: contactEmail.trim(),
        images: finalImages,
      });

      setSubmitting(false);

      if (updateRes.error) {
        setFormError(updateRes.error);
        return;
      }

      if (editingListing.status === "published") {
        setFormSuccess(
          "Revisions submitted successfully! Your changes are awaiting administrator review. The current approved listing remains live."
        );
      } else if (editingListing.status === "rejected") {
        setFormSuccess(
          "Listing revised and resubmitted successfully! It is now Pending Administrator Review."
        );
      } else {
        setFormSuccess("Listing updated successfully!");
      }

      await loadUserListings();
      setTimeout(() => {
        setShowCreateModal(false);
        setFormSuccess(null);
        setEditingListing(null);
      }, 2000);
      return;
    }

    // BRANCH: CREATE NEW LISTING
    const res = await createListing({
      title: title.trim(),
      businessType,
      listingType,
      category: category.trim(),
      sector: sector.trim(),
      location: location.trim(),
      businessStage,
      yearsInOperation,
      businessModel,
      shortDescription: shortDescription.trim(),
      description: description.trim(),
      investmentRange,
      investmentPurpose,
      expectedUseOfFunds: expectedUseOfFunds.trim() || undefined,
      preferredInvestorType,
      expectedValuation: expectedValuation.trim() || undefined,
      equityOffered: equityOffered.trim() || undefined,
      turnover: turnover.trim() || undefined,
      profit: profit.trim() || undefined,
      website: website.trim() || undefined,
      founderName: founderName.trim() || undefined,
      founderBackground: founderBackground.trim() || undefined,
      founderExperience: founderExperience.trim() || undefined,
      pitchDeckUrl: finalPitchDeckUrl || undefined,
      pitchDeckFileName: finalPitchDeckFileName || undefined,
      pitchDeckStoragePath: finalPitchDeckStoragePath || undefined,
      contactPhone: contactPhone.trim(),
      contactEmail: contactEmail.trim(),
      images: finalImages,
    });

    setSubmitting(false);

    if (res.error) {
      setFormError(res.error);
    } else {
      setFormSuccess("Opportunity submitted successfully! Status is Pending Admin Review.");
      // Reset form
      setTitle("");
      setShortDescription("");
      setDescription("");
      setLocation("");
      setExpectedUseOfFunds("");
      setFounderBackground("");
      setFounderExperience("");
      setPitchDeckFile(null);
      setPitchDeckUrl("");
      setPitchDeckFileName("");
      setPitchDeckStoragePath(null);
      setPitchDeckUploadStatus("idle");
      setPitchDeckError(null);
      setImageUrl("");
      setImageFile(null);
      setImageUploadStatus("idle");
      setImageError(null);
      await loadUserListings();
      setTimeout(() => {
        setShowCreateModal(false);
        setFormSuccess(null);
        setEditingListing(null);
      }, 1800);
    }
  };

  const handleRetryPitchDeck = async () => {
    if (!pitchDeckFile) return;
    setPitchDeckUploadStatus("uploading");
    setPitchDeckError(null);
    const tempId = `listing_${Date.now()}`;
    const res = await uploadPitchDeck(pitchDeckFile, tempId);
    if (res.error) {
      setPitchDeckUploadStatus("error");
      setPitchDeckError(res.error);
    } else {
      setPitchDeckUploadStatus("success");
      setPitchDeckUrl(res.url || "");
      setPitchDeckFileName(res.fileName || pitchDeckFile.name);
      setPitchDeckStoragePath(res.storagePath);
    }
  };

  const handleRetryImage = async () => {
    if (!imageFile) return;
    setImageUploadStatus("uploading");
    setImageError(null);
    const tempId = `listing_${Date.now()}`;
    const res = await uploadListingImage(imageFile, tempId);
    if (res.error) {
      setImageUploadStatus("error");
      setImageError(res.error);
    } else {
      setImageUploadStatus("success");
      if (res.url) {
        setImageUrl(res.url);
      }
    }
  };

  const handleDeleteListing = async (listingId?: string) => {
    if (!listingId) return;
    if (!confirm("Are you sure you want to remove this listing?")) return;
    const res = await deleteListing(listingId);
    if (!res.error) {
      loadUserListings();
    } else {
      alert("Failed to delete: " + res.error);
    }
  };

  // If user has both roles and is currently in Investor mode, require active role switch
  if (isMultiRoleNeedingSwitch) {
    return (
      <div className="flex flex-col min-h-screen bg-[#F6FAFF]">
        <Navbar />
        <main className="flex-grow flex items-center justify-center py-24 px-5">
          <RoleSwitchModal
            isOpen={true}
            targetRole="entrepreneur"
            targetPath="/profile/listings"
            onClose={() => router.push("/profile")}
          />
          <div className="text-center">
            <div className="w-8 h-8 border-3 border-[#00A6E8] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-semibold text-[#5F7180]">Switching to Entrepreneur mode...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // If user is signed in as an Investor (or non-entrepreneur), block access and prompt to sign up/in as Entrepreneur
  if (isRestricted) {
    return (
      <div className="flex flex-col min-h-screen bg-[#F6FAFF]">
        <Navbar />
        <main className="flex-grow flex items-center justify-center py-16 px-5 sm:px-8">
          <div className="max-w-lg w-full bg-white border border-[#DCECF2] rounded-3xl p-8 sm:p-10 shadow-[0_16px_40px_rgba(10,25,42,0.06)] text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#EBF6FC] text-[#00A6E8] flex items-center justify-center mx-auto mb-6 shadow-sm border border-[#00A6E8]/20">
              <span className="material-symbols-outlined text-[32px]">rocket_launch</span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold mb-3">
              <span className="material-symbols-outlined text-[15px] text-amber-600">lock</span>
              <span>Entrepreneur Account Required</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0A192A] mb-3 font-heading tracking-tight">
              List Your Venture Access Restricted
            </h1>

            <p className="text-sm text-[#5F7180] leading-relaxed mb-8">
              You are currently signed in as an <strong>Investor</strong>. Listing a business venture, franchise, or commercial opportunity to seek capital is reserved exclusively for registered Entrepreneurs. To list your venture and connect with investors, please sign up or sign in with an Entrepreneur account.
            </p>

            <div className="flex flex-col gap-3">
              <Link
                href="/signup/entrepreneur"
                className="w-full py-3.5 px-6 rounded-xl bg-[#00A6E8] hover:bg-[#0093CE] text-white font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">person_add</span>
                <span>Sign Up as Entrepreneur</span>
              </Link>

              <Link
                href="/login/entrepreneur"
                className="w-full py-3 px-6 rounded-xl bg-white border border-[#DCECF2] hover:bg-[#F4FAFD] text-[#00658F] font-bold text-xs transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px]">login</span>
                <span>Sign In with Existing Entrepreneur Account</span>
              </Link>

              <Link
                href="/profile"
                className="w-full py-2.5 text-xs font-semibold text-[#5F7180] hover:text-[#0A192A] transition-colors"
              >
                ← Return to Profile
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (loading || (!isAuthenticated && loadingListings)) {
    return (
      <div className="flex flex-col min-h-screen bg-[#F6FAFF]">
        <Navbar />
        <main className="flex-grow flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-[#00A6E8] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-[#5F7180] font-medium">Loading listings dashboard...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F6FAFF] selection:bg-[#00A6E8] selection:text-white">
      <Navbar />

      <main className="flex-grow py-12 sm:py-16">
        <div className="w-full max-w-[1140px] mx-auto px-5 sm:px-8">
          {/* Breadcrumb & Navigation */}
          <div className="flex items-center gap-2 text-xs font-semibold text-[#5F7180] mb-6">
            <Link href="/profile" className="hover:text-[#00A6E8] transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>Back to Profile</span>
            </Link>
            <span>/</span>
            <span className="text-[#0A192A]">Business &amp; Opportunity Listings</span>
          </div>

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <span className="text-xs font-bold text-[#00A6E8] uppercase tracking-wider block mb-1">
                Entrepreneur Workspace
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0A192A] tracking-tight font-heading">
                My Business Listings
              </h1>
              <p className="text-sm sm:text-base text-[#5F7180] mt-1">
                Manage your business opportunities and track their review status on Wenture India.
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="px-5 py-3 rounded-xl bg-[#00A6E8] hover:bg-[#0093CE] text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-[#00A6E8]/20 flex items-center gap-2 self-start sm:self-auto cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>Create New Listing</span>
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 p-1.5 bg-white border border-[#DCECF2] rounded-2xl mb-8 shadow-sm overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab("listings")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === "listings"
                  ? "bg-[#00A6E8] text-white shadow-sm"
                  : "text-[#5F7180] hover:text-[#0A192A] hover:bg-[#F6FAFF]"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">storefront</span>
              <span>My Listings ({listings.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("enquiries");
                loadEnquiries();
              }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === "enquiries"
                  ? "bg-[#00A6E8] text-white shadow-sm"
                  : "text-[#5F7180] hover:text-[#0A192A] hover:bg-[#F6FAFF]"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">mark_email_unread</span>
              <span>Interest Received ({enquiries.length})</span>
              {enquiries.filter((e) => (e.status || "").toLowerCase() === "new").length > 0 && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </button>
          </div>

          {activeTab === "enquiries" ? (
            <div>
              {/* Info banner */}
              <div className="bg-[#EBF6FC] border border-[#DCECF2] rounded-2xl p-4 sm:p-5 mb-8 flex items-start gap-3 text-xs sm:text-sm text-[#00658F]">
                <span className="material-symbols-outlined text-[20px] text-[#00A6E8] shrink-0 mt-0.5">
                  forum
                </span>
                <div className="leading-relaxed">
                  <strong>Direct Inbound Channel:</strong> Below are all enquiries sent directly to you by verified investors and fellow entrepreneurs who clicked &ldquo;I&apos;m Interested&rdquo; on your opportunities. Connect directly with them without middlemen.
                </div>
              </div>

              {loadingEnquiries ? (
                <div className="bg-white border border-[#DCECF2] rounded-2xl p-12 text-center text-[#5F7180]">
                  <div className="w-8 h-8 border-3 border-[#00A6E8] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm">Fetching enquiries received for your opportunities...</p>
                </div>
              ) : enquiries.length === 0 ? (
                <div className="bg-white border border-[#DCECF2] rounded-2xl p-12 text-center shadow-sm">
                  <div className="w-16 h-16 rounded-full bg-[#F4FAFD] text-[#00A6E8] flex items-center justify-center mx-auto mb-4 border border-[#DCECF2]">
                    <span className="material-symbols-outlined text-[32px]">inbox</span>
                  </div>
                  <h3 className="text-xl font-bold text-[#0A192A] mb-2 font-heading">
                    No Enquiries Received Yet
                  </h3>
                  <p className="text-sm text-[#5F7180] max-w-md mx-auto leading-relaxed">
                    When investors or entrepreneurs click &ldquo;I&apos;m Interested&rdquo; on your opportunities, their profile details, message, and direct contact options will appear here immediately.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-5">
                  {enquiries.map((enq) => {
                    const normStatus = (enq.status || "New").toLowerCase();
                    let statusBg = "bg-blue-50 text-blue-700 border-blue-200";
                    if (normStatus === "contacted") {
                      statusBg = "bg-amber-50 text-amber-700 border-amber-200";
                    } else if (normStatus === "in discussion") {
                      statusBg = "bg-purple-50 text-purple-700 border-purple-200";
                    } else if (normStatus === "closed") {
                      statusBg = "bg-emerald-50 text-emerald-700 border-emerald-200";
                    }

                    const senderPhone = enq.senderPhone || enq.phone || "";
                    const senderEmail = enq.senderEmail || enq.email || "";
                    const senderWaUrl = senderPhone
                      ? `https://wa.me/${formatWhatsAppNumber(senderPhone)}?text=${encodeURIComponent(
                          formatEnquiryWhatsAppText(enq)
                        )}`
                      : "";
                    const senderMailtoUrl = senderEmail
                      ? `mailto:${senderEmail}?subject=${encodeURIComponent(
                          formatEnquiryEmailSubject(enq)
                        )}&body=${encodeURIComponent(
                          formatEnquiryEmailBody(
                            enq,
                            profile?.fullName || profile?.name || user?.displayName || "Entrepreneur"
                          )
                        )}`
                      : "";

                    return (
                      <motion.div
                        key={enq.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white border border-[#DCECF2] rounded-2xl p-6 sm:p-7 shadow-[0_4px_20px_rgba(10,25,42,0.03)] hover:shadow-md transition-shadow"
                      >
                        {/* Header Row */}
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#DCECF2]">
                          <div>
                            <div className="flex flex-wrap items-center gap-2 mb-1.5">
                              <span className="px-2.5 py-1 bg-[#EBF6FC] text-[#00A6E8] text-[11px] font-bold rounded-md">
                                Opportunity: {enq.opportunityTitle}
                              </span>
                              <span
                                className={`px-2.5 py-1 rounded-md text-[11px] font-bold border uppercase tracking-wider ${statusBg}`}
                              >
                                {enq.status || "New"}
                              </span>
                            </div>
                            <h3 className="text-lg font-bold text-[#0A192A] font-heading flex items-center gap-2">
                              <span>{enq.senderName || enq.name}</span>
                              <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-700 font-semibold rounded">
                                {enq.senderRole || "Investor"}
                              </span>
                            </h3>
                          </div>

                          {/* Status Updater */}
                          <div className="flex items-center gap-3 self-start lg:self-auto">
                            <span className="text-xs font-semibold text-[#5F7180]">Enquiry Status:</span>
                            <select
                              value={
                                normStatus === "contacted"
                                  ? "Contacted"
                                  : normStatus === "in discussion"
                                  ? "In Discussion"
                                  : normStatus === "closed"
                                  ? "Closed"
                                  : "New"
                              }
                              disabled={updatingEnquiryId === enq.id}
                              onChange={(e) =>
                                handleEnquiryStatusUpdate(enq.id, e.target.value as EnquiryStatus)
                              }
                              className="text-xs font-bold border border-[#DCECF2] rounded-xl px-3 py-2 bg-white text-[#0A192A] focus:outline-none focus:border-[#00A6E8] cursor-pointer"
                            >
                              <option value="New">New</option>
                              <option value="Contacted">Contacted</option>
                              <option value="In Discussion">In Discussion</option>
                              <option value="Closed">Closed</option>
                            </select>
                          </div>
                        </div>

                        {/* Metadata Grid */}
                        <div className="py-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 border-b border-[#DCECF2] text-xs">
                          <div>
                            <span className="text-[#5F7180] block mb-0.5">Profile / Type:</span>
                            <span className="font-bold text-[#0A192A]">{enq.senderType || "Direct Investor"}</span>
                          </div>
                          <div>
                            <span className="text-[#5F7180] block mb-0.5">Phone Number:</span>
                            <span className="font-bold text-[#0A192A]">{senderPhone || "Not provided"}</span>
                          </div>
                          <div>
                            <span className="text-[#5F7180] block mb-0.5">Email Address:</span>
                            <span className="font-bold text-[#0A192A] truncate block" title={senderEmail}>
                              {senderEmail || "Not provided"}
                            </span>
                          </div>
                          <div>
                            <span className="text-[#5F7180] block mb-0.5">Location:</span>
                            <span className="font-bold text-[#0A192A]">{enq.senderLocation || "India"}</span>
                          </div>
                          <div>
                            <span className="text-[#5F7180] block mb-0.5">Investment Range:</span>
                            <span className="font-bold text-emerald-700">
                              {enq.investmentRange || enq.investmentCapacity || "Flexible"}
                            </span>
                          </div>
                          <div>
                            <span className="text-[#5F7180] block mb-0.5">Received Date:</span>
                            <span className="font-bold text-[#0A192A]">{formatEnquiryDate(enq.createdAt)}</span>
                          </div>
                        </div>

                        {/* Message */}
                        <div className="py-4">
                          <span className="text-xs font-bold text-[#5F7180] block mb-1.5 uppercase tracking-wider">
                            Enquiry Message:
                          </span>
                          <div className="p-3.5 bg-[#F8FAFD] border border-[#DCECF2] rounded-xl text-xs sm:text-sm text-[#0A192A] leading-relaxed">
                            {enq.message || "I am interested in learning more about this opportunity."}
                          </div>
                        </div>

                        {/* Direct Contact Actions */}
                        <div className="pt-2 flex flex-wrap items-center gap-3">
                          {/* View Full Investor Details Button */}
                          <button
                            type="button"
                            onClick={() => setSelectedContactEnquiry(enq)}
                            className="px-4 py-2 bg-[#EBF6FC] hover:bg-[#DCECF2] text-[#00658F] font-bold text-xs rounded-xl border border-[#DCECF2] transition-colors flex items-center gap-1.5 shadow-2xs"
                          >
                            <span className="material-symbols-outlined text-[16px]">badge</span>
                            <span>Investor Details</span>
                          </button>

                          {/* WhatsApp */}
                          {senderWaUrl ? (
                            <a
                              href={senderWaUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl border border-emerald-200 transition-colors flex items-center gap-1.5 shadow-2xs"
                            >
                              <span className="material-symbols-outlined text-[16px]">chat</span>
                              <span>Chat on WhatsApp ({senderPhone})</span>
                            </a>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setSelectedContactEnquiry(enq)}
                              className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl border border-emerald-200 transition-colors flex items-center gap-1.5 shadow-2xs"
                            >
                              <span className="material-symbols-outlined text-[16px]">chat</span>
                              <span>WhatsApp</span>
                            </button>
                          )}

                          {/* Email */}
                          {senderMailtoUrl ? (
                            <a
                              href={senderMailtoUrl}
                              className="px-4 py-2 bg-[#F4FAFD] hover:bg-[#EBF6FC] text-[#00658F] font-bold text-xs rounded-xl border border-[#DCECF2] transition-colors flex items-center gap-1.5 shadow-2xs"
                            >
                              <span className="material-symbols-outlined text-[16px]">mail</span>
                              <span>Reply via Email ({senderEmail})</span>
                            </a>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setSelectedContactEnquiry(enq)}
                              className="px-4 py-2 bg-[#F4FAFD] hover:bg-[#EBF6FC] text-[#00658F] font-bold text-xs rounded-xl border border-[#DCECF2] transition-colors flex items-center gap-1.5 shadow-2xs"
                            >
                              <span className="material-symbols-outlined text-[16px]">mail</span>
                              <span>Email</span>
                            </button>
                          )}

                          {/* Call */}
                          <button
                            type="button"
                            onClick={() => setSelectedContactEnquiry(enq)}
                            className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5 shadow-2xs"
                          >
                            <span className="material-symbols-outlined text-[16px]">call</span>
                            <span>Call {senderPhone ? `(${senderPhone})` : ""}</span>
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div>
              {/* Notice banner */}
              <div className="bg-[#EBF6FC] border border-[#DCECF2] rounded-2xl p-4 sm:p-5 mb-8 flex items-start gap-3 text-xs sm:text-sm text-[#00658F]">
                <span className="material-symbols-outlined text-[20px] text-[#00A6E8] shrink-0 mt-0.5">
                  verified
                </span>
                <div className="leading-relaxed">
                  <strong>Quality &amp; Review Policy:</strong> All business opportunities submitted on Wenture India are verified by our institutional review team. New submissions start with a <span className="font-bold">Pending</span> status and become public immediately upon approval.
                </div>
              </div>

              {/* Listings Container */}
              {loadingListings ? (
                <div className="bg-white border border-[#DCECF2] rounded-2xl p-12 text-center text-[#5F7180]">
                  <div className="w-8 h-8 border-3 border-[#00A6E8] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm">Fetching your listings from database...</p>
                </div>
              ) : listings.length === 0 ? (
                <div className="bg-white border border-[#DCECF2] rounded-2xl p-12 text-center shadow-sm">
                  <div className="w-16 h-16 rounded-full bg-[#F4FAFD] text-[#00A6E8] flex items-center justify-center mx-auto mb-4 border border-[#DCECF2]">
                    <span className="material-symbols-outlined text-[32px]">storefront</span>
                  </div>
                  <h3 className="text-xl font-bold text-[#0A192A] mb-2 font-heading">
                    No Business Listings Found
                  </h3>
                  <p className="text-sm text-[#5F7180] max-w-md mx-auto mb-6 leading-relaxed">
                    You haven&apos;t published or submitted any business opportunities yet. Click below to introduce your venture to investors and partners.
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenCreateModal}
                    className="px-6 py-3 rounded-xl bg-[#00A6E8] hover:bg-[#0093CE] text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-[#00A6E8]/20 inline-flex items-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    <span>Submit Your First Opportunity</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-5">
                  {listings.map((item) => {
                    let badgeColor = "bg-amber-50 text-amber-800 border-amber-200";
                    let statusLabel = "Pending Review";
                    if (item.status === "published") {
                      badgeColor = "bg-emerald-50 text-emerald-800 border-emerald-200";
                      statusLabel = "Published & Live";
                    } else if (item.status === "rejected") {
                      badgeColor = "bg-rose-50 text-rose-800 border-rose-200";
                      statusLabel = "Needs Revision";
                    }

                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white border border-[#DCECF2] rounded-2xl p-6 sm:p-7 shadow-[0_4px_20px_rgba(10,25,42,0.03)] hover:shadow-md transition-shadow"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#DCECF2]">
                          <div>
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-extrabold uppercase tracking-wider border ${badgeColor}`}>
                                {statusLabel}
                              </span>
                              {item.isVerified && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[12px] text-blue-600">verified</span>
                                  <span>Verified Listing</span>
                                </span>
                              )}
                              {item.hasPendingEdits && (
                                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[13px] text-amber-600">hourglass_top</span>
                                  <span>Revisions Awaiting Review</span>
                                </span>
                              )}
                              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[#F4FAFD] text-[#00658F] border border-[#DCECF2]">
                                {item.listingType}
                              </span>
                              <span className="text-xs text-[#5F7180]">
                                Sector: <strong className="text-[#0A192A]">{item.sector}</strong>
                              </span>
                            </div>
                            <h2 className="text-xl font-bold text-[#0A192A] font-heading">
                              {item.title}
                            </h2>
                          </div>

                          <div className="flex flex-wrap items-center gap-2.5">
                            {/* Edit / Revise Button */}
                            <button
                              type="button"
                              onClick={() => handleStartEdit(item)}
                              className="px-4 py-2 rounded-xl bg-[#00A6E8] hover:bg-[#0093CE] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                {item.status === "rejected" ? "edit_note" : "edit"}
                              </span>
                              <span>
                                {item.status === "rejected" ? "Revise & Resubmit" : "Edit Listing"}
                              </span>
                            </button>

                            {item.status === "published" && item.id && (
                              <Link
                                href={`/opportunities/${item.id}`}
                                target="_blank"
                                className="px-3.5 py-2 rounded-xl bg-[#F4FAFD] hover:bg-[#EBF6FC] text-[#00658F] border border-[#DCECF2] text-xs font-bold transition-colors flex items-center gap-1.5"
                              >
                                <span>View Public Page</span>
                                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                              </Link>
                            )}

                            <button
                              type="button"
                              onClick={() => handleDeleteListing(item.id)}
                              className="px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                              <span>Remove</span>
                            </button>
                          </div>
                        </div>

                        <div className="pt-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                          <div className="md:col-span-8">
                            <p className="text-xs sm:text-sm text-[#5F7180] leading-relaxed mb-4">
                              {item.shortDescription}
                            </p>

                            <div className="flex flex-wrap items-center gap-4 text-xs text-[#5F7180]">
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[16px] text-[#00A6E8]">location_on</span>
                                {item.location}
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[16px] text-[#00A6E8]">payments</span>
                                {item.investmentRange}
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[16px] text-[#00A6E8]">phone</span>
                                {item.contactPhone}
                              </span>
                              {item.turnover && (
                                <span className="flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[16px] text-[#00A6E8]">trending_up</span>
                                  Turnover: {item.turnover}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Rejection / Revision feedback notice */}
                          {item.status === "rejected" && item.rejectionReason && (
                            <div className="md:col-span-12 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-2 shadow-2xs">
                              <div className="flex items-start gap-2.5">
                                <span className="material-symbols-outlined text-[20px] text-rose-600 shrink-0 mt-0.5">info</span>
                                <div>
                                  <strong className="block font-bold text-rose-950 mb-0.5">Administrator Review Feedback:</strong>
                                  <p className="text-rose-800 leading-relaxed">{item.rejectionReason}</p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleStartEdit(item)}
                                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shrink-0 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                              >
                                <span className="material-symbols-outlined text-[15px]">edit_note</span>
                                <span>Revise Listing Now</span>
                              </button>
                            </div>
                          )}

                          {/* Staged revisions banner */}
                          {item.hasPendingEdits && (
                            <div className="md:col-span-12 p-3.5 bg-amber-50/90 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2 mt-2">
                              <span className="material-symbols-outlined text-[18px] text-amber-600 shrink-0">pending_actions</span>
                              <span>Your updates have been submitted and are under administrator review. The current live version remains active in the public catalog until approved.</span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* ============================================================ */}
      {/* CREATE / EDIT LISTING MODAL */}
      {/* ============================================================ */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-3xl bg-white border border-[#DCECF2] rounded-2xl sm:rounded-3xl shadow-2xl p-5 sm:p-8 my-6 sm:my-8 max-h-[92vh] overflow-y-auto"
            >
              <div className="flex items-start justify-between pb-4 border-b border-[#DCECF2] mb-5">
                <div>
                  <span className="text-[10px] sm:text-[11px] font-bold text-[#00A6E8] uppercase tracking-wider block mb-0.5">
                    {editingListing
                      ? editingListing.status === "published"
                        ? "Live Listing Revision"
                        : editingListing.status === "rejected"
                        ? "Address Review Feedback"
                        : "Edit Pending Opportunity"
                      : "Entrepreneur Onboarding & Listing"}
                  </span>
                  <h3 className="text-lg sm:text-2xl font-bold text-[#0A192A] font-heading">
                    {editingListing
                      ? editingListing.status === "published"
                        ? "Update Published Opportunity"
                        : editingListing.status === "rejected"
                        ? "Revise & Resubmit Opportunity"
                        : "Edit Business Opportunity"
                      : "List Your Business Opportunity"}
                  </h3>
                  <p className="text-xs text-[#5F7180] mt-1">
                    {editingListing
                      ? editingListing.status === "published"
                        ? "Submit updates to your live opportunity. Your live listing remains published until changes are approved."
                        : editingListing.status === "rejected"
                        ? "Address the review feedback below and resubmit for administrator approval."
                        : "Update your pending venture submission before administrator moderation."
                      : "Complete your venture profile to connect with active investors and strategic commercial partners."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <span className="material-symbols-outlined text-[24px]">close</span>
                </button>
              </div>

              {/* Revision feedback alert inside modal if rejected */}
              {editingListing?.status === "rejected" && editingListing.rejectionReason && (
                <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-900 flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-[20px] text-rose-600 shrink-0 mt-0.5">feedback</span>
                  <div>
                    <strong className="block font-bold text-rose-950 mb-0.5">Administrator Revision Feedback to Address:</strong>
                    <p className="text-rose-800 leading-relaxed">{editingListing.rejectionReason}</p>
                  </div>
                </div>
              )}

              {/* Published live status notice if editing published */}
              {editingListing?.status === "published" && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-900 flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-[20px] text-blue-600 shrink-0 mt-0.5">info</span>
                  <div>
                    <strong className="block font-bold text-blue-950 mb-0.5">Safe Revision Workflow:</strong>
                    <p className="text-blue-800 leading-relaxed">
                      Your existing approved opportunity remains live in the catalog. When you submit edits, they will be reviewed by an administrator before updating the public listing.
                    </p>
                  </div>
                </div>
              )}

              {/* Completeness Indicator */}
              <div className="mb-6 p-3.5 sm:p-4 bg-[#F4FAFD] border border-[#DCECF2] rounded-2xl">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#0A192A]">
                    <span className="material-symbols-outlined text-[16px] text-[#00A6E8]">verified</span>
                    <span>Listing Completeness Meter</span>
                  </div>
                  <span className="text-xs font-extrabold text-[#00658F]">
                    {calculateCompleteness()}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${
                      calculateCompleteness() >= 80
                        ? "bg-emerald-500"
                        : calculateCompleteness() >= 50
                        ? "bg-[#00A6E8]"
                        : "bg-amber-500"
                    }`}
                    style={{ width: `${calculateCompleteness()}%` }}
                  />
                </div>
                <p className="text-[11px] text-[#5F7180] mt-1.5">
                  {calculateCompleteness() >= 80
                    ? "✓ Excellent! Comprehensive listings receive higher investor engagement."
                    : "💡 Add your pitch deck, founder background, and use of funds to strengthen your opportunity presentation."}
                </p>
              </div>

              {formError && (
                <div className="mb-5 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-red-500">error</span>
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-emerald-600">check_circle</span>
                  <span>{formSuccess}</span>
                </div>
              )}

              <form onSubmit={handleCreateSubmit} className="space-y-6">
                {/* ======================================================= */}
                {/* SECTION 1: BUSINESS INFORMATION */}
                {/* ======================================================= */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-[#DCECF2]">
                    <div className="w-6 h-6 rounded-md bg-[#EBF6FC] text-[#00A6E8] flex items-center justify-center font-bold text-xs">
                      1
                    </div>
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-[#0A192A]">
                        Business Information
                      </h4>
                      <p className="text-[11px] text-[#5F7180]">
                        Core parameters, stage, industry, and structure of your company.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#0A192A] mb-1">
                        Business Name *
                      </label>
                      <p className="text-[11px] text-[#5F7180] mb-1.5 leading-snug">
                        Official trade name or company title.
                      </p>
                      <input
                        id="create-listing-title"
                        type="text"
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Apex CleanTech Systems"
                        className="w-full px-3.5 py-2.5 bg-white border border-[#DCECF2] rounded-xl text-xs sm:text-sm text-[#0A192A] focus:outline-none focus:border-[#00A6E8]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#0A192A] mb-1">
                        Business Type *
                      </label>
                      <p className="text-[11px] text-[#5F7180] mb-1.5 leading-snug">
                        Legal registration entity or incorporation structure.
                      </p>
                      <select
                        value={businessType}
                        onChange={(e) => setBusinessType(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-[#DCECF2] rounded-xl text-xs sm:text-sm text-[#0A192A] focus:outline-none focus:border-[#00A6E8]"
                      >
                        {BUSINESS_TYPES.map((bt) => (
                          <option key={bt} value={bt}>
                            {bt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#0A192A] mb-1">
                        Category *
                      </label>
                      <p className="text-[11px] text-[#5F7180] mb-1.5 leading-snug">
                        Listing classification.
                      </p>
                      <select
                        value={listingType}
                        onChange={(e) => {
                          setListingType(e.target.value as ListingType);
                          setCategory(`${e.target.value} Opportunity`);
                        }}
                        className="w-full px-3.5 py-2.5 bg-white border border-[#DCECF2] rounded-xl text-xs sm:text-sm text-[#0A192A] focus:outline-none focus:border-[#00A6E8]"
                      >
                        {LISTING_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#0A192A] mb-1">
                        Industry Sector *
                      </label>
                      <p className="text-[11px] text-[#5F7180] mb-1.5 leading-snug">
                        Primary domain.
                      </p>
                      <select
                        value={sector}
                        onChange={(e) => setSector(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-[#DCECF2] rounded-xl text-xs sm:text-sm text-[#0A192A] focus:outline-none focus:border-[#00A6E8]"
                      >
                        {SECTORS.map((s) => (
                          <option key={s.id} value={s.name}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#0A192A] mb-1">
                        Business Location *
                      </label>
                      <p className="text-[11px] text-[#5F7180] mb-1.5 leading-snug">
                        City &amp; State.
                      </p>
                      <input
                        id="create-listing-location"
                        type="text"
                        required
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="e.g. Pune, Maharashtra"
                        className="w-full px-3.5 py-2.5 bg-white border border-[#DCECF2] rounded-xl text-xs sm:text-sm text-[#0A192A] focus:outline-none focus:border-[#00A6E8]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#0A192A] mb-1">
                        Business Stage *
                      </label>
                      <p className="text-[11px] text-[#5F7180] mb-1.5 leading-snug">
                        Current operational maturity.
                      </p>
                      <select
                        value={businessStage}
                        onChange={(e) => setBusinessStage(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-[#DCECF2] rounded-xl text-xs sm:text-sm text-[#0A192A] focus:outline-none focus:border-[#00A6E8]"
                      >
                        {BUSINESS_STAGES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#0A192A] mb-1">
                        Years in Operation *
                      </label>
                      <p className="text-[11px] text-[#5F7180] mb-1.5 leading-snug">
                        Time in market.
                      </p>
                      <select
                        value={yearsInOperation}
                        onChange={(e) => setYearsInOperation(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-[#DCECF2] rounded-xl text-xs sm:text-sm text-[#0A192A] focus:outline-none focus:border-[#00A6E8]"
                      >
                        {YEARS_IN_OPERATION.map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#0A192A] mb-1">
                        Business Model *
                      </label>
                      <p className="text-[11px] text-[#5F7180] mb-1.5 leading-snug">
                        Revenue generation model.
                      </p>
                      <select
                        value={businessModel}
                        onChange={(e) => setBusinessModel(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-[#DCECF2] rounded-xl text-xs sm:text-sm text-[#0A192A] focus:outline-none focus:border-[#00A6E8]"
                      >
                        {BUSINESS_MODELS.map((bm) => (
                          <option key={bm} value={bm}>
                            {bm}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#0A192A] mb-1">
                      Detailed Business Description *
                    </label>
                    <p className="text-[11px] text-[#5F7180] mb-1.5 leading-snug">
                      Detailed breakdown of products/services, customers, distribution channels, traction, competitive moat, and strategic vision.
                    </p>
                    <textarea
                      id="create-listing-description"
                      rows={4}
                      required
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Explain your business value proposition, customer metrics, key assets, and operations..."
                      className="w-full px-3.5 py-2.5 bg-white border border-[#DCECF2] rounded-xl text-xs sm:text-sm text-[#0A192A] focus:outline-none focus:border-[#00A6E8]"
                    />
                  </div>
                </div>

                {/* ======================================================= */}
                {/* SECTION 2: INVESTMENT INFORMATION */}
                {/* ======================================================= */}
                <div className="space-y-4 pt-4 border-t border-[#DCECF2]">
                  <div className="flex items-center gap-2 pb-2 border-b border-[#DCECF2]">
                    <div className="w-6 h-6 rounded-md bg-[#EBF6FC] text-[#00A6E8] flex items-center justify-center font-bold text-xs">
                      2
                    </div>
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-[#0A192A]">
                        Investment &amp; Capital Requirements
                      </h4>
                      <p className="text-[11px] text-[#5F7180]">
                        Capital ask, purpose of funds, and preferred investor profiles.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#0A192A] mb-1">
                        Required Investment *
                      </label>
                      <p className="text-[11px] text-[#5F7180] mb-1.5 leading-snug">
                        Target capital range.
                      </p>
                      <select
                        value={investmentRange}
                        onChange={(e) => setInvestmentRange(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-[#DCECF2] rounded-xl text-xs sm:text-sm text-[#0A192A] focus:outline-none focus:border-[#00A6E8]"
                      >
                        {INVESTMENT_RANGES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#0A192A] mb-1">
                        Investment Purpose *
                      </label>
                      <p className="text-[11px] text-[#5F7180] mb-1.5 leading-snug">
                        Primary use category.
                      </p>
                      <select
                        value={investmentPurpose}
                        onChange={(e) => setInvestmentPurpose(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-[#DCECF2] rounded-xl text-xs sm:text-sm text-[#0A192A] focus:outline-none focus:border-[#00A6E8]"
                      >
                        {INVESTMENT_PURPOSES.map((ip) => (
                          <option key={ip} value={ip}>
                            {ip}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#0A192A] mb-1">
                        Preferred Investor Type *
                      </label>
                      <p className="text-[11px] text-[#5F7180] mb-1.5 leading-snug">
                        Target partner profile.
                      </p>
                      <select
                        value={preferredInvestorType}
                        onChange={(e) => setPreferredInvestorType(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-[#DCECF2] rounded-xl text-xs sm:text-sm text-[#0A192A] focus:outline-none focus:border-[#00A6E8]"
                      >
                        {PREFERRED_INVESTOR_TYPES.map((pit) => (
                          <option key={pit} value={pit}>
                            {pit}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#0A192A] mb-1">
                      Expected Use of Funds Breakdown (Optional)
                    </label>
                    <p className="text-[11px] text-[#5F7180] mb-1.5 leading-snug">
                      Brief allocation breakdown (e.g. 40% Product development, 35% Marketing, 25% Working capital).
                    </p>
                    <textarea
                      rows={2}
                      value={expectedUseOfFunds}
                      onChange={(e) => setExpectedUseOfFunds(e.target.value)}
                      placeholder="e.g. 40% New plant machinery, 35% Working capital & inventory, 25% Tier-2 retail distribution"
                      className="w-full px-3.5 py-2.5 bg-white border border-[#DCECF2] rounded-xl text-xs sm:text-sm text-[#0A192A] focus:outline-none focus:border-[#00A6E8]"
                    />
                  </div>

                  {/* Valuation & Deal Terms (Optional) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#DCECF2]/60">
                    <div>
                      <label className="block text-xs font-bold text-[#0A192A] mb-1">
                        Expected Valuation (Optional)
                      </label>
                      <input
                        type="text"
                        value={expectedValuation}
                        onChange={(e) => setExpectedValuation(e.target.value)}
                        placeholder="e.g. ₹5 Cr Pre-Money"
                        className="w-full px-3.5 py-2.5 bg-white border border-[#DCECF2] rounded-xl text-xs sm:text-sm text-[#0A192A] focus:outline-none focus:border-[#00A6E8]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#0A192A] mb-1">
                        Equity Offered / Terms (Optional)
                      </label>
                      <input
                        type="text"
                        value={equityOffered}
                        onChange={(e) => setEquityOffered(e.target.value)}
                        placeholder="e.g. 10% Equity or Debt/Royalty"
                        className="w-full px-3.5 py-2.5 bg-white border border-[#DCECF2] rounded-xl text-xs sm:text-sm text-[#0A192A] focus:outline-none focus:border-[#00A6E8]"
                      />
                    </div>
                  </div>

                  {/* Financial Metrics (Optional) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#0A192A] mb-1">
                        Annual Turnover / Revenue (Optional)
                      </label>
                      <input
                        type="text"
                        value={turnover}
                        onChange={(e) => setTurnover(e.target.value)}
                        placeholder="e.g. ₹1.2 Cr FY24"
                        className="w-full px-3.5 py-2.5 bg-white border border-[#DCECF2] rounded-xl text-xs sm:text-sm text-[#0A192A] focus:outline-none focus:border-[#00A6E8]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#0A192A] mb-1">
                        Net Profit / EBITDA (Optional)
                      </label>
                      <input
                        type="text"
                        value={profit}
                        onChange={(e) => setProfit(e.target.value)}
                        placeholder="e.g. ₹22L Net Profit / Profitable"
                        className="w-full px-3.5 py-2.5 bg-white border border-[#DCECF2] rounded-xl text-xs sm:text-sm text-[#0A192A] focus:outline-none focus:border-[#00A6E8]"
                      />
                    </div>
                  </div>
                </div>

                {/* ======================================================= */}
                {/* SECTION 3: FOUNDER / LEADERSHIP INFORMATION */}
                {/* ======================================================= */}
                <div className="space-y-4 pt-4 border-t border-[#DCECF2]">
                  <div className="flex items-center gap-2 pb-2 border-b border-[#DCECF2]">
                    <div className="w-6 h-6 rounded-md bg-[#EBF6FC] text-[#00A6E8] flex items-center justify-center font-bold text-xs">
                      3
                    </div>
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-[#0A192A]">
                        Founder / Owner Information
                      </h4>
                      <p className="text-[11px] text-[#5F7180]">
                        Leadership background, qualifications, and industry experience.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#0A192A] mb-1">
                        Founder / Owner Name
                      </label>
                      <p className="text-[11px] text-[#5F7180] mb-1.5 leading-snug">
                        Lead promoter or co-founder name.
                      </p>
                      <input
                        type="text"
                        value={founderName}
                        onChange={(e) => setFounderName(e.target.value)}
                        placeholder="e.g. Ananya Sharma & Vikram Patil"
                        className="w-full px-3.5 py-2.5 bg-white border border-[#DCECF2] rounded-xl text-xs sm:text-sm text-[#0A192A] focus:outline-none focus:border-[#00A6E8]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#0A192A] mb-1">
                        Company Website / URL (Optional)
                      </label>
                      <p className="text-[11px] text-[#5F7180] mb-1.5 leading-snug">
                        Official business website or online store.
                      </p>
                      <input
                        type="url"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        placeholder="https://yourcompany.com"
                        className="w-full px-3.5 py-2.5 bg-white border border-[#DCECF2] rounded-xl text-xs sm:text-sm text-[#0A192A] focus:outline-none focus:border-[#00A6E8]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#0A192A] mb-1">
                        Professional / Business Background
                      </label>
                      <p className="text-[11px] text-[#5F7180] mb-1.5 leading-snug">
                        Education, career history, previous businesses.
                      </p>
                      <textarea
                        rows={2}
                        value={founderBackground}
                        onChange={(e) => setFounderBackground(e.target.value)}
                        placeholder="e.g. 12+ years in automotive manufacturing, ex-Tata Motors engineer..."
                        className="w-full px-3.5 py-2.5 bg-white border border-[#DCECF2] rounded-xl text-xs sm:text-sm text-[#0A192A] focus:outline-none focus:border-[#00A6E8]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#0A192A] mb-1">
                        Relevant Domain Experience
                      </label>
                      <p className="text-[11px] text-[#5F7180] mb-1.5 leading-snug">
                        Specific achievements or technical expertise.
                      </p>
                      <textarea
                        rows={2}
                        value={founderExperience}
                        onChange={(e) => setFounderExperience(e.target.value)}
                        placeholder="e.g. Scaled previous D2C brand to ₹15 Cr ARR; holds 2 industrial design patents..."
                        className="w-full px-3.5 py-2.5 bg-white border border-[#DCECF2] rounded-xl text-xs sm:text-sm text-[#0A192A] focus:outline-none focus:border-[#00A6E8]"
                      />
                    </div>
                  </div>
                </div>

                {/* ======================================================= */}
                {/* SECTION 4: PRESENTATION & PITCH DECK */}
                {/* ======================================================= */}
                <div className="space-y-4 pt-4 border-t border-[#DCECF2]">
                  <div className="flex items-center gap-2 pb-2 border-b border-[#DCECF2]">
                    <div className="w-6 h-6 rounded-md bg-[#EBF6FC] text-[#00A6E8] flex items-center justify-center font-bold text-xs">
                      4
                    </div>
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-[#0A192A]">
                        Business Presentation &amp; Pitch Deck
                      </h4>
                      <p className="text-[11px] text-[#5F7180]">
                        Short pitch teaser, PDF pitch deck presentation, and cover visuals.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#0A192A] mb-1">
                      Short Business Introduction / Elevator Pitch *
                    </label>
                    <p className="text-[11px] text-[#5F7180] mb-1.5 leading-snug">
                      A clear, high-impact 1-2 sentence overview displayed on discovery cards.
                    </p>
                    <input
                      id="create-listing-short-description"
                      type="text"
                      required
                      value={shortDescription}
                      onChange={(e) => setShortDescription(e.target.value)}
                      placeholder="e.g. Next-gen B2B EV battery swap infrastructure scaling across Tier-1 transport corridors."
                      className="w-full px-3.5 py-2.5 bg-white border border-[#DCECF2] rounded-xl text-xs sm:text-sm text-[#0A192A] focus:outline-none focus:border-[#00A6E8]"
                    />
                  </div>

                  {/* Pitch Deck PDF Uploader */}
                  <div id="field-pitch-deck-container">
                    <FileUploadField
                      id="create-listing-pitch-deck"
                      label="Pitch Deck Presentation (PDF Document)"
                      description="Upload your confidential venture pitch deck or executive teaser in PDF format (max 20MB). Stored securely for admin moderation."
                      accept="application/pdf"
                      fileTypeLabel="PDF"
                      icon="picture_as_pdf"
                      currentFile={pitchDeckFile}
                      currentUrl={pitchDeckUrl}
                      currentFileName={pitchDeckFileName}
                      uploadStatus={pitchDeckUploadStatus}
                      uploadProgressText="Uploading Pitch Deck..."
                      errorMessage={pitchDeckError}
                      onFileSelect={(file) => {
                        setPitchDeckFile(file);
                        setPitchDeckUrl("");
                        setPitchDeckFileName(file.name);
                        setPitchDeckUploadStatus("selected");
                        setPitchDeckError(null);
                      }}
                      onUploadRetry={handleRetryPitchDeck}
                      onRemove={() => {
                        setPitchDeckFile(null);
                        setPitchDeckUrl("");
                        setPitchDeckFileName("");
                        setPitchDeckStoragePath(null);
                        setPitchDeckUploadStatus("idle");
                        setPitchDeckError(null);
                      }}
                      onValidationError={(err) => {
                        setPitchDeckUploadStatus("error");
                        setPitchDeckError(err);
                      }}
                      disabled={submitting}
                    />
                  </div>

                  {/* Image Cover */}
                  <div id="field-cover-image-container" className="space-y-3">
                    <FileUploadField
                      id="create-listing-image-file"
                      label="Business Cover Image File (Optional)"
                      description="Upload a high-quality cover photo or logo for your opportunity (JPG, PNG, WebP up to 5MB)."
                      accept="image/jpeg,image/png,image/webp,image/jpg"
                      fileTypeLabel="Image"
                      icon="image"
                      currentFile={imageFile}
                      currentUrl={imageUrl.startsWith("http") ? imageUrl : undefined}
                      currentFileName={imageFile?.name}
                      uploadStatus={imageUploadStatus}
                      uploadProgressText="Uploading Cover Image..."
                      errorMessage={imageError}
                      onFileSelect={(file) => {
                        setImageFile(file);
                        setImageUploadStatus("selected");
                        setImageError(null);
                      }}
                      onUploadRetry={handleRetryImage}
                      onRemove={() => {
                        setImageFile(null);
                        setImageUploadStatus("idle");
                        setImageError(null);
                      }}
                      onValidationError={(err) => {
                        setImageUploadStatus("error");
                        setImageError(err);
                      }}
                      disabled={submitting}
                    />

                    <div>
                      <label className="block text-xs font-bold text-[#0A192A] mb-1">
                        Or External Image URL (Optional)
                      </label>
                      <p className="text-[11px] text-[#5F7180] mb-1.5 leading-snug">
                        Alternative direct public image URL if hosted externally.
                      </p>
                      <input
                        type="url"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        placeholder="https://example.com/photo.jpg"
                        className="w-full px-3.5 py-2.5 bg-white border border-[#DCECF2] rounded-xl text-xs sm:text-sm text-[#0A192A] focus:outline-none focus:border-[#00A6E8]"
                      />
                    </div>
                  </div>
                </div>

                {/* ======================================================= */}
                {/* SECTION 5: CONTACT DETAILS */}
                {/* ======================================================= */}
                <div className="space-y-4 pt-4 border-t border-[#DCECF2]">
                  <div className="flex items-center gap-2 pb-2 border-b border-[#DCECF2]">
                    <div className="w-6 h-6 rounded-md bg-[#EBF6FC] text-[#00A6E8] flex items-center justify-center font-bold text-xs">
                      5
                    </div>
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-[#0A192A]">
                        Direct Contact Details
                      </h4>
                      <p className="text-[11px] text-[#5F7180]">
                        For administration moderation &amp; verified investor enquiries.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#0A192A] mb-1">
                        Contact Phone *
                      </label>
                      <input
                        id="create-listing-phone"
                        type="tel"
                        required
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="+91 98418 81008"
                        className="w-full px-3.5 py-2.5 bg-white border border-[#DCECF2] rounded-xl text-xs sm:text-sm text-[#0A192A] focus:outline-none focus:border-[#00A6E8]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#0A192A] mb-1">
                        Contact Email *
                      </label>
                      <input
                        id="create-listing-email"
                        type="email"
                        required
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="founder@company.com"
                        className="w-full px-3.5 py-2.5 bg-white border border-[#DCECF2] rounded-xl text-xs sm:text-sm text-[#0A192A] focus:outline-none focus:border-[#00A6E8]"
                      />
                    </div>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex items-center justify-end gap-3 pt-5 border-t border-[#DCECF2]">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-[#DCECF2] text-xs font-bold text-[#5F7180] hover:text-[#0A192A] hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || pitchDeckUploadStatus === "uploading" || imageUploadStatus === "uploading"}
                    className="px-6 py-2.5 rounded-xl bg-[#00A6E8] hover:bg-[#0093CE] text-white text-xs font-bold transition-all shadow-md shadow-[#00A6E8]/20 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  >
                    {submitting || pitchDeckUploadStatus === "uploading" || imageUploadStatus === "uploading" ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>
                          {pitchDeckUploadStatus === "uploading"
                            ? "Uploading Pitch Deck..."
                            : imageUploadStatus === "uploading"
                            ? "Uploading Cover Image..."
                            : editingListing
                            ? "Saving Changes..."
                            : "Submitting for Review..."}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[16px]">
                          {editingListing ? "save" : "send"}
                        </span>
                        <span>
                          {editingListing
                            ? editingListing.status === "published"
                              ? "Submit Revisions for Review"
                              : editingListing.status === "rejected"
                              ? "Resubmit for Review"
                              : "Save Changes"
                            : "Submit for Admin Review"}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Investor Contact & Details Modal */}
      <InvestorContactModal
        enquiry={selectedContactEnquiry}
        isOpen={!!selectedContactEnquiry}
        onClose={() => setSelectedContactEnquiry(null)}
        onStatusUpdate={handleEnquiryStatusUpdate}
        entrepreneurName={profile?.fullName || profile?.name || user?.displayName || "Entrepreneur"}
      />

      <Footer />
    </div>
  );
}
