import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Baby-foot Entreprise",
    short_name: "Baby-foot",
    description: "Les matchs de baby-foot de votre équipe, en temps réel.",
    start_url: "/",
    display: "standalone",
    background_color: "#07120e",
    theme_color: "#07120e",
    lang: "fr",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}

