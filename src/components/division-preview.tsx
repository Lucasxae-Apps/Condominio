import type { Apartment } from "@/lib/condo-store";

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function DivisionPreview({
  perApt,
}: {
  perApt: Array<{ apartment: Apartment; valor: number }>;
}) {
  if (perApt.length === 0) return null;

  return (
    <div className="mt-5 rounded-2xl bg-card border border-border overflow-hidden shadow-sm">
      <div className="px-4 py-3 bg-secondary/60 text-xs font-semibold uppercase tracking-wider text-secondary-foreground">
        Prévia por apartamento
      </div>
      {perApt.map((row) => (
        <div
          key={row.apartment.id}
          className="flex items-center justify-between gap-3 px-4 py-3 border-t border-border"
        >
          <div className="min-w-0">
            <div className="font-semibold text-base">
              Apto {row.apartment.numero}
            </div>
            <div className="text-sm text-muted-foreground truncate">
              {row.apartment.morador}
            </div>
          </div>
          <div className="text-right font-bold tabular-nums text-primary text-lg">
            {brl(row.valor)}
          </div>
        </div>
      ))}
    </div>
  );
}
