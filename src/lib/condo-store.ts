import { useSyncExternalStore } from "react";
import { saveStoreToCloud, loadStoreFromCloud } from "@/lib/supabase-sync";

export type Apartment = {
  id: string;
  numero: string;
  morador: string; // proprietário
  inquilino?: string; // nome do inquilino (se vazio/undefined = sem inquilino)
  indiceCopasa: number; // fração ideal (%) — soma de todas as unidades deve ser 100
};

export type Responsavel = {
  nome: string;
  telefone: string;
  email: string;
};

export type Expense = {
  id: string;
  nome: string;
  valor: number;
  tipoDivisao: "igual" | "copasa";
};

export type MonthData = {
  expenses: Expense[];
};

export type DivisionRules = Record<string, "igual" | "copasa">;

export type Store = {
  apartments: Apartment[];
  months: Record<string, MonthData>; // key: "YYYY-MM"
  condoName: string;
  divisionRules?: DivisionRules;
  sindico?: string;
  responsavel?: Responsavel;
  vencimentoDia?: number; // dia do mês para vencimento (ex: 10)
  fundoReserva?: number; // valor fixo por unidade
  fundoObras?: number; // valor fixo por unidade (cobrado do proprietário)
  decimoTerceiroFerias?: number; // valor total a ser dividido igualmente
};

const KEY = "condo-store-v1";
const DEBOUNCE_MS = 300;
const CLOUD_DEBOUNCE_MS = 2000;

const defaultStore: Store = {
  condoName: "Meu Condomínio",
  apartments: [
    { id: "a1", numero: "101", morador: "Morador 101", indiceCopasa: 10 },
    { id: "a2", numero: "102", morador: "Morador 102", indiceCopasa: 10 },
  ],
  months: {},
  divisionRules: { "Água (Copasa)": "copasa" },
};

const defaultExpenses = (): Expense[] => [
  { id: crypto.randomUUID(), nome: "Água (Copasa)", valor: 0, tipoDivisao: "copasa" },
  { id: crypto.randomUUID(), nome: "Energia área comum", valor: 0, tipoDivisao: "igual" },
  { id: crypto.randomUUID(), nome: "Limpeza", valor: 0, tipoDivisao: "igual" },
  { id: crypto.randomUUID(), nome: "Manutenção", valor: 0, tipoDivisao: "igual" },
];

// --- Cloud sync ---

let currentUserId: string | null = null;
let cloudSaveTimer: ReturnType<typeof setTimeout> | null = null;

export function setCloudUserId(userId: string | null) {
  currentUserId = userId;
}

function persistToCloud(s: Store) {
  if (!currentUserId) return;
  if (cloudSaveTimer !== null) clearTimeout(cloudSaveTimer);
  cloudSaveTimer = setTimeout(() => {
    saveStoreToCloud(currentUserId!, s);
    cloudSaveTimer = null;
  }, CLOUD_DEBOUNCE_MS);
}

export async function loadFromCloud(): Promise<Store | null> {
  if (!currentUserId) return null;
  const { data } = await loadStoreFromCloud(currentUserId);
  return data;
}

// --- Persistence with debounce ---

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function persistToStorage(s: Store) {
  if (saveTimer !== null) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    localStorage.setItem(KEY, JSON.stringify(s));
    lastSavedAt = Date.now();
    savedListeners.forEach((l) => l());
    saveTimer = null;
  }, DEBOUNCE_MS);
  // Also persist to cloud
  persistToCloud(s);
}

function loadFromStorage(): Store {
  if (typeof window === "undefined") return defaultStore;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultStore;
    return JSON.parse(raw) as Store;
  } catch {
    return defaultStore;
  }
}

// --- Store singleton ---

let current: Store = defaultStore;
let listeners: Set<() => void> = new Set();

// Initialize on module load (client only)
if (typeof window !== "undefined") {
  current = loadFromStorage();
}

function getSnapshot(): Store {
  return current;
}

function getServerSnapshot(): Store {
  return defaultStore;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setStore(updater: (s: Store) => Store) {
  const next = updater(current);
  current = next;
  persistToStorage(next);
  listeners.forEach((l) => l());
}

/**
 * Replace the entire store (used when loading from cloud after login).
 * Also persists to localStorage.
 */
export function replaceStore(s: Store) {
  current = s;
  localStorage.setItem(KEY, JSON.stringify(s));
  lastSavedAt = Date.now();
  listeners.forEach((l) => l());
  savedListeners.forEach((l) => l());
}

// --- "Last saved" tracking ---

let lastSavedAt: number = Date.now();
let savedListeners: Set<() => void> = new Set();

function getSavedSnapshot(): number {
  return lastSavedAt;
}

function subscribeSaved(listener: () => void): () => void {
  savedListeners.add(listener);
  return () => {
    savedListeners.delete(listener);
  };
}

export function useLastSaved(): number {
  return useSyncExternalStore(subscribeSaved, getSavedSnapshot, () => Date.now());
}

// --- Main hook ---

export function useStore() {
  const store = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { store, setStore };
}

// --- Pure utility functions ---

export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function ensureMonth(store: Store, key: string): MonthData {
  return store.months[key] ?? { expenses: defaultExpenses() };
}

export function formatMonthLabel(d: Date): string {
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

export function getTipoDivisao(
  e: Expense,
  rules?: DivisionRules,
): "igual" | "copasa" {
  if (/copasa/i.test(e.nome)) return "copasa";
  return rules?.[e.nome] ?? e.tipoDivisao ?? "igual";
}

export function listExpenseNames(store: Store): string[] {
  const set = new Set<string>();
  for (const m of Object.values(store.months)) {
    for (const e of m.expenses) if (e.nome.trim()) set.add(e.nome);
  }
  for (const n of Object.keys(store.divisionRules ?? {})) set.add(n);
  for (const e of defaultExpenses()) set.add(e.nome);
  return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export function computeDivision(
  month: MonthData,
  apartments: Apartment[],
  rules?: DivisionRules,
) {
  const total = month.expenses.reduce((s, e) => s + (Number(e.valor) || 0), 0);
  const totalIndice =
    apartments.reduce((s, a) => s + (Number(a.indiceCopasa) || 0), 0) || 1;
  const n = apartments.length || 1;

  const perApt = apartments.map((apt) => {
    let valor = 0;
    for (const e of month.expenses) {
      const v = Number(e.valor) || 0;
      if (getTipoDivisao(e, rules) === "copasa") {
        valor += v * ((Number(apt.indiceCopasa) || 0) / totalIndice);
      } else {
        valor += v / n;
      }
    }
    return { apartment: apt, valor };
  });

  return { total, perApt };
}
