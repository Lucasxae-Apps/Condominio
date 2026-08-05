import { Trash2 } from "lucide-react";
import { CurrencyInput } from "@/components/currency-input";
import { getTipoDivisao, type DivisionRules, type Expense } from "@/lib/condo-store";

export function ExpenseRow({
  expense,
  rules,
  onChangeName,
  onChangeValue,
  onRequestDelete,
}: {
  expense: Expense;
  rules?: DivisionRules;
  onChangeName: (name: string) => void;
  onChangeValue: (value: number) => void;
  onRequestDelete: () => void;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_140px_44px] items-center gap-2 px-3 py-2 border-t border-border">
      <div className="min-w-0 flex flex-col gap-1">
        <input
          value={expense.nome}
          onChange={(e) => onChangeName(e.target.value)}
          className="w-full bg-transparent px-2 py-2.5 rounded-lg focus:outline-none focus:bg-background focus:ring-2 focus:ring-ring text-base font-medium truncate min-h-[44px]"
          placeholder="Nome da despesa"
          aria-label="Nome da despesa"
        />
        <span className="text-xs px-2 py-0.5 rounded bg-secondary text-secondary-foreground border border-border w-fit">
          {getTipoDivisao(expense, rules) === "copasa"
            ? "Por consumo (Copasa)"
            : "Dividir igual"}
        </span>
      </div>
      <CurrencyInput value={expense.valor} onChange={onChangeValue} />
      <button
        onClick={onRequestDelete}
        aria-label={`Remover despesa ${expense.nome || ""}`}
        className="justify-self-end p-2.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition min-w-[44px] min-h-[44px] flex items-center justify-center"
      >
        <Trash2 className="size-5" />
      </button>
    </div>
  );
}
