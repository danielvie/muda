import React, { useMemo, useState } from "react";
import { useMemory } from "../memory.tsx";
import { buildSacProjection } from "../sacProjection.ts";
import { commitExprString, formatMoneyOnBlur } from "../mathInput.ts";
import { formatNumber, toNumber } from "../format.ts";
import YearBlockList from "./YearBlockList.tsx";

const TAX_RATE_MEMORY_KEY = "muda.sac.taxRates.v1";
const DEFAULT_TAX_RATE_MEMORY = [7, 10, 12];

function readTaxRateMemory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(TAX_RATE_MEMORY_KEY) ?? "null") as unknown;
    if (!Array.isArray(parsed)) return DEFAULT_TAX_RATE_MEMORY;

    const rates = parsed.filter((rate): rate is number => Number.isFinite(rate));
    return rates.length > 0 ? rates.slice(-3) : DEFAULT_TAX_RATE_MEMORY;
  } catch {
    return DEFAULT_TAX_RATE_MEMORY;
  }
}

function rememberTaxRate(rates: number[], value: number) {
  if (!Number.isFinite(value)) return rates;

  const normalized = Number(value.toFixed(2));
  const nextRates = [...rates.filter((rate) => rate !== normalized), normalized].slice(-3);
  localStorage.setItem(TAX_RATE_MEMORY_KEY, JSON.stringify(nextRates));
  return nextRates;
}

function formatTaxRateLabel(rate: number) {
  return Number.isInteger(rate) ? String(rate) : String(rate).replace(/0+$/, "").replace(/\.$/, "");
}

function formatValorImovelHistoryLabel(value: string) {
  const numberValue = toNumber(value);
  if (!Number.isFinite(numberValue)) return value;

  const thousands = numberValue / 1000;
  const label = Number.isInteger(thousands) ? String(thousands) : String(Number(thousands.toFixed(1)));
  return `${label}k`;
}

export default function Financiamento() {
  const { fields, fieldHistory, updateField, rememberFieldValue } = useMemory();
  const projection = buildSacProjection(fields);
  const [taxRateMemory, setTaxRateMemory] = useState(readTaxRateMemory);
  const sortedTaxRates = useMemo(() => [...taxRateMemory].sort((a, b) => a - b), [taxRateMemory]);
  const valorImovelHistory = fieldHistory.valorImovel ?? [];
  const sortedValorImovelHistory = useMemo(
    () => [...valorImovelHistory].sort((a, b) => toNumber(a) - toNumber(b)),
    [valorImovelHistory],
  );
  const fillPercentEntry = (value: number) => {
    const valorImovel = toNumber(fields.valorImovel);
    if (!Number.isFinite(valorImovel)) return;
    updateField("entrada", formatNumber(valorImovel * value));
  };
  
  const fillPrazoEntry = (value: number) => {
    updateField("prazoMeses", `${value}`);
  };
  const fillTaxaAnoEntry = (value: number) => {
    updateField("taxaFinAnual", String(value));
    setTaxRateMemory((rates) => rememberTaxRate(rates, value));
  }
  const commitValorImovel = () => {
    formatMoneyOnBlur(fields.valorImovel, (value) => {
      updateField("valorImovel", value);
      rememberFieldValue("valorImovel", value);
    });
  };

  return (
    <section className="p-4" aria-labelledby="sac-title">
      <h2 id="sac-title" className="sr-only">Financiamento</h2>

      <div className="grid gap-3 min-w-0">

        {/* Valor do imóvel - full width */}
        <div className="field">
          <div className="field-label-action flex-wrap">
            <label className="field-label" htmlFor="sac-valor-imovel">Valor do imóvel (R$)</label>
            {sortedValorImovelHistory.length > 0 && (
              <div className="flex gap-1.5 flex-wrap">
                {sortedValorImovelHistory.map((value) => (
                  <button className="field-chip" type="button" key={value} onClick={() => updateField("valorImovel", value)}>
                    {formatValorImovelHistoryLabel(value)}
                  </button>
                ))}
              </div>
            )}
          </div>
          <input
            id="sac-valor-imovel"
            className="input-field"
            type="text"
            value={fields.valorImovel}
            onChange={(e) => updateField("valorImovel", e.target.value)}
            onBlur={commitValorImovel}
            onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
          />
        </div>

        {/* Entrada - full width with chips */}
        <div className="field">
          <div className="field-label-action">
            <label className="field-label" htmlFor="sac-entrada">Entrada (R$)</label>
            <div className="flex gap-2">
              <button className="field-chip" type="button" onClick={() => fillPercentEntry(0.2)}>
                20%
              </button>
              <button className="field-chip" type="button" onClick={() => fillPercentEntry(0.3)}>
                30%
              </button>
              <button className="field-chip" type="button" onClick={() => fillPercentEntry(0.4)}>
                40%
              </button>
            </div>
          </div>
          <input
            id="sac-entrada"
            className="input-field"
            type="text"
            value={fields.entrada}
            onChange={(e) => updateField("entrada", e.target.value)}
            onBlur={() => formatMoneyOnBlur(fields.entrada, (v) => updateField("entrada", v))}
          />
        </div>

        {/* Taxa + Prazo side by side */}
        <div className="grid grid-cols-2 gap-3 min-w-0 max-sm:grid-cols-1">
          <div className="field">
            <div className="field-label-action flex-wrap">
              <label className="field-label" htmlFor="sac-taxa-anual">Taxa anual (%)</label>
              <div className="flex gap-1.5">
                {sortedTaxRates.map((rate) => (
                  <button className="field-chip" type="button" key={rate} onClick={() => fillTaxaAnoEntry(rate)}>
                    {formatTaxRateLabel(rate)}%
                  </button>
                ))}
              </div>
            </div>
            <input
              id="sac-taxa-anual"
              className="input-field"
              type="text"
              value={fields.taxaFinAnual}
              onChange={(e) => updateField("taxaFinAnual", e.target.value)}
              onBlur={() => setTaxRateMemory((rates) => rememberTaxRate(rates, Number(fields.taxaFinAnual)))}
            />
          </div>

          <div className="field">
            <div className="field-label-action flex-wrap">
              <label className="field-label" htmlFor="sac-prazo-meses">Prazo (meses)</label>
              <div className="flex gap-1.5">
                <button className="field-chip" type="button" onClick={() => fillPrazoEntry(300)}>
                  25a
                </button>
                <button className="field-chip" type="button" onClick={() => fillPrazoEntry(360)}>
                  30a
                </button>
                <button className="field-chip" type="button" onClick={() => fillPrazoEntry(420)}>
                  35a
                </button>
              </div>
            </div>
            <input
              id="sac-prazo-meses"
              className="input-field"
              type="text"
              value={fields.prazoMeses}
              onChange={(e) => updateField("prazoMeses", e.target.value)}
              onBlur={() =>
                commitExprString(fields.prazoMeses, (v) => updateField("prazoMeses", v), { int: true, min: 1 })
              }
              onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
            />
          </div>
        </div>
      </div>

        {/* Método - close to results */}
        <div className="field mt-2 pt-2 border-t border-border">
          <label className="field-label">Método de Amortização</label>
          <div className="flex gap-2">
            <button 
              className={`field-chip ${fields.metodoAmortizacao === "SAC" ? "field-chip-active" : ""}`} 
              type="button" 
              onClick={() => updateField("metodoAmortizacao", "SAC")}
            >
              SAC
            </button>
            <button 
              className={`field-chip ${fields.metodoAmortizacao === "PRICE" ? "field-chip-active" : ""}`} 
              type="button" 
              onClick={() => updateField("metodoAmortizacao", "PRICE")}
            >
              PRICE
            </button>
          </div>
        </div>

      {/* Metrics */}
      <div className="mt-3">
        {projection ? (
          <>
            <div className="metric-highlight grid grid-cols-2 gap-3 min-w-0 max-sm:grid-cols-1">
              <div>
                <div className="metric-label">Financiado</div>
                <div className="metric-value">{projection.metrics.pv}</div>
              </div>
              <div>
                <div className="metric-label">Total Pago</div>
                <div className="metric-value">{projection.metrics.totalPago}</div>
              </div>
            </div>
            <div className="metric-highlight grid grid-cols-2 gap-3 min-w-0 max-sm:grid-cols-1 mt-2.5">
              <div>
                <div className="metric-label">
                  {fields.metodoAmortizacao === "SAC" ? "Prestação mês 1" : "Prestação mensal"}
                </div>
                <div className="metric-value">{projection.metrics.prestacaoMes1}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5 min-w-0 mt-2.5 max-sm:grid-cols-1">
              <div className="metric">
                <div className="metric-label">Amortização</div>
                <div className="metric-value text-warm">{projection.metrics.amortizacao}</div>
              </div>
              <div className="metric">
                <div className="metric-label">Última prestação</div>
                <div className="metric-value text-positive">{projection.metrics.prestacaoUltima}</div>
              </div>
            </div>

            <YearBlockList blocks={projection.yearBlocks} />
          </>
        ) : (
          <div className="text-xs text-text-muted">Preencha os campos com números.</div>
        )}
      </div>
    </section>
  );
}
