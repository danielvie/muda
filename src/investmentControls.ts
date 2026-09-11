import type { Bounds } from "./financingControls.ts";
import { normalizeControlRange, type ControlSpec } from "./financingGesture.ts";
import { brl } from "./format.ts";
import { parseMathExpression } from "./mathInput.ts";

export const INVESTMENT_FIELDS = [
  { key: "saldoInicial", label: "Saldo inicial", unit: "R$", monetary: true, step: 1000, min: 0, max: Number.MAX_SAFE_INTEGER, focusHalfWidth: 100000 },
  { key: "aporteMensal", label: "Aporte mensal", unit: "R$", monetary: true, step: 100, min: 0, max: Number.MAX_SAFE_INTEGER, focusHalfWidth: 1000 },
  { key: "taxaInvestAnual", label: "Taxa anual", unit: "% a.a.", monetary: false, step: 0.1, min: -99.9, max: 100 },
  { key: "mesesProj", label: "Período", unit: "meses", monetary: false, step: 1, min: 0, max: 1200 },
] as const;
export type InvestmentField = typeof INVESTMENT_FIELDS[number]["key"];
export type InvestmentPeriodUnit = "months" | "years";
export type InvestmentFields = Record<InvestmentField, string>;
export type InvestmentRanges = Record<InvestmentField, Bounds>;
export const DEFAULT_INVESTMENT_VALUES: InvestmentFields = { saldoInicial: "50000", aporteMensal: "2000", taxaInvestAnual: "10", mesesProj: "24" };
export const DEFAULT_INVESTMENT_RANGES: InvestmentRanges = {
  saldoInicial: { min: 0, max: 1000000 }, aporteMensal: { min: 0, max: 20000 },
  taxaInvestAnual: { min: 0, max: 20 }, mesesProj: { min: 0, max: 480 },
};
export function validInvestmentValue(field: InvestmentField, value: unknown): value is number {
  const spec = INVESTMENT_FIELDS.find(item => item.key === field)!;
  return typeof value === "number" && Number.isFinite(value) && value >= spec.min && value <= spec.max
    && (field !== "mesesProj" || Number.isInteger(value));
}
/** Keep both legacy en-US money strings and Brazilian input, without silently stripping letters. */
function parseInvestmentNumber(raw: string, monetary: boolean): number | null {
  const text = raw.trim().replace(/^R\$\s*/, "").replace(/\s/g, "");
  if (!text) return null;
  let value: number | null;
  if (/^[+-]?\d{1,3}(\.\d{3})+,\d+$/.test(text) || monetary && /^[+-]?\d{1,3}(\.\d{3})+$/.test(text)) {
    value = Number(text.replace(/\./g, "").replace(",", "."));
  } else if (/^[+-]?\d{1,3}(,\d{3})+\.\d+$/.test(text) || monetary && /^[+-]?\d{1,3}(,\d{3})+$/.test(text)) {
    value = Number(text.replace(/,/g, ""));
  } else if (/^[+-]?(\d+([.,]\d*)?|[.,]\d+)$/.test(text)) {
    value = Number(text.replace(",", "."));
  } else value = parseMathExpression(raw);
  return value !== null && Number.isFinite(value) ? value : null;
}
export function parseInvestmentInput(field: InvestmentField, raw: string): number | null {
  const value = parseInvestmentNumber(raw, field === "saldoInicial" || field === "aporteMensal");
  return validInvestmentValue(field, value) ? value : null;
}
/** Display units never change the canonical number of whole months. */
export function parseInvestmentPeriod(raw: string, unit: InvestmentPeriodUnit): number | null {
  const value = parseInvestmentNumber(raw, false);
  if (value === null) return null;
  const months = unit === "years" ? value * 12 : value;
  if (months < 0 || months > 1200) return null;
  const rounded = Math.round(months);
  return Math.abs(months - rounded) < 1e-6 && validInvestmentValue("mesesProj", rounded) ? rounded : null;
}
export function investmentPeriodInput(months: number, unit: InvestmentPeriodUnit): string {
  return String(unit === "years" ? Number((months / 12).toFixed(8)) : months);
}
export function formatInvestmentPeriod(months: number, unit: InvestmentPeriodUnit): string {
  const value = unit === "years" ? months / 12 : months;
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 4 })} ${unit === "years" ? value === 1 ? "ano" : "anos" : value === 1 ? "mês" : "meses"}`;
}
export function investmentControlSpec(field: InvestmentField, value: number): ControlSpec {
  const spec = INVESTMENT_FIELDS.find(item => item.key === field)!;
  return { ...spec, value };
}
export function investmentRange(field: InvestmentField, bounds: Bounds, value: number): Bounds {
  return normalizeControlRange(bounds, investmentControlSpec(field, value));
}
export function formatInvestmentValue(field: InvestmentField, value: number): string {
  if (field === "saldoInicial" || field === "aporteMensal") return brl(value);
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 8 })}${field === "taxaInvestAnual" ? "% a.a." : " meses"}`;
}
export function investmentInputError(field: InvestmentField): string {
  const spec = INVESTMENT_FIELDS.find(item => item.key === field)!;
  return field === "mesesProj" ? "Informe de 0 a 1.200 meses inteiros."
    : field === "taxaInvestAnual" ? "Informe uma taxa entre -99,9% e 100% a.a."
    : `Informe um valor entre R$ 0 e ${brl(spec.max)}.`;
}
