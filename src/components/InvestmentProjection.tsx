import { useEffect, useId, useState } from "react";
import { useMemory } from "../memory.tsx";
import { buildInvestmentProjection } from "../investmentProjection.ts";
import { formatNumber } from "../format.ts";
import { INVESTMENT_FIELDS, formatInvestmentValue, investmentControlSpec, investmentInputError, investmentRange, parseInvestmentInput, parseInvestmentPeriod, investmentPeriodInput, formatInvestmentPeriod, type InvestmentField, type InvestmentPeriodUnit } from "../investmentControls.ts";
import { resolveInvestmentRanges, validateInvestmentRange } from "../investmentPreferences.ts";
import FinancingRangeControl from "./FinancingRangeControl.tsx";
import FinancingRangePreferences from "./FinancingRangePreferences.tsx";
import FinancingValuePreference from "./FinancingValuePreference.tsx";
import "./InvestmentProjection.css";

function PeriodInput({ id, raw, unit, onChange }: { id: string; raw: string; unit: InvestmentPeriodUnit; onChange: (months: number) => void }) {
  const months = parseInvestmentInput("mesesProj", raw);
  const display = months === null ? raw : investmentPeriodInput(months, unit);
  const [draft, setDraft] = useState(display);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => { setDraft(display); setDirty(false); setError(false); }, [display]);
  const commit = () => {
    if (!dirty) return;
    const next = parseInvestmentPeriod(draft, unit);
    if (next === null) { setError(true); return; }
    setDirty(false); setError(false); setDraft(investmentPeriodInput(next, unit)); onChange(next);
  };
  return <>
    <input id={id} className="investment-value-input" type="text" inputMode="decimal" autoComplete="off" value={draft}
      aria-invalid={error || months === null || undefined} aria-describedby={error ? `${id}-period-error` : undefined}
      onChange={event => { setDraft(event.currentTarget.value); setDirty(true); setError(false); }} onBlur={commit}
      onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); }} />
    {error && <p id={`${id}-period-error`} className="investment-input-error" role="alert">{unit === "years" ? "Informe de 0 a 100 anos, equivalentes a meses inteiros. Exemplo: 2,5 anos = 30 meses." : "Informe de 0 a 1.200 meses inteiros."} O período anterior foi mantido.</p>}
  </>;
}

export default function InvestmentProjection() {
  const { fields, updateField, investmentControls: controls } = useMemory();
  const id = useId();
  const projection = buildInvestmentProjection(fields);
  const selected = controls.selected;
  const field = INVESTMENT_FIELDS.find(item => item.key === selected)!;
  const value = parseInvestmentInput(selected, fields[selected]);
  const defaults = resolveInvestmentRanges(controls.rangePreferences);
  const [unitError, setUnitError] = useState<string | null>(null);
  const periodSelected = selected === "mesesProj";
  const unit = controls.periodUnit;
  const fieldUnit = periodSelected ? unit === "years" ? "anos" : "meses" : field.unit;
  const format = (number: number) => periodSelected ? formatInvestmentPeriod(number, unit) : formatInvestmentValue(selected, number);
  const sliderStep = periodSelected && unit === "years" ? 12 : field.step;
  const bounds = value === null ? null : investmentRange(selected, controls.ranges[selected], value);
  const defaultApplied = value === null ? null : investmentRange(selected, defaults[selected], value);

  function setValue(key: InvestmentField, number: number) {
    updateField(key, key === "saldoInicial" || key === "aporteMensal" ? formatNumber(number) : String(number));
    controls.setRange(key, investmentRange(key, controls.ranges[key], number));
  }
  function commit() {
    if (value !== null) setValue(selected, value);
  }

  return <section className="investment-projection p-4" aria-labelledby={`${id}-title`}>
    <h2 id={`${id}-title`} className="sr-only">Investimento</h2>
    <div className="investment-targets" role="group" aria-label="Escolha o que ajustar no investimento">
      {INVESTMENT_FIELDS.map(item => {
        const current = parseInvestmentInput(item.key, fields[item.key]);
        return <button type="button" key={item.key} aria-label={`Ajustar ${item.label} na barra`} aria-pressed={selected === item.key} onClick={() => controls.select(item.key)}>
          <span>{item.label}</span>
          <strong>{current === null ? "Valor inválido" : item.key === "mesesProj" ? formatInvestmentPeriod(current, unit) : formatInvestmentValue(item.key, current)}</strong>
        </button>;
      })}
    </div>

    <section className="investment-range" aria-label={`Barra de ${field.label}`}>
      {periodSelected && <div className="investment-period-unit" role="group" aria-label="Unidade do período">
        {([['months', 'Meses'], ['years', 'Anos']] as const).map(([option, label]) => <button type="button" key={option} aria-pressed={unit === option} onClick={() => {
          const result = controls.setPeriodUnit(option); setUnitError(result.ok ? null : result.error);
        }}>{label}</button>)}
      </div>}
      {periodSelected && unitError && <p className="investment-input-error" role="alert">{unitError}</p>}
      <label className="investment-input-label" htmlFor={`${id}-value`}><span>{field.label}</span><small>{fieldUnit}</small></label>
      {periodSelected ? <PeriodInput key={`period-${unit}`} id={`${id}-value`} raw={fields.mesesProj} unit={unit} onChange={number => setValue("mesesProj", number)} />
        : <input key={selected} id={`${id}-value`} className="investment-value-input" type="text" inputMode="decimal" autoComplete="off" value={fields[selected]}
        aria-invalid={value === null || undefined} aria-describedby={value === null ? `${id}-error` : `${id}-input-help`}
        onChange={event => updateField(selected, event.currentTarget.value)}
        onBlur={commit} onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); }} />}
      {periodSelected && unit === "years" && value !== null && <p className="fc-help">Duração de {formatInvestmentPeriod(value, "months")}. Trocar a unidade não altera o período.</p>}
      <p id={`${id}-input-help`} className="fc-help">Use a barra para ajustar. Se digitar, confirme com Enter ou saia do campo.</p>
      {value === null && <p id={`${id}-error`} className="investment-input-error" role="alert">{investmentInputError(selected)}</p>}
      {value !== null && bounds && defaultApplied ? <>
        <FinancingValuePreference key={`value-${selected}`} label={field.label} value={value} saved={controls.valuePreferences[selected]} format={format}
          helpText="O padrão salvo será usado ao abrir a aplicação. Sem padrão, vale o último valor lembrado. Não altera a faixa."
          removedText="Padrão removido. Na próxima abertura será usado o último valor lembrado. O valor atual não mudou."
          onSave={() => controls.saveValue(selected, value)} onRemove={() => controls.saveValue(selected, null)}
          render={(action, details) => <FinancingRangeControl key={`${selected}-${unit}`} label={field.label} spec={{ ...investmentControlSpec(selected, value), step: sliderStep }} bounds={bounds}
            stepLabel={format(sliderStep)} format={format} onChange={number => setValue(selected, number)}
            onBoundsChange={next => controls.setRange(selected, next)} onResetRange={() => controls.setRange(selected, defaultApplied)}
            onSaveRange={() => controls.saveRange(selected, bounds)} valuePreferenceAction={action} valuePreferenceDetails={details} />} />
        <FinancingRangePreferences key={`range-${selected}-${unit}`} label={field.label} unit={fieldUnit} monetary={field.monetary}
          inputFormat={periodSelected ? number => investmentPeriodInput(number, unit) : undefined}
          parseInput={periodSelected ? raw => parseInvestmentPeriod(raw, unit) ?? NaN : undefined}
          validate={next => validateInvestmentRange(selected, next)} current={bounds} saved={defaults[selected]} applied={defaultApplied}
          customized={controls.rangePreferences[selected] !== undefined} format={format}
          onSave={next => controls.saveRange(selected, next)} onRestore={() => controls.saveRange(selected, null)} />
      </> : <p className="investment-input-error">Corrija o valor acima para usar a barra. Os padrões salvos foram preservados.</p>}
    </section>

    <div className="mt-3" aria-label="Resultado do investimento">
      {projection ? <>
        <div className="metric-highlight">
          <div className="metric-label">Saldo final</div>
          <div className="metric-value" style={{ fontSize: 24 }}>{projection.metrics.saldoFinal}</div>
        </div>
        <div className="grid grid-cols-2 gap-2.5 min-w-0 mt-2.5 max-sm:grid-cols-1">
          <div className="metric"><div className="metric-label">Total investido</div><div className="metric-value">{projection.metrics.totalAportado}</div></div>
          <div className="metric"><div className="metric-label">Rendimento</div><div className="metric-value text-positive">{projection.metrics.ganho}</div></div>
        </div>
      </> : <div className="text-xs text-text-muted">Preencha os campos com números válidos.</div>}
    </div>
  </section>;
}
