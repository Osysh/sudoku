import "./globals.css";
import type { Metadata } from "next";
import { Bodoni_Moda } from "next/font/google";

const bodoni = Bodoni_Moda({ subsets: ["latin"], display: "swap", variable: "--font-main", weight: ["400", "700"], style: "normal" });

export const metadata: Metadata = {
  title: "Sudoky",
  description: "Sudoku app with auth, timer, and leaderboard"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={bodoni.variable} data-theme="pink" suppressHydrationWarning>{children}</body>
    </html>
  );
}
