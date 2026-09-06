import { useEffect, useState, type ReactNode } from "react";
import type { ValuePreferenceResult } from "../financingValuePreferences.ts";

type Props = {
  label: string;
  value: number;
  saved: number | undefined;
  format: (value: number) => string;
  onSave: () => ValuePreferenceResult;
  onRemove: () => ValuePreferenceResult;
  render: (action: ReactNode, details: ReactNode) => ReactNode;
};

export default function FinancingValuePreference({ label, value, saved, format, onSave, onRemove, render }: Props) {
  const [feedback, setFeedback] = useState<{ text: string; error: boolean } | null>(null);
  useEffect(() => { setFeedback(null); }, [value]);
  const action = <button type="button" className="fc-save-value" aria-label={`Salvar valor atual de ${label} como padrão`} onClick={() => {
      const result = onSave();
      setFeedback(result.ok
        ? { text: `${label}: ${format(value)} salvo como padrão neste navegador.`, error: false }
        : { text: result.error, error: true });
    }}>Salvar padrão</button>;
  const details = <div className="fc-value-preference">
    <p className="fc-help">Só este campo, ao abrir a calculadora neste navegador. Não altera a faixa nem os estudos.</p>
    {saved !== undefined && <div className="fc-value-saved">
      <span>Padrão salvo: <strong>{format(saved)}</strong></span>
      <button type="button" aria-label={`Remover valor padrão de ${label}`} onClick={() => {
        const result = onRemove();
        setFeedback(result.ok
          ? { text: "Padrão removido. Na próxima abertura será usado o valor original do aplicativo. O valor atual não mudou.", error: false }
          : { text: result.error, error: true });
      }}>Remover padrão</button>
    </div>}
    <div className="fc-value-feedback" role={feedback?.error ? "alert" : "status"}>{feedback?.text ?? ""}</div>
  </div>;
  return render(action, details);
}
