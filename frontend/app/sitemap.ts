import type { MetadataRoute } from "next";
import { site } from "@/lib/config";

export default function sitemap(): MetadataRoute.Sitemap {
  const updated = new Date("2026-09-25");
  return [
    { url: `${site.url}/`, lastModified: updated, changeFrequency: "weekly", priority: 1 },
    { url: `${site.url}/privacy`, lastModified: updated, changeFrequency: "yearly", priority: 0.4 },
    { url: `${site.url}/terms`, lastModified: updated, changeFrequency: "yearly", priority: 0.4 },
    {
      url: `${site.url}/disclaimer`,
      lastModified: updated,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
