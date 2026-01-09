import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import QueryProvider from "./query-provider";
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
  title: "Chat Dashboard Application",
  description: "Dashboard application for the chatbot widget",
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "Chat Dashboard Application",
    description: "Dashboard application for the chatbot widget",
    url: "https://chat-dashboard.com",
    siteName: "Chat Dashboard",
    images: [{ url: "/og-image.png" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Chat Dashboard Application",
    description: "Dashboard application for the chatbot widget",
    images: [{ url: "/og-image.png" }],
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
