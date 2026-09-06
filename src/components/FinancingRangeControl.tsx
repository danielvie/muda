import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { sliderControlKey, sliderControlValue, type ControlSpec } from "../financingGesture.ts";
import { proposeRangeDrop, proposalAtPoint, type RangeDropProposal, type RangeDropTrack } from "../financingRangeDrop.ts";
import type { Bounds } from "../financingControls.ts";
import "./FinancingRangeControl.css";

type Props = {
  label: string; spec: ControlSpec; bounds: Bounds; stepLabel: string;
  format: (value: number) => string;
  onChange: (value: number, bounds: Bounds) => void;
  onBoundsChange: (bounds: Bounds) => void;
  onResetRange: () => void;
  valuePreferenceAction?: ReactNode;
  valuePreferenceDetails?: ReactNode;
};
type Session = {
  pointerId: number | null; startX: number; startY: number; moved: boolean;
  track: RangeDropTrack; bounds: Bounds; spec: ControlSpec; target: number;
};
function proposalTitle(proposal: RangeDropProposal) {
  if (proposal.intent === 'reset-min') return 'Restaurar mínimo';
  if (proposal.intent === 'expand-max') return 'Duplicar máximo';
  if (proposal.intent === 'crop-center') return 'Centralizar faixa em ± R$ 100 mil';
  return proposal.cropEdge === 'max' ? 'Manter mínimo e recortar máximo' : 'Recortar mínimo e manter máximo';
}

export default function FinancingRangeControl(props: Props) {
  const latest = useRef(props); latest.current = props;
  const input = useRef<HTMLInputElement>(null);
  const helper = useRef<HTMLButtonElement>(null);
  const session = useRef<Session | null>(null);
  const proposal = useRef<RangeDropProposal | null>(null);
  const [preview, setPreview] = useState<RangeDropProposal | null>(null);
  const [active, setActive] = useState(false);
  const [message, setMessage] = useState('Arraste Foco até um ponto da barra para recortar.');
  const helpId = useId();
  const setProposal = (next: RangeDropProposal | null) => { proposal.current = next; setPreview(next); };
  const finish = () => {
    const id = session.current?.pointerId;
    session.current = null; proposal.current = null; setPreview(null); setActive(false);
    if (id != null && helper.current?.hasPointerCapture(id)) helper.current.releasePointerCapture(id);
  };
  const cancel = () => {
    if (!session.current) return;
    finish(); setMessage('Gesto cancelado. A faixa não mudou.');
  };
  const begin = (id: number | null, x: number, y: number) => {
    const p = latest.current;
    const rect = input.current!.getBoundingClientRect();
    const left = rect.left + 22;
    session.current = { pointerId: id, startX: x, startY: y, moved: false, track: { left, right: Math.max(left + 1, rect.right - 22), y: rect.top + rect.height / 2 }, bounds: p.bounds, spec: p.spec, target: p.spec.value };
    setActive(true); setProposal(null);
    setMessage('Sobre a barra: recortar. À esquerda: restaurar mínimo. À direita: máximo ×2.');
  };
  const at = (x: number, y: number) => {
    const s = session.current;
    return s ? proposalAtPoint(x, y, s.track, s.bounds, s.spec) : null;
  };
  const apply = (next: RangeDropProposal | null) => {
    finish();
    if (!next) { setMessage('Solte sobre a barra ou nas laterais. Nada foi alterado.'); return; }
    if (next.changed) latest.current.onBoundsChange(next.bounds);
    const note = next.limited ? ' Os limites deste campo foram respeitados.' : '';
    setMessage(next.changed ? `${proposalTitle(next)}: ${latest.current.format(next.bounds.min)} a ${latest.current.format(next.bounds.max)}. Valor preservado.${note}` : `A faixa já está no limite permitido.${note}`);
  };
  useEffect(() => {
    const stop = () => cancel();
    window.addEventListener('blur', stop); document.addEventListener('visibilitychange', stop);
    return () => { session.current = null; proposal.current = null; window.removeEventListener('blur', stop); document.removeEventListener('visibilitychange', stop); };
  }, []);
  useEffect(() => { cancel(); }, [props.bounds.min, props.bounds.max, props.spec.value, props.spec.min, props.spec.max]);
  const { bounds, spec, format } = props;
  const width = Math.max(spec.step, bounds.max - bounds.min);
  const percent = (value: number) => Math.max(0, Math.min(100, (value - bounds.min) / width * 100));
  const changeValue = (value: number) => props.onChange(sliderControlValue(value, bounds, spec), bounds);
  return <div className="financing-range-control">
    <div className="frc-rail">
      <span className="frc-drop-zone" role="img" aria-label={`Soltar à esquerda: restaurar mínimo para ${format(spec.min)}`} data-active={preview?.intent === 'reset-min'} title={`Restaurar mínimo para ${format(spec.min)}`}>←<small>{spec.min === 0 ? '0' : 'mín'}</small></span>
      <div className="frc-slider" data-center-crop={preview?.intent === 'crop-center'}>
        <input ref={input} type="range" aria-label={`Ajustar ${props.label}`} aria-valuetext={format(spec.value)} min={bounds.min} max={bounds.max} step="any" value={spec.value} disabled={bounds.max <= bounds.min}
          onChange={event => changeValue(Number(event.currentTarget.value))}
          onKeyDown={event => {
            if (event.altKey || event.ctrlKey || event.metaKey) return;
            const next = sliderControlKey(event.key, bounds, spec);
            if (next !== null) { event.preventDefault(); changeValue(next); }
          }} />
        {preview && <div className="frc-preview-track" aria-hidden="true"><span style={{ left: `${percent(preview.bounds.min)}%`, width: `${percent(preview.bounds.max) - percent(preview.bounds.min)}%` }} /></div>}
      </div>
      <span className="frc-drop-zone" role="img" aria-label="Soltar à direita: duplicar limite máximo" data-active={preview?.intent === 'expand-max'} title="Duplicar o máximo sem mudar o mínimo">→<small>2×</small></span>
    </div>
    <div className="frc-limits" aria-hidden="true"><span>{format(bounds.min)}</span><span>{format(bounds.max)}</span></div>
    <div className="frc-focus-row">
      {props.valuePreferenceAction && <div className="frc-value-action">{props.valuePreferenceAction}</div>}
      <button ref={helper} type="button" className="frc-focus" aria-label={`Arrastar Foco de ${props.label}`} aria-describedby={helpId} disabled={spec.max <= spec.min} data-active={active}
        onPointerDown={event => {
          if (event.button !== 0 || session.current?.pointerId != null) return;
          event.preventDefault(); flushSync(() => event.currentTarget.focus({ preventScroll: true }));
          if (event.currentTarget.disabled) return;
          event.currentTarget.setPointerCapture(event.pointerId); begin(event.pointerId, event.clientX, event.clientY);
        }} onPointerMove={event => {
          const s = session.current; if (!s || s.pointerId !== event.pointerId) return;
          if (!s.moved && Math.hypot(event.clientX - s.startX, event.clientY - s.startY) < 8) return;
          s.moved = true; setProposal(at(event.clientX, event.clientY));
        }} onPointerUp={event => {
          const s = session.current; if (!s || s.pointerId !== event.pointerId) return;
          if (s.moved) apply(at(event.clientX, event.clientY)); else finish();
        }} onPointerCancel={event => { if (session.current?.pointerId === event.pointerId) cancel(); }}
        onLostPointerCapture={event => { if (session.current?.pointerId === event.pointerId) cancel(); }}
        onBlur={() => { if (session.current?.pointerId === null) cancel(); }}
        onContextMenu={event => event.preventDefault()}
        onKeyDown={event => {
          if (event.altKey || event.ctrlKey || event.metaKey || session.current?.pointerId != null) return;
          if (event.key === 'Escape') { event.preventDefault(); cancel(); return; }
          if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); if (session.current) apply(proposal.current); return; }
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End', '+', '=', '-'].includes(event.key)) return;
          event.preventDefault(); if (!session.current) begin(null, 0, 0);
          const s = session.current!;
          if (event.key === '+' || event.key === '=') { setProposal(proposeRangeDrop('expand-max', s.bounds, s.spec)); return; }
          if (event.key === '-') { setProposal(proposeRangeDrop('reset-min', s.bounds, s.spec)); return; }
          s.target = event.key === 'Home' ? s.bounds.min : event.key === 'End' ? s.bounds.max : Math.max(s.bounds.min, Math.min(s.bounds.max, s.target + (event.key === 'ArrowRight' ? 1 : -1) * Math.max(s.spec.step, (s.bounds.max - s.bounds.min) / 20)));
          const fraction = s.bounds.max > s.bounds.min ? (s.target - s.bounds.min) / (s.bounds.max - s.bounds.min) : 0;
          setProposal(proposalAtPoint(s.track.left + fraction * (s.track.right - s.track.left), s.track.y, s.track, s.bounds, s.spec));
        }}><span aria-hidden="true">⠿</span><strong>Foco</strong></button>
      <button type="button" className="frc-reset" onClick={() => { finish(); props.onResetRange(); setMessage('Faixa padrão restaurada. O valor foi preservado.'); }}>Resetar faixa</button>
    </div>
    {props.valuePreferenceDetails}
    <div className="frc-feedback" role="status">{preview ? <><strong>{proposalTitle(preview)}</strong><span>{format(preview.bounds.min)} a {format(preview.bounds.max)}</span>{preview.limited && <small>Respeita o limite permitido para este campo.</small>}</> : <span>{message}</span>}</div>
    <p className="frc-step">Passo: {props.stepLabel}.</p>
    <p id={helpId} className="frc-help">{spec.monetary && 'Perto do puxador, enquadra R$ 100 mil abaixo e acima do valor atual. '}Acima do valor atual, mantém o mínimo; abaixo, mantém o máximo. Fora à esquerda restaura o mínimo; fora à direita dobra o máximo. O valor atual é preservado. No teclado, use ← → para escolher o ponto, −/+ para os limites, Enter para aplicar e Esc para cancelar.</p>
  </div>;
}
