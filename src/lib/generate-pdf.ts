/**
 * Geração do PDF de Rateio de Condomínio
 *
 * Reproduz o layout especificado: cabeçalho verde, bloco-resumo, tabela detalhada,
 * cards individuais por cobrança, bloco-resumo final e rodapé de contato.
 */
import type { Apartment, DivisionRules, MonthData, Responsavel, Store } from "./condo-store";
import { getTipoDivisao } from "./condo-store";

// --- Types ---

export type Cobranca = {
  tipo: "Proprietário" | "Inquilino";
  nomePagador: string;
  copasa: number;
  rateioMensal: number;
  fundoReserva: number;
  decimoTerceiroFeriasAdm: number;
  fundoObras: number;
  total: number;
};

export type UnidadeCobranca = {
  apartamento: string;
  fracaoIdeal: number;
  cobrancas: Cobranca[];
};

export type DadosPdfRateio = {
  condominio: { nome: string };
  responsavel?: Responsavel;
  referencia: {
    mesExtenso: string;
    ano: number;
    vencimento: string;
    dataGeracao: string;
  };
  totais: {
    rateioMensal: number;
    copasa: number;
    fundoReserva: number;
    fundoObras: number;
    decimoTerceiroFeriasAdm: number;
    total: number;
  };
  unidades: UnidadeCobranca[];
};

// --- Colors ---
const TEXTO_CORPO = [30, 41, 59] as const; // #1E293B
const FUNDO_HEADER_TABELA = [242, 245, 250] as const; // #F2F5FA
const ZEBRA_CLARA = [247, 250, 252] as const; // #F7FAFC
const FUNDO_CARD = [250, 250, 252] as const; // #FAFAFC
const BORDA_CARD = [229, 231, 235] as const; // #E5E7EB
const CINZA_NOTA = [107, 114, 128] as const; // #6B7280
const VERDE_BASE = [9, 112, 78] as const; // #09704E

// --- Utilities ---
const brl = (n: number): string =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatFracao = (n: number): string => n.toFixed(5);

function formatDateBR(d: Date): string {
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getMesExtenso(d: Date): string {
  return d
    .toLocaleDateString("pt-BR", { month: "long" })
    .toUpperCase();
}

function getVencimento(referencia: Date, diaVencimento: number): Date {
  // Vencimento é no mês seguinte ao de referência
  const nextMonth = new Date(referencia.getFullYear(), referencia.getMonth() + 1, 1);
  const lastDay = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate();
  const dia = Math.min(diaVencimento, lastDay);
  return new Date(nextMonth.getFullYear(), nextMonth.getMonth(), dia);
}

// --- Business logic: compute PDF data from store ---

export function computePdfData(opts: {
  store: Store;
  month: MonthData;
  cursor: Date;
}): DadosPdfRateio {
  const { store, month, cursor } = opts;
  const apartments = store.apartments;
  const rules = store.divisionRules;
  const n = apartments.length || 1;

  // Compute totals for each expense category
  const filteredExpenses = month.expenses.filter((e) => e.nome.trim());

  // "Rateio Mensal" = sum of all expenses that are NOT copasa
  // (the non-copasa expenses become the "Rateio Mensal" line item)
  let totalRateioMensal = 0;
  let totalCopasa = 0;

  for (const e of filteredExpenses) {
    const valor = Number(e.valor) || 0;
    if (getTipoDivisao(e, rules) === "copasa") {
      totalCopasa += valor;
    } else {
      totalRateioMensal += valor;
    }
  }

  const totalFundoReserva = (store.fundoReserva ?? 0) * n;
  const totalFundoObras = (store.fundoObras ?? 0) * n;
  const totalDecimoTerceiro = store.decimoTerceiroFerias ?? 0;

  const totalGeral =
    totalRateioMensal + totalCopasa + totalFundoReserva + totalFundoObras + totalDecimoTerceiro;

  // Compute per-unit
  const totalIndice = apartments.reduce((s, a) => s + (Number(a.indiceCopasa) || 0), 0) || 1;
  const rateioMensalPorUnidade = totalRateioMensal / n;
  const fundoReservaPorUnidade = store.fundoReserva ?? 0;
  const fundoObrasPorUnidade = store.fundoObras ?? 0;
  const decimoTerceiroPorUnidade = totalDecimoTerceiro / n;

  const unidades: UnidadeCobranca[] = apartments.map((apt) => {
    const fracaoIdeal = (Number(apt.indiceCopasa) || 0) / totalIndice;
    const copasaUnidade = totalCopasa * fracaoIdeal;

    const cobrancas: Cobranca[] = [];

    if (apt.inquilino?.trim()) {
      // Unidade com inquilino: 2 cobranças
      // Inquilino paga tudo exceto Fundo de Obras
      cobrancas.push({
        tipo: "Inquilino",
        nomePagador: apt.inquilino.trim(),
        copasa: round2(copasaUnidade),
        rateioMensal: round2(rateioMensalPorUnidade),
        fundoReserva: round2(fundoReservaPorUnidade),
        decimoTerceiroFeriasAdm: round2(decimoTerceiroPorUnidade),
        fundoObras: 0,
        total: round2(
          copasaUnidade + rateioMensalPorUnidade + fundoReservaPorUnidade + decimoTerceiroPorUnidade,
        ),
      });
      // Proprietário paga só Fundo de Obras
      cobrancas.push({
        tipo: "Proprietário",
        nomePagador: apt.morador,
        copasa: 0,
        rateioMensal: 0,
        fundoReserva: 0,
        decimoTerceiroFeriasAdm: 0,
        fundoObras: round2(fundoObrasPorUnidade),
        total: round2(fundoObrasPorUnidade),
      });
    } else {
      // Sem inquilino: proprietário paga tudo
      cobrancas.push({
        tipo: "Proprietário",
        nomePagador: apt.morador,
        copasa: round2(copasaUnidade),
        rateioMensal: round2(rateioMensalPorUnidade),
        fundoReserva: round2(fundoReservaPorUnidade),
        decimoTerceiroFeriasAdm: round2(decimoTerceiroPorUnidade),
        fundoObras: round2(fundoObrasPorUnidade),
        total: round2(
          copasaUnidade +
            rateioMensalPorUnidade +
            fundoReservaPorUnidade +
            decimoTerceiroPorUnidade +
            fundoObrasPorUnidade,
        ),
      });
    }

    return { apartamento: apt.numero, fracaoIdeal, cobrancas };
  });

  const diaVencimento = store.vencimentoDia ?? 10;
  const vencimento = getVencimento(cursor, diaVencimento);

  return {
    condominio: { nome: store.condoName.toUpperCase() },
    responsavel: store.responsavel,
    referencia: {
      mesExtenso: getMesExtenso(cursor),
      ano: cursor.getFullYear(),
      vencimento: formatDateBR(vencimento),
      dataGeracao: formatDateBR(new Date()),
    },
    totais: {
      rateioMensal: round2(totalRateioMensal),
      copasa: round2(totalCopasa),
      fundoReserva: round2(totalFundoReserva),
      fundoObras: round2(totalFundoObras),
      decimoTerceiroFeriasAdm: round2(totalDecimoTerceiro),
      total: round2(totalGeral),
    },
    unidades,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// --- PDF Generation ---

export async function generateRateioPDF(opts: {
  store: Store;
  month: MonthData;
  cursor: Date;
}): Promise<void> {
  const dados = computePdfData(opts);

  const { default: jsPDF } = await import("jspdf");

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth(); // ~595
  const pageH = doc.internal.pageSize.getHeight(); // ~842
  const marginX = 40;
  const contentW = pageW - marginX * 2;
  const marginBottom = 40;

  let y = 0;
  let currentPage = 1;

  function newPage(): void {
    doc.addPage();
    currentPage++;
    y = marginX;
  }

  function checkPageBreak(needed: number): void {
    if (y + needed > pageH - marginBottom) {
      newPage();
    }
  }

  // ===== 4.1 CABEÇALHO VERDE (só página 1) =====
  const headerH = 90;
  doc.setFillColor(...VERDE_BASE);
  doc.rect(0, 0, pageW, headerH, "F");

  // Nome do condomínio
  doc.setFont("helvetica", "bold");
  doc.setFontSize(19);
  doc.setTextColor(255, 255, 255);
  doc.text(dados.condominio.nome, pageW / 2, 30, { align: "center" });

  // Subtítulo
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text(
    `RATEIO: MÊS ${dados.referencia.mesExtenso} / ${dados.referencia.ano}`,
    pageW / 2,
    52,
    { align: "center" },
  );

  // Vencimento
  doc.setFontSize(10);
  doc.text(`Vencimento: ${dados.referencia.vencimento}`, pageW / 2, 72, {
    align: "center",
  });

  doc.setTextColor(...TEXTO_CORPO);
  y = headerH + 24;

  // ===== 4.2 BLOCO-RESUMO =====
  drawBlocoResumo(doc, dados, marginX, contentW, pageW);

  // ===== 4.3 TABELA DETALHADA =====
  y += 20;
  drawTabela(doc, dados, marginX, contentW, pageW);

  // ===== 4.4 NOTA DE RODAPÉ DA TABELA =====
  y += 8;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(...CINZA_NOTA);
  doc.text(
    "* Apenas a COPASA varia conforme fração ideal. As demais despesas são igualitárias para todos.",
    marginX,
    y,
  );
  doc.setTextColor(...TEXTO_CORPO);
  y += 20;

  // ===== 4.5 TÍTULO SEÇÃO COBRANÇAS =====
  const totalCobrancas = dados.unidades.reduce((s, u) => s + u.cobrancas.length, 0);
  checkPageBreak(30);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(`${totalCobrancas} TAXAS A SEREM EMITIDAS:`, pageW / 2, y, {
    align: "center",
  });
  y += 24;

  // ===== 4.6 CARDS INDIVIDUAIS =====
  for (const unidade of dados.unidades) {
    const cardH = estimateCardHeight(unidade);
    checkPageBreak(cardH);
    drawCard(doc, unidade, marginX, contentW, pageW);
    y += cardH + 12;
  }

  // ===== 4.7 BLOCO-RESUMO FINAL =====
  checkPageBreak(140);
  // Linha separadora
  doc.setDrawColor(...BORDA_CARD);
  doc.setLineWidth(0.5);
  doc.line(marginX, y, pageW - marginX, y);
  y += 16;
  drawBlocoResumo(doc, dados, marginX, contentW, pageW);

  // ===== 4.8 RODAPÉ DE CONTATO (só última página) =====
  y += 20;
  if (dados.responsavel) {
    doc.setDrawColor(...BORDA_CARD);
    doc.setLineWidth(0.5);
    doc.line(marginX, y, pageW - marginX, y);
    y += 12;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...CINZA_NOTA);
    const leftText = `${dados.responsavel.nome} · ${dados.responsavel.telefone} · ${dados.responsavel.email}`;
    doc.text(leftText, marginX, y);
    doc.text(`Relatório gerado em ${dados.referencia.dataGeracao}`, pageW - marginX, y, {
      align: "right",
    });
    doc.setTextColor(...TEXTO_CORPO);
  }

  // Save
  const filename = `rateio-${dados.referencia.mesExtenso.toLowerCase()}-${dados.referencia.ano}.pdf`;
  doc.save(filename);

  // ===== Helper functions (closures that access y and doc) =====

  function drawBlocoResumo(
    d: InstanceType<typeof jsPDF>,
    data: DadosPdfRateio,
    mx: number,
    cw: number,
    pw: number,
  ): void {
    const lineH = 22;
    const items: [string, number][] = [
      ["RATEIO MENSAL:", data.totais.rateioMensal],
      ["COPASA:", data.totais.copasa],
      ["FUNDO DE RESERVA:", data.totais.fundoReserva],
      ["FUNDO DE OBRAS:", data.totais.fundoObras],
      ["13/FÉRIAS/ADM:", data.totais.decimoTerceiroFeriasAdm],
    ];

    for (const [label, valor] of items) {
      checkPageBreak(lineH);
      d.setFont("helvetica", "bold");
      d.setFontSize(10);
      d.setTextColor(...TEXTO_CORPO);
      d.text(label, mx, y);
      d.setFont("helvetica", "normal");
      d.text(brl(valor), pw - mx, y, { align: "right" });
      y += lineH;
    }

    // Faixa TOTAL
    checkPageBreak(28);
    const totalBarH = 24;
    d.setFillColor(...VERDE_BASE);
    d.rect(mx, y - 4, cw, totalBarH, "F");
    d.setFont("helvetica", "bold");
    d.setFontSize(12);
    d.setTextColor(255, 255, 255);
    d.text("TOTAL:", mx + 8, y + 12);
    d.text(brl(data.totais.total), pw - mx - 8, y + 12, { align: "right" });
    d.setTextColor(...TEXTO_CORPO);
    y += totalBarH + 8;
  }

  function drawTabela(
    d: InstanceType<typeof jsPDF>,
    data: DadosPdfRateio,
    mx: number,
    cw: number,
    pw: number,
  ): void {
    // Column positions.
    // Tipo/AP são alinhados à esquerda; as colunas numéricas são alinhadas
    // à direita neste x, espaçadas o suficiente para nunca se sobreporem.
    const cols = {
      tipo: mx,
      ap: mx + 70,
      fracao: mx + 150,
      copasa: mx + 211,
      rateio: mx + 272,
      reserva: mx + 333,
      decimo: mx + 394,
      obras: mx + 455,
      total: pw - mx,
    };

    const rowH = 17;
    const headerH = 20;

    // Header
    checkPageBreak(headerH + rowH);
    d.setFillColor(...FUNDO_HEADER_TABELA);
    d.rect(mx, y - 4, cw, headerH, "F");
    d.setFont("helvetica", "bold");
    d.setFontSize(8);
    d.setTextColor(80, 80, 80);

    const headerY = y + 8;
    d.text("Tipo", cols.tipo + 2, headerY);
    d.text("AP", cols.ap, headerY);
    d.text("Fração", cols.fracao, headerY, { align: "right" });
    d.text("COPASA", cols.copasa, headerY, { align: "right" });
    d.text("Rat. Mensal", cols.rateio, headerY, { align: "right" });
    d.text("F. Reserva", cols.reserva, headerY, { align: "right" });
    d.text("13º/Férias", cols.decimo, headerY, { align: "right" });
    d.text("F. Obras", cols.obras, headerY, { align: "right" });
    d.text("Total", cols.total - 2, headerY, { align: "right" });

    y += headerH;
    d.setTextColor(...TEXTO_CORPO);

    // Data rows
    let rowIndex = 0;
    for (const unidade of data.unidades) {
      for (let ci = 0; ci < unidade.cobrancas.length; ci++) {
        const cob = unidade.cobrancas[ci];
        checkPageBreak(rowH);

        // Zebra
        if (rowIndex % 2 === 1) {
          d.setFillColor(...ZEBRA_CLARA);
          d.rect(mx, y - 2, cw, rowH, "F");
        }

        const rowY = y + 10;
        d.setFontSize(8);

        // Tipo (italic)
        d.setFont("helvetica", "italic");
        d.text(cob.tipo, cols.tipo + 2, rowY);
        d.setFont("helvetica", "normal");

        // AP
        d.text(`${unidade.apartamento}`, cols.ap, rowY);

        // Fração: only show for first cobranca of unit (or when not "só fundo de obras")
        const isSoFundoObras =
          cob.rateioMensal === 0 &&
          cob.copasa === 0 &&
          cob.fundoReserva === 0 &&
          cob.decimoTerceiroFeriasAdm === 0 &&
          cob.fundoObras > 0;

        if (!isSoFundoObras) {
          d.text(formatFracao(unidade.fracaoIdeal), cols.fracao, rowY, {
            align: "right",
          });
          // COPASA
          d.text(brl(cob.copasa), cols.copasa, rowY, { align: "right" });
        }
        // else: Fração and COPASA remain blank

        // Rateio Mensal, F. Reserva, 13º/Férias show R$ 0,00 even when zero
        d.text(brl(cob.rateioMensal), cols.rateio, rowY, { align: "right" });
        d.text(brl(cob.fundoReserva), cols.reserva, rowY, { align: "right" });
        d.text(brl(cob.decimoTerceiroFeriasAdm), cols.decimo, rowY, { align: "right" });
        d.text(brl(cob.fundoObras), cols.obras, rowY, { align: "right" });

        // Total (bold)
        d.setFont("helvetica", "bold");
        d.text(brl(cob.total), cols.total - 2, rowY, { align: "right" });
        d.setFont("helvetica", "normal");

        y += rowH;
        rowIndex++;
      }
    }

    // Total row
    checkPageBreak(22);
    const totalRowH = 22;
    d.setFillColor(...VERDE_BASE);
    d.rect(mx, y - 2, cw, totalRowH, "F");
    d.setFont("helvetica", "bold");
    d.setFontSize(9);
    d.setTextColor(255, 255, 255);

    const totalY = y + 12;
    d.text("TOTAL", cols.tipo + 2, totalY);

    // Sum each column
    const sumCopasa = data.unidades.reduce(
      (s, u) => s + u.cobrancas.reduce((ss, c) => ss + c.copasa, 0),
      0,
    );
    const sumRateio = data.unidades.reduce(
      (s, u) => s + u.cobrancas.reduce((ss, c) => ss + c.rateioMensal, 0),
      0,
    );
    const sumReserva = data.unidades.reduce(
      (s, u) => s + u.cobrancas.reduce((ss, c) => ss + c.fundoReserva, 0),
      0,
    );
    const sumDecimo = data.unidades.reduce(
      (s, u) => s + u.cobrancas.reduce((ss, c) => ss + c.decimoTerceiroFeriasAdm, 0),
      0,
    );
    const sumObras = data.unidades.reduce(
      (s, u) => s + u.cobrancas.reduce((ss, c) => ss + c.fundoObras, 0),
      0,
    );
    const sumTotal = data.unidades.reduce(
      (s, u) => s + u.cobrancas.reduce((ss, c) => ss + c.total, 0),
      0,
    );

    d.text(brl(sumCopasa), cols.copasa, totalY, { align: "right" });
    d.text(brl(sumRateio), cols.rateio, totalY, { align: "right" });
    d.text(brl(sumReserva), cols.reserva, totalY, { align: "right" });
    d.text(brl(sumDecimo), cols.decimo, totalY, { align: "right" });
    d.text(brl(sumObras), cols.obras, totalY, { align: "right" });
    d.text(brl(sumTotal), cols.total - 2, totalY, { align: "right" });

    d.setTextColor(...TEXTO_CORPO);
    y += totalRowH + 4;
  }

  function estimateCardHeight(unidade: UnidadeCobranca): number {
    // Each sub-block: header (16) + lines (16 each) + total line (20) + divider (8)
    let h = 16; // card padding top
    for (let i = 0; i < unidade.cobrancas.length; i++) {
      const cob = unidade.cobrancas[i];
      h += 18; // header line
      // Count visible lines
      let lineCount = 4; // Rateio Mensal, COPASA, Fundo Reserva, 13º/Férias/ADM
      if (cob.tipo === "Proprietário") {
        lineCount = 5; // includes Fundo de Obras
      }
      h += lineCount * 15;
      h += 20; // total line
      if (i < unidade.cobrancas.length - 1) {
        h += 10; // dotted separator between sub-blocks
      }
    }
    h += 12; // card padding bottom
    return h;
  }

  function drawCard(
    d: InstanceType<typeof jsPDF>,
    unidade: UnidadeCobranca,
    mx: number,
    cw: number,
    pw: number,
  ): void {
    const cardX = mx;
    const cardW = cw;
    const cardStartY = y;
    const cardH = estimateCardHeight(unidade);

    // Card background + border
    d.setFillColor(...FUNDO_CARD);
    d.setDrawColor(...BORDA_CARD);
    d.setLineWidth(0.5);
    d.roundedRect(cardX, cardStartY, cardW, cardH, 4, 4, "FD");

    let cy = cardStartY + 14;
    const innerLeft = cardX + 12;
    const innerRight = cardX + cardW - 12;

    for (let ci = 0; ci < unidade.cobrancas.length; ci++) {
      const cob = unidade.cobrancas[ci];

      // Header: "AP {apt}   {nome}"  à esquerda; "(tipo)" à direita
      d.setFont("helvetica", "bold");
      d.setFontSize(10);
      d.setTextColor(...TEXTO_CORPO);
      d.text(`AP ${unidade.apartamento}   ${cob.nomePagador}`, innerLeft, cy);

      d.setFont("helvetica", "italic");
      d.setFontSize(9);
      d.setTextColor(...CINZA_NOTA);
      d.text(`(${cob.tipo})`, innerRight, cy, { align: "right" });
      d.setTextColor(...TEXTO_CORPO);
      cy += 16;

      // Lines
      d.setFont("helvetica", "normal");
      d.setFontSize(9);

      const drawLine = (label: string, valor: number) => {
        d.text(label, innerLeft, cy);
        d.text(brl(valor), innerRight, cy, { align: "right" });
        cy += 15;
      };

      drawLine("Rateio Mensal", cob.rateioMensal);
      drawLine("COPASA", cob.copasa);
      drawLine("Fundo Reserva", cob.fundoReserva);
      // Fundo de Obras only for Proprietário
      if (cob.tipo === "Proprietário") {
        drawLine("Fundo de Obras", cob.fundoObras);
      }
      drawLine("13º / Férias / ADM", cob.decimoTerceiroFeriasAdm);

      // Divider line before total
      d.setDrawColor(...BORDA_CARD);
      d.setLineWidth(0.3);
      d.line(innerLeft, cy - 4, innerRight, cy - 4);

      // Total
      d.setFont("helvetica", "bold");
      d.setFontSize(10);
      d.text("Total:", innerLeft, cy + 6);
      d.text(brl(cob.total), innerRight, cy + 6, { align: "right" });
      cy += 18;

      // Dotted separator between sub-blocks
      if (ci < unidade.cobrancas.length - 1) {
        d.setDrawColor(...BORDA_CARD);
        d.setLineWidth(0.3);
        d.setLineDashPattern([2, 2], 0);
        d.line(innerLeft, cy, innerRight, cy);
        d.setLineDashPattern([], 0);
        cy += 10;
      }
    }
  }
}

// --- Legacy wrapper that maintains backward compat with old call site ---

export async function generateCondoPDF(opts: {
  condoName: string;
  monthLabel: string;
  month: MonthData;
  apartments: Apartment[];
  rules?: DivisionRules;
  sindico?: string;
  store?: Store;
  cursor?: Date;
}): Promise<void> {
  const { store, month, cursor } = opts;

  // If full store is provided, use the new generation
  if (store && cursor) {
    return generateRateioPDF({ store, month, cursor });
  }

  // Fallback: construct a minimal store from opts for backward compat
  const minimalStore: Store = {
    condoName: opts.condoName,
    apartments: opts.apartments,
    months: {},
    divisionRules: opts.rules,
    sindico: opts.sindico,
  };

  // Parse cursor from monthLabel or use current date
  const fallbackCursor = cursor ?? new Date();

  return generateRateioPDF({ store: minimalStore, month, cursor: fallbackCursor });
}
