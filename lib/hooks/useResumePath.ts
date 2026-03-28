"use client";

import { useEffect, useState } from "react";
import { getStoredGameResumePath } from "@/lib/dailyChallenge";

export function useResumePath(): string | null {
  const [resumePath, setResumePath] = useState<string | null>(null);

  useEffect(() => {
    setResumePath(getStoredGameResumePath(localStorage));
  }, []);

  return resumePath;
}
