import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import FinanceVsInvest from "./FinanceVsInvest.tsx";
import InvestmentProjection from "./InvestmentProjection.tsx";


// Promoted financing workspace. The former I2-D study is now the production flow.
// Palette C is the production theme: blue financing, green investment, blue comparison.

const BASE_URL = import.meta.env.BASE_URL;

type Method = "SAC" | "PRICE";
type SliderKey =
  | "property"
  | "entry"
  | "financingRate"
  | "ownershipRate"
  | "budget"
  | "termMonths"
  | "analysisYears";

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

type ScheduleRow = {
  month: number;
  payment: number;
  interest: number;
  amortization: number;
  balance: number;
};
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
  if (compact && Math.abs(value) >= 1_000_000)
    return `R$ ${(value / 1_000_000).toFixed(2).replace(".", ",")} mi`;
  if (compact && Math.abs(value) >= 1_000)
    return `R$ ${Math.round(value / 1_000)} mil`;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
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

const PRIMARY_SLIDER_KEYS: SliderKey[] = [
  "property",
  "entry",
  "financingRate",
  "termMonths",
];

function calculate(state: FinancingState): Calculation {
  const analysisMonths = Math.max(12, Math.round(state.analysisYears * 12));
  const termMonths = Math.max(12, Math.round(state.termMonths));
  const monthsToCalculate = Math.max(analysisMonths, termMonths);
  const financedAmount = Math.max(0, state.property - state.entry);
  const monthlyRate = state.financingRate / 100 / 12;
  const pricePayment =
    monthlyRate === 0
      ? financedAmount / termMonths
      : (financedAmount *
          (monthlyRate * Math.pow(1 + monthlyRate, termMonths))) /
        (Math.pow(1 + monthlyRate, termMonths) - 1);
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
    const amortization =
      month <= termMonths
        ? state.method === "SAC"
          ? Math.min(debt, fixedAmortization)
          : Math.min(debt, Math.max(0, pricePayment - interest))
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
    initialHousingCost:
      firstPayment + (state.property * state.ownershipRate) / 100 / 12,
    budgetRemaining:
      state.budget -
      firstPayment -
      (state.property * state.ownershipRate) / 100 / 12,
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
  const ownershipCost = (state.property * state.ownershipRate) / 100 / 12;
  const availableForPayment = Math.max(0, state.budget - ownershipCost);
  const paymentFactor =
    state.method === "SAC"
      ? 1 / termMonths + monthlyRate
      : monthlyRate === 0
        ? 1 / termMonths
        : (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
          (Math.pow(1 + monthlyRate, termMonths) - 1);
  const financedAmount =
    availableForPayment / Math.max(paymentFactor, Number.EPSILON);
  const entry = Math.min(
    state.property,
    Math.max(0, state.property - financedAmount),
  );
  return { entry };
}

function clampSliderValue(spec: SliderSpec, value: number) {
  const stepped =
    spec.min + Math.round((value - spec.min) / spec.step) * spec.step;
  return Math.min(spec.max, Math.max(spec.min, stepped));
}

function sliderValue(key: SliderKey, state: FinancingState) {
  const spec = SLIDER_SPECS[key];
  return clampSliderValue(spec, spec.get(state));
}

function Brand() {
  return (
    <div className="flex shrink-0 items-center gap-1.75 text-(--lp-heading)">
      <img
        className="size-7.5 shrink-0 object-contain"
        src={`${BASE_URL}logo.svg`}
        alt=""
      />
      <span className="text-[21px] font-black tracking-[-.07em]">muda</span>
    </div>
  );
}

function TopBar({ caption, action }: { caption: string; action?: ReactNode }) {
  return (
    <header className="sticky top-11.75 z-5 flex min-h-15.5 items-center gap-2.5 border-b border-(--lp-line) bg-(--lp-paper) px-3.5 py-2.5">
      <Brand />
      <span className="min-w-0 flex-1 overflow-hidden text-(--lp-muted) font-mono text-[9px] text-ellipsis whitespace-nowrap max-[420px]:text-[8px]">
        {caption}
      </span>
      <div className="flex shrink-0 items-center gap-1.5">
        {action ?? (
          <button
            type="button"
            className="min-h-10 min-w-10 border-0 bg-transparent p-1.25 text-inherit text-[20px] leading-none"
          >
            ⋯
          </button>
        )}
      </div>
    </header>
  );
}

function Button({
  children,
  onClick,
  secondary = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  secondary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-10 rounded-lg border px-3 text-[10px] font-extrabold ${secondary ? "border-(--lp-line) bg-(--lp-paper) text-(--lp-ink)" : "border-(--lp-ink) bg-(--lp-ink) text-white"}`}
    >
      {children}
    </button>
  );
}

function NumberField({
  label,
  value,
  onChange,
  suffix,
  step = 1,
  sliderKey,
  activeKey,
  onFocusSlider,
  onSelectSlider,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix: string;
  step?: number;
  sliderKey: SliderKey;
} & FieldInteractionProps) {
  const active = activeKey === sliderKey;
  return (
    <label className="grid min-w-0 gap-1.25">
      <span className="text-(--lp-muted) text-[9px] font-extrabold">{label}</span>
      <div
        className={`flex min-h-12 min-w-0 items-center rounded-[5px] border border-(--lp-line) bg-[color-mix(in_srgb,var(--lp-paper)_76%,transparent)] transition-[border-color,box-shadow] duration-150 ease-[ease]${active ? " border-(--lp-accent)!" : ""}`}
      >
        <input
          type="number"
          inputMode="decimal"
          value={value}
          step={step}
          className="w-full min-w-0 border-0 bg-transparent p-[10px_5px_10px_10px] text-(--lp-ink) font-mono text-[13px] font-extrabold outline-0 focus:shadow-[inset_0_0_0_2px_var(--lp-accent)] max-[420px]:text-[12px]"
          onFocus={() => onFocusSlider?.(sliderKey)}
          onChange={(event) => onChange(Number(event.currentTarget.value) || 0)}
        />
        <small className="whitespace-nowrap pr-1.75 text-(--lp-muted) text-[8px] max-[420px]:pr-1 max-[420px]:text-[7px]">{suffix}</small>
        {onSelectSlider && (
          <button
            type="button"
            className="grid h-7.5 w-7.75 shrink-0 place-items-center border-0 border-l border-(--lp-line) bg-transparent pr-0 text-(--lp-muted) text-[15px] leading-none hover:text-(--lp-accent) aria-pressed:text-(--lp-accent)"
            aria-label={`Ajustar ${label} na barra`}
            aria-pressed={active}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onSelectSlider(sliderKey);
            }}
          >
            ↕
          </button>
        )}
      </div>
    </label>
  );
}

function MethodToggle({
  value,
  onChange,
}: {
  value: Method;
  onChange: (value: Method) => void;
}) {
  return (
    <div className="mt-4.25 flex items-center gap-1.25 border-t border-(--lp-line) pt-3.5">
      <span className="flex-1 text-(--lp-muted) text-[9px]">Sistema de amortização</span>
      <button
        type="button"
        className={`min-h-9 rounded-[6px] border border-(--lp-line) bg-transparent px-2.5 text-(--lp-muted) text-[9px] font-black ${
          value === "SAC"
            ? "border-(--lp-ink)! bg-(--lp-ink)! text-white!"
            : ""
        }`}
        onClick={() => onChange("SAC")}
      >
        SAC
      </button>
      <button
        type="button"
        className={`min-h-9 rounded-[6px] border border-(--lp-line) bg-transparent px-2.5 text-(--lp-muted) text-[9px] font-black ${
          value === "PRICE"
            ? "border-(--lp-ink)! bg-(--lp-ink)! text-white!"
            : ""
        }`}
        onClick={() => onChange("PRICE")}
      >
        PRICE
      </button>
    </div>
  );
}

function FinancingFields({
  state,
  update,
  compact = false,
  title,
  interaction = {},
}: {
  state: FinancingState;
  update: (patch: Partial<FinancingState>) => void;
  compact?: boolean;
  title?: string;
  interaction?: FieldInteractionProps;
}) {
  const fieldProps = { ...interaction };
  return (
    <section
      className={`border border-(--lp-line) bg-(--lp-paper) ${compact ? "rounded-[10px] p-3.75" : "rounded-[14px] p-4.25 max-[420px]:p-3.75"}`}
    >
      <header className="mb-4.25 flex items-start justify-between gap-3">
        <div>
          <span className="text-(--lp-muted) text-[9px] font-black tracking-[.14em] uppercase">CALCULADORA DE FINANCIAMENTO</span>
          <h2 className="mt-1.25 text-[20px] tracking-[-.06em]">
            {title ??
              (compact ? "Comece pelo essencial" : "Defina o empréstimo")}
          </h2>
        </div>
        <span className="grid size-7 place-items-center rounded-full bg-(--lp-accent) text-(--lp-accent-ink) font-mono text-[10px] font-black">01</span>
      </header>
      <div className="grid grid-cols-2 gap-x-2.25 gap-y-2.75">
        <NumberField
          label="Valor do imóvel"
          value={state.property}
          onChange={(property) => update({ property })}
          suffix="R$"
          step={10000}
          sliderKey="property"
          {...fieldProps}
        />
        <NumberField
          label="Entrada"
          value={state.entry}
          onChange={(entry) => update({ entry })}
          suffix="R$"
          step={10000}
          sliderKey="entry"
          {...fieldProps}
        />
        <NumberField
          label="Juros do financiamento"
          value={state.financingRate}
          onChange={(financingRate) => update({ financingRate })}
          suffix="% a.a."
          step={0.5}
          sliderKey="financingRate"
          {...fieldProps}
        />
        <NumberField
          label="Prazo do financiamento"
          value={Math.round(state.termMonths / 12)}
          onChange={(years) => update({ termMonths: years * 12 })}
          suffix="anos"
          step={1}
          sliderKey="termMonths"
          {...fieldProps}
        />
        {!compact && (
          <NumberField
            label="Custo de posse"
            value={state.ownershipRate}
            onChange={(ownershipRate) => update({ ownershipRate })}
            suffix="% a.a."
            step={0.1}
            sliderKey="ownershipRate"
            {...fieldProps}
          />
        )}
        {!compact && (
          <NumberField
            label="Orçamento mensal"
            value={state.budget}
            onChange={(budget) => update({ budget })}
            suffix="R$/mês"
            step={100}
            sliderKey="budget"
            {...fieldProps}
          />
        )}
      </div>
      <MethodToggle
        value={state.method}
        onChange={(method) => update({ method })}
      />
    </section>
  );
}

function AdvancedFields({
  state,
  update,
  interaction = {},
}: {
  state: FinancingState;
  update: (patch: Partial<FinancingState>) => void;
  interaction?: FieldInteractionProps;
}) {
  return (
    <section className="grid gap-3.25 rounded-b-[11px] border border-t-0 border-(--lp-line) bg-[color-mix(in_srgb,var(--lp-paper)_70%,transparent)] p-3.75">
      <span className="text-(--lp-muted) text-[9px] font-black tracking-[.14em] uppercase">DETALHES AVANÇADOS</span>
      <div className="grid grid-cols-2 gap-x-2.25 gap-y-2.75">
        <NumberField
          label="Custo de posse"
          value={state.ownershipRate}
          onChange={(ownershipRate) => update({ ownershipRate })}
          suffix="% a.a."
          step={0.1}
          sliderKey="ownershipRate"
          {...interaction}
        />
        <NumberField
          label="Orçamento mensal"
          value={state.budget}
          onChange={(budget) => update({ budget })}
          suffix="R$/mês"
          step={100}
          sliderKey="budget"
          {...interaction}
        />
      </div>
    </section>
  );
}

function AdvancedEditor({
  state,
  update,
  interaction = {},
}: {
  state: FinancingState;
  update: (patch: Partial<FinancingState>) => void;
  interaction?: FieldInteractionProps;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="grid gap-0">
      <button
        type="button"
        className="flex min-h-12 w-full items-center justify-between rounded-[9px] border border-(--lp-line) bg-transparent px-3.5 text-(--lp-ink) text-[10px] font-black text-left"
        onClick={() => setOpen(!open)}
      >
        <span>
          {open ? "Fechar detalhes avançados" : "Abrir detalhes avançados"}
        </span>
        <b className="text-(--lp-accent) text-[16px]">{open ? "↑" : "↓"}</b>
      </button>
      {open && (
        <AdvancedFields
          state={state}
          update={update}
          interaction={interaction}
        />
      )}
    </div>
  );
}

function StudyShelf({
  studies,
  currentPayment,
  loadStudy,
  removeStudy,
  clearStudies,
}: {
  studies: Study[];
  currentPayment: number;
  loadStudy: (id: number) => void;
  removeStudy: (id: number) => void;
  clearStudies: () => void;
}) {
  return (
    <div className="grid gap-2 border-t border-(--lp-line) pt-3">
      <header className="flex items-center justify-between gap-3">
        <span className="text-(--lp-muted) text-[9px] font-black tracking-[.14em] uppercase">COMPARAR ESTUDOS</span>
        <button
          type="button"
          className="min-h-7 rounded-[5px] border-0 bg-transparent px-1.75 text-(--lp-muted) text-[8px] font-black hover:text-(--lp-accent)"
          onClick={clearStudies}
        >
          Limpar
        </button>
      </header>
      <div className="grid gap-1.5">
        {[...studies].reverse().map((study) => {
          const difference = study.payment - currentPayment;
          const differenceLabel =
            Math.abs(difference) < 1
              ? "igual ao atual"
              : `${difference > 0 ? "+" : "−"}${money(Math.abs(difference))} vs atual`;
          return (
            <article className="flex min-w-0 items-stretch rounded-[5px] border border-(--lp-line) bg-(--lp-paper)" key={study.id}>
              <button
                type="button"
                className="grid min-w-0 flex-1 grid-cols-[1fr_auto] gap-x-2.5 gap-y-1 border-0 bg-transparent p-2.5 text-(--lp-ink) text-left"
                onClick={() => loadStudy(study.id)}
              >
                <span className="row-start-1 row-span-2 grid min-w-0 gap-1">
                  <b className="overflow-hidden text-[9px] text-ellipsis whitespace-nowrap">{study.label}</b>
                  <small className="text-(--lp-muted) text-[8px]">
                    {money(study.state.property, true)} · {study.state.method}
                  </small>
                </span>
                <strong className="text-(--lp-accent) font-mono text-[11px] text-right">{money(study.payment)}</strong>
                <em
                  className={`text-[8px] not-italic text-right ${
                    difference > 0
                      ? "text-(--lp-orange)"
                      : difference < 0
                        ? "text-(--lp-positive)"
                        : "text-(--lp-muted)"
                  }`}
                >
                  {differenceLabel}
                </em>
              </button>
              <button
                type="button"
                className="w-7.75 shrink-0 border-0 border-l border-(--lp-line) bg-transparent text-(--lp-muted) text-[16px] hover:text-(--lp-orange)"
                aria-label={`Remover ${study.label}`}
                onClick={() => removeStudy(study.id)}
              >
                ×
              </button>
            </article>
          );
        })}
      </div>
      <p className="text-(--lp-muted) text-[8px] leading-[1.35]">
        Toque em um estudo para carregá-lo. A diferença compara a prestação
        salva com a atual.
      </p>
    </div>
  );
}

function QuickActionButton({
  action,
  className = "",
  paired = false,
}: {
  action: QuickAction;
  className?: string;
  paired?: boolean;
}) {
  return (
    <button
      type="button"
      className={`group relative grid min-h-18.5 content-start gap-1.75 rounded-[5px] border border-(--lp-tab-financing) bg-(--lp-tab-financing) p-3 text-(--lp-accent-ink) text-left transition-[transform,border-color,background] duration-150 ease-[ease] hover:border-(--lp-tab-financing) hover:bg-[color-mix(in_srgb,var(--lp-tab-financing)_88%,black)] hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-(--lp-tab-financing) focus-visible:outline-offset-2 active:translate-y-px max-[699px]:pr-8.5! disabled:cursor-not-allowed disabled:opacity-[.48] disabled:transform-none ${paired ? "min-h-18.5 rounded-none! [border:0]! bg-(--lp-tab-financing) hover:bg-[color-mix(in_srgb,var(--lp-tab-financing)_88%,black)]" : ""} ${className}`}
      disabled={action.disabled}
      onClick={action.onClick}
    >
      <span className={`pr-4 ${paired ? "text-[9px]" : "text-[10px]"} font-black`}>{action.label}</span>
      <small className={`max-w-32.5 text-[color-mix(in_srgb,var(--lp-accent-ink)_76%,transparent)] ${paired ? "text-[7px]" : "text-[8px]"} leading-tight`}>{action.detail}</small>
      <b className="absolute right-2.5 bottom-2.25 grid size-5.25 place-items-center rounded-[5px] border border-(--lp-accent-ink) text-(--lp-accent-ink) text-[13px] font-black leading-none group-hover:bg-(--lp-accent-ink) group-hover:text-(--lp-tab-financing)">→</b>
    </button>
  );
}

function QuickActions({
  title,
  helper,
  actions,
  studies,
  currentPayment,
  loadStudy,
  removeStudy,
  clearStudies,
}: {
  title: string;
  helper: string;
  actions: QuickAction[];
  studies: Study[];
  currentPayment: number;
  loadStudy: (id: number) => void;
  removeStudy: (id: number) => void;
  clearStudies: () => void;
}) {
  return (
    <section className="grid gap-2.75 rounded-[14px] border border-[color-mix(in_srgb,var(--lp-accent)_30%,var(--lp-line))] bg-[color-mix(in_srgb,var(--lp-paper)_78%,transparent)] p-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <span className="text-(--lp-muted) text-[9px] font-black tracking-[.14em] uppercase">AÇÕES RÁPIDAS</span>
          <h3 className="mt-1.25 text-[18px] tracking-[-.06em]">{title}</h3>
        </div>
        <span className="whitespace-nowrap rounded-[99px] bg-[color-mix(in_srgb,var(--lp-accent)_12%,transparent)] px-1.75 py-1.25 text-(--lp-accent) font-mono text-[8px] font-black">
          {studies.length ? `${studies.length} salvos` : "sem estudos"}
        </span>
      </header>
      <p className="max-w-112.5 text-(--lp-muted) text-[10px] leading-[1.35]">{helper}</p>
      <div className="grid grid-cols-6 gap-1.75">
        <QuickActionButton action={actions[0]} className="col-span-3" />
        <QuickActionButton action={actions[1]} className="col-span-3" />
        <QuickActionButton action={actions[2]} className="col-span-2" />
        <div className="col-span-4 grid min-w-0 grid-cols-2 overflow-hidden rounded-[5px] border border-(--lp-line) bg-transparent">
          <QuickActionButton action={actions[3]} paired />
          <QuickActionButton
            action={actions[4]}
            paired
            className="[border-left:1px_solid_var(--lp-line)]!"
          />
        </div>
      </div>
      {studies.length > 0 ? (
        <StudyShelf
          studies={studies}
          currentPayment={currentPayment}
          loadStudy={loadStudy}
          removeStudy={removeStudy}
          clearStudies={clearStudies}
        />
      ) : (
        <div className="rounded-lg border border-dashed border-(--lp-line) px-2.75 py-2.5 text-(--lp-muted) text-[9px] leading-[1.35]">
          Salve uma simulação para criar uma referência e comparar outras
          combinações.
        </div>
      )}
    </section>
  );
}

function ResultNumber({
  label,
  value,
  note = "",
  tone = "",
}: {
  label: string;
  value: string;
  note?: string;
  tone?: string;
}) {
  const toneClass =
    tone === "positive"
      ? "text-(--lp-positive)"
      : tone === "warning"
        ? "text-(--lp-orange)"
        : "";
  return (
    <div className="grid min-w-0 gap-1 rounded-[9px] border border-(--lp-line) bg-(--lp-paper) p-3.25">
      <span className="text-(--lp-muted) text-[9px] leading-tight">{label}</span>
      <strong className={`overflow-hidden text-[clamp(16px,5vw,20px)] tracking-[-.06em] text-ellipsis whitespace-nowrap ${toneClass}`}>{value}</strong>
      {note && <small className="text-(--lp-muted) text-[9px] leading-tight">{note}</small>}
    </div>
  );
}

function FinancingSummary({
  result,
  state,
}: {
  result: Calculation;
  state: FinancingState;
}) {
  return (
    <div className="mt-2 grid grid-cols-2 gap-2 min-[700px]:grid-cols-4">
      <ResultNumber
        label="Valor financiado"
        value={money(result.financedAmount, true)}
      />
      <ResultNumber
        label="Custo mensal inicial"
        value={money(result.initialHousingCost)}
        note={
          result.budgetRemaining >= 0
            ? `${money(result.budgetRemaining)} livres no orçamento`
            : `${money(Math.abs(result.budgetRemaining))} acima do orçamento`
        }
        tone={result.budgetRemaining >= 0 ? "positive" : "warning"}
      />
      <ResultNumber
        label="Juros totais"
        value={money(result.totalInterest, true)}
        note={`${state.method} · ${Math.round(state.termMonths / 12)} anos`}
      />
      <ResultNumber
        label="Saldo no fim do prazo"
        value={money(result.termEndBalance, true)}
        note="deve chegar a zero"
      />
    </div>
  );
}

function InstallmentList({ result }: { result: Calculation }) {
  const [mode, setMode] = useState<"yearly" | "monthly">("yearly");
  const visibleRows =
    mode === "monthly"
      ? result.schedule
      : result.schedule.filter(
          (row) => row.month <= 12 || row.month % 12 === 0,
        );
  return (
    <div className="mt-1.25 rounded-b-[14px] border border-(--lp-line) bg-(--lp-paper) px-3.5 pt-3.75 pb-2">
      <header className="mb-3.25 flex items-end justify-between gap-3 max-[420px]:items-start max-[420px]:flex-col">
        <div>
          <span className="text-(--lp-muted) text-[9px] font-black tracking-[.14em] uppercase">DETALHES DO FINANCIAMENTO</span>
          <h3 className="mt-1 text-[16px] tracking-tighter">{mode === "yearly" ? "Resumo anual" : "Todas as parcelas"}</h3>
        </div>
        <div className="flex shrink-0 gap-0.75">
          <button
            type="button"
            className={`min-h-8 rounded-[6px] border border-(--lp-line) bg-transparent px-2 text-(--lp-muted) text-[8px] font-black ${
              mode === "yearly"
                ? "border-(--lp-ink)! bg-(--lp-ink)! text-white!"
                : ""
            }`}
            onClick={() => setMode("yearly")}
          >
            Anual
          </button>
          <button
            type="button"
            className={`min-h-8 rounded-[6px] border border-(--lp-line) bg-transparent px-2 text-(--lp-muted) text-[8px] font-black ${
              mode === "monthly"
                ? "border-(--lp-ink)! bg-(--lp-ink)! text-white!"
                : ""
            }`}
            onClick={() => setMode("monthly")}
          >
            Mensal
          </button>
        </div>
      </header>
      <div className="schedule-table">
        <div className="schedule-head">
          <span>Parcela</span>
          <span>Pagamento</span>
          <span>Amortização</span>
          <span>Juros</span>
          <span>Saldo</span>
        </div>
        {visibleRows.map((row) => (
          <div className="schedule-row" key={row.month}>
            <span className="grid gap-0.75">
              <b>{row.month}</b>
              <small>
                {row.month <= 12
                  ? "primeiro ano"
                  : `ano ${Math.ceil(row.month / 12)}`}
              </small>
            </span>
            <strong>{money(row.payment)}</strong>
            <span>{money(row.amortization, true)}</span>
            <span>{money(row.interest, true)}</span>
            <span>{money(row.balance, true)}</span>
          </div>
        ))}
      </div>
      <footer className="mt-2.5 text-(--lp-muted) text-[9px] leading-[1.3]">
        {mode === "monthly"
          ? `${visibleRows.length} parcelas exibidas`
          : `${visibleRows.length} pontos no tempo · troque para Mensal para ver todas`}
      </footer>
    </div>
  );
}

function FinancingResult({
  result,
  state,
}: {
  result: Calculation;
  state: FinancingState;
}) {
  const [open, setOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  const stickyTop = 109;
  const stickySentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = stickySentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => setCompact(!entry.isIntersecting),
      { rootMargin: `-${stickyTop}px 0px 0px 0px` },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div ref={stickySentinelRef} className="h-px" aria-hidden="true" />
      <div
        className={`sticky z-20 rounded-[14px] bg-(--lp-hero) text-white transition-[padding] duration-150 ${compact ? "flex items-center gap-3 px-3 py-2.5" : "p-5 max-[420px]:p-3.75"}`}
        style={{ top: stickyTop }}
      >
        {compact ? (
          <>
            <div className="min-w-0 flex-1">
              <span className="text-[color-mix(in_srgb,#fff_68%,transparent)] text-[8px] font-black tracking-[.14em] uppercase">PRESTAÇÃO ESTIMADA</span>
              <p className="mt-0.5 overflow-hidden text-[color-mix(in_srgb,#fff_68%,transparent)] text-[9px] text-ellipsis whitespace-nowrap">{state.method} · primeira parcela</p>
            </div>
            <strong className="shrink-0 text-(--lp-yellow) text-[clamp(24px,7vw,34px)] -tracking-widest leading-none">{money(result.financingPayment)}</strong>
          </>
        ) : (
          <>
            <span className="text-[color-mix(in_srgb,#fff_68%,transparent)] text-[9px] font-black tracking-[.14em] uppercase">PRESTAÇÃO ESTIMADA</span>
            <strong className="mt-2.5 mb-1.5 block text-(--lp-yellow) text-[clamp(38px,12vw,60px)] -tracking-widest leading-[.9]">{money(result.financingPayment)}</strong>
            <p className="text-[color-mix(in_srgb,#fff_68%,transparent)] text-[10px] leading-[1.4]">
              {state.method} · primeira parcela ·{" "}
              {money(result.financingPaymentEnd)} na última parcela do prazo
            </p>
          </>
        )}
        <button
          type="button"
          className={compact ? "grid size-9 shrink-0 place-items-center rounded-[5px] border border-[#3d4847] bg-transparent text-white" : "mt-5 flex min-h-12 w-full items-center justify-between border-0 border-t border-[#3d4847] bg-transparent pt-3 text-[10px] font-black text-white text-left"}
          aria-label={open ? "Fechar lista de parcelas" : "Abrir lista de parcelas"}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {!compact && (open ? "Fechar detalhes" : "Abrir lista de parcelas")}
          <b className="text-(--lp-yellow) text-[17px]">{open ? "↑" : "↓"}</b>
        </button>
      </div>
      <section>
        <FinancingSummary result={result} state={state} />
        {open && <InstallmentList result={result} />}
      </section>
    </>
  );
}

function PaymentChart({ result }: { result: Calculation }) {
  const [open, setOpen] = useState(false);
  const values = [...result.balancePoints, ...result.paymentPoints];
  const min = Math.min(...values) * 0.88;
  const max = Math.max(...values) * 1.03;
  const points = (series: number[]) =>
    series
      .map(
        (value, index) =>
          `${(index / Math.max(1, series.length - 1)) * 520},${165 - ((value - min) / Math.max(1, max - min)) * 140}`,
      )
      .join(" ");
  return (
    <section className="rounded-[11px] border border-(--lp-line) bg-[color-mix(in_srgb,var(--lp-paper)_60%,transparent)]">
      <button
        type="button"
        className="flex min-h-12.75 w-full items-center justify-between border-0 bg-transparent p-[14px_15px] text-(--lp-ink) text-[10px] font-black text-left"
        onClick={() => setOpen(!open)}
      >
        <span>
          {open ? "Ocultar evolução" : "Ver evolução do saldo e da parcela"}
        </span>
        <b className="text-(--lp-accent) text-[18px]">{open ? "−" : "+"}</b>
      </button>
      {open && (
        <div className="px-3.5 pb-3.75">
          <svg className="block h-auto w-full"
            viewBox="0 0 520 180"
            role="img"
            aria-label="Evolução do saldo devedor e da prestação"
          >
            <path className="chart-grid" d="M0 25H520M0 80H520M0 135H520" />
            <polyline
              className="chart-balance"
              points={points(result.balancePoints)}
            />
            <polyline
              className="chart-payment"
              points={points(result.paymentPoints)}
            />
          </svg>
          <div className="mt-2 flex flex-wrap gap-3 text-(--lp-muted) text-[9px] font-extrabold">
            <span className="flex items-center gap-1.25">
              <i className="size-1.75 rounded-full bg-(--lp-orange)" /> Saldo devedor
            </span>
            <span className="flex items-center gap-1.25">
              <i className="size-1.75 rounded-full bg-(--lp-accent)" /> Prestação
            </span>
          </div>
        </div>
      )}
    </section>
  );
}

function SliderTargets({
  state,
  activeKey,
  onChange,
  keys,
}: {
  state: FinancingState;
  activeKey: SliderKey;
  onChange: (key: SliderKey) => void;
  keys: readonly SliderKey[];
}) {
  return (
    <div
      className="grid grid-cols-2 gap-1.5 -mt-0.5 mb-px min-w-0 px-px pt-0.5 pb-1.25"
      role="tablist"
      aria-label="Variável controlada pela barra"
    >
      {keys.map((key) => {
        const spec = SLIDER_SPECS[key];
        return (
          <button
            type="button"
            key={key}
            className={`grid w-full min-w-0 gap-1 rounded-[5px] border border-(--lp-line) bg-transparent p-[9px_10px] text-(--lp-muted) text-left ${
              activeKey === key
                ? "border-(--lp-accent)! bg-[color-mix(in_srgb,var(--lp-accent)_13%,var(--lp-paper))]! text-(--lp-accent)!"
                : ""
            }`}
            role="tab"
            aria-selected={activeKey === key}
            onClick={() => onChange(key)}
          >
            <span className="text-[9px] font-extrabold">{spec.short}</span>
            <b
              className={`overflow-hidden text-(--lp-ink) font-mono text-[9px] text-ellipsis whitespace-nowrap ${
                activeKey === key ? "text-(--lp-accent)!" : ""
              }`}
            >
              {spec.format(sliderValue(key, state))}
            </b>
          </button>
        );
      })}
    </div>
  );
}

function SliderControl({
  spec,
  value,
  onChange,
}: {
  spec: SliderSpec;
  value: number;
  onChange: (value: number) => void;
}) {
  const percentage = ((value - spec.min) / Math.max(1, spec.max - spec.min)) * 100;

  return (
    <div className="relative mx-3 h-12" aria-label={`${spec.label}: ${value}`}>
      <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-(--lp-line)" />
      <div
        className="absolute left-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-(--lp-tab-financing)"
        style={{ width: `${percentage}%` }}
      />
      <input
        className="absolute inset-0 z-10 h-full w-full cursor-grab opacity-0 active:cursor-grabbing"
        type="range"
        min={spec.min}
        max={spec.max}
        step={spec.step}
        value={value}
        aria-label={`Ajustar ${spec.label}`}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
      />
      <span
        className="pointer-events-none absolute top-1/2 border-[3px] border-(--lp-paper) bg-(--lp-tab-financing) shadow-[0_0_0_1px_var(--lp-tab-financing)]"
        style={{
          left: `${percentage}%`,
          width: 36,
          height: 36,
          borderRadius: 10,
          transform: "translate(-50%, -50%)",
        }}
        aria-hidden="true"
      />
    </div>
  );
}

function SliderPanel({
  state,
  update,
  activeKey,
  onChangeActive,
  targetKeys,
  title,
  helper,
  showTargets = false,
  showNudge = false,
}: {
  state: FinancingState;
  update: (patch: Partial<FinancingState>) => void;
  activeKey: SliderKey;
  onChangeActive?: (key: SliderKey) => void;
  targetKeys?: readonly SliderKey[];
  title: string;
  helper: string;
  showTargets?: boolean;
  showNudge?: boolean;
}) {
  const spec = SLIDER_SPECS[activeKey];
  const value = sliderValue(activeKey, state);
  const change = (nextValue: number) =>
    update(spec.patch(clampSliderValue(spec, nextValue)));
  const nudge = (direction: number) => change(value + direction * spec.step);
  return (
    <section className={`grid gap-3.25 rounded-[14px] border border-(--lp-line) bg-[color-mix(in_srgb,var(--lp-paper)_80%,var(--lp-accent)_5%)] p-4.25 max-[420px]:p-3.75`}>
      <header className="flex items-start justify-between gap-3.5">
        <div>
          <span className="text-(--lp-muted) text-[9px] font-black tracking-[.14em] uppercase">BARRA DE AJUSTE</span>
          <h3 className="mt-1.25 text-[18px] tracking-[-.06em]">{title}</h3>
          <p className="mt-1.25 max-w-70 text-(--lp-muted) text-[10px] leading-[1.35]">{helper}</p>
        </div>
        <output className="shrink-0 text-(--lp-accent) font-mono text-[15px] font-black text-right">{spec.format(value)}</output>
      </header>
      {showTargets && (
        <SliderTargets
          state={state}
          activeKey={activeKey}
          onChange={onChangeActive ?? (() => undefined)}
          keys={targetKeys ?? PRIMARY_SLIDER_KEYS}
        />
      )}
      <div className="flex items-baseline justify-between gap-2.5 rounded-[7px] bg-[color-mix(in_srgb,var(--lp-accent)_10%,transparent)] px-2.75 py-2.25 text-(--lp-muted) text-[9px]">
        <span>Ajustando</span>
        <strong className="text-(--lp-ink) text-[10px]">{spec.label}</strong>
      </div>
      <SliderControl spec={spec} value={value} onChange={change} />
      <div className="-mt-2 flex justify-between gap-2.5 text-(--lp-muted) font-mono text-[8px]">
        <span>{spec.format(spec.min)}</span>
        <span>{spec.format(spec.max)}</span>
      </div>
      {showNudge && (
        <div className="-mt-0.5 flex items-center justify-center gap-3">
          <button
            type="button"
            className="grid h-8.5 w-9.5 place-items-center rounded-[7px] border border-(--lp-line) bg-(--lp-paper) text-(--lp-ink) text-[18px] leading-none active:scale-[.96]"
            onClick={() => nudge(-1)}
            aria-label={`Diminuir ${spec.label}`}
          >
            −
          </button>
          <span className="min-w-25 text-(--lp-muted) font-mono text-[8px] text-center">{spec.format(spec.step)} por toque</span>
          <button
            type="button"
            className="grid h-8.5 w-9.5 place-items-center rounded-[7px] border border-(--lp-line) bg-(--lp-paper) text-(--lp-ink) text-[18px] leading-none active:scale-[.96]"
            onClick={() => nudge(1)}
            aria-label={`Aumentar ${spec.label}`}
          >
            +
          </button>
        </div>
      )}
    </section>
  );
}

function Heading({
  kicker,
  title,
  description,
}: {
  kicker: string;
  title: ReactNode;
  description: string;
}) {
  return (
    <header className="px-0.5 pt-5.25 pb-4.75">
      <span className="text-(--lp-muted) text-[9px] font-black tracking-[.14em] uppercase">{kicker}</span>
      <h1 className="mt-2.25 text-(--lp-heading) text-[clamp(35px,11vw,58px)] -tracking-widest leading-[.87]">{title}</h1>
      <p className="mt-3.5 max-w-107.5 text-(--lp-muted) text-[13px] leading-[1.42]">{description}</p>
    </header>
  );
}

type Environment = "financing" | "investment" | "comparison";

function EnvironmentTabs({
  value,
  onChange,
}: {
  value: Environment;
  onChange: (value: Environment) => void;
}) {
  return (
    <nav
      className="sticky top-0 z-10 flex gap-1 border-b border-(--lp-line) bg-(--lp-paper) px-3 py-1.25"
      role="tablist"
      aria-label="Ambientes financeiros"
    >
      <button
        type="button"
        role="tab"
        aria-selected={value === "financing"}
        className={`min-h-9 flex-1 rounded-[7px] border-0 bg-transparent text-(--lp-muted) text-[10px] font-black focus-visible:outline-2 focus-visible:outline-(--lp-accent) focus-visible:outline-offset-2 ${value === "financing" ? "bg-(--lp-tab-financing)! text-(--lp-accent-ink)!" : ""}`}
        onClick={() => onChange("financing")}
      >
        Financiar
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === "investment"}
        className={`min-h-9 flex-1 rounded-[7px] border-0 bg-transparent text-(--lp-muted) text-[10px] font-black focus-visible:outline-2 focus-visible:outline-(--lp-accent) focus-visible:outline-offset-2 ${value === "investment" ? "bg-(--lp-tab-investment)! text-(--lp-accent-ink)!" : ""}`}
        onClick={() => onChange("investment")}
      >
        Investir
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === "comparison"}
        className={`min-h-9 flex-1 rounded-[7px] border-0 bg-transparent text-(--lp-muted) text-[10px] font-black focus-visible:outline-2 focus-visible:outline-(--lp-accent) focus-visible:outline-offset-2 ${value === "comparison" ? "bg-(--lp-tab-comparison)! text-(--lp-accent-ink)!" : ""}`}
        onClick={() => onChange("comparison")}
      >
        Comparar
      </button>
    </nav>
  );
}

function InvestmentEnvironment({ financingEntry }: { financingEntry: number }) {
  return (
    <div data-environment="investment" className="min-h-[calc(100vh-47px)] bg-(--lp-bg) text-(--lp-ink)">
      <TopBar
        caption="Ambiente · investimento de renda fixa"
        action={<span className="text-(--lp-accent) font-mono text-[8px] font-black tracking-[.08em]">RENDA FIXA</span>}
      />
      <main className="mx-auto w-[calc(100%-24px)] max-w-170 pt-4.5 pb-15 min-[700px]:w-[calc(100%-48px)] min-[700px]:pt-7 max-[420px]:w-[calc(100%-18px)]">
        <Heading
          kicker="INVESTIR · RENDA FIXA"
          title={
            <>
              Quanto pode
              <br />
              acumular?
            </>
          }
          description="Calcule saldo final, aportes e rendimento. A entrada do financiamento pode ser usada como saldo inicial."
        />
        <section className="pane">
          <InvestmentProjection financingEntry={financingEntry} />
        </section>
      </main>
    </div>
  );
}

function ComparisonEnvironment() {
  return (
    <div data-environment="comparison" className="min-h-[calc(100vh-47px)] bg-(--lp-bg) text-(--lp-ink)">
      <TopBar
        caption="Ambiente · financiar vs investir"
        action={<span className="text-(--lp-accent) font-mono text-[8px] font-black tracking-[.08em]">COMPARAÇÃO</span>}
      />
      <main className="mx-auto w-[calc(100%-24px)] max-w-170 pt-4.5 pb-15 min-[700px]:w-[calc(100%-48px)] min-[700px]:pt-7 max-[420px]:w-[calc(100%-18px)]">
        <Heading
          kicker="COMPARAR ESTRATÉGIAS"
          title={
            <>
              Financiar
              <br />
              ou investir?
            </>
          }
          description="Coloque as duas estratégias lado a lado e veja patrimônio, fluxo mensal e ponto de virada."
        />
        <section className="pane">
          <FinanceVsInvest />
        </section>
      </main>
    </div>
  );
}

function FinancingView({ props }: { props: LayoutProps }) {
  const {
    state,
    result,
    update,
    reset,
    fitBudget,
    studies,
    saveStudy,
    loadStudy,
    removeStudy,
    clearStudies,
  } = props;
  const [activeKey, setActiveKey] = useState<SliderKey>("termMonths");
  const toggleMethod = () =>
    update({ method: state.method === "SAC" ? "PRICE" : "SAC" });
  const extendTerm = () =>
    update({ termMonths: Math.min(480, state.termMonths + 60) });
  const lowerRate = () =>
    update({ financingRate: Math.max(4, state.financingRate - 0.5) });
  const increaseRate = () =>
    update({ financingRate: Math.min(18, state.financingRate + 0.5) });
  const actions: QuickAction[] = [
    {
      label: state.method === "SAC" ? "Testar PRICE" : "Voltar ao SAC",
      detail: "alternar o sistema de amortização",
      onClick: toggleMethod,
    },
    {
      label: "Salvar comparação",
      detail: "guardar este método",
      onClick: () => saveStudy("Comparação"),
    },
    {
      label: "Prazo +5 anos",
      detail: "testar o efeito no pagamento",
      onClick: extendTerm,
    },
    {
      label: "Juros −0,5 p.p.",
      detail: "simular uma taxa menor",
      onClick: lowerRate,
    },
    {
      label: "Juros +0,5 p.p.",
      detail: "simular uma taxa maior",
      onClick: increaseRate,
    },
  ];

  return (
    <div data-environment="financing" className="min-h-[calc(100vh-47px)] bg-(--lp-bg) text-(--lp-ink)">
      <TopBar
        caption="Ambiente · financiamento"
        action={
          <Button secondary onClick={reset}>
            Novo cenário
          </Button>
        }
      />
      <main className="mx-auto flex w-[calc(100%-24px)] max-w-170 flex-col gap-2 pt-4.5 pb-27.5 min-[700px]:w-[calc(100%-48px)] min-[700px]:pt-7 max-[420px]:w-[calc(100%-18px)]">
        <Heading
          kicker="FINANCIAMENTO · SAC OU PRICE"
          title={
            <>
              Troque o método.
              <br />
              Veja a parcela.
            </>
          }
          description="O botão rápido alterna SAC e PRICE sem abrir detalhes; salve os dois para comparar depois."
        />
        <FinancingResult result={result} state={state} />
        <QuickActions
          title="Compare mecanismos"
          helper="A prestação muda de forma diferente em cada sistema. Guarde os dois estados."
          actions={actions}
          studies={studies}
          currentPayment={result.financingPayment}
          loadStudy={loadStudy}
          removeStudy={removeStudy}
          clearStudies={clearStudies}
        />
        <FinancingFields
          state={state}
          update={update}
          compact
          title="Defina o essencial"
          interaction={{ activeKey, onSelectSlider: setActiveKey }}
        />
        <SliderPanel
          state={state}
          update={update}
          activeKey={activeKey}
          onChangeActive={setActiveKey}
          targetKeys={["termMonths", "entry", "property", "financingRate"]}
          title="Controle escolhido"
          helper="A barra ajusta a variável marcada nos campos ou na faixa."
          showTargets
        />
        <AdvancedEditor
          state={state}
          update={update}
          interaction={{ activeKey, onSelectSlider: setActiveKey }}
        />
        <PaymentChart result={result} />
      </main>
    </div>
  );
}

const STUDIES_STORAGE_KEY = "muda.financing.studies.v1";

function isFinancingState(value: unknown): value is FinancingState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<FinancingState>;
  return (
    [
      state.property,
      state.entry,
      state.financingRate,
      state.ownershipRate,
      state.budget,
      state.termMonths,
      state.analysisYears,
    ].every(Number.isFinite) &&
    (state.method === "SAC" || state.method === "PRICE")
  );
}

function readSavedStudies(): Study[] {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(STUDIES_STORAGE_KEY) ?? "null",
    ) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is Study => {
        if (!item || typeof item !== "object") return false;
        const study = item as Partial<Study>;
        return (
          Number.isFinite(study.id) &&
          typeof study.label === "string" &&
          isFinancingState(study.state) &&
          Number.isFinite(study.payment) &&
          Number.isFinite(study.housingCost)
        );
      })
      .slice(-8);
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
  const nextStudyId = useRef(
    studies.reduce((highest, study) => Math.max(highest, study.id), 0),
  );
  const result = useMemo(() => calculate(state), [state]);
  const update = useCallback(
    (patch: Partial<FinancingState>) =>
      setState((previous) => ({ ...previous, ...patch })),
    [],
  );
  const reset = useCallback(() => setState(DEFAULTS), []);
  const fitBudget = useCallback(
    () => setState((previous) => ({ ...previous, ...budgetPatch(previous) })),
    [],
  );
  const saveStudy = useCallback(
    (label = "Estudo") => {
      nextStudyId.current += 1;
      const id = nextStudyId.current;
      setStudies((previous) =>
        [
          ...previous,
          {
            id,
            label: `${label} ${String(id).padStart(2, "0")}`,
            state,
            payment: result.financingPayment,
            housingCost: result.initialHousingCost,
          },
        ].slice(-8),
      );
    },
    [result, state],
  );
  const loadStudy = useCallback(
    (id: number) => {
      const study = studies.find((candidate) => candidate.id === id);
      if (study) setState(study.state);
    },
    [studies],
  );
  const removeStudy = useCallback(
    (id: number) =>
      setStudies((previous) => previous.filter((study) => study.id !== id)),
    [],
  );
  const clearStudies = useCallback(() => setStudies([]), []);

  useEffect(() => {
    persistStudies(studies);
  }, [studies]);

  const props: LayoutProps = {
    state,
    result,
    update,
    reset,
    fitBudget,
    studies,
    saveStudy,
    loadStudy,
    removeStudy,
    clearStudies,
  };
  return (
    <div
      className={`financing-workspace palette-c min-h-screen${environment !== "financing" ? " financing-workspace-secondary" : ""}`}
    >
      <EnvironmentTabs value={environment} onChange={setEnvironment} />
      {environment === "financing" ? (
        <FinancingView props={props} />
      ) : environment === "investment" ? (
        <InvestmentEnvironment financingEntry={state.entry} />
      ) : (
        <ComparisonEnvironment />
      )}
    </div>
  );
}
