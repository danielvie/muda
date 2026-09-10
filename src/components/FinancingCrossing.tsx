export default function FinancingCrossing({ month }: { month: number | null }) {
  const years = month === null ? 0 : Math.floor(month / 12);
  const rest = month === null ? 0 : month % 12;
  const elapsed = [years ? `${years} ${years === 1 ? "ano" : "anos"}` : "", rest ? `${rest} ${rest === 1 ? "mês" : "meses"}` : ""].filter(Boolean).join(" e ");
  return <span className="comparison-crossing">Primeiro mês em que SAC ≤ PRICE: <strong>{month === null ? "não ocorre no prazo original" : `mês ${month}, ${elapsed}`}</strong>. Compara as curvas originais sem FGTS e ignora o acerto final parcial. Com FGTS, esse mês pode ser diferente do mês em que a amortização extra zera.</span>;
}
