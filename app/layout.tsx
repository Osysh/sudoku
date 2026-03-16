import "./globals.css";
import type { Metadata, Viewport } from "next";
import PwaRegister from "@/components/PwaRegister";

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
    <html lang="en">
      <body>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
