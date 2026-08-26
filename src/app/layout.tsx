import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

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
};

export const viewport: Viewport = {
  themeColor: "#07120e",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="fr">
      <body>
        <main className="mx-auto min-h-dvh w-full max-w-2xl px-5 pb-10 pt-[max(2rem,env(safe-area-inset-top))]">
          {children}
        </main>
      </body>
    </html>
  );
}

