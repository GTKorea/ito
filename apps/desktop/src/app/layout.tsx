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
  keywords: [
    "task management", "team collaboration", "thread-based", "project management",
    "task delegation", "workflow automation", "ito",
    "태스크 관리", "팀 협업", "업무 위임",
    "タスク管理", "チームコラボレーション",
    "任务管理", "团队协作",
    "Aufgabenverwaltung", "Teamzusammenarbeit",
    "gestión de tareas", "colaboración en equipo",
    "gestion des tâches", "collaboration d'équipe",
    "gestão de tarefas", "colaboração em equipe",
  ],
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
    languages: {
      "en": BASE_URL,
      "ko": BASE_URL,
      "ja": BASE_URL,
      "zh-CN": BASE_URL,
      "zh-TW": BASE_URL,
      "de": BASE_URL,
      "es": BASE_URL,
      "fr": BASE_URL,
      "pt": BASE_URL,
      "x-default": BASE_URL,
    },
  },
  other: {
    "theme-color": "#0A0A0A",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "name": "ito",
      "url": BASE_URL,
      "description": "Thread-based task collaboration tool for modern teams.",
      "inLanguage": ["en", "ko", "ja", "zh-CN", "zh-TW", "de", "es", "fr", "pt"],
      "potentialAction": {
        "@type": "SearchAction",
        "target": `${BASE_URL}/workspace?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "SoftwareApplication",
      "name": "ito",
      "applicationCategory": "BusinessApplication",
      "applicationSubCategory": "Project Management",
      "operatingSystem": "Web, macOS, Windows, Linux",
      "url": BASE_URL,
      "description": "Thread-based task collaboration tool. Connect teammates, hand off tasks, and get them back automatically.",
      "inLanguage": ["en", "ko", "ja", "zh-CN", "zh-TW", "de", "es", "fr", "pt"],
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD",
      },
      "featureList": [
        "Thread-based task chains with automatic snap-back",
        "Real-time collaboration with Socket.IO",
        "Cross-workspace shared spaces",
        "Slack integration with /ito commands",
        "Google Calendar sync",
        "Desktop app for macOS, Windows, Linux",
        "9 language support",
      ],
    },
    {
      "@type": "Organization",
      "name": "ito",
      "url": BASE_URL,
      "logo": `${BASE_URL}/og-image.png`,
    },
    {
      "@type": "SiteNavigationElement",
      "name": "Features",
      "url": `${BASE_URL}/#features`,
    },
    {
      "@type": "SiteNavigationElement",
      "name": "Download",
      "url": `${BASE_URL}/#download`,
    },
    {
      "@type": "SiteNavigationElement",
      "name": "Sign Up",
      "url": `${BASE_URL}/register`,
    },
    {
      "@type": "SiteNavigationElement",
      "name": "Sign In",
      "url": `${BASE_URL}/login`,
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
