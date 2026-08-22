import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import FinanceVsInvest from "./FinanceVsInvest.tsx";
import InvestmentProjection from "./InvestmentProjection.tsx";
import "../financing-workspace.css";

// Promoted financing workspace. The former I2-D study is now the production flow.
// Palette C is the production theme: blue financing, green investment, blue comparison.

const BASE_URL = import.meta.env.BASE_URL;

type Method = "SAC" | "PRICE";
type SliderKey = "property" | "entry" | "financingRate" | "ownershipRate" | "budget" | "termMonths" | "analysisYears";

type FinancingState = {
  property: number;
  entry: number;
  financingRate: number;
  ownershipRate: number;
  budget: number;
  termMonths: number;
  analysisYears: number;
  method: Method;
};

type ScheduleRow = { month: number; payment: number; interest: number; amortization: number; balance: number };
type Calculation = {
  financedAmount: number;
  financingPayment: number;
  financingPaymentEnd: number;
  initialHousingCost: number;
  budgetRemaining: number;
  totalPaid: number;
  totalInterest: number;
  termEndBalance: number;
  analysisDebt: number;
  analysisProperty: number;
  schedule: ScheduleRow[];
  balancePoints: number[];
  paymentPoints: number[];
};

type Study = {
  id: number;
  label: string;
  state: FinancingState;
  payment: number;
  housingCost: number;
};

type QuickAction = {
  label: string;
  detail: string;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
};

type LayoutProps = {
  state: FinancingState;
  result: Calculation;
  update: (patch: Partial<FinancingState>) => void;
  reset: () => void;
  fitBudget: () => void;
  studies: Study[];
  saveStudy: (label?: string) => void;
  loadStudy: (id: number) => void;
  removeStudy: (id: number) => void;
  clearStudies: () => void;
};

type SliderSpec = {
  key: SliderKey;
  label: string;
  short: string;
  min: number;
  max: number;
  step: number;
  get: (state: FinancingState) => number;
  patch: (value: number) => Partial<FinancingState>;
  format: (value: number) => string;
};

type FieldInteractionProps = {
  activeKey?: SliderKey;
  onFocusSlider?: (key: SliderKey) => void;
  onSelectSlider?: (key: SliderKey) => void;
};

const DEFAULTS: FinancingState = {
  property: 600000,
  entry: 120000,
  financingRate: 10,
  ownershipRate: 0.4,
  budget: 4200,
  termMonths: 420,
  analysisYears: 35,
  method: "SAC",
};

function money(value: number, compact = false) {
  if (compact && Math.abs(value) >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(2).replace(".", ",")} mi`;
  if (compact && Math.abs(value) >= 1_000) return `R$ ${Math.round(value / 1_000)} mil`;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);
}

function decimal(value: number) {
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

const SLIDER_SPECS: Record<SliderKey, SliderSpec> = {
  property: {
    key: "property",
    label: "Valor do imóvel",
    short: "Imóvel",
    min: 250000,
    max: 1500000,
    step: 10000,
    get: (state) => state.property,
    patch: (value) => ({ property: value }),
    format: (value) => money(value, true),
  },
  entry: {
    key: "entry",
    label: "Entrada",
    short: "Entrada",
    min: 0,
    max: 600000,
    step: 10000,
    get: (state) => state.entry,
    patch: (value) => ({ entry: value }),
    format: (value) => money(value, true),
  },
  financingRate: {
    key: "financingRate",
    label: "Juros do financiamento",
    short: "Juros",
    min: 4,
    max: 18,
    step: 0.5,
    get: (state) => state.financingRate,
    patch: (value) => ({ financingRate: value }),
    format: (value) => `${decimal(value)}% a.a.`,
  },
  ownershipRate: {
    key: "ownershipRate",
    label: "Custo de posse",
    short: "Posse",
    min: 0,
    max: 2,
    step: 0.1,
    get: (state) => state.ownershipRate,
    patch: (value) => ({ ownershipRate: value }),
    format: (value) => `${decimal(value)}% a.a.`,
  },
  budget: {
    key: "budget",
    label: "Orçamento mensal",
    short: "Orçamento",
    min: 1500,
    max: 12000,
    step: 100,
    get: (state) => state.budget,
    patch: (value) => ({ budget: value }),
    format: (value) => money(value, true),
  },
  termMonths: {
    key: "termMonths",
    label: "Prazo do financiamento",
    short: "Prazo",
    min: 5,
    max: 40,
    step: 1,
    get: (state) => state.termMonths / 12,
    patch: (value) => ({ termMonths: value * 12 }),
    format: (value) => `${value} anos`,
  },
  analysisYears: {
    key: "analysisYears",
    label: "Horizonte para avaliar",
    short: "Horizonte",
    min: 1,
    max: 40,
    step: 1,
    get: (state) => state.analysisYears,
    patch: (value) => ({ analysisYears: value }),
    format: (value) => `${value} anos`,
  },
};

const PRIMARY_SLIDER_KEYS: SliderKey[] = ["property", "entry", "financingRate", "termMonths"];

function calculate(state: FinancingState): Calculation {
  const analysisMonths = Math.max(12, Math.round(state.analysisYears * 12));
  const termMonths = Math.max(12, Math.round(state.termMonths));
  const monthsToCalculate = Math.max(analysisMonths, termMonths);
  const financedAmount = Math.max(0, state.property - state.entry);
  const monthlyRate = state.financingRate / 100 / 12;
  const pricePayment = monthlyRate === 0
    ? financedAmount / termMonths
    : financedAmount * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / (Math.pow(1 + monthlyRate, termMonths) - 1);
  const fixedAmortization = financedAmount / termMonths;
  let debt = financedAmount;
  let propertyValue = state.property;
  let firstPayment = 0;
  let finalPayment = 0;
  let totalPaid = 0;
  let totalInterest = 0;
  let analysisDebt = financedAmount;
  let analysisProperty = state.property;
  const schedule: ScheduleRow[] = [];
  const balancePoints: number[] = [];
  const paymentPoints: number[] = [];

  for (let month = 1; month <= monthsToCalculate; month += 1) {
    propertyValue *= 1 + (Math.pow(1 + 5 / 100, 1 / 12) - 1);
    const interest = month <= termMonths ? debt * monthlyRate : 0;
    const amortization = month <= termMonths
      ? state.method === "SAC" ? Math.min(debt, fixedAmortization) : Math.min(debt, Math.max(0, pricePayment - interest))
      : 0;
    const payment = month <= termMonths ? amortization + interest : 0;
    debt = Math.max(0, debt - amortization);
    if (month === 1) firstPayment = payment;
    if (month === termMonths) finalPayment = payment;
    if (month <= termMonths) {
      totalPaid += payment;
      totalInterest += interest;
      schedule.push({ month, payment, interest, amortization, balance: debt });
    }
    if (month === analysisMonths) {
      analysisDebt = debt;
      analysisProperty = propertyValue;
    }
    if (month === 1 || month % 12 === 0) {
      balancePoints.push(debt);
      paymentPoints.push(payment);
    }
  }

  return {
    financedAmount,
    financingPayment: firstPayment,
    financingPaymentEnd: finalPayment,
    initialHousingCost: firstPayment + state.property * state.ownershipRate / 100 / 12,
    budgetRemaining: state.budget - firstPayment - state.property * state.ownershipRate / 100 / 12,
    totalPaid,
    totalInterest,
    termEndBalance: schedule[schedule.length - 1]?.balance ?? 0,
    analysisDebt,
    analysisProperty,
    schedule,
    balancePoints,
    paymentPoints,
  };
}

function budgetPatch(state: FinancingState) {
  const termMonths = Math.max(12, Math.round(state.termMonths));
  const monthlyRate = state.financingRate / 100 / 12;
  const ownershipCost = state.property * state.ownershipRate / 100 / 12;
  const availableForPayment = Math.max(0, state.budget - ownershipCost);
  const paymentFactor = state.method === "SAC"
    ? 1 / termMonths + monthlyRate
    : monthlyRate === 0
      ? 1 / termMonths
      : monthlyRate * Math.pow(1 + monthlyRate, termMonths) / (Math.pow(1 + monthlyRate, termMonths) - 1);
  const financedAmount = availableForPayment / Math.max(paymentFactor, Number.EPSILON);
  const entry = Math.min(state.property, Math.max(0, state.property - financedAmount));
  return { entry };
}

function clampSliderValue(spec: SliderSpec, value: number) {
  const stepped = spec.min + Math.round((value - spec.min) / spec.step) * spec.step;
  return Math.min(spec.max, Math.max(spec.min, stepped));
}

function sliderValue(key: SliderKey, state: FinancingState) {
  const spec = SLIDER_SPECS[key];
  return clampSliderValue(spec, spec.get(state));
}

function Brand() {
  return <div className="lp-brand"><img src={`${BASE_URL}logo.svg`} alt="" /><span>muda</span></div>;
}


function TopBar({ caption, action }: { caption: string; action?: ReactNode }) {
  return <header className="lp-topbar"><Brand /><span className="lp-topbar-caption">{caption}</span><div className="lp-topbar-actions">{action ?? <button type="button" className="lp-quiet-button">⋯</button>}</div></header>;
}

function Button({ children, onClick, secondary = false }: { children: ReactNode; onClick?: () => void; secondary?: boolean }) {
  return <button type="button" onClick={onClick} className={`lp-button${secondary ? " lp-button-secondary" : ""}`}>{children}</button>;
}

function NumberField({ label, value, onChange, suffix, step = 1, sliderKey, activeKey, onFocusSlider, onSelectSlider }: { label: string; value: number; onChange: (value: number) => void; suffix: string; step?: number; sliderKey: SliderKey } & FieldInteractionProps) {
  const active = activeKey === sliderKey;
  return <label className={`lp-field${active ? " active" : ""}`}><span>{label}</span><div><input type="number" inputMode="decimal" value={value} step={step} onFocus={() => onFocusSlider?.(sliderKey)} onChange={(event) => onChange(Number(event.currentTarget.value) || 0)} /><small>{suffix}</small>{onSelectSlider && <button type="button" className="lp-field-slider-button" aria-label={`Ajustar ${label} na barra`} aria-pressed={active} onClick={(event) => { event.preventDefault(); event.stopPropagation(); onSelectSlider(sliderKey); }}>↕</button>}</div></label>;
}


function MethodToggle({ value, onChange }: { value: Method; onChange: (value: Method) => void }) {
  return <div className="lp-method-toggle"><span>Sistema de amortização</span><button type="button" className={value === "SAC" ? "active" : ""} onClick={() => onChange("SAC")}>SAC</button><button type="button" className={value === "PRICE" ? "active" : ""} onClick={() => onChange("PRICE")}>PRICE</button></div>;
}

function FinancingFields({ state, update, compact = false, title, interaction = {} }: { state: FinancingState; update: (patch: Partial<FinancingState>) => void; compact?: boolean; title?: string; interaction?: FieldInteractionProps }) {
  const fieldProps = { ...interaction };
  return <section className={`lp-financing-fields${compact ? " compact" : ""}`}><header><div><span className="lp-kicker">CALCULADORA DE FINANCIAMENTO</span><h2>{title ?? (compact ? "Comece pelo essencial" : "Defina o empréstimo")}</h2></div><span className="lp-step">01</span></header><div className="lp-fields-grid"><NumberField label="Valor do imóvel" value={state.property} onChange={(property) => update({ property })} suffix="R$" step={10000} sliderKey="property" {...fieldProps} /><NumberField label="Entrada" value={state.entry} onChange={(entry) => update({ entry })} suffix="R$" step={10000} sliderKey="entry" {...fieldProps} /><NumberField label="Juros do financiamento" value={state.financingRate} onChange={(financingRate) => update({ financingRate })} suffix="% a.a." step={0.5} sliderKey="financingRate" {...fieldProps} /><NumberField label="Prazo do financiamento" value={Math.round(state.termMonths / 12)} onChange={(years) => update({ termMonths: years * 12 })} suffix="anos" step={1} sliderKey="termMonths" {...fieldProps} />{!compact && <NumberField label="Custo de posse" value={state.ownershipRate} onChange={(ownershipRate) => update({ ownershipRate })} suffix="% a.a." step={0.1} sliderKey="ownershipRate" {...fieldProps} />}{!compact && <NumberField label="Orçamento mensal" value={state.budget} onChange={(budget) => update({ budget })} suffix="R$/mês" step={100} sliderKey="budget" {...fieldProps} />}</div><MethodToggle value={state.method} onChange={(method) => update({ method })} /></section>;
}

function AdvancedFields({ state, update, interaction = {} }: { state: FinancingState; update: (patch: Partial<FinancingState>) => void; interaction?: FieldInteractionProps }) {
  return <section className="lp-advanced-fields"><span className="lp-kicker">DETALHES AVANÇADOS</span><div className="lp-fields-grid"><NumberField label="Custo de posse" value={state.ownershipRate} onChange={(ownershipRate) => update({ ownershipRate })} suffix="% a.a." step={0.1} sliderKey="ownershipRate" {...interaction} /><NumberField label="Orçamento mensal" value={state.budget} onChange={(budget) => update({ budget })} suffix="R$/mês" step={100} sliderKey="budget" {...interaction} /></div></section>;
}

function AdvancedEditor({ state, update, interaction = {} }: { state: FinancingState; update: (patch: Partial<FinancingState>) => void; interaction?: FieldInteractionProps }) {
  const [open, setOpen] = useState(false);
  return <div className="lp-advanced-editor"><button type="button" className="lp-advanced-trigger" onClick={() => setOpen(!open)}><span>{open ? "Fechar detalhes avançados" : "Abrir detalhes avançados"}</span><b>{open ? "↑" : "↓"}</b></button>{open && <AdvancedFields state={state} update={update} interaction={interaction} />}</div>;
}

function StudyShelf({ studies, currentPayment, loadStudy, removeStudy, clearStudies }: { studies: Study[]; currentPayment: number; loadStudy: (id: number) => void; removeStudy: (id: number) => void; clearStudies: () => void }) {
  return <div className="lp-study-shelf"><header><span className="lp-kicker">COMPARAR ESTUDOS</span><button type="button" onClick={clearStudies}>Limpar</button></header><div className="lp-study-list">{[...studies].reverse().map((study) => { const difference = study.payment - currentPayment; const differenceLabel = Math.abs(difference) < 1 ? "igual ao atual" : `${difference > 0 ? "+" : "−"}${money(Math.abs(difference))} vs atual`; return <article className="lp-study-card" key={study.id}><button type="button" className="lp-study-load" onClick={() => loadStudy(study.id)}><span><b>{study.label}</b><small>{money(study.state.property, true)} · {study.state.method}</small></span><strong>{money(study.payment)}</strong><em className={difference > 0 ? "higher" : difference < 0 ? "lower" : "same"}>{differenceLabel}</em></button><button type="button" className="lp-study-remove" aria-label={`Remover ${study.label}`} onClick={() => removeStudy(study.id)}>×</button></article>; })}</div><p>Toque em um estudo para carregá-lo. A diferença compara a prestação salva com a atual.</p></div>;
}

function QuickActions({ title, helper, actions, studies, currentPayment, loadStudy, removeStudy, clearStudies }: { title: string; helper: string; actions: QuickAction[]; studies: Study[]; currentPayment: number; loadStudy: (id: number) => void; removeStudy: (id: number) => void; clearStudies: () => void }) {
  return <section className="lp-quick-actions"><header><div><span className="lp-kicker">AÇÕES RÁPIDAS</span><h3>{title}</h3></div><span className="lp-study-count">{studies.length ? `${studies.length} salvos` : "sem estudos"}</span></header><p className="lp-quick-helper">{helper}</p><div className="lp-quick-action-grid">{actions.map((action) => <button type="button" key={action.label} className={`lp-quick-action${action.primary ? " primary" : ""}`} disabled={action.disabled} onClick={action.onClick}><span>{action.label}</span><small>{action.detail}</small><b>→</b></button>)}</div>{studies.length > 0 ? <StudyShelf studies={studies} currentPayment={currentPayment} loadStudy={loadStudy} removeStudy={removeStudy} clearStudies={clearStudies} /> : <div className="lp-empty-studies">Salve uma simulação para criar uma referência e comparar outras combinações.</div>}</section>;
}

function ResultNumber({ label, value, note = "", tone = "" }: { label: string; value: string; note?: string; tone?: string }) {
  return <div className={`lp-result-number ${tone}`}><span>{label}</span><strong>{value}</strong>{note && <small>{note}</small>}</div>;
}

function FinancingSummary({ result, state }: { result: Calculation; state: FinancingState }) {
  return <div className="lp-financing-summary"><ResultNumber label="Valor financiado" value={money(result.financedAmount, true)} /><ResultNumber label="Custo mensal inicial" value={money(result.initialHousingCost)} note={result.budgetRemaining >= 0 ? `${money(result.budgetRemaining)} livres no orçamento` : `${money(Math.abs(result.budgetRemaining))} acima do orçamento`} tone={result.budgetRemaining >= 0 ? "positive" : "warning"} /><ResultNumber label="Juros totais" value={money(result.totalInterest, true)} note={`${state.method} · ${Math.round(state.termMonths / 12)} anos`} /><ResultNumber label="Saldo no fim do prazo" value={money(result.termEndBalance, true)} note="deve chegar a zero" /></div>;
}

function InstallmentList({ result }: { result: Calculation }) {
  const [mode, setMode] = useState<"yearly" | "monthly">("yearly");
  const visibleRows = mode === "monthly" ? result.schedule : result.schedule.filter((row) => row.month <= 12 || row.month % 12 === 0);
  return <div className="lp-installment-list"><header><div><span className="lp-kicker">DETALHES DO FINANCIAMENTO</span><h3>{mode === "yearly" ? "Resumo anual" : "Todas as parcelas"}</h3></div><div className="lp-list-toggle"><button type="button" className={mode === "yearly" ? "active" : ""} onClick={() => setMode("yearly")}>Anual</button><button type="button" className={mode === "monthly" ? "active" : ""} onClick={() => setMode("monthly")}>Mensal</button></div></header><div className="lp-schedule-table"><div className="lp-schedule-head"><span>Parcela</span><span>Pagamento</span><span>Amortização</span><span>Juros</span><span>Saldo</span></div>{visibleRows.map((row) => <div className="lp-schedule-row" key={row.month}><span><b>{row.month}</b><small>{row.month <= 12 ? "primeiro ano" : `ano ${Math.ceil(row.month / 12)}`}</small></span><strong>{money(row.payment)}</strong><span>{money(row.amortization, true)}</span><span>{money(row.interest, true)}</span><span>{money(row.balance, true)}</span></div>)}</div><footer>{mode === "monthly" ? `${visibleRows.length} parcelas exibidas` : `${visibleRows.length} pontos no tempo · troque para Mensal para ver todas`}</footer></div>;
}

function FinancingResult({ result, state }: { result: Calculation; state: FinancingState }) {
  const [open, setOpen] = useState(false);
  return <section className="lp-financing-result"><div className="lp-payment-hero"><span className="lp-kicker">PRESTAÇÃO ESTIMADA</span><strong>{money(result.financingPayment)}</strong><p>{state.method} · primeira parcela · {money(result.financingPaymentEnd)} na última parcela do prazo</p><button type="button" onClick={() => setOpen(!open)}>{open ? "Fechar detalhes" : "Abrir lista de parcelas"}<b>{open ? "↑" : "↓"}</b></button></div><FinancingSummary result={result} state={state} />{open && <InstallmentList result={result} />}</section>;
}

function PaymentChart({ result }: { result: Calculation }) {
  const [open, setOpen] = useState(false);
  const values = [...result.balancePoints, ...result.paymentPoints];
  const min = Math.min(...values) * .88;
  const max = Math.max(...values) * 1.03;
  const points = (series: number[]) => series.map((value, index) => `${(index / Math.max(1, series.length - 1)) * 520},${165 - ((value - min) / Math.max(1, max - min)) * 140}`).join(" ");
  return <section className="lp-payment-chart"><button type="button" onClick={() => setOpen(!open)}><span>{open ? "Ocultar evolução" : "Ver evolução do saldo e da parcela"}</span><b>{open ? "−" : "+"}</b></button>{open && <div><svg viewBox="0 0 520 180" role="img" aria-label="Evolução do saldo devedor e da prestação"><path className="lp-chart-grid" d="M0 25H520M0 80H520M0 135H520" /><polyline className="lp-chart-balance" points={points(result.balancePoints)} /><polyline className="lp-chart-payment" points={points(result.paymentPoints)} /></svg><div className="lp-chart-legend"><span><i className="balance" /> Saldo devedor</span><span><i className="payment" /> Prestação</span></div></div>}</section>;
}

function SliderTargets({ state, activeKey, onChange, keys }: { state: FinancingState; activeKey: SliderKey; onChange: (key: SliderKey) => void; keys: readonly SliderKey[] }) {
  return <div className="lp-slider-targets" role="tablist" aria-label="Variável controlada pela barra">{keys.map((key) => { const spec = SLIDER_SPECS[key]; return <button type="button" key={key} className={activeKey === key ? "active" : ""} role="tab" aria-selected={activeKey === key} onClick={() => onChange(key)}><span>{spec.short}</span><b>{spec.format(sliderValue(key, state))}</b></button>; })}</div>;
}

function SliderPanel({ state, update, activeKey, onChangeActive, targetKeys, mode, title, helper, showTargets = false, showNudge = false }: { state: FinancingState; update: (patch: Partial<FinancingState>) => void; activeKey: SliderKey; onChangeActive?: (key: SliderKey) => void; targetKeys?: readonly SliderKey[]; mode: string; title: string; helper: string; showTargets?: boolean; showNudge?: boolean }) {
  const spec = SLIDER_SPECS[activeKey];
  const value = sliderValue(activeKey, state);
  const change = (nextValue: number) => update(spec.patch(clampSliderValue(spec, nextValue)));
  const nudge = (direction: number) => change(value + direction * spec.step);
  return <section className={`lp-slider-panel lp-slider-${mode}`}><header><div><span className="lp-kicker">BARRA DE AJUSTE</span><h3>{title}</h3><p>{helper}</p></div><output>{spec.format(value)}</output></header>{showTargets && <SliderTargets state={state} activeKey={activeKey} onChange={onChangeActive ?? (() => undefined)} keys={targetKeys ?? PRIMARY_SLIDER_KEYS} />}<div className="lp-slider-current"><span>Ajustando</span><strong>{spec.label}</strong></div><input className="lp-main-slider" type="range" min={spec.min} max={spec.max} step={spec.step} value={value} aria-label={`Ajustar ${spec.label}`} onChange={(event) => change(Number(event.currentTarget.value))} /><div className="lp-slider-scale"><span>{spec.format(spec.min)}</span><span>{spec.format(spec.max)}</span></div>{showNudge && <div className="lp-slider-nudge"><button type="button" onClick={() => nudge(-1)} aria-label={`Diminuir ${spec.label}`}>−</button><span>{spec.format(spec.step)} por toque</span><button type="button" onClick={() => nudge(1)} aria-label={`Aumentar ${spec.label}`}>+</button></div>}</section>;
}

function Heading({ kicker, title, description }: { kicker: string; title: ReactNode; description: string }) {
  return <header className="lp-mobile-heading"><span className="lp-kicker">{kicker}</span><h1>{title}</h1><p>{description}</p></header>;
}




type Environment = "financing" | "investment" | "comparison";

function EnvironmentTabs({ value, onChange }: { value: Environment; onChange: (value: Environment) => void }) {
  return <nav className="lp-environment-tabs" role="tablist" aria-label="Ambientes financeiros"><button type="button" role="tab" aria-selected={value === "financing"} className={value === "financing" ? "active" : ""} onClick={() => onChange("financing")}>Financiar</button><button type="button" role="tab" aria-selected={value === "investment"} className={value === "investment" ? "active" : ""} onClick={() => onChange("investment")}>Investir</button><button type="button" role="tab" aria-selected={value === "comparison"} className={value === "comparison" ? "active" : ""} onClick={() => onChange("comparison")}>Comparar</button></nav>;
}


function InvestmentEnvironment({ financingEntry }: { financingEntry: number }) {
  return <div className="lp-layout lp-layout-investment"><TopBar caption="Ambiente · investimento de renda fixa" action={<span className="lp-topbar-mode">RENDA FIXA</span>} /><main className="lp-mobile-main lp-investment-main"><Heading kicker="INVESTIR · RENDA FIXA" title={<>Quanto pode<br />acumular?</>} description="Calcule saldo final, aportes e rendimento. A entrada do financiamento pode ser usada como saldo inicial." /><section className="lp-investment-card"><InvestmentProjection financingEntry={financingEntry} /></section></main></div>;
}

function ComparisonEnvironment() {
  return <div className="lp-layout lp-layout-comparison"><TopBar caption="Ambiente · financiar vs investir" action={<span className="lp-topbar-mode">COMPARAÇÃO</span>} /><main className="lp-mobile-main lp-comparison-main"><Heading kicker="COMPARAR ESTRATÉGIAS" title={<>Financiar<br />ou investir?</>} description="Coloque as duas estratégias lado a lado e veja patrimônio, fluxo mensal e ponto de virada." /><section className="lp-comparison-card"><FinanceVsInvest /></section></main></div>;
}

function FinancingView({ props }: { props: LayoutProps }) {
  const { state, result, update, reset, fitBudget, studies, saveStudy, loadStudy, removeStudy, clearStudies } = props;
  const [activeKey, setActiveKey] = useState<SliderKey>("termMonths");
  const toggleMethod = () => update({ method: state.method === "SAC" ? "PRICE" : "SAC" });
  const extendTerm = () => update({ termMonths: Math.min(480, state.termMonths + 60) });
  const lowerRate = () => update({ financingRate: Math.max(4, state.financingRate - .5) });
  const increaseRate = () => update({ financingRate: Math.min(18, state.financingRate + .5) });
  const actions: QuickAction[] = [
    { label: state.method === "SAC" ? "Testar PRICE" : "Voltar ao SAC", detail: "alternar o sistema de amortização", onClick: toggleMethod, primary: true },
    { label: "Salvar comparação", detail: "guardar este método", onClick: () => saveStudy("Comparação") },
    { label: "Prazo +5 anos", detail: "testar o efeito no pagamento", onClick: extendTerm },
    { label: "Juros −0,5 p.p.", detail: "simular uma taxa menor", onClick: lowerRate },
    { label: "Juros +0,5 p.p.", detail: "simular uma taxa maior", onClick: increaseRate },
  ];
  return <div className="lp-layout lp-layout-financing"><TopBar caption="Ambiente · financiamento" action={<Button secondary onClick={reset}>Novo cenário</Button>} /><main className="lp-mobile-main"><Heading kicker="FINANCIAMENTO · SAC OU PRICE" title={<>Troque o método.<br />Veja a parcela.</>} description="O botão rápido alterna SAC e PRICE sem abrir detalhes; salve os dois para comparar depois." /><QuickActions title="Compare mecanismos" helper="A prestação muda de forma diferente em cada sistema. Guarde os dois estados." actions={actions} studies={studies} currentPayment={result.financingPayment} loadStudy={loadStudy} removeStudy={removeStudy} clearStudies={clearStudies} /><FinancingFields state={state} update={update} compact title="Defina o essencial" interaction={{ activeKey, onSelectSlider: setActiveKey }} /><SliderPanel state={state} update={update} activeKey={activeKey} onChangeActive={setActiveKey} targetKeys={["termMonths", "entry", "property", "financingRate"]} mode="explicit" title="Controle escolhido" helper="A barra ajusta a variável marcada nos campos ou na faixa." showTargets /><AdvancedEditor state={state} update={update} interaction={{ activeKey, onSelectSlider: setActiveKey }} /><FinancingResult result={result} state={state} /><PaymentChart result={result} /></main></div>;
}


const STUDIES_STORAGE_KEY = "muda.financing.studies.v1";

function isFinancingState(value: unknown): value is FinancingState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<FinancingState>;
  return [state.property, state.entry, state.financingRate, state.ownershipRate, state.budget, state.termMonths, state.analysisYears].every(Number.isFinite)
    && (state.method === "SAC" || state.method === "PRICE");
}

function readSavedStudies(): Study[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STUDIES_STORAGE_KEY) ?? "null") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is Study => {
      if (!item || typeof item !== "object") return false;
      const study = item as Partial<Study>;
      return Number.isFinite(study.id)
        && typeof study.label === "string"
        && isFinancingState(study.state)
        && Number.isFinite(study.payment)
        && Number.isFinite(study.housingCost);
    }).slice(-8);
  } catch {
    return [];
  }
}

function persistStudies(studies: Study[]) {
  try {
    localStorage.setItem(STUDIES_STORAGE_KEY, JSON.stringify(studies));
  } catch {
    // Saving is optional if browser storage is unavailable or full.
  }
}

export default function FinancingWorkspace() {
  const [environment, setEnvironment] = useState<Environment>("financing");
  const [state, setState] = useState<FinancingState>(DEFAULTS);
  const [studies, setStudies] = useState<Study[]>(readSavedStudies);
  const nextStudyId = useRef(studies.reduce((highest, study) => Math.max(highest, study.id), 0));
  const result = useMemo(() => calculate(state), [state]);
  const update = useCallback((patch: Partial<FinancingState>) => setState((previous) => ({ ...previous, ...patch })), []);
  const reset = useCallback(() => setState(DEFAULTS), []);
  const fitBudget = useCallback(() => setState((previous) => ({ ...previous, ...budgetPatch(previous) })), []);
  const saveStudy = useCallback((label = "Estudo") => {
    nextStudyId.current += 1;
    const id = nextStudyId.current;
    setStudies((previous) => [...previous, { id, label: `${label} ${String(id).padStart(2, "0")}`, state, payment: result.financingPayment, housingCost: result.initialHousingCost }].slice(-8));
  }, [result, state]);
  const loadStudy = useCallback((id: number) => {
    const study = studies.find((candidate) => candidate.id === id);
    if (study) setState(study.state);
  }, [studies]);
  const removeStudy = useCallback((id: number) => setStudies((previous) => previous.filter((study) => study.id !== id)), []);
  const clearStudies = useCallback(() => setStudies([]), []);

  useEffect(() => {
    persistStudies(studies);
  }, [studies]);

  const props: LayoutProps = { state, result, update, reset, fitBudget, studies, saveStudy, loadStudy, removeStudy, clearStudies };
  return <div className={`financing-workspace palette-c${environment !== "financing" ? " financing-workspace-secondary" : ""}`}><EnvironmentTabs value={environment} onChange={setEnvironment} />{environment === "financing" ? <FinancingView props={props} /> : environment === "investment" ? <InvestmentEnvironment financingEntry={state.entry} /> : <ComparisonEnvironment />}</div>;
}
