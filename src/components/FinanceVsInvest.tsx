import React, { useMemo, useState } from "react";
import { brl } from "../format";
import { useMemory } from "../memory";
import {
  buildFinanceVsInvestProjection,
  defaultFinanceVsInvestFields,
  getInitialComparisonBudget,
  type FinanceVsInvestFields,
  type FinanceVsInvestMonth,
} from "../financeVsInvestProjection";

type NumericField = Exclude<keyof FinanceVsInvestFields, "amortizationMethod">;
type ComparisonFieldHistory = Partial<Record<NumericField, string[]>>;

const FIELD_HISTORY_KEY = "muda.financeVsInvest.fieldHistory.v1";
const FIELDS_STORAGE_KEY = "muda.financeVsInvest.fields.v1";
const ADVANCED_OPEN_STORAGE_KEY = "muda.financeVsInvest.advancedOpen.v1";
const FIELD_HISTORY_LIMIT = 3;

const numericFields: Array<{ key: NumericField; label: string; help: string; placeholder?: string }> = [
  {
    key: "availableMoney",
    label: "Dinheiro disponível (R$)",
    help: "Valor inicial usado como entrada no financiamento ou aplicado no cenário de investimento.",
  },
  {
    key: "propertyPrice",
    label: "Valor do imóvel (R$)",
    help: "Preço do imóvel comprado no cenário de financiamento.",
  },
  {
    key: "financingAnnualRate",
    label: "Juros financiamento (% a.a.)",
    help: "Taxa anual efetiva usada para calcular as parcelas do financiamento.",
  },
  {
    key: "financingTermMonths",
    label: "Prazo (meses)",
    help: "Quantidade de meses para quitar o financiamento.",
  },
  {
    key: "monthlyRent",
    label: "Aluguel mensal (R$)",
    help: "Custo mensal de moradia no cenário de investir e morar de aluguel.",
  },
  {
    key: "investmentAnnualReturn",
    label: "Retorno investimento (% a.a.)",
    help: "Retorno anual aplicado ao dinheiro inicial e aos aportes mensais que sobrarem.",
  },
  {
    key: "propertyAppreciationAnnual",
    label: "Valorização imóvel (% a.a.)",
    help: "Crescimento anual esperado do valor de mercado do imóvel comprado.",
  },
  {
    key: "rentInflationAnnual",
    label: "Inflação aluguel (% a.a.)",
    help: "Aumento anual esperado do aluguel ao longo da simulação.",
  },
  {
    key: "budgetGrowthAnnual",
    label: "Cresc. orçamento (% a.a.)",
    help: "Crescimento anual do orçamento mensal usado para pagar moradia e investir o que sobrar.",
  },
  {
    key: "monthlyOwnershipCost",
    label: "Custo de posse (R$/mês)",
    help: "Custo mensal adicional de possuir o imóvel, como condomínio, IPTU, seguro ou manutenção.",
  },
  {
    key: "monthlyBudget",
    label: "Orçamento mensal (R$)",
    help: "Valor mensal disponível para moradia e investimento. Se vazio, usa o maior valor entre primeira parcela com custos e aluguel.",
    placeholder: "Automático",
  },
  {
    key: "horizonYears",
    label: "Horizonte (anos)",
    help: "Período usado para comparar patrimônio final e recomendar financiar ou investir.",
  },
];

const primaryFieldKeys: NumericField[] = [
  "availableMoney",
  "propertyPrice",
  "monthlyRent",
  "investmentAnnualReturn",
  "financingAnnualRate",
  "horizonYears",
];

const advancedFieldKeys: NumericField[] = [
  "financingTermMonths",
  "propertyAppreciationAnnual",
  "rentInflationAnnual",
  "budgetGrowthAnnual",
  "monthlyOwnershipCost",
  "monthlyBudget",
];

const fieldsByKey = Object.fromEntries(numericFields.map((field) => [field.key, field])) as Record<
  NumericField,
  (typeof numericFields)[number]
>;

function readFieldHistory(): ComparisonFieldHistory {
  try {
    const parsed = JSON.parse(localStorage.getItem(FIELD_HISTORY_KEY) ?? "{}") as ComparisonFieldHistory;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function readSavedFields(): FinanceVsInvestFields {
  try {
    const parsed = JSON.parse(localStorage.getItem(FIELDS_STORAGE_KEY) ?? "{}") as Partial<FinanceVsInvestFields>;
    return { ...defaultFinanceVsInvestFields, ...parsed };
  } catch {
    return defaultFinanceVsInvestFields;
  }
}

function readAdvancedOpen() {
  try {
    return localStorage.getItem(ADVANCED_OPEN_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function monthLabel(month: number) {
  const years = month / 12;
  return years >= 1 ? `${Number(years.toFixed(1))}a` : `${month}m`;
}

function formatAxisMoney(value: number) {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}R$ ${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${sign}R$ ${Math.round(abs / 1_000)}k`;
  return `${sign}R$ ${Math.round(abs)}`;
}

function axisTicks(min: number, max: number) {
  const mid = min + (max - min) / 2;
  return [max, mid, min];
}

function findFirstCrossing(
  data: FinanceVsInvestMonth[],
  getA: (month: FinanceVsInvestMonth) => number,
  getB: (month: FinanceVsInvestMonth) => number,
) {
  for (let index = 1; index < data.length; index += 1) {
    const previousDiff = getA(data[index - 1]) - getB(data[index - 1]);
    const currentDiff = getA(data[index]) - getB(data[index]);
    if (previousDiff === 0 || Math.sign(previousDiff) !== Math.sign(currentDiff)) {
      return data[index];
    }
  }

  return null;
}

function HelpTip({ text }: { text: string }) {
  return (
    <span className="help-tip">
      <button className="help-tip-button" type="button" aria-label={text}>?</button>
      <span className="help-tip-popup" role="tooltip">{text}</span>
    </span>
  );
}

function ChartCallout({ x, y, text }: { x: number; y: number; text: string }) {
  const boxWidth = Math.max(96, text.length * 7 + 18);
  const boxHeight = 24;
  return (
    <g className="chart-callout">
      <rect x={x} y={y - boxHeight + 6} width={boxWidth} height={boxHeight} rx="5" />
      <text x={x + 9} y={y - 6}>{text}</text>
    </g>
  );
}

function ChartLine({
  data,
  getA,
  getB,
  labelA,
  labelB,
  help,
  breakEvenMonth,
}: {
  data: FinanceVsInvestMonth[];
  getA: (month: FinanceVsInvestMonth) => number;
  getB: (month: FinanceVsInvestMonth) => number;
  labelA: string;
  labelB: string;
  help: string;
  breakEvenMonth?: number | null;
}) {
  const width = 640;
  const height = 220;
  const pad = 24;
  const values = data.flatMap((month) => [getA(month), getB(month)]);
  const min = Math.min(0, ...values);
  const max = Math.max(...values, 1);
  const span = max - min || 1;
  const xFor = (index: number) => pad + (index / Math.max(1, data.length - 1)) * (width - pad * 2);
  const yFor = (value: number) => height - pad - ((value - min) / span) * (height - pad * 2);
  const pointsFor = (getter: (month: FinanceVsInvestMonth) => number) =>
    data.map((month, index) => `${xFor(index)},${yFor(getter(month))}`).join(" ");
  const breakEvenX = breakEvenMonth ? xFor(Math.max(0, breakEvenMonth - 1)) : null;
  const crossing = breakEvenMonth ? data[breakEvenMonth - 1] : findFirstCrossing(data, getA, getB);
  const crossingX = crossing ? xFor(crossing.month - 1) : null;
  const crossingY = crossing ? yFor((getA(crossing) + getB(crossing)) / 2) : null;
  const crossingLabel = crossing ? monthLabel(crossing.month) : "";
  const crossingValue = crossing ? brl((getA(crossing) + getB(crossing)) / 2) : "";

  return (
    <div className="comparison-chart">
      <div className="comparison-chart-header">
        <span>{labelA}</span>
        <span>{labelB}</span>
        <HelpTip text={help} />
      </div>
      <div className="comparison-legend" aria-label="Legenda do gráfico">
        <span><i className="legend-swatch legend-a" />{labelA}</span>
        <span><i className="legend-swatch legend-b" />{labelB}</span>
        {crossing && <span><i className="legend-dot legend-crossing" />Cruzamento: {crossingLabel} · {crossingValue}</span>}
        {breakEvenMonth && <span><i className="legend-swatch legend-break-even" />Ponto de virada</span>}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${labelA} versus ${labelB}`}>
        <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} className="chart-axis" />
        <line x1={pad} y1={pad} x2={pad} y2={height - pad} className="chart-axis" />
        {axisTicks(min, max).map((tick) => (
          <React.Fragment key={tick}>
            <line x1={pad} y1={yFor(tick)} x2={width - pad} y2={yFor(tick)} className="chart-grid-line" />
            <text x={pad + 4} y={yFor(tick) - 4} className="chart-axis-label">{formatAxisMoney(tick)}</text>
          </React.Fragment>
        ))}
        {breakEvenX && (
          <>
            <line x1={breakEvenX} y1={pad} x2={breakEvenX} y2={height - pad} className="chart-break-even" />
            <ChartCallout x={breakEvenX + 6} y={pad + 24} text="virada" />
          </>
        )}
        <polyline points={pointsFor(getA)} className="chart-line chart-line-a" />
        <polyline points={pointsFor(getB)} className="chart-line chart-line-b" />
        {crossingX && crossingY && (
          <>
            <circle cx={crossingX} cy={crossingY} r="6" className="chart-crossing-point" />
            <ChartCallout x={crossingX + 8} y={Math.max(pad + 24, crossingY - 8)} text={`cruzou em ${crossingLabel}`} />
          </>
        )}
        <text x={pad} y={height - 5} className="chart-label">0</text>
        <text x={width - pad - 36} y={height - 5} className="chart-label">{monthLabel(data.length)}</text>
      </svg>
    </div>
  );
}

function CashflowChart({ data, help }: { data: FinanceVsInvestMonth[]; help: string }) {
  const width = 640;
  const height = 180;
  const pad = 24;
  const max = Math.max(...data.flatMap((month) => [month.budget, month.rent, month.mortgageCost]), 1);
  const xFor = (index: number) => pad + (index / Math.max(1, data.length - 1)) * (width - pad * 2);
  const yFor = (value: number) => height - pad - (value / max) * (height - pad * 2);
  const pointsFor = (getter: (month: FinanceVsInvestMonth) => number) =>
    data.map((month, index) => `${xFor(index)},${yFor(getter(month))}`).join(" ");
  const crossing = findFirstCrossing(data, (month) => month.rent, (month) => month.mortgageCost);
  const crossingX = crossing ? xFor(crossing.month - 1) : null;
  const crossingY = crossing ? yFor((crossing.rent + crossing.mortgageCost) / 2) : null;
  const crossingLabel = crossing ? monthLabel(crossing.month) : "";
  const crossingValue = crossing ? brl((crossing.rent + crossing.mortgageCost) / 2) : "";

  return (
    <div className="comparison-chart">
      <div className="comparison-chart-header">
        <span>Orçamento</span>
        <span>Aluguel</span>
        <span>Parcela + custos</span>
        <HelpTip text={help} />
      </div>
      <div className="comparison-legend" aria-label="Legenda do fluxo mensal">
        <span><i className="legend-swatch legend-budget" />Orçamento</span>
        <span><i className="legend-swatch legend-b" />Aluguel</span>
        <span><i className="legend-swatch legend-a" />Parcela + custos</span>
        {crossing && <span><i className="legend-dot legend-crossing" />Cruzamento: {crossingLabel} · {crossingValue}</span>}
        <span><i className="legend-box legend-rent-forced" />Aluguel elevou orçamento</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Fluxo mensal">
        <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} className="chart-axis" />
        {axisTicks(0, max).map((tick) => (
          <React.Fragment key={tick}>
            <line x1={pad} y1={yFor(tick)} x2={width - pad} y2={yFor(tick)} className="chart-grid-line" />
            <text x={pad + 4} y={yFor(tick) - 4} className="chart-axis-label">{formatAxisMoney(tick)}</text>
          </React.Fragment>
        ))}
        {data.map((month, index) => month.rentForcedBudget && (
          <rect
            key={month.month}
            x={xFor(index) - 2}
            y={pad}
            width="4"
            height={height - pad * 2}
            className="chart-rent-forced"
          />
        ))}
        <polyline points={pointsFor((month) => month.budget)} className="chart-line chart-line-budget" />
        <polyline points={pointsFor((month) => month.rent)} className="chart-line chart-line-b" />
        <polyline points={pointsFor((month) => month.mortgageCost)} className="chart-line chart-line-a" />
        {crossingX && crossingY && (
          <>
            <circle cx={crossingX} cy={crossingY} r="6" className="chart-crossing-point" />
            <ChartCallout x={crossingX + 8} y={Math.max(pad + 24, crossingY - 8)} text={`cruzou em ${crossingLabel}`} />
          </>
        )}
      </svg>
    </div>
  );
}

function MonthlyDetailsTable({ data }: { data: FinanceVsInvestMonth[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedYears, setExpandedYears] = useState<Record<number, boolean>>({});
  const yearlyRows = useMemo(() => {
    const groups: FinanceVsInvestMonth[][] = [];
    for (const month of data) {
      const yearIndex = Math.ceil(month.month / 12) - 1;
      groups[yearIndex] = [...(groups[yearIndex] ?? []), month];
    }

    return groups.map((months, index) => {
      const lastMonth = months[months.length - 1];
      return {
        year: index + 1,
        months,
        rentSpent: months.reduce((sum, month) => sum + month.rent, 0),
        financingSpent: months.reduce((sum, month) => sum + month.mortgageCost, 0),
        investNetWorth: lastMonth.investNetWorth,
        financeNetWorth: lastMonth.financeNetWorth,
        budget: lastMonth.budget,
      };
    });
  }, [data]);

  const toggleYear = (year: number) => {
    setExpandedYears((current) => ({ ...current, [year]: !current[year] }));
  };

  return (
    <div className="monthly-details">
      <button className="field-chip monthly-details-toggle" type="button" onClick={() => setIsOpen((current) => !current)}>
        {isOpen ? "Ocultar tabela por ano" : "Mostrar tabela por ano"}
      </button>
      {isOpen && (
        <div className="monthly-details-scroll">
          <table>
            <thead>
              <tr>
                <th>Ano</th>
                <th>Aluguel gasto no ano</th>
                <th>Financ. gasto no ano</th>
                <th>Patrimônio investir</th>
                <th>Patrimônio financiar</th>
                <th>Orçamento fim do ano</th>
              </tr>
            </thead>
            <tbody>
              {yearlyRows.map((row) => (
                <React.Fragment key={row.year}>
                  <tr
                    className="year-row"
                    tabIndex={0}
                    onClick={() => toggleYear(row.year)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        toggleYear(row.year);
                      }
                    }}
                  >
                    <td>{expandedYears[row.year] ? "−" : "+"} Ano {row.year}</td>
                    <td>{brl(row.rentSpent)}</td>
                    <td>{brl(row.financingSpent)}</td>
                    <td>{brl(row.investNetWorth)}</td>
                    <td>{brl(row.financeNetWorth)}</td>
                    <td>{brl(row.budget)}</td>
                  </tr>
                  {expandedYears[row.year] && row.months.map((month) => (
                    <tr className="month-row" key={month.month}>
                      <td>Mês {month.month}</td>
                      <td>{brl(month.rent)}</td>
                      <td>{brl(month.mortgageCost)}</td>
                      <td>{brl(month.investNetWorth)}</td>
                      <td>{brl(month.financeNetWorth)}</td>
                      <td>{brl(month.budget)}</td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function FinanceVsInvest() {
  const { fields: sourceFields } = useMemory();
  const [fields, setFields] = useState<FinanceVsInvestFields>(readSavedFields);
  const [fieldHistory, setFieldHistory] = useState<ComparisonFieldHistory>(readFieldHistory);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(readAdvancedOpen);
  const [importNote, setImportNote] = useState("");
  const projection = useMemo(() => buildFinanceVsInvestProjection(fields), [fields]);
  const automaticBudget = getInitialComparisonBudget(fields);

  const updateField = <K extends keyof FinanceVsInvestFields>(key: K, value: FinanceVsInvestFields[K]) => {
    setFields((current) => {
      const next = { ...current, [key]: value };
      localStorage.setItem(FIELDS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const toggleAdvanced = () => {
    setIsAdvancedOpen((current) => {
      const next = !current;
      localStorage.setItem(ADVANCED_OPEN_STORAGE_KEY, String(next));
      return next;
    });
  };

  const rememberField = (key: NumericField) => {
    const value = fields[key].trim();
    if (!value) return;

    setFieldHistory((current) => {
      const next = {
        ...current,
        [key]: [value, ...(current[key] ?? []).filter((item) => item !== value)].slice(0, FIELD_HISTORY_LIMIT),
      };
      localStorage.setItem(FIELD_HISTORY_KEY, JSON.stringify(next));
      return next;
    });
  };

  const importFinancing = () => {
    setFields((current) => {
      const next = {
      ...current,
      availableMoney: sourceFields.entrada,
      propertyPrice: sourceFields.valorImovel,
      financingAnnualRate: sourceFields.taxaFinAnual,
      financingTermMonths: sourceFields.prazoMeses,
      amortizationMethod: sourceFields.metodoAmortizacao,
      };
      localStorage.setItem(FIELDS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    setImportNote("Valores importados de Financiamento.");
  };

  const importInvestment = () => {
    setFields((current) => {
      const next = {
      ...current,
      availableMoney: sourceFields.saldoInicial,
      investmentAnnualReturn: sourceFields.taxaInvestAnual,
      };
      localStorage.setItem(FIELDS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    setImportNote("Valores importados de Investimento.");
  };

  const winnerLabel = projection?.winner === "finance" ? "Financiar" : projection?.winner === "invest" ? "Investir" : "Empate";
  const finalDifference = projection ? Math.abs(projection.difference) : 0;
  const renderInputField = (field: (typeof numericFields)[number]) => (
    <div className="field" key={field.key}>
      <div className="field-label-with-help">
        <label className="field-label" htmlFor={`compare-${field.key}`}>{field.label}</label>
        <HelpTip text={field.help} />
        {(fieldHistory[field.key] ?? []).map((value) => (
          <button
            className="field-chip comparison-memory-chip"
            type="button"
            key={value}
            onClick={() => updateField(field.key, value)}
          >
            {value}
          </button>
        ))}
      </div>
      <input
        id={`compare-${field.key}`}
        className="input-field comparison-input"
        type="text"
        value={fields[field.key]}
        placeholder={field.placeholder}
        onChange={(event) => updateField(field.key, event.target.value)}
        onBlur={() => rememberField(field.key)}
        onKeyDown={(event) => event.key === "Enter" && (event.currentTarget as HTMLInputElement).blur()}
      />
    </div>
  );

  return (
    <section className="comparison-panel p-4" aria-labelledby="compare-title">
      <h2 id="compare-title" className="sr-only">Financiar vs Investir</h2>

      <div className="comparison-summary">
        <div className="metric-highlight">
          <div className="metric-label">Recomendação</div>
          <div className="metric-value">{projection ? winnerLabel : "Revise os campos"}</div>
        </div>
        <div className="metric">
          <div className="metric-label">Diferença no horizonte</div>
          <div className="metric-value">{projection ? brl(finalDifference) : "-"}</div>
        </div>
        <div className="metric">
          <div className="metric-label">Ponto de virada</div>
          <div className="metric-value">{projection?.breakEvenMonth ? monthLabel(projection.breakEvenMonth) : "Sem virada"}</div>
        </div>
      </div>

      <div className="comparison-assumptions">
        <div className="comparison-assumptions-header">
          <div>
            <div className="metric-label">Premissas</div>
            {Number.isFinite(automaticBudget) && !fields.monthlyBudget.trim() && (
              <div className="comparison-note">Orçamento automático: {brl(automaticBudget)}</div>
            )}
            {importNote && <div className="comparison-note">{importNote}</div>}
          </div>
          <div className="comparison-imports">
            <button className="field-chip" type="button" onClick={importFinancing}>Importar Financiamento</button>
            <button className="field-chip" type="button" onClick={importInvestment}>Importar Investimento</button>
          </div>
        </div>

        <div className="comparison-primary-fields">
          {primaryFieldKeys.map((key) => renderInputField(fieldsByKey[key]))}
        </div>

        <button
          className="field-chip comparison-advanced-toggle"
          type="button"
          aria-expanded={isAdvancedOpen}
          onClick={toggleAdvanced}
        >
          {isAdvancedOpen ? "Menos premissas" : "Mais premissas"}
        </button>

        {isAdvancedOpen && (
          <div className="comparison-advanced-fields">
          <div className="field">
            <div className="field-label-with-help">
              <label className="field-label">Método</label>
              <HelpTip text="Define como o financiamento amortiza a dívida: SAC começa mais caro e cai; PRICE mantém parcela constante." />
            </div>
            <div className="flex gap-2">
              <button
                className={`field-chip ${fields.amortizationMethod === "SAC" ? "field-chip-active" : ""}`}
                type="button"
                onClick={() => updateField("amortizationMethod", "SAC")}
              >
                SAC
              </button>
              <button
                className={`field-chip ${fields.amortizationMethod === "PRICE" ? "field-chip-active" : ""}`}
                type="button"
                onClick={() => updateField("amortizationMethod", "PRICE")}
              >
                PRICE
              </button>
            </div>
          </div>
            {advancedFieldKeys.map((key) => renderInputField(fieldsByKey[key]))}
          </div>
        )}
      </div>

      <div className="comparison-main">
        {projection ? (
          <>
            <div className="comparison-charts-grid">
              <ChartLine
                data={projection.months}
                getA={(month) => month.financeNetWorth}
                getB={(month) => month.investNetWorth}
                labelA="Patrimônio: Financiar"
                labelB="Patrimônio: Investir"
                help="Mostra a evolução do patrimônio em cada caminho. Financiar considera valor do imóvel, saldo devedor e investimentos feitos com o dinheiro que sobra. Investir considera o dinheiro aplicado e os aportes feitos depois de pagar aluguel. A recomendação usa o maior patrimônio no horizonte escolhido."
                breakEvenMonth={projection.breakEvenMonth}
              />
              <CashflowChart
                data={projection.months}
                help="Mostra quanto do orçamento mensal é consumido por moradia em cada caminho. Aluguel cresce pela inflação do aluguel; parcela + custos usa o financiamento e custo de posse. O que sobra do orçamento vira aporte no respectivo caminho."
              />
            </div>
            <div className="comparison-table">
              <div>
                <span>Final financiando</span>
                <strong>{brl(projection.finalFinanceNetWorth)}</strong>
              </div>
              <div>
                <span>Final investindo</span>
                <strong>{brl(projection.finalInvestNetWorth)}</strong>
              </div>
              <div>
                <span>Vantagem relativa</span>
                <strong>{(projection.differencePercent * 100).toFixed(1)}%</strong>
              </div>
            </div>
            <MonthlyDetailsTable data={projection.months} />
          </>
        ) : (
          <div className="text-xs text-text-muted">Preencha os campos com números válidos.</div>
        )}
      </div>
    </section>
  );
}
