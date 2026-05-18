import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cine City",
  description: "3D pixel art city renderer",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="m-0 overflow-hidden bg-black">{children}</body>
    </html>
  );
}
