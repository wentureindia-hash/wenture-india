import React from "react";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Opportunity } from "@/lib/constants/opportunities";
import { OpportunityDetailView } from "@/components/opportunity-detail-view";
import { getPublishedListingById, convertListingToOpportunity } from "@/lib/firebase/listings";

export const dynamicParams = true;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  let opp: Opportunity | undefined;

  const { listing } = await getPublishedListingById(slug);
  if (listing && listing.status === "published" && !listing.isDeleted) {
    opp = convertListingToOpportunity(listing);
  }

  if (!opp) return { title: "Opportunity Not Found" };

  return {
    title: `${opp.title} (${opp.category} - ${opp.sector}) | Wenture India International`,
    description: opp.shortDescription,
  };
}

export default async function OpportunityDetailPage({ params }: PageProps) {
  const { slug } = await params;
  let opp: Opportunity | undefined;

  const { listing } = await getPublishedListingById(slug);
  if (listing && listing.status === "published" && !listing.isDeleted) {
    opp = convertListingToOpportunity(listing);
  }

  if (!opp) {
    notFound();
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F6FAFF] selection:bg-[#00A6E8] selection:text-white">
      <Navbar />
      <main className="flex-grow">
        <OpportunityDetailView opportunity={opp} />
      </main>
      <Footer />
    </div>
  );
}
