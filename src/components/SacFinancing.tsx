import React from "react";
import { useMemory } from "../memory.tsx";
import { buildSacProjection } from "../sacProjection";
import { commitExprString, formatMoneyOnBlur } from "../mathInput";
import { formatNumber, toNumber } from "../format";
import YearBlockList from "./YearBlockList.tsx";

export default function SacFinancing() {
  const { fields, updateField } = useMemory();
  const projection = buildSacProjection(fields);
  const fillPercentEntry = (value: number) => {
    const valorImovel = toNumber(fields.valorImovel);
    if (!Number.isFinite(valorImovel)) return;
    updateField("entrada", formatNumber(valorImovel * value));
  };
  
  const fillPrazoEntry = (value: number) => {
    updateField("prazoMeses", `${value}`);
  };

  return (
    <section className="bg-surface border border-border rounded-lg p-4" aria-labelledby="sac-title">
      <h2 id="sac-title" className="m-0 text-sm font-semibold text-text-heading tracking-tight">
        Financiamento SAC (resumo)
      </h2>

      <div className="mt-3 grid grid-cols-2 gap-3 min-w-0 max-md:grid-cols-1">
        <label className="field">
          <span className="field-label">Valor do imóvel (R$)</span>
          <input
            className="input-field"
            type="text"
            value={fields.valorImovel}
            onChange={(e) => updateField("valorImovel", e.target.value)}
            onBlur={() => formatMoneyOnBlur(fields.valorImovel, (v) => updateField("valorImovel", v))}
          />
        </label>

        <label className="field">
          <span className="field-label field-label-action">
            Entrada (R$)
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
          </span>
          <input
            className="input-field"
            type="text"
            value={fields.entrada}
            onChange={(e) => updateField("entrada", e.target.value)}
            onBlur={() => formatMoneyOnBlur(fields.entrada, (v) => updateField("entrada", v))}
          />
        </label>

        <label className="field">
          <span className="field-label">Taxa anual (%)</span>
          <input
            className="input-field"
            type="number"
            step="0.1"
            value={fields.taxaFinAnual}
            onChange={(e) => updateField("taxaFinAnual", Number(e.target.value))}
          />
        </label>

        <label className="field">
          <span className="field-label field-label-action">Prazo (meses)
            <div className="flex gap-2">
              <button className="field-chip" type="button" onClick={() => fillPrazoEntry(300)}>
                25 a
              </button>
              <button className="field-chip" type="button" onClick={() => fillPrazoEntry(360)}>
                30 a
              </button>
              <button className="field-chip" type="button" onClick={() => fillPrazoEntry(420)}>
                35 a
              </button>
            </div>
          </span>
          <input
          className="input-field"
          type="text"
          value={fields.prazoMeses}
          onChange={(e) => updateField("prazoMeses", e.target.value)}
          onBlur={() =>
            commitExprString(fields.prazoMeses, (v) => updateField("prazoMeses", v), { int: true, min: 1 })
          }
          onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
          />
        </label>
      </div>

      <div className="mt-3 p-3 rounded-md bg-surface-alt border border-border">
        {projection ? (
          <>
            <div className="grid grid-cols-2 gap-2.5 min-w-0 max-md:grid-cols-1">
              <div className="metric">
                <div className="metric-label">Financiado (PV)</div>
                <div className="metric-value">{projection.metrics.pv}</div>
              </div>
              <div className="metric">
                <div className="metric-label">Amortização</div>
                <div className="metric-value">{projection.metrics.amortizacao}</div>
              </div>
              <div className="metric">
                <div className="metric-label">Prestação mês 1</div>
                <div className="metric-value text-warm">{projection.metrics.prestacaoMes1}</div>
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
