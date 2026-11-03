import type { MetadataRoute } from "next";
import { GUIDES } from "@/lib/constants/guides";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://wentureindia.com";
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${baseUrl}`, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${baseUrl}/discover`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/for-entrepreneurs`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/for-investors`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/opportunities`, lastModified: now, changeFrequency: "daily", priority: 0.95 },
    { url: `${baseUrl}/investors`, lastModified: now, changeFrequency: "daily", priority: 0.95 },
    { url: `${baseUrl}/how-it-works`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${baseUrl}/guides`, lastModified: now, changeFrequency: "weekly", priority: 0.85 },
    { url: `${baseUrl}/login`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
    { url: `${baseUrl}/signup`, lastModified: now, changeFrequency: "yearly", priority: 0.6 },
  ];

  const guideRoutes: MetadataRoute.Sitemap = GUIDES.map((guide) => ({
    url: `${baseUrl}/guides/${guide.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...guideRoutes];
}
