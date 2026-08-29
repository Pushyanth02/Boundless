import type { Metadata } from "next";
import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}
