import { useId, useState } from "react";
import { formatFinancingNumber, parseFinancingNumber, type Bounds, type FinancingField } from "../financingControls.ts";
import { validateRangePreference, type PreferenceResult } from "../financingRangePreferences.ts";
import "./FinancingRangePreferences.css";

type Props = {
  field: FinancingField; label: string; unit: string; monetary: boolean;
  current: Bounds; saved: Bounds; applied: Bounds; customized: boolean;
  format: (value: number) => string;
  onSave: (bounds: Bounds) => PreferenceResult;
  onRestore: () => PreferenceResult;
};
export default function FinancingRangePreferences(p: Props) {
  const [editing, setEditing] = useState(false);
  const [draftMin, setDraftMin] = useState('');
  const [draftMax, setDraftMax] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [message, setMessage] = useState('');
  const id = useId();
  const format = (value: number) => p.monetary ? `R$ ${formatFinancingNumber(value, true)}` : p.format(value);
  const edit = () => {
    setDraftMin(formatFinancingNumber(p.saved.min, p.monetary));
    setDraftMax(formatFinancingNumber(p.saved.max, p.monetary));
    setEditing(true); setError(null); setInvalid(false); setMessage('');
  };
  const save = (bounds: Bounds) => {
    const validation = validateRangePreference(p.field, bounds);
    if (validation) { setError(validation); setInvalid(true); setMessage(''); return; }
    const result = p.onSave(bounds);
    if (!result.ok) { setError(result.error); setInvalid(false); setMessage(''); return; }
    setEditing(false); setError(null); setInvalid(false);
    setMessage('Faixa padrão salva neste navegador. A barra em uso não mudou.');
  };
  const restore = () => {
    const result = p.onRestore();
    if (!result.ok) { setError(result.error); setInvalid(false); setMessage(''); return; }
    setError(null); setInvalid(false);
    setMessage('Padrão do aplicativo restaurado neste navegador. Use Resetar faixa para aplicá-lo à barra.');
  };
  const adjusted = p.applied.min !== p.saved.min || p.applied.max !== p.saved.max;
  return <details className="range-preferences">
    <summary><span><strong>Minha faixa</strong><small>{format(p.saved.min)} a {format(p.saved.max)}</small></span><span className="rp-chevron" aria-hidden="true">⌄</span></summary>
    <div className="rp-body">
      <header><h3>Faixa padrão de {p.label.toLocaleLowerCase('pt-BR')}</h3><small>{p.customized ? 'Salva neste navegador' : 'Padrão do aplicativo'}</small></header>
      <p>Usada nas próximas visitas e ao tocar em Resetar faixa. Crop e expansão não alteram este padrão.</p>
      {editing ? <form aria-label={`Editar faixa padrão de ${p.label}`} onSubmit={event => { event.preventDefault(); save({ min: parseFinancingNumber(draftMin), max: parseFinancingNumber(draftMax) }); }}>
        <div className="rp-fields">
          <label htmlFor={`${id}-min`}><span>Mínimo · {p.unit}</span><input id={`${id}-min`} type="text" inputMode="decimal" autoComplete="off" value={draftMin} aria-invalid={invalid || undefined} aria-describedby={error ? `${id}-error` : undefined} onChange={event => { setDraftMin(event.target.value); setError(null); setInvalid(false); }} /></label>
          <label htmlFor={`${id}-max`}><span>Máximo · {p.unit}</span><input id={`${id}-max`} type="text" inputMode="decimal" autoComplete="off" value={draftMax} aria-invalid={invalid || undefined} aria-describedby={error ? `${id}-error` : undefined} onChange={event => { setDraftMax(event.target.value); setError(null); setInvalid(false); }} /></label>
        </div>
        <p>Alterações ainda não salvas. Salvar guarda o padrão; Resetar faixa o aplica à barra. Cancelar ou mudar de campo descarta a edição.</p>
        <div className="rp-actions"><button type="submit" className="rp-primary">Salvar</button><button type="button" onClick={() => { setEditing(false); setError(null); setInvalid(false); setMessage('Edição descartada.'); }}>Cancelar</button></div>
      </form> : <>
        <div className="rp-current"><span>Faixa em uso agora</span><strong>{format(p.current.min)} a {format(p.current.max)}</strong></div>
        <button type="button" className="rp-primary" onClick={() => save(p.current)}>Salvar faixa atual como padrão</button>
        <button type="button" onClick={edit}>Editar limites</button>
        <button type="button" className="rp-restore" disabled={!p.customized} onClick={restore}>Restaurar padrão do aplicativo</button>
      </>}
      {error && <p id={`${id}-error`} className="rp-error" role="alert">{error}</p>}
      <p className="rp-status" role="status">{message}</p>
      {adjusted && <p className="rp-adjusted">Ao usar este padrão, a barra ficará entre {format(p.applied.min)} e {format(p.applied.max)} para incluir o valor atual e respeitar os limites do campo. O padrão salvo não muda.</p>}
      <p className="rp-note">Estas preferências ficam somente neste navegador. Não salvam automaticamente a simulação.</p>
    </div>
  </details>;
}
