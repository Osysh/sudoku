import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Bodoni_Moda } from "next/font/google";
import PwaRegister from "@/components/PwaRegister";
import BackgroundToggle from "@/components/BackgroundToggle";

const bodoni = Bodoni_Moda({ subsets: ["latin"], display: "swap", variable: "--font-main", weight: ["400", "700"], style: "normal" });

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const withBasePath = (path: string) => `${basePath}${path}`;

export const metadata: Metadata = {
  title: "Sudoky",
  description: "Sudoku app with auth, timer, and leaderboard",
  manifest: withBasePath("/manifest.webmanifest"),
  icons: {
    apple: withBasePath("/icons/apple-touch-icon.png")
  }
};

export const viewport: Viewport = {
  themeColor: "#101820"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={bodoni.variable} data-theme="pink" suppressHydrationWarning>
        <PwaRegister />
        <div className="theme-floating">
          <BackgroundToggle />
        </div>
        {children}
      </body>
    </html>
  );
}
