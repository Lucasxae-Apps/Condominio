import { useState } from "react";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { CurrencyInput } from "@/components/currency-input";
import { getTipoDivisao } from "@/lib/condo-store";
import type { DivisionRules, Expense } from "@/lib/condo-store";

export function ExpenseRow({
  expense,
  rules,
  readOnly = false,
  onChangeName,
  onChangeValue,
  onRequestDelete,
  onCancelNew,
}: {
  expense: Expense;
  rules?: DivisionRules;
  readOnly?: boolean;
  onChangeName: (name: string) => void;
  onChangeValue: (value: number) => void;
  onRequestDelete: () => void;
  onCancelNew?: () => void;
}) {
  const isCopasa = getTipoDivisao(expense, rules) === "copasa";

  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(expense.nome);
  const [draftValue, setDraftValue] = useState(expense.valor);

  const isNew = !expense.nome.trim() && expense.valor === 0;
  const showEditing = (editing || isNew) && !readOnly;

  function startEditing() {
    setDraftName(expense.nome);
    setDraftValue(expense.valor);
    setEditing(true);
  }

  function save() {
    onChangeName(draftName);
    onChangeValue(draftValue);
    setEditing(false);
  }

  function cancel() {
    if (isNew) {
      onCancelNew?.();
      return;
    }
    setDraftName(expense.nome);
    setDraftValue(expense.valor);
    setEditing(false);
  }

  if (showEditing) {
    return (
      <div className="border-t border-border px-3 py-3 space-y-3 bg-background/50">
        <input
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          autoFocus
          className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ring text-base font-medium min-h-[44px]"
          placeholder="Nome da despesa"
          aria-label="Nome da despesa"
        />
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <CurrencyInput value={draftValue} onChange={setDraftValue} />
          </div>
          {!isNew && (
            <button
              onClick={onRequestDelete}
              aria-label={`Remover despesa ${draftName || ""}`}
              className="p-2.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <Trash2 className="size-5" />
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={cancel}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 bg-secondary text-secondary-foreground font-medium hover:bg-accent/30 transition min-h-[44px]"
          >
            <X className="size-5" /> Cancelar
          </button>
          <button
            onClick={save}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 bg-primary text-primary-foreground font-semibold hover:opacity-90 transition min-h-[44px]"
          >
            <Check className="size-5" /> Salvar
          </button>
        </div>
      </div>
    );
  }

  const formattedValue =
    expense.valor === 0
      ? "—"
      : expense.valor.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        });

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-1 px-3 py-2.5 border-t border-border">
      <div className="min-w-0 px-2">
        <span className="block text-base font-medium truncate">
          {expense.nome || "(sem nome)"}
        </span>
        {isCopasa && (
          <span className="block text-xs text-muted-foreground">
            Rateada por fração ideal
          </span>
        )}
      </div>
      <span className="text-base font-semibold tabular-nums text-right px-2 whitespace-nowrap">
        {formattedValue}
      </span>
      {!readOnly && (
        <>
          <button
            onClick={startEditing}
            aria-label={`Editar despesa ${expense.nome || ""}`}
            className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition min-w-[40px] min-h-[40px] flex items-center justify-center"
          >
            <Pencil className="size-4" />
          </button>
          <button
            onClick={onRequestDelete}
            aria-label={`Remover despesa ${expense.nome || ""}`}
            className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition min-w-[40px] min-h-[40px] flex items-center justify-center"
          >
            <Trash2 className="size-4" />
          </button>
        </>
      )}
    </div>
  );
}
