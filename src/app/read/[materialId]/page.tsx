"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { LectureWorkspace } from "@/components/lecture-workspace";
import { apiRequest } from "@/lib/client/api";
import type { MaterialResponse } from "@/lib/contracts";

export default function ReaderPage() {
  const { materialId } = useParams<{ materialId: string }>();
  const [data, setData] = useState<MaterialResponse | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setData(null); setError("");
    apiRequest<MaterialResponse>(`/api/materials/${encodeURIComponent(materialId)}`, { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setData(data); })
      .catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "We could not open this material."); });
    return () => controller.abort();
  }, [materialId, attempt]);

  if (error) return <><Link href="/" className="back-link"><Icon name="back" size={17} />Back to lectures</Link><div className="error-panel" role="alert"><h1>This lecture could not open</h1><p>{error}</p><button className="button button-secondary" onClick={() => setAttempt(value => value + 1)}>Try again</button></div></>;
  if (!data || data.material.id !== materialId) return <div className="loading-state" role="status">Opening your reading space…</div>;
  return <LectureWorkspace key={data.material.id} initialMaterial={data.material} compilationAvailable={!!data.compilationAvailable} />;
}
