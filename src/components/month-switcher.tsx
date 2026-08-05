import { ChevronLeft, ChevronRight } from "lucide-react";

export function MonthSwitcher({
  label,
  isCurrentMonth,
  onPrev,
  onNext,
}: {
  label: string;
  isCurrentMonth: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="mx-auto max-w-2xl px-4 pb-3 flex items-center justify-between gap-2">
      <button
        onClick={onPrev}
        className="rounded-full p-3 bg-card border border-border hover:bg-accent hover:text-accent-foreground transition min-w-[44px] min-h-[44px] flex items-center justify-center"
        aria-label="Mês anterior"
      >
        <ChevronLeft className="size-6" />
      </button>
      <div className="text-center flex-1">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          Mês
        </div>
        <div className="text-2xl font-bold capitalize text-foreground">
          {label}
        </div>
        {isCurrentMonth && (
          <span className="inline-block mt-1 text-xs font-semibold bg-primary/15 text-primary px-2 py-0.5 rounded-full">
            Mês atual
          </span>
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
