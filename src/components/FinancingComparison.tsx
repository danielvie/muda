import type { FinancingState } from "../financingControls.ts";
import type { FgtsComparison as FgtsComparisonData } from "../fgtsSchedule.ts";
import { brl } from "../format.ts";
import { FgtsDetails, FgtsEvolution } from "./FgtsComparison.tsx";
import "./FinancingComparison.css";

// Reuse the corrected projection contract; this component does not calculate schedules.
export type { SacPriceScenarioCalculation as FinancingComparisonScenario } from "../financingProjection.ts";
import type { SacPriceScenarioCalculation as FinancingComparisonScenario } from "../financingProjection.ts";

export type FinancingComparisonProps = {
  state: FinancingState;
  scenario: FinancingComparisonScenario;
  fgtsComparison: FgtsComparisonData | null;
  includeFgts: boolean;
  onIncludeFgtsChange: (enabled: boolean) => void;
  update: (patch: Partial<FinancingState>) => void;
  fgtsMonthlyEstimate: number;
  fgtsIntervalMonths: number;
};

function period(months: number | null) {
  if (months === null) return "Não ocorre no prazo";
  if (months === 0) return "Sem dívida";
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const yearLabel = `${years} ${years === 1 ? "ano" : "anos"}`;
  const monthLabel = `${rest} ${rest === 1 ? "mês" : "meses"}`;
  return years ? `${yearLabel}${rest ? ` e ${monthLabel}` : ""}` : monthLabel;
}

export default function FinancingComparison({
  state, scenario, fgtsComparison, includeFgts, onIncludeFgtsChange, update,
  fgtsMonthlyEstimate, fgtsIntervalMonths,
}: FinancingComparisonProps) {
  const strategies = [
    { name: "SAC", description: "Quota de principal constante; juros caem com o saldo. Reduzir prestação recalcula a quota.", initial: scenario.sac.financingPayment,
      payoff: scenario.sac.schedule.length, interest: scenario.sac.totalInterest, fgts: scenario.sac.fgtsAmortization },
    { name: "PRICE", description: includeFgts && state.fgtsSalary > 0 && state.fgtsMode === "PRESTACAO"
      ? "O FGTS recalcula as próximas prestações." : "Prestação fixa até o acerto final.", initial: scenario.price.financingPayment,
      payoff: scenario.price.schedule.length, interest: scenario.price.totalInterest, fgts: scenario.price.fgtsAmortization },
    { name: "PRICE + diferença", description: "A prestação SAC real é o orçamento. A diferença para o encargo PRICE próprio vira amortização extra.", initial: scenario.differenceSchedule[0]?.payment ?? 0,
      payoff: scenario.payoffMonth, interest: scenario.totalInterest, fgts: scenario.fgtsAmortization },
  ];
  const showFgtsDetails = includeFgts && state.fgtsSalary > 0 && fgtsComparison !== null;

  return (
    <section className="financing-comparison" aria-labelledby="financing-comparison-title">
      <header>
        <p className="comparison-eyebrow">SAC · PRICE · PRICE + diferença</p>
        <h2 id="financing-comparison-title">Comparar estratégias de financiamento</h2>
        <p className="comparison-intro">Compare o desembolso mensal, o prazo de quitação e os juros com as mesmas configurações de FGTS.</p>
      </header>

      <div className="comparison-controls">
        <label className="comparison-toggle">
          <span>Considerar FGTS</span>
          <input type="checkbox" checked={includeFgts} onChange={event => onIncludeFgtsChange(event.currentTarget.checked)} />
        </label>
        {includeFgts ? (
          <>
            <fieldset className="comparison-modes">
              <legend>Como usar o FGTS</legend>
              <div>
                <button type="button" aria-pressed={state.fgtsMode === "PRAZO"} onClick={() => update({ fgtsMode: "PRAZO" })}>
                  <strong>Reduzir prazo</strong><span>Antecipa a quitação. SAC mantém a quota de principal; PRICE mantém o encargo.</span>
                </button>
                <button type="button" aria-pressed={state.fgtsMode === "PRESTACAO"} onClick={() => update({ fgtsMode: "PRESTACAO" })}>
                  <strong>Reduzir prestação</strong><span>Recalcula as próximas prestações pelo prazo restante.</span>
                </button>
              </div>
            </fieldset>
            <div className="comparison-fields">
              <label>Salário mensal bruto
                <div><span>R$</span><input type="number" inputMode="decimal" min="0" step="100" value={state.fgtsSalary || ""} placeholder="Informe o salário" onChange={event => update({ fgtsSalary: Number(event.currentTarget.value) || 0 })} /></div>
              </label>
              <label>Crescimento anual do salário
                <div><input type="number" inputMode="decimal" min="0" step="0.5" value={state.fgtsSalaryGrowth || ""} placeholder="0" onChange={event => update({ fgtsSalaryGrowth: Number(event.currentTarget.value) || 0 })} /><span>% a.a.</span></div>
              </label>
            </div>
            <p className="comparison-note" role="status">{state.fgtsSalary > 0
              ? `FGTS estimado: ${brl(fgtsMonthlyEstimate)}/mês no primeiro ano · uso no fim de cada ${fgtsIntervalMonths} meses, após a prestação.`
              : "Informe o salário para considerar FGTS nas três estratégias. Por enquanto, os resultados não incluem FGTS."}</p>
          </>
        ) : <p className="comparison-note" role="status">Sem FGTS nas três estratégias. Seu salário, crescimento e modo de uso foram preservados.</p>}
      </div>

      <p className="comparison-note">Modelo simplificado de principal e juros, sem TR ou outro indexador, seguros, tarifas e custos de posse. Não é cotação CAIXA nem reproduz seu algoritmo contratual; confira a simulação do contrato.</p>

      <div className="comparison-strategies">
        {strategies.map(strategy => (
          <article className="comparison-strategy" key={strategy.name}>
            <header><h3>{strategy.name}</h3><p>{strategy.description}</p></header>
            <dl>
              <div><dt>Desembolso mensal inicial</dt><dd>{brl(strategy.initial)}</dd></div>
              <div><dt>Quitação</dt><dd>{period(strategy.payoff)}</dd></div>
              <div><dt>Juros totais</dt><dd>{brl(strategy.interest)}</dd></div>
              <div><dt>FGTS aplicado</dt><dd>{brl(strategy.fgts)}</dd></div>
            </dl>
          </article>
        ))}
      </div>

      <details className="comparison-details">
        <summary>Detalhes da comparação</summary>
        <div className="comparison-details-content">
          <section>
            <h3>Prestações e amortização extra</h3>
            <dl className="comparison-detail-stats">
              <div><dt>Última prestação SAC</dt><dd>{brl(scenario.sac.financingPaymentEnd)}</dd></div>
              <div><dt>Amortização extra com recursos próprios · PRICE + diferença</dt><dd>{brl(scenario.extraAmortization)}</dd></div>
              <div><dt>Do bolso no financiamento · PRICE + diferença</dt><dd>{brl(scenario.totalPaid)}</dd></div>
              <div><dt>Total com FGTS, sem entrada · PRICE + diferença</dt><dd>{brl(scenario.totalPaid + scenario.fgtsAmortization)}</dd></div>
              <div><dt>Total com entrada e FGTS · PRICE + diferença</dt><dd>{brl(state.entry + scenario.totalPaid + scenario.fgtsAmortization)}</dd></div>
            </dl>
            <p className="comparison-note">Em PRICE + diferença, o dinheiro do bolso inclui prestações e extras em dinheiro, sem entrada e FGTS. A amortização extra já está nesse total e não deve ser somada novamente.</p>
            <p className="comparison-note">Sem SAC ativa, não há extra. Extras em dinheiro reduzem prazo; no modo reduzir prestação, somente o FGTS recalcula o encargo pelo saldo próprio e prazo restante.</p>
            <p className="comparison-crossing">Primeiro mês SAC ≤ PRICE: <strong>{scenario.equalizationMonth === null ? "sem cruzamento com ambos os financiamentos ativos" : period(scenario.equalizationMonth)}</strong>. Compara prestações reais, incluindo o acerto final. Não indica empate permanente; a relação pode mudar após novos usos do FGTS.</p>
          </section>
          {showFgtsDetails && <FgtsDetails comparison={fgtsComparison} entry={state.entry} />}
          {includeFgts && <p className="comparison-note">Estratégia hipotética de FGTS: saldo inicial zero, depósitos de 8% do salário e reajuste anual informado, sem 13º, remuneração do fundo ou distribuição de resultados. O primeiro uso no mês {fgtsIntervalMonths} é uma hipótese, não uma carência obrigatória. Elegibilidade, saldo disponível, intervalo entre usos e data de pagamento dependem das regras do FGTS e do contrato.</p>}
        </div>
      </details>
      {showFgtsDetails && <FgtsEvolution comparison={fgtsComparison} />}
    </section>
  );
}
