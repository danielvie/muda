import { useEffect, useId, useRef, useState } from "react";
import {
  cropBounds, expandAtEdge, minimumEntry, widthToZoom, zoomBounds, zoomScale, zoomToWidth,
  type Bounds, type FinancingField, type FinancingState, type ZoomAnchor,
} from "../financingControls.ts";
import "./FinancingPanel.css";

type Props = {
  state: FinancingState;
  result: { financingPayment: number; financingPaymentEnd: number; financedAmount: number; totalInterest: number };
  update: (patch: Partial<FinancingState>) => void;
  automaticEntry: boolean;
  onAutomaticEntryChange: (enabled: boolean) => void;
  bounds: Bounds;
  onBoundsChange: (bounds: Bounds) => void;
  saveStudy: () => void;
};
const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const fields = [
  { key: "property", label: "Valor do imóvel", short: "Imóvel", unit: "R$", min: 0, max: Number.MAX_SAFE_INTEGER, step: 10000 },
  { key: "entry", label: "Entrada", short: "Entrada", unit: "R$", min: 0, max: Number.MAX_SAFE_INTEGER, step: 10000 },
  { key: "financingRate", label: "Juros anuais", short: "Juros", unit: "% a.a.", min: 0, max: 20, step: 0.1 },
  { key: "termMonths", label: "Prazo", short: "Prazo", unit: "anos", min: 1, max: 40, step: 1 },
] as const;
function fieldValue(key: FinancingField, state: FinancingState) { return key === "termMonths" ? state.termMonths / 12 : state[key]; }
function display(key: FinancingField, value: number) {
  return key === "property" || key === "entry" ? money(value) : `${value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ${key === "termMonths" ? "anos" : "% a.a."}`;
}

/** Keep incomplete typing local; only confirmed numbers mutate financing assumptions. */
function AmountInput({ id, value, min, max, step, onChange }: { id: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const commit = () => {
    const parsed = Number(draft);
    if (!draft.trim() || !Number.isFinite(parsed)) { setDraft(String(value)); return; }
    const next = Math.max(min, Math.min(max, parsed));
    setDraft(String(next));
    onChange(next);
  };
  return <input id={id} type="number" inputMode={step < 1 ? "decimal" : "numeric"} min={min} max={max} step={step} value={draft} onChange={e => setDraft(e.target.value)} onBlur={commit} onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }} />;
}

function FinancingZoom({ bounds, onBoundsChange, value }: Pick<Props, "bounds" | "onBoundsChange"> & { value: number }) {
  const [anchor, setAnchor] = useState<ZoomAnchor>("value");
  const scale = zoomScale(bounds, value);
  // Freeze the scale during a gesture so its track does not move under the finger.
  const gestureScale = useRef<Bounds | null>(null);
  const resetGesture = () => { gestureScale.current = null; };
  return <details className="fc-range-disclosure">
    <summary><span><strong>Ajustar alcance</strong><small>{money(bounds.min)} a {money(bounds.max)}</small></span><span aria-hidden="true" className="fc-chevron">⌄</span></summary>
    <div className="fc-range-editor">
      <p>Escolha qual ponto fica parado enquanto você move o zoom.</p>
      <div className="fc-scale-modes" role="group" aria-label="Ponto fixo do zoom">
        {([['min', 'Mínimo'], ['value', 'Imóvel'], ['max', 'Máximo']] as const).map(([key, label]) => <button key={key} type="button" aria-pressed={anchor === key} onClick={() => setAnchor(key)}>{label}</button>)}
      </div>
      <label className="fc-zoom-label">Zoom da faixa
        <div className="fc-drag-zone"><input type="range" aria-label="Zoom da faixa" aria-valuetext={`Largura ${money(bounds.max - bounds.min)}`} min={0} max={100} step={1} value={widthToZoom(bounds.max - bounds.min, scale)} onPointerDown={() => { gestureScale.current = scale; }} onPointerUp={resetGesture} onPointerCancel={resetGesture} onBlur={resetGesture} onChange={e => onBoundsChange(zoomBounds(bounds, value, zoomToWidth(Number(e.target.value), gestureScale.current ?? scale), anchor))} /></div>
      </label>
      <div className="fc-zoom-ends"><span>Mais precisão</span><span>Mais alcance</span></div>
      <p>A redução para antes de deixar o imóvel fora da faixa.</p>
      <button type="button" className="fc-crop" onClick={() => onBoundsChange(cropBounds(bounds, value))}>Recortar perto do imóvel</button>
      <p>Zoom e recorte não alteram o imóvel. Solte na borda da régua principal para ampliar, mesmo com este painel fechado.</p>
    </div>
  </details>;
}

export default function FinancingPanel(props: Props) {
  const { state, result, update, automaticEntry, onAutomaticEntryChange, bounds, onBoundsChange } = props;
  const [selected, setSelected] = useState<FinancingField>("property");
  const [savedState, setSavedState] = useState<FinancingState | null>(null);
  const field = fields.find(candidate => candidate.key === selected)!;
  const id = useId();
  const value = fieldValue(selected, state);
  const floor = minimumEntry(state.property);
  const inputMin = selected === "entry" && automaticEntry ? floor : field.min;
  const inputMax = selected === "entry" ? Math.max(state.property, state.entry) : field.max;
  const min = selected === "property" ? bounds.min : inputMin;
  const max = selected === "property" ? bounds.max : inputMax;
  const change = (next: number) => {
    if (!Number.isFinite(next)) return;
    const clamped = Math.max(inputMin, Math.min(inputMax, Math.round(next * 100) / 100));
    update({ [selected]: selected === "termMonths" ? clamped * 12 : clamped });
  };
  const expand = (next: number) => { if (selected === "property") onBoundsChange(expandAtEdge(bounds, next)); };
  const stepLabel = selected === "financingRate" ? "0,1 p.p." : selected === "termMonths" ? "1 ano" : money(field.step);
  return <section className="financing-panel">
    <h1>Quanto fica a parcela?</h1>
    <div className="fc-card">
      <div className="fc-payment"><span>Primeira prestação estimada · {state.method}</span><output aria-live="polite">{money(result.financingPayment)}</output><small>Última parcela de {money(result.financingPaymentEnd)}</small>
        <div className="fc-save-row">
          <button type="button" className="fc-save-study" onClick={() => { props.saveStudy(); setSavedState(state); }}>Salvar estudo</button>
          <span role="status">{savedState === state ? "Adicionado aos estudos." : ""}</span>
        </div>
      </div>
      <div className="fc-card-body">
        <div className="fc-targets" role="group" aria-label="Escolha o que ajustar">{fields.map(candidate => <button type="button" key={candidate.key} aria-pressed={selected === candidate.key} onClick={() => setSelected(candidate.key)}><span>{candidate.short}</span><strong>{display(candidate.key, fieldValue(candidate.key, state))}</strong></button>)}</div>
        <button className="fc-auto-entry" type="button" role="switch" aria-checked={automaticEntry} onClick={() => onAutomaticEntryChange(!automaticEntry)}><span><strong>Entrada mínima de 20%</strong><small>{automaticEntry ? `Automático · mínimo atual ${money(floor)}` : "Desativado · entrada manual"}</small></span><span className="fc-switch-track" aria-hidden="true"><span /></span></button>
        {automaticEntry && <p className="fc-help">Ao mudar o imóvel, mantém a entrada atual ou aumenta para 20%. Entradas maiores não são reduzidas.</p>}
        {state.entry > state.property && <p role="status" className="fc-warning">A entrada supera o valor do imóvel. Não há saldo a financiar; ajuste a entrada se necessário.</p>}
        <div className="fc-adjustment">
          <label className="fc-input-label" htmlFor={id}><span>{field.label}</span><small>{field.unit}</small></label>
          <div className="fc-number-row"><AmountInput key={selected} id={id} value={value} min={inputMin} max={inputMax} step={field.step} onChange={change} /></div>
          <p className="fc-help">{selected === "property" ? "Solte na ponta da régua para ampliar o alcance. " : ""}Se digitar, confirme com Enter ou saia do campo.</p>
          {selected === "entry" && <button type="button" className="fc-entry-shortcut" onClick={() => update({ entry: floor })}><span>Usar 20% do imóvel</span><strong>{money(floor)}</strong></button>}
          <div className="fc-drag-zone fc-ruler"><input type="range" aria-label={`Ajustar ${field.label}`} aria-valuetext={display(selected, value)} min={min} max={max} step={selected === "property" || selected === "entry" ? 1000 : field.step} value={value} disabled={max <= min} onChange={e => change(Number(e.target.value))} onPointerUp={e => expand(Number(e.currentTarget.value))} onKeyUp={e => { if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)) expand(Number(e.currentTarget.value)); }} /></div>
          <div className="fc-range-scale" aria-hidden="true"><span>{display(selected, min)}</span><span>{display(selected, max)}</span></div>
          <div className="fc-nudges">{[-1, 1].map(direction => <button type="button" key={direction} aria-label={`${direction < 0 ? "Diminuir" : "Aumentar"} ${field.label}`} disabled={direction < 0 ? value <= inputMin : value >= inputMax} onClick={() => change(value + direction * field.step)}><b>{direction < 0 ? "−" : "+"}</b><span>{stepLabel}</span></button>)}</div>
        </div>
        {selected === "property" && <FinancingZoom bounds={bounds} onBoundsChange={onBoundsChange} value={state.property} />}
        <div className="fc-method" role="group" aria-label="Sistema de amortização"><span>Sistema</span>{(["SAC", "PRICE"] as const).map(method => <button type="button" key={method} aria-pressed={state.method === method} onClick={() => update({ method })}>{method}</button>)}</div>
      </div>
      <dl className="fc-costs"><div><dt>Financiado</dt><dd>{money(result.financedAmount)}</dd></div><div><dt>Juros totais</dt><dd>{money(result.totalInterest)}</dd></div></dl>
    </div>
    <p className="fc-note">Estimativa sem seguros, tarifas ou outros custos do banco.</p>
  </section>;
}
