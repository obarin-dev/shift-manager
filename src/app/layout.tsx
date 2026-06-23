import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shift Manager",
  description: "保育園向け勤務表管理システム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
