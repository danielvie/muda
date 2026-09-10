import { useId } from "react";
import { brl, formatMonths } from "../format.ts";
import { parseInvestmentRate, type AmortizationComparison } from "../amortizationComparison.ts";

type Props = {
  comparison: AmortizationComparison | null;
  investmentRate: string;
  storageError: string | null;
  onRateChange: (value: string) => void;
};

export default function AmortizationComparisonPanel({ comparison, investmentRate, storageError, onRateChange }: Props) {
  const id = useId();
  const invalid = !!investmentRate.trim() && parseInvestmentRate(investmentRate) === null;
  const ready = comparison?.status === "ready" ? comparison : null;
  return <section className="amortization-comparison" aria-labelledby={`${id}-title`}>
    <header>
      <p className="comparison-eyebrow">O MESMO ORÇAMENTO · A MESMA DATA</p>
      <h3 id={`${id}-title`}>Amortizar agora ou investir para amortizar depois?</h3>
      <p className="comparison-intro">Duas destinações para o dinheiro extra. Compare a dívida e o patrimônio que sobra, não apenas o desembolso.</p>
    </header>
    <div className="comparison-investment-input">
      <div className="comparison-fields">
        <label htmlFor={`${id}-rate`}>Rentabilidade líquida estimada do investimento
          <div><input id={`${id}-rate`} type="text" inputMode="decimal" autoComplete="off" value={investmentRate}
            placeholder="Informe a taxa anual" aria-invalid={invalid || undefined} aria-describedby={`${id}-rate-help ${id}-storage`}
            onChange={event => onRateChange(event.currentTarget.value)} /><span>% a.a.</span></div>
        </label>
      </div>
      <p id={`${id}-rate-help`} className="comparison-note" role={invalid ? "alert" : undefined}>{invalid ? "Informe uma taxa anual entre 0% e 100%." : "Taxa efetiva anual, já descontados impostos e taxas. Use 0 para simular sem rendimento. O retorno é estimado, não garantido."}</p>
      <p id={`${id}-storage`} className="comparison-note" role={storageError ? "alert" : undefined}>{storageError ?? "Taxas válidas são salvas automaticamente neste navegador. Apagar o campo remove a taxa salva."}</p>
    </div>
    {ready ? <p className="comparison-common-date"><strong>Comparação no mês {ready.crossingMonth} · {formatMonths(ready.crossingMonth)}</strong><br />Primeiro mês em que PRICE ≥ SAC nas curvas originais, sem FGTS ou extras. Valores abaixo são do fim desse mês, após a amortização acumulada.</p>
      : <p className="comparison-note" role="status">{comparison?.status === "no-debt" ? "Sem dívida a financiar." : comparison?.status === "no-crossing" ? "Não há cruzamento das curvas originais no prazo. Nenhuma data de resgate foi inventada." : "Informe a rentabilidade para comparar as duas estratégias."}</p>}
    <div className="comparison-strategies">
      {[
        { key: "amortize", name: "Amortizar todo mês", description: "Paga a prestação PRICE e usa a sobra mensal do orçamento para reduzir o prazo da dívida.", result: ready?.amortize },
        { key: "invest", name: "Investir até o cruzamento e amortizar", description: "Paga a prestação PRICE e investe a sobra. No cruzamento, resgata o acumulado para amortizar. Só quita se o dinheiro for suficiente.", result: ready?.invest },
      ].map(({ key, name, description, result }) => <article className="comparison-strategy" key={key} aria-labelledby={`${id}-${key}`}>
        <header><h4 id={`${id}-${key}`}>{name}</h4><p>{description}</p></header>
        {result ? <>
          <dl>
            <div><dt>Do bolso até a data comum</dt><dd>{brl(result.atCrossing.cashCommitted)}</dd></div>
            <div className="comparison-primary"><dt>Dívida após as amortizações</dt><dd>{brl(result.atCrossing.debt)}</dd></div>
            <div><dt>Saldo investido restante</dt><dd>{brl(result.atCrossing.investment)}</dd></div>
            <div><dt>Falta para quitar com o investimento</dt><dd>{brl(Math.max(0, result.atCrossing.debt - result.atCrossing.investment))}<small>Não presume novos recursos do bolso nem uso imediato de FGTS</small></dd></div>
            <div><dt>FGTS utilizado até a data</dt><dd>{brl(result.atCrossing.fgtsUsed)}</dd></div>
            <div><dt>FGTS remanescente na data</dt><dd>{brl(result.atCrossing.fgtsRemaining)}</dd></div>
          </dl>
          {key === "invest" && <p className="comparison-note">Amortização com o investimento no mês {ready!.crossingMonth}: <strong>{brl(result.atCrossing.redemption)}</strong>. {result.atCrossing.debt > 0.005 ? "A dívida não foi quitada; as prestações continuam." : "O apartamento está quitado. Qualquer sobra permanece investida."}</p>}
          <details className="comparison-details">
            <summary>Depois dessa data: quitação e desembolso</summary>
            <dl className="comparison-followup">
              <div><dt>Quitação prevista</dt><dd>{result.payoffMonth === null ? "Não ocorre no prazo" : `Mês ${result.payoffMonth} · ${formatMonths(result.payoffMonth)}`}</dd></div>
              <div><dt>Do bolso até quitar</dt><dd>{result.cashUntilPayoff === null ? "Não calculado" : brl(result.cashUntilPayoff)}</dd></div>
              <div><dt>Sobra investida ao quitar</dt><dd>{result.investmentAtPayoff === null ? "Não calculada" : brl(result.investmentAtPayoff)}</dd></div>
            </dl>
          </details>
        </> : <p className="comparison-note">{comparison?.status === "no-debt" ? "Sem dívida." : "Aguardando as premissas da comparação."}</p>}
      </article>)}
    </div>
    {ready && <section className="comparison-conclusion" aria-label="Conclusão na data comum">
      <h4>Qual deixa a melhor posição financeira nessa data?</h4>
      <p className="comparison-payoff-verdict" role="status">{ready.better === "tie" ? "Posição financeira equivalente nas duas estratégias, dentro da precisão de centavos."
        : <><strong>{ready.better === "invest" ? "Investir até o cruzamento e amortizar" : "Amortizar todo mês"}</strong> deixa a posição financeira <strong>{brl(ready.advantage)} melhor</strong> no mês {ready.crossingMonth}.</>}</p>
      <p className="comparison-note">Compara saldo investido + FGTS remanescente − dívida. O imóvel e o desembolso são comuns às duas estratégias. Um desembolso igual não significa empate se a dívida ou os saldos forem diferentes. FGTS é patrimônio, mas tem restrições de uso.</p>
    </section>}
    <details className="comparison-details">
      <summary>Regras compartilhadas da comparação</summary>
      <div className="comparison-details-content">
        <p className="comparison-note">Ambas começam com o mesmo financiamento PRICE e a mesma entrada. O orçamento de cada mês é o maior valor entre as prestações SAC e PRICE originais, sem FGTS. {ready && <>No primeiro mês: {brl(ready.budgets[0])}.</>} A sobra após a prestação própria segue a estratégia escolhida.</p>
        <p className="comparison-note">Até a data comum, todo o orçamento é destinado à dívida ou ao investimento. Se uma estratégia quitar antes, a verba liberada também fica investida até essa data, mantendo os recursos comparáveis. O mesmo retorno é usado nas sobras das duas estratégias.</p>
        <p className="comparison-note">Aportes ocorrem no fim do mês, após o rendimento do saldo anterior. A prestação e os extras mensais precedem o FGTS. O resgate acumulado ocorre uma única vez no cruzamento, após o FGTS, limitado à dívida. Não há complemento extraordinário do bolso.</p>
        <p className="comparison-note">As duas usam o mesmo salário e política de FGTS. Apenas FGTS no modo reduzir prestação recalcula o encargo próprio. Extras em dinheiro e o resgate reduzem prazo. Depois do cruzamento, ambas destinam a sobra do mesmo orçamento à amortização mensal, sem novos resgates. Não há novos aportes depois dessa data; a sobra investida continua rendendo.</p>
        <p className="comparison-note">A conclusão compara uma posição patrimonial na data comum. Desembolso até quitar e prazo são informações complementares, não o critério de vitória. Estimativa sem TR, seguros e tarifas; rentabilidade futura pode ser diferente da informada.</p>
      </div>
    </details>
  </section>;
}
