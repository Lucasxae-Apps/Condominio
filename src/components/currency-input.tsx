import { useState } from "react";

/**
 * Formata um valor numérico como string de moeda para exibição no input.
 * Ex: 1500 -> "1.500,00"
 */
export function formatCurrencyInput(value: number): string {
  if (value === 0) return "";
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Converte string digitada pelo usuário em número.
 * Aceita "1500", "1.500", "1.500,00", "1500,50"
 */
export function parseCurrencyInput(raw: string): number {
  if (!raw.trim()) return 0;
  // Remove pontos de milhar e troca vírgula por ponto decimal
  const cleaned = raw.replace(/\./g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.round(num * 100) / 100;
}

export function CurrencyInput({
  value,
  onChange,
  className,
  ariaLabel = "Valor em reais",
}: {
  value: number;
  onChange: (v: number) => void;
  /** Sobrescreve o estilo padrão do input (ex.: variante com borda usada nos Ajustes) */
  className?: string;
  ariaLabel?: string;
}) {
  const [focused, setFocused] = useState(false);
  const [raw, setRaw] = useState("");

  return (
    <div className="relative flex items-center">
      <span className="absolute left-2 text-muted-foreground text-sm pointer-events-none">
        R$
      </span>
      <input
        type="text"
        inputMode="decimal"
        value={focused ? raw : formatCurrencyInput(value)}
        onFocus={() => {
          setFocused(true);
          setRaw(value === 0 ? "" : formatCurrencyInput(value));
        }}
        onBlur={() => {
          setFocused(false);
          onChange(parseCurrencyInput(raw));
        }}
        onChange={(e) => setRaw(e.target.value)}
        placeholder="0,00"
        className={
          className ??
          "w-full text-right bg-transparent pl-8 pr-2 py-2.5 rounded-lg focus:outline-none focus:bg-background focus:ring-2 focus:ring-ring text-base font-semibold tabular-nums min-h-[44px]"
        }
        aria-label={ariaLabel}
      />
    </div>
  );
}
