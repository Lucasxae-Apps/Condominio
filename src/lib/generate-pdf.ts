import type { Apartment, DivisionRules, MonthData } from "./condo-store";
import { computeDivision, getTipoDivisao } from "./condo-store";

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export async function generateCondoPDF(opts: {
  condoName: string;
  monthLabel: string;
  month: MonthData;
  apartments: Apartment[];
  rules?: DivisionRules;
  sindico?: string;
}) {
  const { condoName, monthLabel, month, apartments, rules, sindico } = opts;

  // Filtrar despesas sem nome (linhas vazias)
  const filteredMonth: MonthData = {
    expenses: month.expenses.filter((e) => e.nome.trim()),
  };

  const { total, perApt } = computeDivision(filteredMonth, apartments, rules);

  // Lazy import — jsPDF só é carregado quando o usuário clica "Gerar PDF"
  const { default: jsPDF } = await import("jspdf");

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  let y = 60;

  // Título
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(condoName, pageW / 2, y, { align: "center" });
  y += 24;

  // Subtítulo
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Divisão do condomínio - referente ao mês de ${monthLabel}`,
    pageW / 2,
    y,
    { align: "center" },
  );
  y += 18;

  // Data de emissão
  const dataEmissao = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Emitido em ${dataEmissao}`, pageW / 2, y, { align: "center" });
  doc.setTextColor(0, 0, 0);
  y += 28;

  // Introdução
  doc.setFontSize(11);
  const intro =
    `Prezados moradores,\n\nSegue abaixo a divisão do valor do condomínio referente ao mês de ${monthLabel}. ` +
    `O valor total das despesas foi de ${brl(total)}, dividido conforme as despesas comuns (partes iguais) ` +
    `e o consumo individual de água (índice Copasa).`;
  const introLines = doc.splitTextToSize(intro, pageW - 80);
  doc.text(introLines, 40, y);
  y += introLines.length * 14 + 16;

  // Despesas
  doc.setFont("helvetica", "bold");
  doc.text("Despesas do mês", 40, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  for (const e of filteredMonth.expenses) {
    const tipo =
      getTipoDivisao(e, rules) === "copasa" ? "(por consumo)" : "(igual)";
    doc.text(`${e.nome} ${tipo}`, 50, y);
    doc.text(brl(Number(e.valor) || 0), pageW - 50, y, { align: "right" });
    y += 16;
    if (y > 720) {
      doc.addPage();
      y = 60;
    }
  }
  doc.setFont("helvetica", "bold");
  y += 4;
  doc.line(50, y - 2, pageW - 50, y - 2);
  doc.text("Total", 50, y + 10);
  doc.text(brl(total), pageW - 50, y + 10, { align: "right" });
  y += 34;

  // Divisão por apartamento
  if (y > 660) {
    doc.addPage();
    y = 60;
  }
  doc.text("Valor por apartamento", 40, y);
  y += 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Apto", 50, y);
  doc.text("Morador", 110, y);
  doc.text("Índice", pageW - 160, y, { align: "right" });
  doc.text("Valor", pageW - 50, y, { align: "right" });
  y += 6;
  doc.line(40, y, pageW - 40, y);
  y += 14;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  for (const row of perApt) {
    doc.text(String(row.apartment.numero), 50, y);
    doc.text(String(row.apartment.morador).slice(0, 40), 110, y);
    doc.text(String(row.apartment.indiceCopasa), pageW - 160, y, {
      align: "right",
    });
    doc.text(brl(row.valor), pageW - 50, y, { align: "right" });
    y += 16;
    if (y > 720) {
      doc.addPage();
      y = 60;
    }
  }

  y += 10;
  doc.line(40, y, pageW - 40, y);
  y += 18;
  doc.setFont("helvetica", "bold");
  doc.text("Total arrecadado", 50, y);
  doc.text(brl(perApt.reduce((s, r) => s + r.valor, 0)), pageW - 50, y, {
    align: "right",
  });

  // Assinatura do síndico
  if (sindico?.trim()) {
    y += 60;
    if (y > 720) {
      doc.addPage();
      y = 100;
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    const sindicoX = pageW / 2;
    doc.line(sindicoX - 80, y, sindicoX + 80, y);
    y += 14;
    doc.text(sindico.trim(), sindicoX, y, { align: "center" });
    y += 14;
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text("Síndico / Responsável", sindicoX, y, { align: "center" });
    doc.setTextColor(0, 0, 0);
  }

  // Add page numbers
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const pageH = doc.internal.pageSize.getHeight();
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(`Página ${i} de ${totalPages}`, pageW / 2, pageH - 20, {
      align: "center",
    });
    doc.setTextColor(0, 0, 0);
  }

  doc.save(`condominio-${monthLabel.replace(/\s+/g, "-")}.pdf`);
}
