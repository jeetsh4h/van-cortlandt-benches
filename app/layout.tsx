import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Montserrat } from "next/font/google";
import "mapbox-gl/dist/mapbox-gl.css";
import "./globals.css";

import { cn } from "@/lib/utils";

const montserratHeading = Montserrat({
  subsets: ["latin"],
  variable: "--font-heading",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Van Cortlandt Park Benches",
  description: "Explore and adopt benches in Van Cortlandt Park.",
};

export const viewport: Viewport = {
  themeColor: "#f8faf7",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        montserratHeading.variable,
      )}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
