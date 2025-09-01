import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DocMind AI | Intelligent Document Assistant",
  description: "AI-powered tool for your document needs.",
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
