import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState, type ReactNode } from "react";
import {
  Plus,
  Trash2,
  Download,
  Upload,
  Pencil,
  Check,
  FileDown,
} from "lucide-react";
import {
  ensureMonth,
  formatMonthLabel,
  monthKey,
  useStore,
  type Store,
} from "@/lib/condo-store";
import { generateCondoPDF } from "@/lib/generate-pdf";
import { storeSchema } from "@/lib/store-schema";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { SavedIndicator } from "@/components/saved-indicator";
import { CurrencyInput } from "@/components/currency-input";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";

/** Estilo dos inputs de valor (R$) nos Ajustes — mesma aparência dos demais campos do formulário */
const MONEY_INPUT_CLASS =
  "w-full bg-background border border-border rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-ring text-base tabular-nums min-h-[44px]";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Ajustes - Condomínio" },
      {
        name: "description",
        content:
          "Configuração dos apartamentos, moradores e índices de consumo Copasa.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { store, setStore } = useStore();
  const { isAdmin } = useAuth();
  const importRef = useRef<HTMLInputElement>(null);

  // Estado do AlertDialog único para exclusão de apartamento
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    label: string;
  } | null>(null);

  // Mês atual — usado para gerar o PDF de rateio a partir dos Ajustes
  const cursor = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }, []);
  const monthLabel = formatMonthLabel(cursor);
  const currentMonth = ensureMonth(store, monthKey(cursor));

  async function handleGeneratePDF() {
    try {
      await generateCondoPDF({
        condoName: store.condoName,
        monthLabel,
        month: currentMonth,
        apartments: store.apartments,
        rules: store.divisionRules,
        sindico: store.sindico,
        store,
        cursor,
      });
      toast.success("PDF gerado com sucesso! Verifique seus downloads.");
    } catch {
      toast.error("Erro ao gerar o PDF. Tente novamente.");
    }
  }

  function handleExport() {
    const data = JSON.stringify(store, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `condominio-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Backup exportado com sucesso!");
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const raw = JSON.parse(ev.target?.result as string);
        const result = storeSchema.safeParse(raw);
        if (!result.success) {
          const issues = result.error.issues
            .slice(0, 3)
            .map((i) => i.message)
            .join("; ");
          toast.error(`Arquivo inválido: ${issues}`);
          return;
        }
        setStore(() => result.data as Store);
        toast.success("Backup importado com sucesso!");
      } catch {
        toast.error("Erro ao ler o arquivo. Verifique se é um JSON válido.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 bg-cream-deep/95 backdrop-blur border-b border-border">
        <div className="mx-auto max-w-2xl px-4 py-3 flex items-center gap-3">
          <h1 className="text-xl font-bold text-primary flex-1">Ajustes</h1>
          <SavedIndicator />
        </div>
      </header>

      {!isAdmin && (
        <div className="mx-auto max-w-2xl px-4 pt-4">
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
            🔒 Modo visualização — apenas administradores podem editar.
          </div>
        </div>
      )}

      <main className="mx-auto max-w-2xl px-4 py-4 space-y-6">
        {/* Nome condomínio */}
        <EditableSection title="Nome do condomínio" canEdit={isAdmin}>
          {() => (
            <div className="p-4">
              <input
                id="condo-name"
                value={store.condoName}
                onChange={(e) =>
                  setStore((s) => ({ ...s, condoName: e.target.value }))
                }
                aria-label="Nome do condomínio"
                className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ring text-base font-medium min-h-[44px]"
              />
            </div>
          )}
        </EditableSection>

        {/* Responsável (nome, telefone, email) */}
        <EditableSection
          title="Responsável / Síndico"
          subtitle="Dados que aparecerão no rodapé do PDF gerado."
          canEdit={isAdmin}
        >
          {() => (
            <div className="p-4 space-y-3">
              <input
                value={store.responsavel?.nome ?? store.sindico ?? ""}
                onChange={(e) =>
                  setStore((s) => ({
                    ...s,
                    sindico: e.target.value,
                    responsavel: {
                      nome: e.target.value,
                      telefone: s.responsavel?.telefone ?? "",
                      email: s.responsavel?.email ?? "",
                    },
                  }))
                }
                placeholder="Nome completo"
                aria-label="Nome do responsável"
                className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ring text-base font-medium min-h-[44px]"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="tel"
                  inputMode="tel"
                  value={store.responsavel?.telefone ?? ""}
                  onChange={(e) =>
                    setStore((s) => ({
                      ...s,
                      responsavel: {
                        nome: s.responsavel?.nome ?? s.sindico ?? "",
                        telefone: e.target.value,
                        email: s.responsavel?.email ?? "",
                      },
                    }))
                  }
                  placeholder="Telefone"
                  aria-label="Telefone do responsável"
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ring text-base min-h-[44px]"
                />
                <input
                  type="email"
                  inputMode="email"
                  value={store.responsavel?.email ?? ""}
                  onChange={(e) =>
                    setStore((s) => ({
                      ...s,
                      responsavel: {
                        nome: s.responsavel?.nome ?? s.sindico ?? "",
                        telefone: s.responsavel?.telefone ?? "",
                        email: e.target.value,
                      },
                    }))
                  }
                  placeholder="Email"
                  aria-label="Email do responsável"
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ring text-base min-h-[44px]"
                />
              </div>
            </div>
          )}
        </EditableSection>

        {/* Valores fixos mensais (Fundo de Reserva, Fundo de Obras, 13º/Férias, Vencimento) */}
        <EditableSection title="Valores fixos do rateio" canEdit={isAdmin}>
          {() => (
            <div className="p-4 space-y-4">
              <p className="text-xs text-muted-foreground">
                Estes valores são adicionados ao rateio mensal além das despesas
                variáveis.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className="text-sm font-medium text-foreground">
                    Fundo de Reserva (por unidade)
                  </span>
                  <CurrencyInput
                    value={store.fundoReserva ?? 0}
                    onChange={(v) =>
                      setStore((s) => ({ ...s, fundoReserva: v }))
                    }
                    ariaLabel="Fundo de Reserva por unidade"
                    className={MONEY_INPUT_CLASS}
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-foreground">
                    Fundo de Obras (por unidade)
                  </span>
                  <CurrencyInput
                    value={store.fundoObras ?? 0}
                    onChange={(v) => setStore((s) => ({ ...s, fundoObras: v }))}
                    ariaLabel="Fundo de Obras por unidade"
                    className={MONEY_INPUT_CLASS}
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-foreground">
                    13º / Férias / ADM (total)
                  </span>
                  <CurrencyInput
                    value={store.decimoTerceiroFerias ?? 0}
                    onChange={(v) =>
                      setStore((s) => ({ ...s, decimoTerceiroFerias: v }))
                    }
                    ariaLabel="13º Férias ADM total"
                    className={MONEY_INPUT_CLASS}
                  />
                  <span className="text-xs text-muted-foreground">
                    Será dividido igualmente entre as unidades.
                  </span>
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-foreground">
                    Dia de vencimento
                  </span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max="31"
                    value={store.vencimentoDia ?? 10}
                    onChange={(e) =>
                      setStore((s) => ({
                        ...s,
                        vencimentoDia: Math.min(
                          31,
                          Math.max(1, Number(e.target.value) || 10),
                        ),
                      }))
                    }
                    aria-label="Dia de vencimento"
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ring text-base tabular-nums min-h-[44px]"
                  />
                  <span className="text-xs text-muted-foreground">
                    Vencimento no mês seguinte ao de referência.
                  </span>
                </label>
              </div>
            </div>
          )}
        </EditableSection>

        {/* Apartamentos */}
        <EditableSection
          title="Apartamentos"
          canEdit={isAdmin}
          headerRight={
            <span className="shrink-0 text-xs text-muted-foreground">
              {store.apartments.length} unidades
            </span>
          }
        >
          {() => (
            <>
              <div className="divide-y divide-border">
                {store.apartments.map((apt) => (
                  <div key={apt.id} className="p-3 space-y-2">
                    <div className="grid grid-cols-[90px_minmax(0,1fr)_44px] gap-2 items-center">
                      <input
                        value={apt.numero}
                        onChange={(e) =>
                          setStore((s) => ({
                            ...s,
                            apartments: s.apartments.map((a) =>
                              a.id === apt.id
                                ? { ...a, numero: e.target.value }
                                : a,
                            ),
                          }))
                        }
                        placeholder="Nº"
                        aria-label={`Número do apartamento ${apt.numero || ""}`}
                        className="w-full bg-background border border-border rounded-xl px-3 py-2.5 font-semibold text-center focus:outline-none focus:ring-2 focus:ring-ring text-base min-h-[44px]"
                      />
                      <input
                        value={apt.morador}
                        onChange={(e) =>
                          setStore((s) => ({
                            ...s,
                            apartments: s.apartments.map((a) =>
                              a.id === apt.id
                                ? { ...a, morador: e.target.value }
                                : a,
                            ),
                          }))
                        }
                        placeholder="Proprietário"
                        aria-label={`Proprietário do apto ${apt.numero || ""}`}
                        className="w-full bg-background border border-border rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-ring text-base min-h-[44px]"
                      />
                      <button
                        onClick={() =>
                          setDeleteTarget({
                            id: apt.id,
                            label: `${apt.numero || "(sem número)"}${apt.morador ? ` (${apt.morador})` : ""}`,
                          })
                        }
                        className="p-2.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition min-w-[44px] min-h-[44px] flex items-center justify-center"
                        aria-label={`Remover apartamento ${apt.numero || ""}`}
                      >
                        <Trash2 className="size-5" />
                      </button>
                    </div>

                    {/* Inquilino */}
                    <div className="pl-1">
                      <input
                        value={apt.inquilino ?? ""}
                        onChange={(e) =>
                          setStore((s) => ({
                            ...s,
                            apartments: s.apartments.map((a) =>
                              a.id === apt.id
                                ? { ...a, inquilino: e.target.value }
                                : a,
                            ),
                          }))
                        }
                        placeholder="Inquilino (deixe vazio se não tiver)"
                        aria-label={`Inquilino do apto ${apt.numero || ""}`}
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring text-sm min-h-[44px]"
                      />
                    </div>

                    {/* Fração ideal (%) */}
                    <FracaoIdealInput
                      value={apt.indiceCopasa}
                      onChange={(val) =>
                        setStore((s) => ({
                          ...s,
                          apartments: s.apartments.map((a) =>
                            a.id === apt.id ? { ...a, indiceCopasa: val } : a,
                          ),
                        }))
                      }
                      apartamento={apt.numero}
                    />
                  </div>
                ))}
              </div>

              <button
                onClick={() =>
                  setStore((s) => ({
                    ...s,
                    apartments: [
                      ...s.apartments,
                      {
                        id: crypto.randomUUID(),
                        numero: "",
                        morador: "",
                        indiceCopasa: 0,
                      },
                    ],
                  }))
                }
                className="w-full flex items-center justify-center gap-2 px-4 py-3.5 border-t border-border text-primary font-medium hover:bg-accent/20 transition min-h-[44px]"
              >
                <Plus className="size-5" /> Adicionar apartamento
              </button>

              {/* Total da fração ideal */}
              {store.apartments.length > 0 &&
                (() => {
                  const totalFracao = store.apartments.reduce(
                    (s, a) => s + (a.indiceCopasa || 0),
                    0,
                  );
                  const totalFormatted = totalFracao.toFixed(5);
                  const isValid = Math.abs(totalFracao - 1) < 0.0001;
                  return (
                    <div
                      className={`px-4 py-2.5 border-t border-border flex items-center justify-between text-sm ${isValid ? "text-green-700 bg-green-50" : "text-amber-700 bg-amber-50"}`}
                    >
                      <span className="font-medium">Total fração ideal:</span>
                      <span className="font-bold tabular-nums">
                        {totalFormatted}{" "}
                        {isValid ? "✓" : `(deve somar 1.00000)`}
                      </span>
                    </div>
                  );
                })()}
            </>
          )}
        </EditableSection>

        {/* Backup: Export/Import */}
        <section className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-secondary/60">
            <h2 className="font-semibold text-secondary-foreground text-base">
              Backup dos dados
            </h2>
          </div>
          <div className="p-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Exporte seus dados para manter um backup seguro. Se precisar
              restaurar, importe o arquivo JSON salvo.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleExport}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 bg-primary text-primary-foreground font-medium hover:opacity-90 transition min-h-[44px]"
              >
                <Download className="size-5" /> Exportar backup
              </button>
              <button
                onClick={() => importRef.current?.click()}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 bg-secondary text-secondary-foreground font-medium hover:bg-accent/30 transition min-h-[44px]"
              >
                <Upload className="size-5" /> Importar backup
              </button>
              <input
                ref={importRef}
                type="file"
                accept=".json,application/json"
                onChange={handleImport}
                className="hidden"
                aria-label="Selecionar arquivo de backup"
              />
            </div>
          </div>
        </section>
      </main>

      {/* PDF de rateio — sempre disponível, independente do modo edição */}
      <div className="mx-auto max-w-2xl px-4 pb-4">
        <section className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-secondary/60">
            <h2 className="font-semibold text-secondary-foreground text-base">
              Relatório de rateio
            </h2>
          </div>
          <div className="p-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Gera o PDF de rateio do mês atual ({monthLabel}) com as despesas e
              os valores configurados acima.
            </p>
            <button
              onClick={handleGeneratePDF}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 bg-primary text-primary-foreground font-semibold hover:opacity-90 transition min-h-[44px]"
            >
              <FileDown className="size-5" /> Gerar PDF
            </button>
          </div>
        </section>
      </div>

      {/* Single delete confirmation dialog */}
      <ConfirmDeleteDialog
        open={deleteTarget !== null}
        title="Excluir apartamento"
        description={`Tem certeza que deseja excluir o apartamento ${deleteTarget?.label ?? ""}? Esta ação não pode ser desfeita.`}
        onConfirm={() => {
          if (deleteTarget) {
            setStore((s) => ({
              ...s,
              apartments: s.apartments.filter((a) => a.id !== deleteTarget.id),
            }));
          }
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

/**
 * Seção de ajustes com modo edição próprio (ícone de lápis + salvar), no mesmo
 * padrão das linhas de despesa da tela inicial. Cada seção que pode conter dados
 * tem seu próprio botão — não há um modo edição global.
 */
function EditableSection({
  title,
  subtitle,
  headerRight,
  canEdit,
  children,
}: {
  title: string;
  subtitle?: string;
  headerRight?: ReactNode;
  canEdit: boolean;
  children: (editing: boolean) => ReactNode;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <section className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-secondary/60 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-secondary-foreground text-base">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
        {headerRight}
        {canEdit &&
          (editing ? (
            <button
              onClick={() => setEditing(false)}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition min-h-[36px]"
            >
              <Check className="size-4" /> Salvar
            </button>
          ) : (
            <button
              onClick={() => setEditing(true)}
              aria-label={`Editar: ${title}`}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 transition min-h-[36px]"
            >
              <Pencil className="size-4" /> Editar
            </button>
          ))}
      </div>
      <div
        className={editing ? "" : "pointer-events-none opacity-75 select-none"}
      >
        {children(editing)}
      </div>
    </section>
  );
}

/** Input controlado para fração ideal que permite digitar decimais como "0.8" sem limpar */
function FracaoIdealInput({
  value,
  onChange,
  apartamento,
}: {
  value: number;
  onChange: (val: number) => void;
  apartamento: string;
}) {
  const [focused, setFocused] = useState(false);
  const [raw, setRaw] = useState("");

  const displayValue = focused ? raw : value === 0 ? "" : String(value);

  return (
    <label className="flex items-center gap-2 pl-1">
      <span className="text-sm text-muted-foreground min-w-fit">
        Fração ideal (%):
      </span>
      <input
        type="text"
        inputMode="decimal"
        value={displayValue}
        onFocus={() => {
          setFocused(true);
          setRaw(value === 0 ? "" : String(value));
        }}
        onBlur={() => {
          setFocused(false);
          const parsed = parseFloat(raw.replace(",", "."));
          onChange(isNaN(parsed) ? 0 : Math.round(parsed * 100000) / 100000);
        }}
        onChange={(e) => setRaw(e.target.value)}
        placeholder="0.000"
        aria-label={`Fração ideal do apto ${apartamento || ""}`}
        className="flex-1 bg-background border border-border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring tabular-nums text-base min-h-[44px]"
      />
    </label>
  );
}
