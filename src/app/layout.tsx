import type { Metadata, Viewport } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT"],
  style: ["normal", "italic"],
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
  title: "Boundless — Resume intelligence, honestly scored",
  description:
    "Upload a resume, paste a job description, and get a real match score: offline NLP engine, 16-point ATS audit, and optional AI-enhanced insights via your own OpenRouter key.",
  keywords: [
    "resume scoring",
    "ATS checker",
    "ATS score",
    "resume matcher",
    "job description match",
    "resume parser",
    "OpenRouter",
    "BYOK AI",
  ],
  authors: [{ name: "Boundless" }],
  openGraph: {
    title: "Boundless — Resume intelligence, honestly scored",
    description:
      "A real matching engine: document parsing, NLP scoring, ATS audit, and AI-enhanced insights you can bring your own key to.",
    siteName: "Boundless",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf9f6" },
    { media: "(prefers-color-scheme: dark)", color: "#15120e" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${fraunces.variable} ${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          {children}
          <Toaster position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
