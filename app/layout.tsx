import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DocMind - AI Document Assistant",
  description:
    "AI-powered document assistant for writing, editing, and formatting",
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
