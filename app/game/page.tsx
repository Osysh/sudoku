"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LegacyGameRedirectPage() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const qs = params.toString();
    router.replace(qs ? `/?${qs}` : "/");
  }, [params, router]);

  return (
    <main className="container">
      <p>Redirecting...</p>
    </main>
  );
}
