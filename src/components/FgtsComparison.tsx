import { brl } from "../format.ts";
import type { FgtsComparison as FgtsComparisonData } from "../fgtsSchedule.ts";

function installment(value: number | null) {
  if (value === null) return "Não houve uso";
  return value <= 0.005 ? "Quitado" : brl(value);
}

export function FgtsDetails({ comparison, entry }: { comparison: FgtsComparisonData; entry: number }) {
  return (
    <section>
      <h3>Detalhes da projeção FGTS</h3>
      <div className="comparison-fgts-details">
        {[comparison.sac, comparison.price].map(projection => (
          <section key={projection.metodo} aria-label={`Detalhes FGTS ${projection.metodo}`}>
            <h4>{projection.metodo}</h4>
            <dl className="comparison-detail-stats">
              <div><dt>Prestação após o primeiro FGTS</dt><dd>{installment(projection.prestacaoAposPrimeiroFgts)}</dd></div>
              <div><dt>Entrada</dt><dd>{brl(entry)}</dd></div>
              <div><dt>Soma das prestações pagas</dt><dd>{brl(projection.prestacoes)}</dd></div>
              <div><dt>FGTS aplicado</dt><dd>{brl(projection.fgtsAmortizacao)}</dd></div>
              <div><dt>Total com entrada e FGTS</dt><dd>{brl(projection.valorEfetivoImovel)}</dd></div>
              <div><dt>Usos do FGTS</dt><dd>{projection.fgtsAcionamentos} {projection.fgtsAcionamentos === 1 ? "vez" : "vezes"}</dd></div>
              <div><dt>FGTS não utilizado ao quitar</dt><dd>{brl(projection.fgtsNaoUtilizado)}</dd></div>
            </dl>
          </section>
        ))}
      </div>
      <p className="comparison-note">Total = entrada + prestações do bolso + FGTS aplicado. Sem TR ou outro indexador, seguros, tarifas e custos de posse. Não inclui FGTS não utilizado.</p>
    </section>
  );
}

export function FgtsEvolution({ comparison }: { comparison: FgtsComparisonData }) {
  const maxYears = Math.max(comparison.sac.yearBlocks.length, comparison.price.yearBlocks.length);
  return (
    <details className="comparison-details">
      <summary>Evolução anual do saldo devedor e do FGTS</summary>
      <div className="comparison-details-content">
        <p className="comparison-note">Esta tabela mostra a evolução anual de SAC e PRICE. O cronograma de PRICE + diferença ainda não é exibido nesta tabela.</p>
        <div className="comparison-table-scroll" role="region" aria-label="Evolução anual SAC e PRICE, tabela com rolagem horizontal" tabIndex={0}>
          <table>
            <caption>Projeção FGTS · saldo ao fim do ano, juros e FGTS aplicado no ano</caption>
            <colgroup span={1} /><colgroup span={3} /><colgroup span={3} />
            <thead>
              <tr>
                <th scope="col" rowSpan={2}>Ano</th>
                <th scope="colgroup" colSpan={3}>SAC</th>
                <th scope="colgroup" colSpan={3}>PRICE</th>
              </tr>
              <tr>
                <th scope="col">Saldo devedor</th><th scope="col">Juros no ano</th><th scope="col">FGTS no ano</th>
                <th scope="col">Saldo devedor</th><th scope="col">Juros no ano</th><th scope="col">FGTS no ano</th>
              </tr>
            </thead>
            <tbody>{Array.from({ length: maxYears }, (_, index) => {
              const sac = comparison.sac.yearBlocks[index];
              const price = comparison.price.yearBlocks[index];
              return <tr key={index}>
                <th scope="row">{index + 1}</th>
                {[sac?.saldoFinal, sac?.juros, sac?.fgtsAmortizacao, price?.saldoFinal, price?.juros, price?.fgtsAmortizacao].map((value, cell) => (
                  <td key={cell}>{value === undefined ? "—" : brl(value)}</td>
                ))}
              </tr>;
            })}</tbody>
          </table>
        </div>
      </div>
    </details>
  );
}
