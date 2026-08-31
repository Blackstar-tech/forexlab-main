import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ForexLab Journal",
  description: "Advanced Forex & Trading Performance Journal"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
