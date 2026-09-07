import { useEffect, useId, useState } from "react";
import { minimumEntry, formatFinancingNumber, parseFinancingNumber, snapFinancingValue, type Bounds, type FinancingField, type FinancingState } from "../financingControls.ts";
import { FINANCING_FIELDS, controlSpec, normalizeControlRange, resetControlRange, type ControlRanges } from "../financingGesture.ts";
import FinancingRangeControl from "./FinancingRangeControl.tsx";
import FinancingRangePreferences from "./FinancingRangePreferences.tsx";
import FinancingValuePreference from "./FinancingValuePreference.tsx";
import type { ValuePreferences, ValuePreferenceResult } from "../financingValuePreferences.ts";
import { resolveRangePreferences, type RangePreferences, type PreferenceResult } from "../financingRangePreferences.ts";
import "./FinancingPanel.css";

type Props = {
  valuePreferences: ValuePreferences;
  onSaveValuePreference: (field: FinancingField) => ValuePreferenceResult;
  onRemoveValuePreference: (field: FinancingField) => ValuePreferenceResult;
  rangePreferences: RangePreferences;
  onSaveRangePreference: (field: FinancingField, bounds: Bounds) => PreferenceResult;
  onRestoreRangePreference: (field: FinancingField) => PreferenceResult;
  state: FinancingState;
  result: { financingPayment: number; financingPaymentEnd: number; financedAmount: number; totalInterest: number };
  update: (patch: Partial<FinancingState>) => void;
  automaticEntry: boolean;
  onAutomaticEntryChange: (enabled: boolean) => void;
  ranges: ControlRanges;
  onRangeChange: (field: FinancingField, bounds: Bounds) => void;
  saveStudy: () => void;
};
const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
function fieldValue(key: FinancingField, state: FinancingState) { return key === "termMonths" ? state.termMonths / 12 : state[key]; }
function display(key: FinancingField, value: number) {
  return key === "property" || key === "entry" ? money(value) : `${value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ${key === "termMonths" ? "anos" : "% a.a."}`;
}

/** Keep incomplete typing local; focusing an automatic entry must not round it away. */
function AmountInput({ id, value, min, max, step, monetary, onChange }: { id: string; value: number; min: number; max: number; step: number; monetary: boolean; onChange: (value: number) => void }) {
  const [draft, setDraft] = useState(() => formatFinancingNumber(value, monetary));
  const [dirty, setDirty] = useState(false);
  useEffect(() => { setDraft(formatFinancingNumber(value, monetary)); setDirty(false); }, [value, monetary]);
  const commit = () => {
    if (!dirty) return;
    const parsed = parseFinancingNumber(draft);
    setDirty(false);
    if (!Number.isFinite(parsed)) { setDraft(formatFinancingNumber(value, monetary)); return; }
    const next = snapFinancingValue(parsed, step, min, max);
    setDraft(formatFinancingNumber(next, monetary)); onChange(next);
  };
  return <input id={id} type="text" inputMode="decimal" autoComplete="off" spellCheck={false} value={draft} onChange={e => { setDraft(e.target.value); setDirty(true); }} onBlur={commit} onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }} />;
}

export default function FinancingPanel(props: Props) {
  const { state, result, update, automaticEntry, onAutomaticEntryChange } = props;
  const [selected, setSelected] = useState<FinancingField>("property");
  const [savedState, setSavedState] = useState<FinancingState | null>(null);
  const [showPaymentInfo, setShowPaymentInfo] = useState(false);
  const field = FINANCING_FIELDS.find(candidate => candidate.key === selected)!;
  const spec = controlSpec(selected, state, automaticEntry);
  const bounds = normalizeControlRange(props.ranges[selected], spec);
  const defaults = resolveRangePreferences(props.rangePreferences);
  const defaultApplied = resetControlRange(selected, state, automaticEntry, defaults);
  const id = useId();
  const paymentInfoId = `${id}-payment-info`;
  const floor = minimumEntry(state.property);
  const change = (value: number) => {
    if (!Number.isFinite(value)) return;
    const next = Math.max(spec.min, Math.min(spec.max, value));
    update({ [selected]: selected === "termMonths" ? next * 12 : next });
  };
  const stepLabel = selected === "financingRate" ? "0,1 p.p." : selected === "termMonths" ? "1 ano" : money(field.step);
  const rangeProps = {
    label: field.label, spec, bounds, stepLabel,
    format: (value: number) => display(selected, value),
    onChange: (value: number, nextBounds: Bounds) => { change(value); props.onRangeChange(selected, nextBounds); },
    onBoundsChange: (nextBounds: Bounds) => props.onRangeChange(selected, nextBounds),
    onResetRange: () => props.onRangeChange(selected, defaultApplied),
  };
  return <section className="financing-panel">
    <h1>Quanto fica a parcela?</h1>
    <div className="fc-card">
      <div className="fc-payment">
        <div className="fc-payment-heading">
          <span>Primeira prestação estimada · {state.method}</span>
          <button
            type="button"
            className="fc-info-button"
            aria-label="Mostrar informações sobre a estimativa"
            aria-expanded={showPaymentInfo}
            aria-controls={paymentInfoId}
            onClick={() => setShowPaymentInfo(previous => !previous)}
          >
            i
          </button>
        </div>
        <output aria-live="polite">{money(result.financingPayment)}</output>
        <small>Última parcela de {money(result.financingPaymentEnd)}</small>
        {showPaymentInfo && <p id={paymentInfoId} className="fc-payment-info">Principal e juros, sem FGTS nesta prévia, sem TR ou outro indexador, seguros e tarifas. Taxa efetiva anual. Não é cotação CAIXA; confira a simulação contratual.</p>}
        <div className="fc-method" role="group" aria-label="Sistema de amortização">
          <div className="flex">
            <button type="button" className="fc-save-study" onClick={() => { props.saveStudy(); setSavedState(state); }}>Salvar estudo</button>
          </div>
          <div className="flex gap-2 grow justify-end">
            {(["SAC", "PRICE"] as const).map(method => <button type="button" key={method} aria-pressed={state.method === method} onClick={() => update({ method })}>{method}</button>)}
          </div>
          <span className="fc-save-status" role="status">{savedState === state ? "Adicionado aos estudos." : ""}</span>
        </div>
      </div>
      <div className="fc-card-body">
        <div className="fc-targets" role="group" aria-label="Escolha o que ajustar">{FINANCING_FIELDS.map(candidate => <button type="button" key={candidate.key} aria-pressed={selected === candidate.key} onClick={() => setSelected(candidate.key)}><span>{candidate.short}</span><strong>{display(candidate.key, fieldValue(candidate.key, state))}</strong></button>)}</div>
        <button className="fc-auto-entry" type="button" role="switch" aria-checked={automaticEntry} onClick={() => onAutomaticEntryChange(!automaticEntry)}><span><strong>Entrada mínima de 20%</strong><small>{automaticEntry ? `Automático · mínimo atual ${money(floor)}` : "Desativado · entrada manual"}</small></span><span className="fc-switch-track" aria-hidden="true"><span /></span></button>
        {automaticEntry && <p className="fc-help">Ao mudar o imóvel, mantém a entrada atual ou aumenta para 20%. Entradas maiores não são reduzidas.</p>}
        {state.entry > state.property && <p role="status" className="fc-warning">A entrada supera o valor do imóvel. Não há saldo a financiar; ajuste a entrada se necessário.</p>}
        <div className="fc-adjustment">
          <label className="fc-input-label" htmlFor={id}><span>{field.label}</span><small>{field.unit}</small></label>
          <div className="fc-number-row"><AmountInput key={selected} id={id} value={spec.value} min={spec.min} max={spec.max} step={field.step} monetary={field.monetary} onChange={change} /></div>
          <p className="fc-help">Se digitar, confirme com Enter ou saia do campo.</p>
          {selected === "entry" && <button type="button" className="fc-entry-shortcut" onClick={() => update({ entry: floor })}><span>Usar 20% do imóvel</span><strong>{money(floor)}</strong></button>}
          <FinancingValuePreference key={`value-${selected}`} label={field.label} value={state[selected]} saved={props.valuePreferences[selected]}
            format={value => display(selected, selected === "termMonths" ? value / 12 : value)}
            onSave={() => props.onSaveValuePreference(selected)} onRemove={() => props.onRemoveValuePreference(selected)}
            render={(action, details) => <FinancingRangeControl {...rangeProps} valuePreferenceAction={action} valuePreferenceDetails={details} />} />
          {selected === "entry" && props.valuePreferences.entry !== undefined && props.valuePreferences.entry > state.property && <p className="fc-help">Ao abrir a calculadora, a entrada fica limitada ao valor inicial do imóvel. O padrão salvo é preservado.</p>}
          <FinancingRangePreferences key={`preferences-${selected}`} field={selected} label={field.label} unit={field.unit} monetary={field.monetary} current={bounds} saved={defaults[selected]} applied={defaultApplied} customized={props.rangePreferences[selected] !== undefined} format={rangeProps.format}
            onSave={next => props.onSaveRangePreference(selected, next)}
            onRestore={() => props.onRestoreRangePreference(selected)} />
        </div>
      </div>
      <dl className="fc-costs"><div><dt>Financiado</dt><dd>{money(result.financedAmount)}</dd></div><div><dt>Juros totais</dt><dd>{money(result.totalInterest)}</dd></div></dl>
    </div>
    <p className="fc-note">Estimativa sem seguros, tarifas ou outros custos do banco.</p>
  </section>;
}
