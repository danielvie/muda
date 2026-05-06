import React, { useMemo } from "react";
import { useMemory } from "../memory.tsx";
import { buildInvestmentProjection } from "../investmentProjection";
import { commitExprString, formatMoneyOnBlur } from "../mathInput";
import { toNumber } from "../format";

function sortHistoryByNumber(values: string[]) {
  return [...values].sort((a, b) => toNumber(a) - toNumber(b));
}

function formatThousandsLabel(value: string) {
  const numberValue = toNumber(value);
  if (!Number.isFinite(numberValue)) return value;

  const thousands = numberValue / 1000;
  const label = Number.isInteger(thousands) ? String(thousands) : String(Number(thousands.toFixed(1)));
  return `${label}k`;
}

function formatPercentLabel(value: string) {
  const numberValue = toNumber(value);
  if (!Number.isFinite(numberValue)) return value;

  const label = Number.isInteger(numberValue) ? String(numberValue) : String(Number(numberValue.toFixed(2)));
  return `${label}%`;
}

export default function InvestmentProjection() {
  const { fields, fieldHistory, updateField, rememberFieldValue } = useMemory();
  const projection = buildInvestmentProjection(fields);
  const saldoInicialHistory = useMemo(() => sortHistoryByNumber(fieldHistory.saldoInicial ?? []), [fieldHistory.saldoInicial]);
  const aporteMensalHistory = useMemo(() => sortHistoryByNumber(fieldHistory.aporteMensal ?? []), [fieldHistory.aporteMensal]);
  const taxaInvestHistory = useMemo(() => sortHistoryByNumber(fieldHistory.taxaInvestAnual ?? []), [fieldHistory.taxaInvestAnual]);
  const mesesProjHistory = useMemo(() => sortHistoryByNumber(fieldHistory.mesesProj ?? []), [fieldHistory.mesesProj]);

  const commitMoneyField = (key: "saldoInicial" | "aporteMensal") => {
    formatMoneyOnBlur(fields[key], (value) => {
      updateField(key, value);
      rememberFieldValue(key, value);
    });
  };

  const commitTaxaInvest = () => {
    updateField("taxaInvestAnual", fields.taxaInvestAnual);
    rememberFieldValue("taxaInvestAnual", fields.taxaInvestAnual);
  };

  const commitMesesProj = () => {
    commitExprString(fields.mesesProj, (value) => {
      updateField("mesesProj", value);
      rememberFieldValue("mesesProj", value);
    }, { int: true, min: 0 });
  };

  return (
    <section className="p-4" aria-labelledby="inv-title">
      <h2 id="inv-title" className="sr-only">Investimento</h2>

      <div className="grid gap-3 min-w-0">
        {/* Saldo + Aporte side by side */}
        <div className="grid grid-cols-2 gap-3 min-w-0 max-sm:grid-cols-1">
          <div className="field">
            <div className="field-label-action flex-wrap">
              <label className="field-label" htmlFor="inv-saldo-inicial">Saldo inicial (R$)</label>
              {saldoInicialHistory.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {saldoInicialHistory.map((value) => (
                    <button className="field-chip" type="button" key={value} onClick={() => updateField("saldoInicial", value)}>
                      {formatThousandsLabel(value)}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input
              id="inv-saldo-inicial"
              className="input-field"
              type="text"
              value={fields.saldoInicial}
              onChange={(e) => updateField("saldoInicial", e.target.value)}
              onBlur={() => commitMoneyField("saldoInicial")}
              onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
            />
          </div>

          <div className="field">
            <div className="field-label-action flex-wrap">
              <label className="field-label" htmlFor="inv-aporte-mensal">Aporte mensal (R$)</label>
              {aporteMensalHistory.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {aporteMensalHistory.map((value) => (
                    <button className="field-chip" type="button" key={value} onClick={() => updateField("aporteMensal", value)}>
                      {formatThousandsLabel(value)}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input
              id="inv-aporte-mensal"
              className="input-field"
              type="text"
              value={fields.aporteMensal}
              onChange={(e) => updateField("aporteMensal", e.target.value)}
              onBlur={() => commitMoneyField("aporteMensal")}
              onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
            />
          </div>
        </div>

        {/* Taxa + Periodo side by side */}
        <div className="grid grid-cols-2 gap-3 min-w-0 max-sm:grid-cols-1">
          <div className="field">
            <div className="field-label-action flex-wrap">
              <label className="field-label" htmlFor="inv-taxa-anual">Taxa anual (%)</label>
              {taxaInvestHistory.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {taxaInvestHistory.map((value) => (
                    <button className="field-chip" type="button" key={value} onClick={() => updateField("taxaInvestAnual", toNumber(value))}>
                      {formatPercentLabel(value)}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input
              id="inv-taxa-anual"
              className="input-field"
              type="number"
              step="0.1"
              value={fields.taxaInvestAnual}
              onChange={(e) => updateField("taxaInvestAnual", Number(e.target.value))}
              onBlur={commitTaxaInvest}
            />
          </div>

          <div className="field">
            <div className="field-label-action flex-wrap">
              <label className="field-label" htmlFor="inv-meses-proj">Meses para projetar</label>
              {mesesProjHistory.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {mesesProjHistory.map((value) => (
                    <button className="field-chip" type="button" key={value} onClick={() => updateField("mesesProj", value)}>
                      {value}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input
              id="inv-meses-proj"
              className="input-field"
              type="text"
              value={fields.mesesProj}
              onChange={(e) => updateField("mesesProj", e.target.value)}
              onBlur={commitMesesProj}
              onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
            />
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="mt-3">
        {projection ? (
          <>
            <div className="metric-highlight">
              <div className="metric-label">Saldo final</div>
              <div className="metric-value" style={{ fontSize: 24 }}>{projection.metrics.saldoFinal}</div>
            </div>
            <div className="grid grid-cols-2 gap-2.5 min-w-0 mt-2.5 max-sm:grid-cols-1">
              <div className="metric">
                <div className="metric-label">Total investido</div>
                <div className="metric-value">{projection.metrics.totalAportado}</div>
              </div>
              <div className="metric">
                <div className="metric-label">Rendimento</div>
                <div className="metric-value text-positive">{projection.metrics.ganho}</div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-xs text-text-muted">Preencha os campos com números.</div>
        )}
      </div>
    </section>
  );
}
