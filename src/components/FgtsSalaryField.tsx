import { useEffect, useId, useState } from "react";
import { parseFinancingNumber } from "../financingControls.ts";

type Props = {
  value: number;
  hidden: boolean;
  onChange: (value: number) => void;
  onToggleVisibility: () => void;
  onClear: () => boolean;
};
const display = (value: number) => value === 0 ? "" : String(value).replace(".", ",");

export default function FgtsSalaryField({ value, hidden, onChange, onToggleVisibility, onClear }: Props) {
  const id = useId();
  const [draft, setDraft] = useState(() => display(value));
  const [invalid, setInvalid] = useState(false);
  useEffect(() => { setDraft(display(value)); setInvalid(false); }, [value]);
  const clear = () => {
    if (onClear()) { setDraft(""); setInvalid(false); }
    else setDraft(display(value));
  };
  return <div className="comparison-salary-field">
    <label htmlFor={id}>Salário mensal bruto</label>
    <div className="comparison-salary-input"><span>R$</span><input id={id} type={hidden ? "password" : "text"} inputMode="decimal"
        autoComplete="off" spellCheck={false} readOnly={hidden} value={draft} placeholder="Informe o salário"
        aria-invalid={invalid || undefined} aria-describedby={`${id}-help`}
        onChange={event => {
          const next = event.currentTarget.value;
          setDraft(next);
          if (!next.trim()) { clear(); return; }
          const parsed = parseFinancingNumber(next);
          const valid = Number.isFinite(parsed) && parsed >= 0;
          setInvalid(!valid);
          if (valid) onChange(parsed);
        }} />
      <button type="button" className="comparison-salary-icon" aria-label="Limpar salário" title="Limpar salário" onClick={clear}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" focusable="false"><path d="m6 6 12 12M6 18 18 6" /></svg>
      </button>
      <button type="button" className="comparison-salary-icon" aria-label={hidden ? "Revelar salário para editar" : "Ocultar salário"}
        title={hidden ? "Revelar salário" : "Ocultar salário"} aria-controls={id} disabled={!hidden && value === 0} onClick={onToggleVisibility}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />
          {!hidden && <path d="m3 3 18 18" />}
        </svg>
      </button>
    </div>
    <p id={`${id}-help`} className="comparison-note" role={invalid ? "alert" : undefined}>
      {invalid ? "Informe um salário válido, maior ou igual a zero."
        : hidden ? "Salário oculto. Revele para consultar ou editar."
        : "Ao reabrir, o salário salvo fica oculto."}
    </p>
  </div>;
}
