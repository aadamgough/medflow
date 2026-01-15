import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "MedFlow - Transform Medical Records into Actionable Insights",
  description:
    "Upload, process, and understand patient documents in seconds. MedFlow automatically extracts key medical events and builds comprehensive patient timelines.",
  keywords: [
    "medical records",
    "healthcare",
    "document processing",
    "patient timeline",
    "AI",
    "HIPAA",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${playfair.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
