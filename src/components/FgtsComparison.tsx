import React from "react";
import { brl } from "../format.ts";
import {
  FGTS_DEPOSIT_RATE,
  type FgtsComparison as FgtsComparisonData,
  type FgtsMethodProjection,
} from "../fgtsSchedule.ts";

function formatMonths(months: number) {
  if (months <= 0) return "Quitado";
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (years === 0) return `${remainingMonths} meses`;
  if (remainingMonths === 0) return `${years} anos`;
  return `${years} anos e ${remainingMonths} meses`;
}

function formatValue(value: number | undefined) {
  return value === undefined ? "-" : brl(value);
}

function formatUses(count: number) {
  return `${count} ${count === 1 ? "vez" : "vezes"}`;
}

function MethodCard({ projection }: { projection: FgtsMethodProjection }) {
  return (
    <article className="grid gap-2 rounded-[7px] border border-(--lp-line) bg-(--lp-paper) p-3">
      <div className="flex items-baseline justify-between gap-2">
        <h4 className="text-sm font-black text-(--lp-heading)">{projection.metodo}</h4>
        <span className="text-[11px] font-bold uppercase tracking-wider text-(--lp-muted)">amortização em prazo</span>
      </div>
      <dl className="grid grid-cols-2 gap-2">
        <div className="rounded-[7px] bg-[color-mix(in_srgb,var(--lp-paper)_88%,var(--lp-line))] p-2">
          <dt className="text-[10px] font-bold uppercase tracking-[0.04em] text-(--lp-muted)">Prazo final</dt>
          <dd className="mt-1 text-sm font-black text-(--lp-heading)">{formatMonths(projection.prazoFinalMeses)}</dd>
        </div>
        <div className="rounded-[7px] bg-[color-mix(in_srgb,var(--lp-paper)_88%,var(--lp-line))] p-2">
          <dt className="text-[10px] font-bold uppercase tracking-[0.04em] text-(--lp-muted)">Juros totais</dt>
          <dd className="mt-1 text-sm font-black text-(--lp-heading)">{brl(projection.juros)}</dd>
        </div>
        <div className="rounded-[7px] bg-[color-mix(in_srgb,var(--lp-paper)_88%,var(--lp-line))] p-2">
          <dt className="text-[10px] font-bold uppercase tracking-[0.04em] text-(--lp-muted)">FGTS usado</dt>
          <dd className="mt-1 text-sm font-black text-(--lp-heading)">{brl(projection.fgtsAmortizacao)}</dd>
        </div>
        <div className="rounded-[7px] bg-[color-mix(in_srgb,var(--lp-paper)_88%,var(--lp-line))] p-2">
          <dt className="text-[10px] font-bold uppercase tracking-[0.04em] text-(--lp-muted)">Prestações Pagas</dt>
          <dd className="mt-1 text-sm font-black text-(--lp-heading)">{brl(projection.prestacoes)}</dd>
        </div>
        <div className="rounded-[7px] bg-[color-mix(in_srgb,var(--lp-paper)_88%,var(--lp-line))] p-2">
          <dt className="text-[10px] font-bold uppercase tracking-[0.04em] text-(--lp-muted)">Acionamentos FGTS</dt>
          <dd className="mt-1 text-sm font-black text-(--lp-heading)">{formatUses(projection.fgtsAcionamentos)}</dd>
        </div>
        <div className="rounded-[7px] bg-[color-mix(in_srgb,var(--lp-paper)_88%,var(--lp-line))] p-2">
          <dt className="text-[10px] font-bold uppercase tracking-[0.04em] text-(--lp-muted)">Valor efetivo do imóvel</dt>
          <dd className="mt-1 text-[clamp(14px,4vw,18px)] font-black text-(--lp-heading)">{brl(projection.valorEfetivoImovel)}</dd>
        </div>
      </dl>
      <p className="text-[11px] leading-[1.35] text-(--lp-muted)">
        Valor efetivo = entrada + prestações pagas + FGTS aplicado. Não inclui taxas ou custos de posse.
      </p>
      {projection.fgtsNaoUtilizado > 0.005 && (
        <p className="text-[11px] leading-[1.35] text-(--lp-muted)">
          FGTS estimado não utilizado ao quitar: {brl(projection.fgtsNaoUtilizado)}.
        </p>
      )}
    </article>
  );
}

type FgtsComparisonProps = {
  comparison: FgtsComparisonData | null;
  salary: number;
  salaryGrowth: number;
  onSalaryChange: (salary: number) => void;
  onSalaryGrowthChange: (salaryGrowth: number) => void;
};

export default function FgtsComparison({
  comparison,
  salary,
  salaryGrowth,
  onSalaryChange,
  onSalaryGrowthChange,
}: FgtsComparisonProps) {
  return (
    <section className="grid gap-3 rounded-[10px] border border-(--lp-line) bg-[color-mix(in_srgb,var(--lp-paper)_80%,var(--lp-accent)_5%)] p-3.5" aria-labelledby="fgts-comparison-title">
      <header className="grid gap-1">
        <span className="text-(--lp-muted) text-[9px] font-black tracking-[.14em] uppercase">SUB-SIMULAÇÃO · FGTS</span>
        <h3 id="fgts-comparison-title" className="text-[18px] font-black tracking-tight text-(--lp-heading)">Amortização com FGTS</h3>
        <p className="text-[11px] leading-[1.4] text-(--lp-muted)">
          Simule o uso do FGTS no financiamento sem alterar os comandos da simulação principal.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 max-[699px]:grid-cols-1">
        <label className="grid gap-1.25">
          <span className="text-(--lp-muted) text-[9px] font-extrabold">Salário mensal bruto</span>
          <div className="flex min-h-12 min-w-0 items-center rounded-[5px] border border-(--lp-line) bg-[color-mix(in_srgb,var(--lp-paper)_76%,transparent)]">
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="100"
              value={salary || ""}
              placeholder="Informe o salário"
              className="w-full min-w-0 border-0 bg-transparent p-[10px_5px_10px_10px] text-(--lp-ink) font-mono text-[13px] font-extrabold outline-0 focus:shadow-[inset_0_0_0_2px_var(--lp-accent)] max-[420px]:text-[12px]"
              onChange={(event) => onSalaryChange(Number(event.currentTarget.value) || 0)}
            />
            <small className="whitespace-nowrap pr-2 text-(--lp-muted) text-[8px]">R$</small>
          </div>
          <small className="text-(--lp-muted) text-[9px] leading-[1.35]">
            FGTS atual estimado: {brl(salary * FGTS_DEPOSIT_RATE)}/mês.
          </small>
        </label>

        <label className="grid gap-1.25">
          <span className="text-(--lp-muted) text-[9px] font-extrabold">Crescimento anual do salário</span>
          <div className="flex min-h-12 min-w-0 items-center rounded-[5px] border border-(--lp-line) bg-[color-mix(in_srgb,var(--lp-paper)_76%,transparent)]">
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.5"
              value={salaryGrowth || ""}
              placeholder="Ex.: 5"
              className="w-full min-w-0 border-0 bg-transparent p-[10px_5px_10px_10px] text-(--lp-ink) font-mono text-[13px] font-extrabold outline-0 focus:shadow-[inset_0_0_0_2px_var(--lp-accent)] max-[420px]:text-[12px]"
              onChange={(event) => onSalaryGrowthChange(Number(event.currentTarget.value) || 0)}
            />
            <small className="whitespace-nowrap pr-2 text-(--lp-muted) text-[8px]">% a.a.</small>
          </div>
          <small className="text-(--lp-muted) text-[9px] leading-[1.35]">
            Inclui dissídio e outros reajustes anuais.
          </small>
        </label>
      </div>

      {comparison ? (
        <ComparisonResults comparison={comparison} />
      ) : (
        <div className="rounded-[7px] border border-dashed border-(--lp-line) bg-(--lp-paper) px-3 py-2.5 text-(--lp-muted) text-[9px] leading-[1.35]">
          Informe o salário para comparar SAC e PRICE com uma estimativa de amortização via FGTS.
        </div>
      )}
    </section>
  );
}

function ComparisonResults({ comparison }: { comparison: FgtsComparisonData }) {
  const differenceInInterest = Math.abs(comparison.sac.juros - comparison.price.juros);
  const lowerInterestMethod = comparison.sac.juros <= comparison.price.juros ? "SAC" : "PRICE";
  const maxYears = Math.max(comparison.sac.yearBlocks.length, comparison.price.yearBlocks.length);

  return (
    <>
      <div className="grid gap-1">
        <p className="text-[11px] leading-[1.4] text-(--lp-muted)">
          O salário cresce {comparison.crescimentoSalarioAnual.toLocaleString("pt-BR")}% ao ano. O saldo acumulado é usado a cada {comparison.intervaloUsoMeses} meses para reduzir o prazo.
        </p>
        <p className="text-[11px] font-bold text-(--lp-muted)">
          FGTS no primeiro ano: {brl(comparison.fgtsMensalEstimado)} por mês · {brl(comparison.fgtsMensalEstimado * 12)} por ano.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 min-w-0 max-[699px]:grid-cols-1">
        <MethodCard projection={comparison.sac} />
        <MethodCard projection={comparison.price} />
      </div>

      <div className="rounded-[7px] border border-(--lp-line) bg-[color-mix(in_srgb,var(--lp-paper)_88%,var(--lp-line))] p-3 text-xs leading-[1.4] text-(--lp-heading)">
        Nesta simulação, <strong>{lowerInterestMethod}</strong> paga menos juros por {brl(differenceInInterest)}.
      </div>

      <details className="group">
        <summary className="cursor-pointer select-none rounded-[7px] border border-(--lp-line) bg-(--lp-paper) px-3 py-3 text-center text-xs font-bold uppercase tracking-wider text-(--lp-heading) transition-colors hover:border-(--lp-accent) hover:bg-[color-mix(in_srgb,var(--lp-accent)_10%,var(--lp-paper))] list-none [&::-webkit-details-marker]:hidden">
          Ver evolução anual do FGTS e do saldo devedor
        </summary>
        <div className="mt-3 overflow-x-auto rounded-[7px] border border-(--lp-line) bg-(--lp-paper)">
          <table className="w-full min-w-175 border-collapse text-left text-[11px]">
            <thead className="bg-[color-mix(in_srgb,var(--lp-paper)_88%,var(--lp-line))] text-[10px] uppercase tracking-[0.04em] text-(--lp-muted)">
              <tr>
                <th className="px-3 py-2 font-bold">Ano</th>
                <th className="px-3 py-2 font-bold">Saldo SAC</th>
                <th className="px-3 py-2 font-bold">Saldo PRICE</th>
                <th className="px-3 py-2 font-bold">Juros SAC</th>
                <th className="px-3 py-2 font-bold">Juros PRICE</th>
                <th className="px-3 py-2 font-bold">FGTS SAC</th>
                <th className="px-3 py-2 font-bold">FGTS PRICE</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: maxYears }, (_, index) => {
                const sacBlock = comparison.sac.yearBlocks[index];
                const priceBlock = comparison.price.yearBlocks[index];
                return (
                  <tr key={index + 1} className="border-t border-(--lp-line)">
                    <td className="px-3 py-2 font-bold text-(--lp-heading)">{index + 1}</td>
                    <td className="px-3 py-2 text-(--lp-heading)">{formatValue(sacBlock?.saldoFinal)}</td>
                    <td className="px-3 py-2 text-(--lp-heading)">{formatValue(priceBlock?.saldoFinal)}</td>
                    <td className="px-3 py-2 text-(--lp-heading)">{formatValue(sacBlock?.juros)}</td>
                    <td className="px-3 py-2 text-(--lp-heading)">{formatValue(priceBlock?.juros)}</td>
                    <td className="px-3 py-2 text-(--lp-heading)">{formatValue(sacBlock?.fgtsAmortizacao)}</td>
                    <td className="px-3 py-2 text-(--lp-heading)">{formatValue(priceBlock?.fgtsAmortizacao)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}
