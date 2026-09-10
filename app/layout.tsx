import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: "Nord Imports — Sneakers & Streetwear", template: "%s | Nord Imports" },
  description: "Curadoria de sneakers e streetwear importados. Peças selecionadas, achados raros e atendimento personalizado.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
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
