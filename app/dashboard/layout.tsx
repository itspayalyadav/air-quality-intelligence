import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description:
    "Live modelled air quality for your city, with US and CPCB indices, six pollutant concentrations, weather context and a seven day PM2.5 trend.",
  alternates: { canonical: "/dashboard" },
  openGraph: {
    type: "website",
    url: "/dashboard",
    title: "Live air quality dashboard | Aeris",
    description:
      "US and CPCB indices side by side, six pollutant concentrations, weather context and a seven day PM2.5 trend for your city.",
    images: [
      {
        url: "/images/hero-city-haze.jpg",
        width: 1800,
        height: 1051,
        alt: "A city skyline dissolving into morning haze above a canopy of trees.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Live air quality dashboard | Aeris",
    description:
      "US and CPCB indices side by side, six pollutant concentrations, weather context and a seven day PM2.5 trend for your city.",
    images: ["/images/hero-city-haze.jpg"],
  },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
