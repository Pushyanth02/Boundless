import type { Metadata } from "next";
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
  title: "Boundless · Resume match intelligence",
  description:
    "Know how well your resume matches the job. Upload your resume, paste the job description, and see your match score, strengths, and gaps before you apply.",
  keywords: [
    "resume score",
    "job description match",
    "resume checker",
    "skill gap",
  ],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "Boundless · Resume match intelligence",
    description:
      "Upload your resume, paste the job description, and discover your strengths, gaps, and opportunities before you apply.",
    siteName: "Boundless",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
