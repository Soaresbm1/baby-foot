import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { PwaManager } from "@/components/pwa-manager";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Baby-foot",
    template: "%s · Baby-foot",
  },
  description: "Créez, jouez et suivez les matchs de baby-foot de votre équipe.",
  applicationName: "Baby-foot",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Baby-foot",
  },
  icons: {
    icon: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0b0d",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="fr">
      <body>
        <PwaManager />
        <main className="app-shell mx-auto min-h-dvh w-full max-w-6xl px-4 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-6 sm:pt-8">
          {children}
        </main>
      </body>
    </html>
  );
}

