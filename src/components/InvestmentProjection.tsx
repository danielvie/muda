import React from "react";
import { useMemory } from "../memory.tsx";
import { buildInvestmentProjection } from "../investmentProjection";
import { commitExprString, formatMoneyOnBlur } from "../mathInput";

export default function InvestmentProjection() {
  const { fields, updateField } = useMemory();
  const projection = buildInvestmentProjection(fields);

  return (
    <section className="bg-surface border border-border rounded-lg p-4" aria-labelledby="inv-title">
      <h2 id="inv-title" className="m-0 text-sm font-semibold text-text-heading tracking-tight">
        Projeção de investimento
      </h2>

      <div className="mt-3 grid grid-cols-2 gap-3 min-w-0 max-md:grid-cols-1">
        <label className="field">
          <span className="field-label">Saldo inicial (R$)</span>
          <input
            className="input-field"
            type="text"
            value={fields.saldoInicial}
            onChange={(e) => updateField("saldoInicial", e.target.value)}
            onBlur={() => formatMoneyOnBlur(fields.saldoInicial, (v) => updateField("saldoInicial", v))}
          />
        </label>

        <label className="field">
          <span className="field-label">Aporte mensal (R$)</span>
          <input
            className="input-field"
            type="text"
            value={fields.aporteMensal}
            onChange={(e) => updateField("aporteMensal", e.target.value)}
            onBlur={() => formatMoneyOnBlur(fields.aporteMensal, (v) => updateField("aporteMensal", v))}
          />
        </label>

        <label className="field">
          <span className="field-label">Taxa anual (%)</span>
          <input
            className="input-field"
            type="number"
            step="0.1"
            value={fields.taxaInvestAnual}
            onChange={(e) => updateField("taxaInvestAnual", Number(e.target.value))}
          />
        </label>

        <label className="field">
          <span className="field-label">Meses para projetar</span>
          <input
            className="input-field"
            type="text"
            value={fields.mesesProj}
            onChange={(e) => updateField("mesesProj", e.target.value)}
            onBlur={() =>
              commitExprString(fields.mesesProj, (v) => updateField("mesesProj", v), { int: true, min: 0 })
            }
            onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
          />
        </label>
      </div>

      <div className="mt-3 p-3 rounded-md bg-surface-alt border border-border">
        {projection ? (
          <div className="grid grid-cols-3 gap-2.5 min-w-0 max-md:grid-cols-1">
            <div className="metric">
              <div className="metric-label">Saldo final</div>
              <div className="metric-value">{projection.metrics.saldoFinal}</div>
            </div>
            <div className="metric">
              <div className="metric-label">Total aportado</div>
              <div className="metric-value">{projection.metrics.totalAportado}</div>
            </div>
            <div className="metric">
              <div className="metric-label">Ganho</div>
              <div className="metric-value text-positive">{projection.metrics.ganho}</div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-text-muted">Preencha os campos com números.</div>
        )}
      </div>
    </section>
  );
}
