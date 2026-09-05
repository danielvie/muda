import { useState } from "react";
import { sliderControlKey, sliderControlValue } from "../financingGesture.ts";
import FinancingGestureControl, { type FinancingGestureControlProps } from "./FinancingGestureControl.tsx";
import "./FinancingRangeControl.css";

/** The everyday slider stays visible; the two-axis surface only exists while explicitly open. */
export default function FinancingRangeControl(props: FinancingGestureControlProps) {
  const [expanded, setExpanded] = useState(false);
  const { bounds, spec, format } = props;
  const change = (value: number) => props.onChange(sliderControlValue(value, bounds, spec), bounds);
  return <div className="financing-range-control">
    <div className="frc-slider">
      <input type="range" aria-label={`Ajustar ${props.label}`} aria-valuetext={format(spec.value)} min={bounds.min} max={bounds.max} step="any" value={spec.value} disabled={bounds.max <= bounds.min}
        onChange={event => change(Number(event.currentTarget.value))}
        onKeyDown={event => {
          if (event.altKey || event.ctrlKey || event.metaKey) return;
          const next = sliderControlKey(event.key, bounds, spec);
          if (next === null) return;
          event.preventDefault(); change(next);
        }} />
    </div>
    <div className="frc-limits" aria-hidden="true"><span>{format(bounds.min)}</span><span>{format(bounds.max)}</span></div>
    <p className="frc-step">Passo: {props.stepLabel}.</p>
    <details className="frc-disclosure" onToggle={event => setExpanded(event.currentTarget.open)}>
      <summary><span><strong>Ajustar alcance e precisão</strong><small>Expandir controles de gesto e recorte</small></span><span className="frc-chevron" aria-hidden="true">⌄</span></summary>
      {expanded && <div className="frc-advanced"><FinancingGestureControl {...props} /></div>}
    </details>
  </div>;
}
