import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useLastSaved } from "@/lib/condo-store";

export function SavedIndicator() {
  const lastSaved = useLastSaved();
  const [, tick] = useState(0);

  // Re-render a cada 5s para atualizar tempo relativo
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 5000);
    return () => clearInterval(id);
  }, []);

  const seconds = Math.floor((Date.now() - lastSaved) / 1000);
  const label =
    seconds < 5
      ? "Salvo agora"
      : seconds < 60
        ? `Salvo há ${seconds}s`
        : seconds < 3600
          ? `Salvo há ${Math.floor(seconds / 60)}min`
          : "Salvo";

  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <CheckCircle2 className="size-3.5 text-green-600" aria-hidden="true" />
      <span aria-live="polite">{label}</span>
    </span>
  );
}
