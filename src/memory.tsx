import React, { createContext, useContext, useState, useEffect } from "react";
import type { Bounds } from "./financingControls.ts";
import { DEFAULT_INVESTMENT_VALUES, type InvestmentField, type InvestmentRanges, type InvestmentPeriodUnit } from "./investmentControls.ts";
import { applyInvestmentDefaults, readInvestmentValues, readInvestmentRanges, resolveInvestmentRanges, saveInvestmentValue, saveInvestmentRange, readInvestmentPeriodUnit, saveInvestmentPeriodUnit, type InvestmentValuePreferences, type InvestmentRangePreferences } from "./investmentPreferences.ts";
import type { PreferenceActionResult } from "./preferenceResult.ts";

const storageKey = "muda:fields";
const historyStorageKey = "muda:field-history";

export type FieldMemory = {
  saldoInicial: string;
  aporteMensal: string;
  taxaInvestAnual: string;
  mesesProj: string;
  valorImovel: string;
  entrada: string;
  taxaFinAnual: string;
  prazoMeses: string;
  metodoAmortizacao: "SAC" | "PRICE";
};

type FieldHistory = Partial<Record<keyof FieldMemory, string[]>>;

const defaults: FieldMemory = {
  ...DEFAULT_INVESTMENT_VALUES,
  valorImovel: "800000",
  entrada: "180000",
  taxaFinAnual: "12",
  prazoMeses: "420",
  metodoAmortizacao: "SAC",
};

function readSavedMemory(): FieldMemory {
  let fields = { ...defaults };
  try {
    const raw = globalThis.localStorage.getItem(storageKey);
    if (raw) fields = { ...fields, ...JSON.parse(raw) };
  } catch {}
  for (const key of Object.keys(DEFAULT_INVESTMENT_VALUES) as InvestmentField[]) {
    if (typeof fields[key] !== "string") fields[key] = defaults[key];
  }
  return applyInvestmentDefaults(fields, readInvestmentValues());
}

function readSavedHistory(): FieldHistory {
  if (typeof localStorage === "undefined") return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(historyStorageKey) ?? "{}") as FieldHistory;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

type MemoryContextType = {
  fields: FieldMemory;
  fieldHistory: FieldHistory;
  updateField: <K extends keyof FieldMemory>(key: K, value: FieldMemory[K]) => void;
  rememberFieldValue: <K extends keyof FieldMemory>(key: K, value: FieldMemory[K]) => void;
  investmentControls: {
    selected: InvestmentField;
    periodUnit: InvestmentPeriodUnit;
    setPeriodUnit: (unit: InvestmentPeriodUnit) => PreferenceActionResult;
    select: (field: InvestmentField) => void;
    ranges: InvestmentRanges;
    setRange: (field: InvestmentField, bounds: Bounds) => void;
    valuePreferences: InvestmentValuePreferences;
    rangePreferences: InvestmentRangePreferences;
    saveValue: (field: InvestmentField, value: number | null) => PreferenceActionResult;
    saveRange: (field: InvestmentField, bounds: Bounds | null) => PreferenceActionResult;
  };
};

const MemoryContext = createContext<MemoryContextType | null>(null);

export function MemoryProvider({ children }: { children: React.ReactNode }) {
  const [fields, setFields] = useState<FieldMemory>(readSavedMemory);
  const [fieldHistory, setFieldHistory] = useState<FieldHistory>(readSavedHistory);
  const [selected, select] = useState<InvestmentField>("saldoInicial");
  const [periodUnit, setPeriodUnit] = useState(readInvestmentPeriodUnit);
  const [valuePreferences, setValuePreferences] = useState(readInvestmentValues);
  const [rangePreferences, setRangePreferences] = useState(readInvestmentRanges);
  const [ranges, setRanges] = useState(() => resolveInvestmentRanges(rangePreferences));
  const investmentControls: MemoryContextType["investmentControls"] = {
    selected, select, periodUnit, ranges, valuePreferences, rangePreferences,
    setPeriodUnit: unit => {
      setPeriodUnit(unit);
      return saveInvestmentPeriodUnit(unit);
    },
    setRange: (field, bounds) => setRanges(previous => ({ ...previous, [field]: bounds })),
    saveValue: (field, value) => {
      const result = saveInvestmentValue(field, value);
      if (result.ok) setValuePreferences(result.preferences);
      return result;
    },
    saveRange: (field, bounds) => {
      const result = saveInvestmentRange(field, bounds);
      if (result.ok) setRangePreferences(result.preferences);
      return result;
    },
  };

  useEffect(() => {
    try { globalThis.localStorage.setItem(storageKey, JSON.stringify(fields)); } catch {}
  }, [fields]);

  useEffect(() => {
    try { globalThis.localStorage.setItem(historyStorageKey, JSON.stringify(fieldHistory)); } catch {}
  }, [fieldHistory]);

  const updateField = <K extends keyof FieldMemory>(key: K, value: FieldMemory[K]) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  const rememberFieldValue = <K extends keyof FieldMemory>(key: K, value: FieldMemory[K]) => {
    const normalized = String(value).trim();
    if (!normalized) return;

    setFieldHistory((prev) => ({
      ...prev,
      [key]: [normalized, ...(prev[key] ?? []).filter((item) => item !== normalized)].slice(0, 3),
    }));
  };

  return (
    <MemoryContext.Provider value={{ fields, fieldHistory, updateField, rememberFieldValue, investmentControls }}>
      {children}
    </MemoryContext.Provider>
  );
}

export function useMemory() {
  const ctx = useContext(MemoryContext);
  if (!ctx) throw new Error("useMemory must be used within MemoryProvider");
  return ctx;
}
