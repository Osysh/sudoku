"use client";

import { Suspense } from "react";
import SudokuGame from "@/components/SudokuGame";

export default function GamePage() {
  return (
    <Suspense fallback={<main className="container"><p>Loading...</p></main>}>
      <SudokuGame />
    </Suspense>
  );
}
