import { useId } from "react";
import { brl, formatMonths } from "../format.ts";
import { parseInvestmentRate, type AmortizationComparison, type PayoffSummary } from "../amortizationComparison.ts";

type Props = {
  comparison: AmortizationComparison | null;
  includeFgts: boolean;
  investmentRate: string;
  storageError: string | null;
  onRateChange: (value: string) => void;
};

function PayoffFigures({ payoff }: { payoff: PayoffSummary }) {
  return <>
    <dl className="price-plus-totals">
      <div><dt>Saiu do seu bolso</dt><dd>{brl(payoff.cashApplied)}<small>Aplicado no apartamento, inclui a entrada</small></dd></div>
      <div><dt>FGTS utilizado</dt><dd>{brl(payoff.fgtsUsed)}</dd></div>
      <div className="comparison-total"><dt>Total do bolso + FGTS</dt><dd>{brl(payoff.cashApplied + payoff.fgtsUsed)}<small>Rendimentos do investimento não entram nesta soma</small></dd></div>
      <div className="price-plus-payoff"><dt>Tempo para quitar</dt><dd>{formatMonths(payoff.month)}<small>{payoff.monthsSaved > 0 ? `${formatMonths(payoff.monthsSaved)} antes do prazo contratado` : "No prazo contratado"}</small></dd></div>
    </dl>
    {payoff.investmentRemaining > 0.005 && <p className="comparison-note price-plus-leftover">Sobra investida ao quitar: <strong>{brl(payoff.investmentRemaining)}</strong>. Não entra no total do bolso + FGTS.</p>}
  </>;
}

function PayoffDetails({ payoff }: { payoff: PayoffSummary }) {
  return <dl className="comparison-detail-stats">
    <div><dt>Entrada do bolso</dt><dd>{brl(payoff.entry)}</dd></div>
    <div><dt>Prestações pagas</dt><dd>{brl(payoff.payments)}</dd></div>
    <div><dt>Amortizações extras do bolso</dt><dd>{brl(payoff.extras)}</dd></div>
    <div><dt>Juros do financiamento, já incluídos nas prestações</dt><dd>{brl(payoff.totalInterest)}</dd></div>
    <div><dt>Aportes no investimento até quitar</dt><dd>{brl(payoff.contributions)}</dd></div>
    <div><dt>Resgate aplicado no apartamento</dt><dd>{brl(payoff.redemption)}</dd></div>
    <div><dt>Parte do resgate que veio dos aportes</dt><dd>{brl(payoff.contributionRedeemed)}</dd></div>
    <div><dt>Rendimentos usados no pagamento</dt><dd>{brl(payoff.earningsUsed)}</dd></div>
    <div><dt>Total pago incluindo rendimentos</dt><dd>{brl(payoff.totalPaid)}</dd></div>
    <div><dt>Desembolso do bolso, incluindo todos os aportes</dt><dd>{brl(payoff.cashCommitted)}</dd></div>
    <div><dt>Dinheiro dos aportes que permaneceu investido</dt><dd>{brl(payoff.contributionRemaining)}</dd></div>
    <div><dt>Rendimentos que permaneceram investidos</dt><dd>{brl(payoff.earningsRemaining)}</dd></div>
  </dl>;
}

export default function AmortizationComparisonPanel({ comparison, includeFgts, investmentRate, storageError, onRateChange }: Props) {
  const id = useId();
  const invalid = !!investmentRate.trim() && parseInvestmentRate(investmentRate) === null;
  const ready = comparison?.status === "ready" ? comparison : null;
  const available = comparison?.status === "ready" || comparison?.status === "needs-rate" ? comparison : null;
  const strategies = [
    { key: "amortize", name: "Amortizar todo mês", description: "Paga a prestação PRICE e usa a sobra do orçamento para amortizar todo mês.", payoff: available?.amortize.payoff, crossing: ready?.amortize.atCrossing },
    { key: "invest", name: "Investir para amortizar depois", description: available ? `Investe a sobra e amortiza no mês ${available.crossingMonth}. Depois, amortiza todo mês.` : "Investe a sobra para amortizar de uma vez. Depois, amortiza todo mês.", payoff: ready?.invest.payoff, crossing: ready?.invest.atCrossing },
  ];
  const empty = comparison?.status === "no-debt" ? "Sem dívida a financiar."
    : comparison?.status === "no-crossing" ? "Não há cruzamento das curvas originais no prazo. Nenhuma data de resgate foi inventada." : null;
  const amortizePayoff = ready?.amortize.payoff;
  const investPayoff = ready?.invest.payoff;
  const totalDifference = amortizePayoff && investPayoff
    ? investPayoff.cashApplied + investPayoff.fgtsUsed - amortizePayoff.cashApplied - amortizePayoff.fgtsUsed : null;
  const monthDifference = amortizePayoff && investPayoff ? investPayoff.month - amortizePayoff.month : null;

  return <section className="amortization-comparison" aria-labelledby={`${id}-title`}>
    <header>
      <h3 id={`${id}-title`}>PRICE+</h3>
      <p className="comparison-intro">Quanto você paga pelo apartamento e em quanto tempo quita.</p>
      <p className="comparison-note">Projeção até a quitação de cada estratégia, com a entrada incluída. Não é um histórico de pagamentos realizados.</p>
    </header>
    {empty && <p className="comparison-note" role="status">{empty}</p>}
    <div className="comparison-strategies price-plus-strategies">
      {strategies.map(({ key, name, description, payoff }) => <article className="comparison-strategy price-plus-strategy" key={key} aria-labelledby={`${id}-${key}`}>
        <header><h4 id={`${id}-${key}`}>{name}</h4><p>{description}</p></header>
        {payoff ? <PayoffFigures payoff={payoff} />
          : <p className="comparison-note" role="status">{empty ?? (key === "invest" && !ready ? "Informe a rentabilidade abaixo para calcular esta estratégia." : available ? "Quitação não ocorre no prazo simulado. Não há total até quitar." : "Aguardando os dados do financiamento.")}</p>}
      </article>)}
    </div>
    {totalDifference !== null && monthDifference !== null && <div className="price-plus-differences comparison-note" aria-label="Diferenças até quitar">
      <p>{Math.abs(totalDifference) < 0.005 ? "As duas usam o mesmo total do bolso + FGTS."
        : <><strong>{totalDifference > 0 ? "Amortizar todo mês" : "Investir para amortizar depois"}</strong> usa {brl(Math.abs(totalDifference))} menos do bolso + FGTS.</>}</p>
      <p>{monthDifference === 0 ? "As duas quitam no mesmo mês."
        : <><strong>{monthDifference > 0 ? "Amortizar todo mês" : "Investir para amortizar depois"}</strong> quita {formatMonths(Math.abs(monthDifference))} antes.</>}</p>
      <p>Totais nominais em cada quitação, sem descontar a inflação. Não comparam o patrimônio na mesma data.</p>
    </div>}
    <div className="price-plus-assumptions">
      <p className="comparison-note">Orçamento mensal inicial: <strong>{available ? brl(available.budgets[0]) : "Não disponível"}</strong> · FGTS {includeFgts ? "ligado" : "desligado"}</p>
      <div className="comparison-investment-input">
        <div className="comparison-fields">
          <label htmlFor={`${id}-rate`}>Rentabilidade para investir e amortizar depois
            <div><input id={`${id}-rate`} type="text" inputMode="decimal" autoComplete="off" value={investmentRate}
              placeholder="Informe a taxa anual" aria-invalid={invalid || undefined} aria-describedby={`${id}-rate-help ${id}-storage`}
              onChange={event => onRateChange(event.currentTarget.value)} /><span>% a.a.</span></div>
          </label>
        </div>
        <p id={`${id}-rate-help`} className="comparison-note" role={invalid ? "alert" : undefined}>{invalid ? "Informe uma taxa anual entre 0% e 100%." : "Retorno anual líquido estimado, após impostos e taxas. Aceita 0%. Amortizar todo mês não precisa desta taxa."}</p>
        <p id={`${id}-storage`} className="comparison-note" role={storageError ? "alert" : undefined}>{storageError ?? "Taxas válidas são salvas automaticamente neste navegador. Apagar o campo remove a taxa salva."}</p>
      </div>
    </div>
    <p className="comparison-note">Estimativa sem TR, seguros, tarifas e custos de compra e posse. O total não é o custo completo de ter o apartamento. A rentabilidade futura não é garantida.</p>
    <details className="comparison-details">
      <summary>Entender os valores</summary>
      <div className="comparison-details-content">
        <p className="comparison-note">Do bolso considera apenas seu dinheiro aplicado no apartamento. Aportes que continuam investidos ficam fora desse valor. O resgate é dividido proporcionalmente entre aportes e rendimentos, conforme a composição do saldo no momento do resgate. É uma regra de atribuição da simulação, não uma regra tributária.</p>
        <p className="comparison-note">Total do bolso + FGTS soma apenas o dinheiro do bolso aplicado no apartamento e o FGTS utilizado. Nos detalhes, Total pago incluindo rendimentos acrescenta os rendimentos usados no pagamento. Esse total equivale a entrada + prestações + extras do bolso + FGTS utilizado + resgate. Não somamos os aportes novamente ao resgate, nem o FGTS que ficou no fundo. Todos os valores param no mês da quitação.</p>
        <div className="price-plus-detail-columns">
          {strategies.map(({ key, name, payoff }) => <section key={key} aria-label={`Composição de ${name}`}><h4>{name}</h4>{payoff ? <PayoffDetails payoff={payoff} /> : <p className="comparison-note">{empty ?? "Sem resumo de quitação disponível."}</p>}</section>)}
        </div>
      </div>
    </details>
    <details className="comparison-details">
      <summary>Comparação no mês da amortização</summary>
      <div className="comparison-details-content">
        {ready ? <>
          <p className="comparison-common-date"><strong>Comparação no mês {ready.crossingMonth} · {formatMonths(ready.crossingMonth)}</strong><br />Primeiro mês em que PRICE ≥ SAC nas curvas originais, sem FGTS ou extras. Valores do fim desse mês, após a amortização acumulada. Essa data não é necessariamente a quitação.</p>
          <div className="price-plus-detail-columns">
            {strategies.map(({ key, name, crossing }) => crossing && <section key={key} aria-label={`No mês da amortização: ${name}`}>
              <h4>{name}</h4>
              <dl className="comparison-detail-stats">
                <div><dt>Desembolso do bolso até a data, incluindo aportes</dt><dd>{brl(crossing.cashCommitted)}</dd></div>
                <div><dt>Dívida após as amortizações</dt><dd>{brl(crossing.debt)}</dd></div>
                <div><dt>Saldo investido restante</dt><dd>{brl(crossing.investment)}</dd></div>
                <div><dt>Falta para quitar com o investimento</dt><dd>{brl(Math.max(0, crossing.debt - crossing.investment))}</dd></div>
                <div><dt>FGTS utilizado até a data</dt><dd>{brl(crossing.fgtsUsed)}</dd></div>
                <div><dt>FGTS remanescente na data</dt><dd>{brl(crossing.fgtsRemaining)}</dd></div>
              </dl>
              {key === "invest" && <p className="comparison-note">Amortização com o investimento: <strong>{brl(crossing.redemption)}</strong>. {crossing.debt > 0.005 ? "A dívida não foi quitada; as prestações continuam." : "O apartamento está quitado. Qualquer sobra permanece investida."}</p>}
            </section>)}
          </div>
          <section className="comparison-conclusion" aria-label="Conclusão na data comum">
            <h4>Posição financeira na mesma data</h4>
            <p className="comparison-payoff-verdict">{ready.better === "tie" ? "Posição financeira equivalente nas duas estratégias, dentro da precisão de centavos."
              : <><strong>{ready.better === "invest" ? "Investir para amortizar depois" : "Amortizar todo mês"}</strong> deixa a posição financeira <strong>{brl(ready.advantage)} melhor</strong> no mês {ready.crossingMonth}.</>}</p>
            <p className="comparison-note">Compara saldo investido + FGTS remanescente − dívida. O imóvel e o desembolso são comuns às duas estratégias. Um desembolso igual não significa empate se a dívida ou os saldos forem diferentes. FGTS é patrimônio, mas tem restrições de uso. Não presume novos recursos do bolso nem uso imediato de FGTS.</p>
          </section>
        </> : <p className="comparison-note">{empty ?? "Informe a rentabilidade para comparar as duas estratégias na mesma data."}</p>}
      </div>
    </details>
    <details className="comparison-details">
      <summary>Regras das estratégias</summary>
      <div className="comparison-details-content">
        <p className="comparison-note">Ambas começam com o mesmo financiamento PRICE e a mesma entrada. O orçamento de cada mês é o maior valor entre as prestações SAC e PRICE originais, sem FGTS. A sobra após a prestação própria segue a estratégia escolhida.</p>
        <p className="comparison-note">O resgate ocorre uma única vez no cruzamento das prestações originais, após o FGTS, limitado à dívida. Não antecipa o resgate se o investimento cobrir a dívida antes. Se faltar, amortiza parcialmente; não exige um complemento extraordinário do bolso.</p>
        <p className="comparison-note">Depois do cruzamento, ambas destinam a sobra do orçamento à amortização mensal, sem novos resgates nem aportes. Somente FGTS no modo reduzir prestação recalcula o encargo próprio. Extras em dinheiro e o resgate reduzem prazo.</p>
        <p className="comparison-note">Aportes ocorrem no fim do mês, após o rendimento do saldo anterior. A prestação e os extras mensais precedem o FGTS. Se uma estratégia quitar antes do cruzamento, o orçamento liberado fica investido até essa data para a comparação patrimonial. Esses aportes posteriores não entram no resumo até quitar.</p>
      </div>
    </details>
  </section>;
}
