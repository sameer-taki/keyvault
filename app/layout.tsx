import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Biz Key Vault",
  description: "A zero-knowledge password & secrets vault. Your secrets never leave your device unencrypted.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
