import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

const ROUTES: Array<{ path: string; priority: number }> = [
  { path: "", priority: 1 },
  { path: "/dashboard", priority: 0.9 },
  { path: "/decisions", priority: 0.95 },
  { path: "/assistant", priority: 0.8 },
  { path: "/plan", priority: 0.7 },
  { path: "/indoor", priority: 0.7 },
  { path: "/impact", priority: 0.6 },
  { path: "/insights", priority: 0.7 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return ROUTES.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: route.priority,
  }));
}
