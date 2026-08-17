import { describe, it, expect } from "vitest";
import { computePdfData } from "@/lib/generate-pdf";
import type { Store, MonthData } from "@/lib/condo-store";

function makeStore(overrides: Partial<Store> = {}): Store {
  return {
    condoName: "Cond. Teste",
    apartments: [
      { id: "a1", numero: "101", morador: "João", indiceCopasa: 10 },
      { id: "a2", numero: "102", morador: "Maria", indiceCopasa: 30 },
    ],
    months: {},
    divisionRules: { "Água (Copasa)": "copasa" },
    fundoReserva: 250,
    fundoObras: 200,
    decimoTerceiroFerias: 100,
    vencimentoDia: 10,
    responsavel: {
      nome: "Admin",
      telefone: "31999999999",
      email: "admin@test.com",
    },
    ...overrides,
  };
}

function makeMonth(): MonthData {
  return {
    expenses: [
      { id: "e1", nome: "Água (Copasa)", valor: 400, tipoDivisao: "copasa" },
      { id: "e2", nome: "Energia", valor: 200, tipoDivisao: "igual" },
      { id: "e3", nome: "Limpeza", valor: 300, tipoDivisao: "igual" },
    ],
  };
}

describe("computePdfData", () => {
  const cursor = new Date(2026, 6, 1); // Julho 2026

  it("computes totais correctly", () => {
    const store = makeStore();
    const month = makeMonth();
    const result = computePdfData({ store, month, cursor });

    // Rateio Mensal = Energia (200) + Limpeza (300) = 500
    expect(result.totais.rateioMensal).toBe(500);
    // COPASA = Água (400)
    expect(result.totais.copasa).toBe(400);
    // Fundo Reserva = 250 * 2 unidades = 500
    expect(result.totais.fundoReserva).toBe(500);
    // Fundo Obras = 200 * 2 unidades = 400
    expect(result.totais.fundoObras).toBe(400);
    // 13º/Férias = 100 (total)
    expect(result.totais.decimoTerceiroFeriasAdm).toBe(100);
    // Total = 500 + 400 + 500 + 400 + 100 = 1900
    expect(result.totais.total).toBe(1900);
  });

  it("generates 1 cobrança per unit when no inquilino", () => {
    const store = makeStore();
    const month = makeMonth();
    const result = computePdfData({ store, month, cursor });

    expect(result.unidades).toHaveLength(2);
    expect(result.unidades[0].cobrancas).toHaveLength(1);
    expect(result.unidades[0].cobrancas[0].tipo).toBe("Proprietário");
    expect(result.unidades[1].cobrancas).toHaveLength(1);
  });

  it("generates 2 cobranças when unit has inquilino", () => {
    const store = makeStore({
      apartments: [
        { id: "a1", numero: "101", morador: "João", inquilino: "Carlos", indiceCopasa: 10 },
        { id: "a2", numero: "102", morador: "Maria", indiceCopasa: 30 },
      ],
    });
    const month = makeMonth();
    const result = computePdfData({ store, month, cursor });

    // Unit 101 has inquilino -> 2 cobranças
    expect(result.unidades[0].cobrancas).toHaveLength(2);
    expect(result.unidades[0].cobrancas[0].tipo).toBe("Inquilino");
    expect(result.unidades[0].cobrancas[0].nomePagador).toBe("Carlos");
    expect(result.unidades[0].cobrancas[1].tipo).toBe("Proprietário");
    expect(result.unidades[0].cobrancas[1].nomePagador).toBe("João");

    // Inquilino pays everything except Fundo de Obras
    expect(result.unidades[0].cobrancas[0].fundoObras).toBe(0);
    expect(result.unidades[0].cobrancas[0].rateioMensal).toBe(250); // 500/2
    expect(result.unidades[0].cobrancas[0].fundoReserva).toBe(250);

    // Proprietário pays only Fundo de Obras
    expect(result.unidades[0].cobrancas[1].fundoObras).toBe(200);
    expect(result.unidades[0].cobrancas[1].rateioMensal).toBe(0);
    expect(result.unidades[0].cobrancas[1].copasa).toBe(0);
    expect(result.unidades[0].cobrancas[1].fundoReserva).toBe(0);
    expect(result.unidades[0].cobrancas[1].decimoTerceiroFeriasAdm).toBe(0);

    // Unit 102 has no inquilino -> 1 cobrança
    expect(result.unidades[1].cobrancas).toHaveLength(1);
  });

  it("computes fracaoIdeal based on indiceCopasa", () => {
    const store = makeStore();
    const month = makeMonth();
    const result = computePdfData({ store, month, cursor });

    // 101: 10/(10+30) = 0.25
    expect(result.unidades[0].fracaoIdeal).toBeCloseTo(0.25, 5);
    // 102: 30/(10+30) = 0.75
    expect(result.unidades[1].fracaoIdeal).toBeCloseTo(0.75, 5);
  });

  it("distributes COPASA proportionally to fracaoIdeal", () => {
    const store = makeStore();
    const month = makeMonth();
    const result = computePdfData({ store, month, cursor });

    // COPASA total = 400
    // 101: 400 * 0.25 = 100
    expect(result.unidades[0].cobrancas[0].copasa).toBe(100);
    // 102: 400 * 0.75 = 300
    expect(result.unidades[1].cobrancas[0].copasa).toBe(300);
  });

  it("computes vencimento in the next month", () => {
    const store = makeStore({ vencimentoDia: 10 });
    const month = makeMonth();
    const result = computePdfData({ store, month, cursor });

    // Cursor is July 2026, vencimento should be 10/08/2026
    expect(result.referencia.vencimento).toBe("10/08/2026");
  });

  it("sets mesExtenso to uppercase month name", () => {
    const store = makeStore();
    const month = makeMonth();
    const result = computePdfData({ store, month, cursor });

    expect(result.referencia.mesExtenso).toBe("JULHO");
  });

  it("uppercases condominio name", () => {
    const store = makeStore({ condoName: "Cond. Exemplo" });
    const month = makeMonth();
    const result = computePdfData({ store, month, cursor });

    expect(result.condominio.nome).toBe("COND. EXEMPLO");
  });

  it("sum of all cobranças totals equals totais.total", () => {
    const store = makeStore({
      apartments: [
        { id: "a1", numero: "101", morador: "João", inquilino: "Carlos", indiceCopasa: 10 },
        { id: "a2", numero: "102", morador: "Maria", indiceCopasa: 30 },
      ],
    });
    const month = makeMonth();
    const result = computePdfData({ store, month, cursor });

    const sumCobrancas = result.unidades.reduce(
      (s, u) => s + u.cobrancas.reduce((ss, c) => ss + c.total, 0),
      0,
    );
    expect(sumCobrancas).toBeCloseTo(result.totais.total, 2);
  });

  it("handles zero values for fixed funds", () => {
    const store = makeStore({
      fundoReserva: 0,
      fundoObras: 0,
      decimoTerceiroFerias: 0,
    });
    const month = makeMonth();
    const result = computePdfData({ store, month, cursor });

    expect(result.totais.fundoReserva).toBe(0);
    expect(result.totais.fundoObras).toBe(0);
    expect(result.totais.decimoTerceiroFeriasAdm).toBe(0);
  });

  it("handles undefined fixed funds (backward compat)", () => {
    const store = makeStore({
      fundoReserva: undefined,
      fundoObras: undefined,
      decimoTerceiroFerias: undefined,
    });
    const month = makeMonth();
    const result = computePdfData({ store, month, cursor });

    expect(result.totais.fundoReserva).toBe(0);
    expect(result.totais.fundoObras).toBe(0);
    expect(result.totais.decimoTerceiroFeriasAdm).toBe(0);
  });
});
