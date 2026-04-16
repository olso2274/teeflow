import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "RubeGolf - Real-Time Tee Times Across Minnesota",
  description:
    "Find and book real tee times from 100+ Minnesota golf courses. Live availability, instant booking, one search.",
  openGraph: {
    title: "RubeGolf - Real-Time Tee Times Across Minnesota",
    description:
      "Find and book real tee times from 100+ Minnesota golf courses.",
    siteName: "RubeGolf",
    type: "website",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-white text-gray-900 font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
