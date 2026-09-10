import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useCallback } from "react";
import { Plus, Copy, Receipt } from "lucide-react";
import {
  computeDivision,
  ensureMonth,
  formatMonthLabel,
  monthKey,
  useStore,
  type Expense,
} from "@/lib/condo-store";
import { computePdfData } from "@/lib/generate-pdf";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { SavedIndicator } from "@/components/saved-indicator";
import { MonthSwitcher } from "@/components/month-switcher";
import { ExpenseRow } from "@/components/expense-row";
import { RateioBreakdown } from "@/components/rateio-breakdown";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Condomínio - Despesas do mês" },
      {
        name: "description",
        content:
          "Gestão simples de despesas mensais do condomínio e geração de PDF de rateio.",
      },
    ],
  }),
  component: HomePage,
});

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function HomePage() {
  const { store, setStore } = useStore();
  const { isAdmin } = useAuth();
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  // Estado do AlertDialog único (exclusão)
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    nome: string;
  } | null>(null);

  // Estado do confirm para copiar mês quando já tem dados
  const [confirmCopy, setConfirmCopy] = useState(false);

  const key = monthKey(cursor);
  const month = ensureMonth(store, key);
  const label = formatMonthLabel(cursor);

  const now = new Date();
  const isCurrentMonth =
    cursor.getFullYear() === now.getFullYear() &&
    cursor.getMonth() === now.getMonth();

  const { total } = useMemo(
    () => computeDivision(month, store.apartments, store.divisionRules),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [month.expenses, store.apartments, store.divisionRules],
  );

  const pdfData = useMemo(
    () => computePdfData({ store, month, cursor }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store, month.expenses, cursor],
  );

  function updateMonth(updater: (expenses: Expense[]) => Expense[]) {
    setStore((s) => ({
      ...s,
      months: {
        ...s.months,
        [key]: { expenses: updater(ensureMonth(s, key).expenses) },
      },
    }));
  }

  function addExpense() {
    updateMonth((exps) => [
      ...exps,
      {
        id: crypto.randomUUID(),
        nome: "",
        valor: 0,
        tipoDivisao: "igual",
      },
    ]);
  }

  function shiftMonth(delta: number) {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));
  }

  const doCopy = useCallback(() => {
    const prevDate = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
    const prevKey = monthKey(prevDate);
    const prevMonth = ensureMonth(store, prevKey);

    if (prevMonth.expenses.length === 0) {
      toast.info(
        `Não há despesas em ${formatMonthLabel(prevDate)} para trazer para este mês.`,
      );
      return;
    }

    const newExpenses = prevMonth.expenses.map((e) => ({
      ...e,
      id: crypto.randomUUID(),
      valor: 0,
    }));

    setStore((s) => ({
      ...s,
      months: {
        ...s.months,
        [key]: { expenses: newExpenses },
      },
    }));

    toast.success(
      `${newExpenses.length} despesa(s) trazidas de ${formatMonthLabel(prevDate)}. Agora é só preencher os valores.`,
    );
  }, [cursor, store, key, setStore]);

  function copyPreviousMonth() {
    // Se o mês já tem despesas com dados, confirmar antes
    const hasData = month.expenses.some((e) => e.nome.trim() || e.valor > 0);
    if (hasData) {
      setConfirmCopy(true);
    } else {
      doCopy();
    }
  }

  return (
    <div className="min-h-screen bg-background pb-44">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-cream-deep/95 backdrop-blur border-b border-border">
        <div className="mx-auto max-w-2xl px-4 py-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <h1 className="truncate text-xl font-bold text-primary">
            {store.condoName}
          </h1>
          <SavedIndicator />
        </div>

        <MonthSwitcher
          label={label}
          isCurrentMonth={isCurrentMonth}
          onPrev={() => shiftMonth(-1)}
          onNext={() => shiftMonth(1)}
        />
      </header>

      {/* Expenses list */}
      <main className="mx-auto max-w-2xl px-4 py-4">
        <div className="rounded-2xl bg-card border border-border overflow-hidden shadow-sm">
          <div className="grid grid-cols-[minmax(0,1fr)_140px_44px] items-center gap-2 px-4 py-3 bg-secondary/60 text-xs font-semibold uppercase tracking-wider text-secondary-foreground">
            <span>Despesa</span>
            <span className="text-right">Valor</span>
            <span></span>
          </div>

          {/* Empty state */}
          {month.expenses.length === 0 && (
            <div className="p-8 text-center">
              <Receipt className="size-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground text-base mb-4">
                Nenhuma despesa neste mês.
              </p>
              {isAdmin && (
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <button
                    onClick={addExpense}
                    className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 bg-primary text-primary-foreground font-semibold shadow hover:opacity-90 transition min-h-[44px]"
                  >
                    <Plus className="size-5" /> Adicionar despesa
                  </button>
                  <button
                    onClick={copyPreviousMonth}
                    className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 bg-secondary text-secondary-foreground font-medium hover:bg-accent/30 transition min-h-[44px]"
                  >
                    <Copy className="size-5" /> Copiar mês anterior
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Expense rows */}
          {month.expenses.map((e) => (
            <ExpenseRow
              key={e.id}
              expense={e}
              rules={store.divisionRules}
              readOnly={!isAdmin}
              onChangeName={(name) =>
                updateMonth((exps) =>
                  exps.map((x) => (x.id === e.id ? { ...x, nome: name } : x)),
                )
              }
              onChangeValue={(val) =>
                updateMonth((exps) =>
                  exps.map((x) => (x.id === e.id ? { ...x, valor: val } : x)),
                )
              }
              onRequestDelete={() =>
                setDeleteTarget({ id: e.id, nome: e.nome })
              }
              onCancelNew={() =>
                updateMonth((exps) => exps.filter((x) => x.id !== e.id))
              }
            />
          ))}

          {/* Add expense + copy buttons (ícones) */}
          {month.expenses.length > 0 && isAdmin && (
            <div className="flex items-center justify-end gap-1 border-t border-border px-2 py-2">
              <button
                onClick={copyPreviousMonth}
                aria-label="Copiar despesas do mês anterior"
                title="Copiar mês anterior"
                className="inline-flex items-center justify-center rounded-lg size-10 text-muted-foreground hover:text-foreground hover:bg-accent/20 transition"
              >
                <Copy className="size-5" />
              </button>
              <button
                onClick={addExpense}
                aria-label="Adicionar despesa"
                title="Adicionar despesa"
                className="inline-flex items-center justify-center rounded-lg size-10 text-primary hover:bg-accent/20 transition"
              >
                <Plus className="size-5" />
              </button>
            </div>
          )}
        </div>

        {/* Rateio detalhado por unidade */}
        {store.apartments.length > 0 && <RateioBreakdown data={pdfData} />}
      </main>

      {/* Fixed footer with total + add expense */}
      <footer className="fixed bottom-14 inset-x-0 bg-cream-deep/95 backdrop-blur border-t border-border">
        <div className="mx-auto max-w-2xl px-4 py-4 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Total do mês
            </div>
            <div className="text-3xl font-extrabold text-foreground tabular-nums truncate">
              {brl(total)}
            </div>
          </div>
          {isAdmin && (
            <button
              onClick={addExpense}
              aria-label="Adicionar despesa"
              className="shrink-0 inline-flex items-center justify-center rounded-xl size-12 bg-primary text-primary-foreground shadow hover:opacity-90 transition"
            >
              <Plus className="size-6" />
            </button>
          )}
        </div>
      </footer>

      {/* Single delete confirmation dialog */}
      <ConfirmDeleteDialog
        open={deleteTarget !== null}
        title="Excluir despesa"
        description={`Tem certeza que deseja excluir "${deleteTarget?.nome || "esta despesa"}"? Esta ação não pode ser desfeita.`}
        onConfirm={() => {
          if (deleteTarget) {
            updateMonth((exps) => exps.filter((x) => x.id !== deleteTarget.id));
          }
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Confirm copy over existing data */}
      <ConfirmDeleteDialog
        open={confirmCopy}
        title="Trazer despesas do mês anterior?"
        description="Isso apaga as despesas já cadastradas neste mês e coloca no lugar a mesma lista do mês anterior, com os valores zerados para você preencher."
        confirmLabel="Substituir"
        destructive={false}
        onConfirm={() => {
          setConfirmCopy(false);
          doCopy();
        }}
        onCancel={() => setConfirmCopy(false)}
      />
    </div>
  );
}
