import { describe, it, expect } from "vitest";
import {
  computeDivision,
  ensureMonth,
  formatMonthLabel,
  getTipoDivisao,
  monthKey,
  type Apartment,
  type Expense,
  type MonthData,
} from "@/lib/condo-store";
import {
  formatCurrencyInput,
  parseCurrencyInput,
} from "@/components/currency-input";

describe("parseCurrencyInput", () => {
  it("parses empty string to 0", () => {
    expect(parseCurrencyInput("")).toBe(0);
    expect(parseCurrencyInput("   ")).toBe(0);
  });

  it("parses plain number", () => {
    expect(parseCurrencyInput("1500")).toBe(1500);
  });

  it("parses number with comma as decimal separator", () => {
    expect(parseCurrencyInput("1500,50")).toBe(1500.5);
  });

  it("parses number with dots as thousand separator and comma as decimal", () => {
    expect(parseCurrencyInput("1.500,00")).toBe(1500);
    expect(parseCurrencyInput("12.345,67")).toBe(12345.67);
  });

  it("rounds to 2 decimal places", () => {
    expect(parseCurrencyInput("10,999")).toBe(11);
    expect(parseCurrencyInput("10,555")).toBe(10.56);
  });

  it("returns 0 for invalid input", () => {
    expect(parseCurrencyInput("abc")).toBe(0);
    expect(parseCurrencyInput("--")).toBe(0);
  });
});

describe("formatCurrencyInput", () => {
  it("returns empty string for 0", () => {
    expect(formatCurrencyInput(0)).toBe("");
  });

  it("formats integer with 2 decimal places", () => {
    expect(formatCurrencyInput(1500)).toBe("1.500,00");
  });

  it("formats decimal value", () => {
    expect(formatCurrencyInput(99.9)).toBe("99,90");
  });

  it("formats large numbers with thousands separator", () => {
    expect(formatCurrencyInput(1234567.89)).toBe("1.234.567,89");
  });
});

describe("computeDivision", () => {
  const apartments: Apartment[] = [
    { id: "1", numero: "101", morador: "A", indiceCopasa: 10 },
    { id: "2", numero: "102", morador: "B", indiceCopasa: 30 },
  ];

  it("computes total from expenses", () => {
    const month: MonthData = {
      expenses: [
        { id: "e1", nome: "Luz", valor: 200, tipoDivisao: "igual" },
        { id: "e2", nome: "Água", valor: 400, tipoDivisao: "copasa" },
      ],
    };
    const { total } = computeDivision(month, apartments);
    expect(total).toBe(600);
  });

  it("divides 'igual' expenses equally", () => {
    const month: MonthData = {
      expenses: [
        { id: "e1", nome: "Luz", valor: 200, tipoDivisao: "igual" },
      ],
    };
    const { perApt } = computeDivision(month, apartments);
    expect(perApt[0].valor).toBe(100);
    expect(perApt[1].valor).toBe(100);
  });

  it("divides 'copasa' expenses proportionally by index", () => {
    const month: MonthData = {
      expenses: [
        { id: "e1", nome: "Água", valor: 400, tipoDivisao: "copasa" },
      ],
    };
    const { perApt } = computeDivision(month, apartments);
    // apt 101: 10/(10+30) = 0.25 -> 100
    // apt 102: 30/(10+30) = 0.75 -> 300
    expect(perApt[0].valor).toBe(100);
    expect(perApt[1].valor).toBe(300);
  });

  it("respects divisionRules over expense tipoDivisao", () => {
    const month: MonthData = {
      expenses: [
        { id: "e1", nome: "Água", valor: 400, tipoDivisao: "igual" },
      ],
    };
    const rules = { "Água": "copasa" as const };
    const { perApt } = computeDivision(month, apartments, rules);
    expect(perApt[0].valor).toBe(100);
    expect(perApt[1].valor).toBe(300);
  });

  it("handles empty apartments", () => {
    const month: MonthData = {
      expenses: [
        { id: "e1", nome: "Luz", valor: 200, tipoDivisao: "igual" },
      ],
    };
    const { total, perApt } = computeDivision(month, []);
    expect(total).toBe(200);
    expect(perApt).toHaveLength(0);
  });

  it("handles empty expenses", () => {
    const month: MonthData = { expenses: [] };
    const { total, perApt } = computeDivision(month, apartments);
    expect(total).toBe(0);
    expect(perApt[0].valor).toBe(0);
    expect(perApt[1].valor).toBe(0);
  });
});

describe("getTipoDivisao", () => {
  it("returns expense tipoDivisao when no rules", () => {
    const e: Expense = { id: "1", nome: "Luz", valor: 100, tipoDivisao: "igual" };
    expect(getTipoDivisao(e)).toBe("igual");
  });

  it("returns rule value when rule exists", () => {
    const e: Expense = { id: "1", nome: "Água", valor: 100, tipoDivisao: "igual" };
    expect(getTipoDivisao(e, { "Água": "copasa" })).toBe("copasa");
  });

  it("falls back to expense tipoDivisao when rule not found", () => {
    const e: Expense = { id: "1", nome: "Luz", valor: 100, tipoDivisao: "copasa" };
    expect(getTipoDivisao(e, { "Água": "copasa" })).toBe("copasa");
  });
});

describe("monthKey", () => {
  it("formats date as YYYY-MM", () => {
    expect(monthKey(new Date(2024, 0, 1))).toBe("2024-01");
    expect(monthKey(new Date(2024, 11, 15))).toBe("2024-12");
  });
});

describe("formatMonthLabel", () => {
  it("returns month and year in Portuguese", () => {
    const label = formatMonthLabel(new Date(2024, 0, 1));
    expect(label).toContain("2024");
    // "janeiro" in pt-BR
    expect(label.toLowerCase()).toContain("janeiro");
  });
});

describe("ensureMonth", () => {
  it("returns existing month data", () => {
    const store = {
      condoName: "Test",
      apartments: [],
      months: { "2024-01": { expenses: [{ id: "x", nome: "Luz", valor: 50, tipoDivisao: "igual" as const }] } },
    };
    const month = ensureMonth(store, "2024-01");
    expect(month.expenses).toHaveLength(1);
    expect(month.expenses[0].nome).toBe("Luz");
  });

  it("returns default expenses for missing month", () => {
    const store = {
      condoName: "Test",
      apartments: [],
      months: {},
    };
    const month = ensureMonth(store, "2024-06");
    expect(month.expenses.length).toBeGreaterThan(0);
    expect(month.expenses[0].nome).toBe("Água (Copasa)");
  });
});
