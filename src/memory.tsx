import React, { createContext, useContext, useState, useEffect } from "react";

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
  saldoInicial: "50000",
  aporteMensal: "2000",
  taxaInvestAnual: "10",
  mesesProj: "24",
  valorImovel: "800000",
  entrada: "180000",
  taxaFinAnual: "12",
  prazoMeses: "420",
  metodoAmortizacao: "SAC",
};

function readSavedMemory(): FieldMemory {
  if (typeof localStorage === "undefined") return { ...defaults };
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      return { ...defaults, ...JSON.parse(raw) };
    }
  } catch {}
  return { ...defaults };
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
};

const MemoryContext = createContext<MemoryContextType | null>(null);

export function MemoryProvider({ children }: { children: React.ReactNode }) {
  const [fields, setFields] = useState<FieldMemory>(readSavedMemory);
  const [fieldHistory, setFieldHistory] = useState<FieldHistory>(readSavedHistory);

  useEffect(() => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(storageKey, JSON.stringify(fields));
    }
  }, [fields]);

  useEffect(() => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(historyStorageKey, JSON.stringify(fieldHistory));
    }
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
    <MemoryContext.Provider value={{ fields, fieldHistory, updateField, rememberFieldValue }}>
      {children}
    </MemoryContext.Provider>
  );
}

export function useMemory() {
  const ctx = useContext(MemoryContext);
  if (!ctx) throw new Error("useMemory must be used within MemoryProvider");
  return ctx;
}
