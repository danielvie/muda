import { useEffect, useId, useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  cropControlRange, gestureBounds, moveFinancingGesture, startFinancingGesture,
  type ControlSpec, type FinancingGesture,
} from "../financingGesture.ts";
import type { Bounds } from "../financingControls.ts";
import "./FinancingGestureControl.css";

type Props = {
  label: string;
  spec: ControlSpec;
  bounds: Bounds;
  format: (value: number) => string;
  formatDelta: (value: number) => string;
  stepLabel: string;
  onChange: (value: number, bounds: Bounds) => void;
  onBoundsChange: (bounds: Bounds) => void;
};
const HEIGHT = 240;
const BAND_SPACING = 48;
function ZoomBands({ origin, height, band }: { origin: number; height: number; band: number }) {
  const clamp = (n: number) => Math.max(0, Math.min(height, n));
  return <div className="fgc-bands" aria-hidden="true">{[2, 1, 0, -1, -2].map(index => {
    const top = clamp(index === 2 ? 0 : origin - (index + 0.5) * BAND_SPACING);
    const bottom = clamp(index === -2 ? height : origin - (index - 0.5) * BAND_SPACING);
    if (bottom <= top) return null;
    return <span key={index} className="fgc-band" data-selected={band === index} data-band={index} style={{ top, height: bottom - top }}>
      {index !== 0 && bottom - top >= 18 && <small>{Math.pow(2, index).toLocaleString("pt-BR")}×</small>}
      <i />
    </span>;
  })}</div>;
}

export default function FinancingGestureControl(props: Props) {
  const latest = useRef(props); latest.current = props;
  const pad = useRef<HTMLButtonElement>(null);
  const session = useRef<FinancingGesture | null>(null);
  const pointer = useRef<number | null>(null);
  const geometry = useRef({ left: 0, top: 0, width: 1, height: HEIGHT });
  const [view, setView] = useState<FinancingGesture | null>(null);
  const helpId = useId();
  const disabled = props.spec.max <= props.spec.min || Math.ceil(props.spec.min / props.spec.step) > Math.floor(props.spec.max / props.spec.step);
  const finish = () => {
    const id = pointer.current;
    pointer.current = null; session.current = null; setView(null);
    if (id !== null && pad.current?.hasPointerCapture(id)) pad.current.releasePointerCapture(id);
  };
  const move = (x: number, y: number) => {
    if (!session.current) return;
    const next = moveFinancingGesture(session.current, x, y);
    session.current = next; setView(next);
    const bounds = gestureBounds(next);
    if (next.value === latest.current.spec.value) latest.current.onBoundsChange(bounds);
    else latest.current.onChange(next.value, bounds);
  };
  const begin = (x: number, y: number) => {
    const current = latest.current;
    const next = startFinancingGesture(x, y, current.spec, current.bounds);
    session.current = next; setView(next);
  };
  useEffect(() => {
    const cancel = () => finish();
    window.addEventListener("blur", cancel);
    document.addEventListener("visibilitychange", cancel);
    return () => { session.current = null; pointer.current = null; window.removeEventListener("blur", cancel); document.removeEventListener("visibilitychange", cancel); };
  }, []);
  const originY = view ? view.originY - geometry.current.top : HEIGHT / 2;
  const gain = view?.scale ?? 1;
  const reference = view ?? startFinancingGesture(0, 0, props.spec, props.bounds);
  const position = (n: number, origin: number, size: number) => `${Math.max(2, Math.min(98, (n - origin) / size * 100))}%`;
  return <div className="financing-gesture">
    <p>← diminui · → aumenta. Suba para ampliar a escala; desça para ajustar com precisão.</p>
    <div className="fgc-readout"><div><small>{props.label}</small><strong title={props.format(props.spec.value)}>{props.format(props.spec.value)}</strong></div><div><small>Escala do gesto</small><strong data-gesture-scale={gain}>{gain.toLocaleString("pt-BR")}×</strong></div></div>
    <button ref={pad} type="button" className="fgc-pad" aria-label={`Arrastar ${props.label} e escala`} aria-describedby={helpId} disabled={disabled} data-active={!!view}
      onPointerDown={event => {
        if (event.button !== 0 || pointer.current !== null) return;
        event.preventDefault();
        // Confirm any edited amount before taking a snapshot of the starting value.
        flushSync(() => event.currentTarget.focus({ preventScroll: true }));
        if (event.currentTarget.disabled) return;
        geometry.current = event.currentTarget.getBoundingClientRect();
        pointer.current = event.pointerId; event.currentTarget.setPointerCapture(event.pointerId);
        begin(event.clientX, event.clientY);
      }}
      onPointerMove={event => { if (pointer.current === event.pointerId) move(event.clientX, event.clientY); }}
      onPointerUp={event => { if (pointer.current !== event.pointerId) return; if (session.current && (session.current.x !== event.clientX || session.current.y !== event.clientY)) move(event.clientX, event.clientY); finish(); }}
      onPointerCancel={event => { if (pointer.current === event.pointerId) finish(); }}
      onLostPointerCapture={event => { if (pointer.current === event.pointerId) finish(); }}
      onContextMenu={event => event.preventDefault()}
      onBlur={finish}
      onKeyDown={event => {
        if (pointer.current !== null) return;
        if (["Escape", "Enter", " "].includes(event.key)) { event.preventDefault(); finish(); return; }
        if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
        event.preventDefault();
        if (!session.current) { geometry.current = event.currentTarget.getBoundingClientRect(); begin(geometry.current.left + geometry.current.width / 2, geometry.current.top + geometry.current.height / 2); }
        const current = session.current!;
        move(current.x + (event.key === "ArrowLeft" ? -8 : event.key === "ArrowRight" ? 8 : 0), current.y + (event.key === "ArrowUp" ? -48 : event.key === "ArrowDown" ? 48 : 0));
      }}>
      <ZoomBands origin={originY} height={geometry.current.height} band={view?.band ?? 0} />
      <span className="fgc-top">↑ Mais alcance</span><span className="fgc-bottom">↓ Mais precisão</span><span className="fgc-left">−</span><span className="fgc-right">+</span>
      {!view && <span className="fgc-center">{disabled ? "Sem intervalo para ajustar" : "Comece em qualquer ponto"}<small>{disabled ? "Revise os valores da simulação" : "1× na altura inicial"}</small></span>}
      {view && <>
        <span className="fgc-baseline" aria-hidden="true" style={{ top: originY }}><small>1×</small></span>
        <span className="fgc-origin" aria-hidden="true" style={{ left: position(view.originX, geometry.current.left, geometry.current.width), top: originY }} />
        <span className="fgc-cursor" aria-hidden="true" style={{ left: position(view.x, geometry.current.left, geometry.current.width), top: position(view.y, geometry.current.top, geometry.current.height) }} />
      </>}
    </button>
    <p className="fgc-step">Passo mínimo: {props.stepLabel}.<span>8 px na horizontal ≈ {props.formatDelta(reference.basePerPixel * gain * 8)}.</span></p>
    <p className="fgc-range">Faixa atual: {props.format(props.bounds.min)} a {props.format(props.bounds.max)}</p>
    <button type="button" className="fgc-crop" disabled={disabled} onClick={() => props.onBoundsChange(cropControlRange(props.spec))}>Recortar perto do valor atual</button>
    <p id={helpId} className="fgc-help">A linha de 1× fica na altura inicial. ↑↓ só muda a escala dos próximos movimentos ↔. Use as setas no teclado; Enter encerra. Ao soltar ou cancelar, os ajustes já feitos são mantidos.</p>
  </div>;
}
