import type {
  Cobranca,
  DadosPdfRateio,
  UnidadeCobranca,
} from "@/lib/generate-pdf";

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Linhas de cobrança na ordem em que aparecem no card da unidade. */
const LINHAS: Array<{ label: string; key: keyof Cobranca }> = [
  { label: "Rateio Mensal", key: "rateioMensal" },
  { label: "COPASA", key: "copasa" },
  { label: "Fundo Reserva", key: "fundoReserva" },
  { label: "Fundo de Obras", key: "fundoObras" },
  { label: "13º / Férias / ADM", key: "decimoTerceiroFeriasAdm" },
];

/** Texto pequeno exibido abaixo de alguns rótulos, igual ao que a COPASA já tem. */
const SUBTITULOS: Partial<Record<keyof Cobranca, string>> = {
  copasa: "Rateada por fração ideal",
  fundoReserva: "fundo de reserva",
  fundoObras: "fundo de obras",
  decimoTerceiroFeriasAdm: "13 férias",
};

function CobrancaCard({
  unidade,
  cobranca,
}: {
  unidade: UnidadeCobranca;
  cobranca: Cobranca;
}) {
  const linhasVisiveis = LINHAS.filter(
    ({ key }) => (cobranca[key] as number) !== 0,
  );
  // Garante ao menos uma linha para não deixar o card só com o total
  const linhas = linhasVisiveis.length > 0 ? linhasVisiveis : [LINHAS[0]];

  return (
    <div className="px-4 py-3.5 border-t border-border">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <span className="font-semibold text-base">
            Apto {unidade.apartamento}
          </span>{" "}
          <span className="text-sm text-muted-foreground">
            {cobranca.nomePagador}
          </span>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
            cobranca.tipo === "Inquilino"
              ? "bg-primary/10 text-primary"
              : "bg-secondary text-secondary-foreground"
          }`}
        >
          {cobranca.tipo}
        </span>
      </div>

      <dl className="space-y-1">
        {linhas.map(({ label, key }) => (
          <div key={key} className="flex items-baseline justify-between gap-3">
            <dt className="text-sm text-muted-foreground">
              {label}
              {SUBTITULOS[key] && (
                <span className="block text-xs text-muted-foreground/70">
                  {SUBTITULOS[key]}
                </span>
              )}
            </dt>
            <dd className="text-sm tabular-nums">
              {brl(cobranca[key] as number)}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-2 pt-2 border-t border-border flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold">Total</span>
        <span className="text-base font-bold tabular-nums text-primary">
          {brl(cobranca.total)}
        </span>
      </div>
    </div>
  );
}

export function RateioBreakdown({ data }: { data: DadosPdfRateio }) {
  const { unidades, totais } = data;
  if (unidades.length === 0) return null;

  const totalCobrancas = unidades.reduce((s, u) => s + u.cobrancas.length, 0);

  const resumoBase: Array<{ label: string; key: keyof Cobranca; valor: number }> = [
    { label: "Rateio Mensal", key: "rateioMensal", valor: totais.rateioMensal },
    { label: "COPASA", key: "copasa", valor: totais.copasa },
    { label: "Fundo Reserva", key: "fundoReserva", valor: totais.fundoReserva },
    { label: "Fundo de Obras", key: "fundoObras", valor: totais.fundoObras },
    { label: "13º / Férias / ADM", key: "decimoTerceiroFeriasAdm", valor: totais.decimoTerceiroFeriasAdm },
  ];
  const resumo = resumoBase.filter((r) => r.valor !== 0);

  return (
    <div className="mt-5 rounded-2xl bg-card border border-border overflow-hidden shadow-sm">
      <div className="px-4 py-3 bg-secondary/60 text-xs font-semibold uppercase tracking-wider text-secondary-foreground flex items-baseline justify-between gap-2">
        <span>Rateio por unidade</span>
        <span className="normal-case font-medium text-muted-foreground">
          {totalCobrancas} {totalCobrancas === 1 ? "cobrança" : "cobranças"} ·{" "}
          {unidades.length} {unidades.length === 1 ? "unidade" : "unidades"}
        </span>
      </div>

      {unidades.flatMap((unidade) =>
        unidade.cobrancas.map((cobranca, i) => (
          <CobrancaCard
            key={`${unidade.apartamento}-${i}`}
            unidade={unidade}
            cobranca={cobranca}
          />
        )),
      )}

      {/* Resumo por categoria */}
      {resumo.length > 0 && (
        <div className="border-t-4 border-border bg-secondary/30 px-4 py-3.5">
          <div className="text-xs font-semibold uppercase tracking-wider text-secondary-foreground mb-2">
            Resumo do mês
          </div>
          <dl className="space-y-1">
            {resumo.map((r) => (
              <div
                key={r.label}
                className="flex items-baseline justify-between gap-3"
              >
                <dt className="text-sm text-muted-foreground">
                  {r.label}
                  {SUBTITULOS[r.key] && (
                    <span className="block text-xs text-muted-foreground/70">
                      {SUBTITULOS[r.key]}
                    </span>
                  )}
                </dt>
                <dd className="text-sm tabular-nums">{brl(r.valor)}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-2 pt-2 border-t border-border flex items-baseline justify-between gap-3">
            <span className="text-sm font-bold">Total geral</span>
            <span className="text-lg font-extrabold tabular-nums text-primary">
              {brl(totais.total)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
