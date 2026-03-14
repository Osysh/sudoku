import "./globals.css";
import type { Metadata } from "next";
import BackgroundToggle from "@/components/BackgroundToggle";

export const metadata: Metadata = {
  title: "Sudoky",
  description: "Sudoku app with auth, timer, and leaderboard"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body><BackgroundToggle />{children}</body>
    </html>
  );
}
