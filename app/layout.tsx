import type { Metadata } from "next";
import "./globals.css";
import "./brand-overrides.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: "Nord Imports — Sneakers & Streetwear", template: "%s | Nord Imports" },
  description: "Curadoria de sneakers e moda de luxo selecionados a dedo, com atendimento personalizado e entrega para todo o Brasil.",
  icons: {
    icon: "/nordlogo1.png",
    shortcut: "/nordlogo1.png",
    apple: "/nordlogo1.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body id="top" className="antialiased">{children}</body>
    </html>
  );
}
