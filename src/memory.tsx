import React, { createContext, useContext, useState, useEffect } from "react";

const storageKey = "muda:fields";

export type FieldMemory = {
  saldoInicial: string;
  aporteMensal: string;
  taxaInvestAnual: number;
  mesesProj: string;
  valorImovel: string;
  entrada: string;
  taxaFinAnual: number;
  prazoMeses: string;
};

const defaults: FieldMemory = {
  saldoInicial: "50000",
  aporteMensal: "2000",
  taxaInvestAnual: 10,
  mesesProj: "24",
  valorImovel: "800000",
  entrada: "180000",
  taxaFinAnual: 12,
  prazoMeses: "360",
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

type MemoryContextType = {
  fields: FieldMemory;
  updateField: <K extends keyof FieldMemory>(key: K, value: FieldMemory[K]) => void;
};

const MemoryContext = createContext<MemoryContextType | null>(null);

export function MemoryProvider({ children }: { children: React.ReactNode }) {
  const [fields, setFields] = useState<FieldMemory>(readSavedMemory);

  useEffect(() => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(storageKey, JSON.stringify(fields));
    }
  }, [fields]);

  const updateField = <K extends keyof FieldMemory>(key: K, value: FieldMemory[K]) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <MemoryContext.Provider value={{ fields, updateField }}>
      {children}
    </MemoryContext.Provider>
  );
}

export function useMemory() {
  const ctx = useContext(MemoryContext);
  if (!ctx) throw new Error("useMemory must be used within MemoryProvider");
  return ctx;
}
