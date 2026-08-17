import { z } from "zod";

const apartmentSchema = z.object({
  id: z.string(),
  numero: z.string(),
  morador: z.string(),
  inquilino: z.string().optional(),
  indiceCopasa: z.number().min(0),
});

const expenseSchema = z.object({
  id: z.string(),
  nome: z.string(),
  valor: z.number().min(0),
  tipoDivisao: z.enum(["igual", "copasa"]),
});

const monthDataSchema = z.object({
  expenses: z.array(expenseSchema),
});

const divisionRulesSchema = z.record(z.string(), z.enum(["igual", "copasa"]));

const responsavelSchema = z.object({
  nome: z.string(),
  telefone: z.string(),
  email: z.string(),
});

export const storeSchema = z.object({
  condoName: z.string().min(1, "Nome do condomínio é obrigatório"),
  apartments: z.array(apartmentSchema),
  months: z.record(z.string(), monthDataSchema),
  divisionRules: divisionRulesSchema.optional(),
  sindico: z.string().optional(),
  responsavel: responsavelSchema.optional(),
  vencimentoDia: z.number().min(1).max(31).optional(),
  fundoReserva: z.number().min(0).optional(),
  fundoObras: z.number().min(0).optional(),
  decimoTerceiroFerias: z.number().min(0).optional(),
});

export type ValidatedStore = z.infer<typeof storeSchema>;
