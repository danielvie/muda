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

export const fieldMemory = $state<FieldMemory>({ ...defaults });

export function loadFieldMemory() {
  if (typeof localStorage === "undefined") return;

  const saved = readSavedMemory();
  if (!saved) return;

  fieldMemory.saldoInicial = saved.saldoInicial ?? defaults.saldoInicial;
  fieldMemory.aporteMensal = saved.aporteMensal ?? defaults.aporteMensal;
  fieldMemory.taxaInvestAnual = saved.taxaInvestAnual ?? defaults.taxaInvestAnual;
  fieldMemory.mesesProj = saved.mesesProj ?? defaults.mesesProj;
  fieldMemory.valorImovel = saved.valorImovel ?? defaults.valorImovel;
  fieldMemory.entrada = saved.entrada ?? defaults.entrada;
  fieldMemory.taxaFinAnual = saved.taxaFinAnual ?? defaults.taxaFinAnual;
  fieldMemory.prazoMeses = saved.prazoMeses ?? defaults.prazoMeses;
}

export function saveFieldMemory() {
  if (typeof localStorage === "undefined") return;

  localStorage.setItem(storageKey, JSON.stringify(fieldMemory));
}

function readSavedMemory(): Partial<FieldMemory> | null {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
