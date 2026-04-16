import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TeeFlow - Find Golf Tee Times",
  description: "Real-time golf tee time booking app",
  viewport: "width=device-width, initial-scale=1, maximum-scale=5",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900">
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50">
          {children}
        </div>
      </body>
    </html>
  );
}
