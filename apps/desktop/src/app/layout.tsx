import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LocaleProvider } from "@/components/locale-provider";
import { PostHogProvider } from "@/components/posthog-provider";
import { TauriDeepLinkListener } from "@/components/tauri-deep-link-listener";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://itothread.com';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "ito - Thread-based Task Collaboration",
    template: "%s | ito",
  },
  description: "Connect teammates with threads, hand off tasks, and automatically get them back. A new way to manage teamwork.",
  keywords: ["task management", "team collaboration", "thread-based", "project management", "task delegation", "workflow automation", "ito"],
  authors: [{ name: "ito" }],
  creator: "ito",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-icon.png",
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "ito - Thread-based Task Collaboration",
    description: "Connect teammates with threads, hand off tasks, and automatically get them back.",
    url: BASE_URL,
    siteName: "ito",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "ito - Thread-based Task Collaboration" }],
    type: "website",
    locale: "en_US",
    alternateLocale: ["ko_KR", "ja_JP", "zh_CN", "zh_TW", "de_DE", "es_ES", "fr_FR", "pt_BR"],
  },
  twitter: {
    card: "summary_large_image",
    title: "ito - Thread-based Task Collaboration",
    description: "Connect teammates with threads, hand off tasks, and automatically get them back.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: BASE_URL,
  },
  other: {
    "theme-color": "#0A0A0A",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      "name": "ito",
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Web, macOS, Windows, Linux",
      "url": BASE_URL,
      "description": "Thread-based task collaboration tool. Connect teammates, hand off tasks, and get them back automatically.",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD",
      },
    },
    {
      "@type": "Organization",
      "name": "ito",
      "url": BASE_URL,
      "logo": `${BASE_URL}/og-image.png`,
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <TauriDeepLinkListener />
        <PostHogProvider>
          <LocaleProvider>
            <TooltipProvider>{children}</TooltipProvider>
            <Toaster theme="dark" position="bottom-right" richColors />
          </LocaleProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
