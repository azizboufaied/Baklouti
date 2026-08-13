import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Cartographie des acteurs du piment en Tunisie",
    template: "%s — Cartographie du piment",
  },
  description:
    "Annuaire géolocalisé des centres de recherche, laboratoires, semenciers et industriels " +
    "de la filière piment en Tunisie.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={inter.variable}>
      <body className="min-h-full font-sans antialiased">{children}</body>
    </html>
  );
}
