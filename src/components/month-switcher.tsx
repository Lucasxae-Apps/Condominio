import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Distância mínima de arrasto (px) para considerar uma troca de mês por swipe. */
const SWIPE_THRESHOLD = 50;

export function MonthSwitcher({
  label,
  monthKey,
  direction,
  isCurrentMonth,
  isClosed,
  onPrev,
  onNext,
}: {
  label: string;
  /** Chave única do mês (ex: "2026-10"), usada para reanimar a troca. */
  monthKey?: string;
  /** 1 = avançando, -1 = voltando; controla o sentido da animação. */
  direction?: 1 | -1;
  isCurrentMonth: boolean;
  isClosed?: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  const touchStartX = useRef<number | null>(null);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(deltaX) < SWIPE_THRESHOLD) return;
    if (deltaX > 0) onPrev();
    else onNext();
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-3 flex items-center justify-between gap-2">
      <button
        onClick={onPrev}
        className="rounded-full p-3 bg-card border border-border hover:bg-accent hover:text-accent-foreground transition min-w-[44px] min-h-[44px] flex items-center justify-center"
        aria-label="Mês anterior"
      >
        <ChevronLeft className="size-6" />
      </button>
      <div
        className="text-center flex-1 touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          Mês
        </div>
        <div
          key={monthKey ?? label}
          className={`text-2xl font-bold text-foreground animate-in fade-in duration-300 ${
            direction === -1 ? "slide-in-from-left-4" : "slide-in-from-right-4"
          }`}
        >
          {label}
        </div>
        {isClosed ? (
          <span className="inline-block mt-1 text-xs font-semibold bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
            Encerrado
          </span>
        ) : (
          isCurrentMonth && (
            <span className="inline-block mt-1 text-xs font-semibold bg-primary/15 text-primary px-2 py-0.5 rounded-full">
              Mês atual
            </span>
          )
        )}
      </div>
      <button
        onClick={onNext}
        className="rounded-full p-3 bg-card border border-border hover:bg-accent hover:text-accent-foreground transition min-w-[44px] min-h-[44px] flex items-center justify-center"
        aria-label="Próximo mês"
      >
        <ChevronRight className="size-6" />
      </button>
    </div>
  );
}
