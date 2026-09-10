import type { FinancingState } from "../financingControls.ts";
import type { AmortizationComparison } from "../amortizationComparison.ts";
import type { FgtsComparison as FgtsComparisonData } from "../fgtsSchedule.ts";
import { brl, formatMonths } from "../format.ts";
import { FgtsDetails, FgtsEvolution } from "./FgtsComparison.tsx";
import FinancingCrossing from "./FinancingCrossing.tsx";
import FgtsSalaryField from "./FgtsSalaryField.tsx";
import AmortizationComparisonPanel from "./AmortizationComparisonPanel.tsx";
import "./FinancingComparison.css";

export type { SacPriceScenarioCalculation as FinancingComparisonScenario } from "../financingProjection.ts";
import type { SacPriceScenarioCalculation as FinancingComparisonScenario } from "../financingProjection.ts";

export type FinancingComparisonProps = {
  salaryHidden: boolean;
  onToggleSalaryVisibility: () => void;
  onClearFgtsSalary: () => boolean;
  fgtsMemoryFeedback: { ok: boolean; message: string } | null;
  investmentRate: string;
  investmentRateStorageError: string | null;
  onInvestmentRateChange: (value: string) => void;
  amortizationComparison: AmortizationComparison | null;
  state: FinancingState;
  scenario: FinancingComparisonScenario;
  fgtsComparison: FgtsComparisonData | null;
  includeFgts: boolean;
  onIncludeFgtsChange: (enabled: boolean) => void;
  update: (patch: Partial<FinancingState>) => void;
  fgtsMonthlyEstimate: number;
  fgtsIntervalMonths: number;
};

export default function FinancingComparison({
  state, scenario, fgtsComparison, includeFgts, onIncludeFgtsChange, update,
  fgtsMonthlyEstimate, fgtsIntervalMonths,
  investmentRate, investmentRateStorageError, onInvestmentRateChange, amortizationComparison,
  salaryHidden, onToggleSalaryVisibility, onClearFgtsSalary, fgtsMemoryFeedback,
}: FinancingComparisonProps) {
  const showFgtsDetails = includeFgts && state.fgtsSalary > 0 && fgtsComparison !== null;
  return <section className="financing-comparison" aria-labelledby="financing-comparison-title">
    <header>
      <p className="comparison-eyebrow">FINANCIAMENTO · ESTRATÉGIAS</p>
      <h2 id="financing-comparison-title">Como usar o dinheiro extra?</h2>
      <p className="comparison-intro">Configure o FGTS, consulte SAC e PRICE e depois compare amortizar com investir.</p>
    </header>
    <div className="comparison-controls">
      <label className="comparison-toggle"><span>Considerar FGTS</span><input type="checkbox" checked={includeFgts} onChange={event => onIncludeFgtsChange(event.currentTarget.checked)} /></label>
      {includeFgts ? <>
        <fieldset className="comparison-modes">
          <legend>Como usar o FGTS</legend>
          <div>
            <button type="button" aria-pressed={state.fgtsMode === "PRAZO"} onClick={() => update({ fgtsMode: "PRAZO" })}>
              <strong>Reduzir prazo</strong><span>Mantém a curva original das prestações e usa a economia de juros para antecipar a quitação.</span>
            </button>
            <button type="button" aria-pressed={state.fgtsMode === "PRESTACAO"} onClick={() => update({ fgtsMode: "PRESTACAO" })}>
              <strong>Reduzir prestação</strong><span>Recalcula as próximas prestações pelo prazo restante.</span>
            </button>
          </div>
        </fieldset>
        <div className="comparison-fields">
          <FgtsSalaryField value={state.fgtsSalary} hidden={salaryHidden} onChange={value => update({ fgtsSalary: value })} onToggleVisibility={onToggleSalaryVisibility} onClear={onClearFgtsSalary} />
          <label>Crescimento anual do salário
            <div><input type="number" inputMode="decimal" min="0" step="0.5" value={state.fgtsSalaryGrowth || ""} placeholder="0" onChange={event => update({ fgtsSalaryGrowth: Number(event.currentTarget.value) || 0 })} /><span>% a.a.</span></div>
          </label>
        </div>
        <p className="comparison-note" role="status">{state.fgtsSalary > 0
          ? salaryHidden ? "FGTS estimado oculto junto com o salário. O valor salvo continua sendo usado nos cálculos."
            : `FGTS estimado: ${brl(fgtsMonthlyEstimate)}/mês no primeiro ano · uso no fim de cada ${fgtsIntervalMonths} meses, após a prestação.`
          : "Informe o salário para considerar FGTS nas estratégias. Por enquanto, os resultados não incluem FGTS."}</p>
        <p className="comparison-note">Salário e crescimento anual são lembrados neste navegador. Ocultar é uma proteção visual, não criptografia; os resultados financeiros continuam visíveis.</p>
        {fgtsMemoryFeedback && <p className="comparison-note" role={fgtsMemoryFeedback.ok ? "status" : "alert"}>{fgtsMemoryFeedback.message}</p>}
      </> : <p className="comparison-note" role="status">Sem FGTS nas estratégias. Seu salário, crescimento e modo de uso foram preservados.</p>}
    </div>
    <p className="comparison-note">Modelo simplificado de principal e juros, sem TR ou outro indexador, seguros, tarifas e custos de posse. Não é cotação CAIXA nem reproduz seu algoritmo contratual; confira a simulação do contrato.</p>

    <section className="comparison-references" aria-label="Referências SAC e PRICE">
      <h3>Referências sem extras do bolso</h3>
      <p className="comparison-note">SAC e PRICE usam o FGTS selecionado, sem amortização extra em dinheiro ou investimento da diferença.</p>
      <div className="comparison-strategies">
        {[{ name: "SAC", result: scenario.sac }, { name: "PRICE", result: scenario.price }].map(({ name, result }) => <article className="comparison-strategy comparison-reference" key={name} aria-label={`Referência ${name}`}>
          <header><h4>{name}</h4><p>{name === "SAC" ? "Prestação decrescente." : includeFgts && state.fgtsSalary > 0 && state.fgtsMode === "PRESTACAO" ? "O FGTS recalcula as próximas prestações." : "Prestação fixa até o acerto final."}</p></header>
          <dl>
            <div><dt>Desembolso mensal inicial</dt><dd>{brl(result.financingPayment)}</dd></div>
            <div><dt>Quitação</dt><dd>{formatMonths(result.schedule.length)}</dd></div>
            <div><dt>Pago do bolso até quitar</dt><dd>{brl(state.entry + result.totalPaid)}<small>Entrada + prestações</small></dd></div>
            <div><dt>Juros totais</dt><dd>{brl(result.totalInterest)}</dd></div>
            <div><dt>FGTS utilizado</dt><dd>{brl(result.fgtsAmortization)}</dd></div>
            <div className="comparison-total"><dt>Total gasto</dt><dd>{brl(state.entry + result.totalPaid + result.fgtsAmortization)}<small>Pago do bolso + FGTS utilizado</small></dd></div>
          </dl>
        </article>)}
      </div>
    </section>
    <details className="comparison-details">
      <summary>Detalhes das referências SAC e PRICE</summary>
      <div className="comparison-details-content">
        <p><FinancingCrossing month={scenario.equalizationMonth} /></p>
        {showFgtsDetails && <FgtsDetails comparison={fgtsComparison} entry={state.entry} />}
        {includeFgts && <p className="comparison-note">Estratégia hipotética de FGTS: saldo inicial zero, depósitos de 8% do salário e reajuste anual informado, sem 13º, remuneração do fundo ou distribuição de resultados. O primeiro uso no mês {fgtsIntervalMonths} é uma hipótese, não uma carência obrigatória. Elegibilidade, saldo disponível, intervalo entre usos e data de pagamento dependem das regras do FGTS e do contrato.</p>}
      </div>
    </details>
    {showFgtsDetails && <FgtsEvolution comparison={fgtsComparison} />}
    <AmortizationComparisonPanel comparison={amortizationComparison} investmentRate={investmentRate} storageError={investmentRateStorageError} onRateChange={onInvestmentRateChange} />
  </section>;
}
