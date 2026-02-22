import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Praxis | Deterministic AI-to-XRPL Gateway",
  description:
    "Zero-hallucination enterprise oracle. Mathematically proven DeFi execution on the XRP Ledger.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
