"use client";

import { Suspense } from "react";
import SudokuGame from "@/components/SudokuGame";
import { useT } from "@/lib/i18n/useT";

export default function GamePage() {
  const t = useT();

  return (
    <Suspense fallback={<main className="container"><p>{t("common.loading")}</p></main>}>
      <SudokuGame />
    </Suspense>
  );
}
