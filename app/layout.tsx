import type { Metadata } from "next";
import { Toaster } from "sonner";
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
    process.env.APP_URL || "http://localhost:3000"
  ),

  title: {
    default: "AI Chatbot Dashboard | Manage & Embed Business Chatbots",
    template: "%s | AI Chatbot Dashboard",
  },

  description:
    "Manage, configure, and deploy embeddable AI chatbots for customer support, lead capture, and business automation.",

  keywords: [
    "AI chatbot dashboard",
    "business chatbot",
    "embeddable chatbot",
    "customer support automation",
    "chatbot management platform",
    "AI customer support",
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
    title: "AI Chatbot Dashboard",
    description:
      "A dashboard to manage embeddable AI chatbots for customer support, automation, and lead generation.",
    url: "https://chat-dashboard.com",
    siteName: "AI Chatbot Dashboard",
    locale: "en_US",
    type: "website",
    // REMOVE this if you don’t have the file yet
    // images: [
    //   {
    //     url: "/og-image.png",
    //     width: 1200,
    //     height: 630,
    //     alt: "AI Chatbot Dashboard Preview",
    //   },
    // ],
  },

  twitter: {
    card: "summary_large_image",
    title: "AI Chatbot Dashboard",
    description:
      "Manage and deploy embeddable AI chatbots for modern businesses.",
    // REMOVE this if you don’t have the file yet
    // images: ["/og-image.png"],
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
        <Toaster richColors/>
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
