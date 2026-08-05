import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Plus, Trash2, Download, Upload } from "lucide-react";
import { listExpenseNames, useStore, type Store } from "@/lib/condo-store";
import { storeSchema } from "@/lib/store-schema";
import { toast } from "sonner";
import { SavedIndicator } from "@/components/saved-indicator";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";

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
  const importRef = useRef<HTMLInputElement>(null);

  // Estado do AlertDialog único para exclusão de apartamento
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    label: string;
  } | null>(null);

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

      <main className="mx-auto max-w-2xl px-4 py-4 space-y-6">
        {/* Nome condomínio */}
        <section className="rounded-2xl bg-card border border-border p-4 shadow-sm">
          <label
            htmlFor="condo-name"
            className="text-xs uppercase tracking-wider font-semibold text-muted-foreground"
          >
            Nome do condomínio
          </label>
          <input
            id="condo-name"
            value={store.condoName}
            onChange={(e) =>
              setStore((s) => ({ ...s, condoName: e.target.value }))
            }
            className="mt-2 w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ring text-base font-medium min-h-[44px]"
          />
        </section>

        {/* Síndico / Responsável */}
        <section className="rounded-2xl bg-card border border-border p-4 shadow-sm">
          <label
            htmlFor="sindico-name"
            className="text-xs uppercase tracking-wider font-semibold text-muted-foreground"
          >
            Síndico / Responsável
          </label>
          <p className="text-xs text-muted-foreground mt-1 mb-2">
            Nome que aparecerá na assinatura do PDF gerado.
          </p>
          <input
            id="sindico-name"
            value={store.sindico ?? ""}
            onChange={(e) =>
              setStore((s) => ({ ...s, sindico: e.target.value }))
            }
            placeholder="Ex: João da Silva"
            className="w-full bg-background border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ring text-base font-medium min-h-[44px]"
          />
        </section>

        {/* Apartamentos */}
        <section className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-secondary/60 flex items-center justify-between">
            <h2 className="font-semibold text-secondary-foreground text-base">
              Apartamentos
            </h2>
            <span className="text-xs text-muted-foreground">
              {store.apartments.length} unidades
            </span>
          </div>

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
                    placeholder="Nome do morador"
                    aria-label={`Morador do apto ${apt.numero || ""}`}
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
                <label className="flex items-center gap-2 pl-1">
                  <span className="text-sm text-muted-foreground min-w-fit">
                    Índice Copasa:
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={apt.indiceCopasa === 0 ? "" : apt.indiceCopasa}
                    onChange={(e) =>
                      setStore((s) => ({
                        ...s,
                        apartments: s.apartments.map((a) =>
                          a.id === apt.id
                            ? {
                                ...a,
                                indiceCopasa: Number(e.target.value) || 0,
                              }
                            : a,
                        ),
                      }))
                    }
                    placeholder="0"
                    aria-label={`Índice Copasa do apto ${apt.numero || ""}`}
                    className="flex-1 bg-background border border-border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring tabular-nums text-base min-h-[44px]"
                  />
                </label>
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
        </section>

        {/* Tipo de divisão por despesa */}
        <section className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-secondary/60">
            <h2 className="font-semibold text-secondary-foreground text-base">
              Tipo de divisão das despesas
            </h2>
          </div>
          <div className="divide-y divide-border">
            {listExpenseNames(store).map((nome) => (
              <div
                key={nome}
                className="px-4 py-3 flex items-center justify-between gap-3"
              >
                <span className="text-base font-medium min-w-0 truncate">
                  {nome}
                </span>
                <select
                  value={store.divisionRules?.[nome] ?? "igual"}
                  onChange={(e) =>
                    setStore((s) => ({
                      ...s,
                      divisionRules: {
                        ...(s.divisionRules ?? {}),
                        [nome]: e.target.value as "igual" | "copasa",
                      },
                    }))
                  }
                  aria-label={`Tipo de divisão para ${nome}`}
                  className="shrink-0 text-base px-3 py-2.5 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-ring min-h-[44px]"
                >
                  <option value="igual">Dividir igual</option>
                  <option value="copasa">Por consumo (Copasa)</option>
                </select>
              </div>
            ))}
          </div>
        </section>

        <p className="text-sm text-muted-foreground px-1">
          O índice Copasa é usado para dividir despesas marcadas como "por
          consumo". As despesas marcadas como "dividir igual" são rateadas em
          partes iguais entre todos os apartamentos.
        </p>

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
