import type { Metadata } from "next";
import { Geist_Mono, Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ROUTE — Opportunity Infrastructure",
  description: "Discover opportunities, understand what they require, and prepare to pursue them — powered by ROUTE MCP.",
};

export default function RootLayout({ children }: any) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} ${geistMono.variable} h-full dark antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
