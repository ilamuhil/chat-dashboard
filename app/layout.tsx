import type { Metadata } from "next";
import QueryProvider from "./query-provider";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:4000"
  ),

  title: {
    default: "AI Chat Bot | Admissions Chatbot for Academic Institutes",
    template: "%s | AI Chat Bot",
  },

  description:
    "Build an AI admissions chatbot that answers student enquiries from approved institute content, captures leads, and connects applicants with counsellors.",

  keywords: [
    "AI admissions chatbot",
    "college admission chatbot",
    "education chatbot",
    "admissions automation",
    "student enquiry chatbot",
    "admissions CRM",
  ],

  icons: {
    icon: [
      { url: "/favicon/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      { url: "/favicon/apple-touch-icon.png", sizes: "180x180" },
    ],
  },

  manifest: "/favicon/site.webmanifest",

  openGraph: {
    title: "AI Chat Bot for Admissions Teams",
    description:
      "Grounded admissions answers, lead capture, and counsellor handoff for academic institutes.",
    siteName: "AI Chat Bot",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/marketing/admissions-ai-hero.png",
        width: 1536,
        height: 864,
        alt: "AI admissions chatbot for academic institutes",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "AI Chat Bot for Admissions Teams",
    description:
      "Grounded admissions answers, lead capture, and counsellor handoff for academic institutes.",
    images: ["/marketing/admissions-ai-hero.png"],
  },
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">

      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
