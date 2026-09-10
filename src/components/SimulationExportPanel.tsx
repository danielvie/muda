import { useMemo, useRef, useState } from "react";
import { formatProgramInputs, maskSalaryForPreview, type ProgramInputs } from "../simulationExport.ts";

export default function SimulationExportPanel({ inputs, salaryHidden = false }: { inputs: ProgramInputs; salaryHidden?: boolean }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("");
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const text = useMemo(
    () => formatProgramInputs(inputs),
    [inputs],
  );

  const previewText = salaryHidden ? maskSalaryForPreview(text) : text;

  const copyValues = async () => {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard API indisponível");
      await navigator.clipboard.writeText(text);
      setStatus("Valores copiados.");
      return;
    } catch {
      const temporary = !textAreaRef.current || previewText !== text;
      const textArea = temporary ? document.createElement("textarea") : textAreaRef.current!;
      if (temporary) {
        textArea.value = text;
        textArea.setAttribute("readonly", "");
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
      }

      textArea.focus();
      textArea.select();
      const copied = document.execCommand("copy");
      if (temporary) textArea.remove();
      setStatus(
        copied
          ? "Valores copiados."
          : salaryHidden ? "Não foi possível copiar. Revele o salário para copiar a prévia completa manualmente." : "Não foi possível copiar. Selecione o texto manualmente.",
      );
    }
  };

  return (
    <section
      className="grid gap-3 rounded-[12px] border border-(--lp-line) bg-(--lp-paper) p-4"
      aria-labelledby="simulation-export-title"
    >
      <header className="flex items-start justify-between gap-3 max-[559px]:grid">
        <div>
          <span className="text-(--lp-muted) text-[9px] font-black tracking-[.14em] uppercase">
            EXPORTAR
          </span>
          <h2 id="simulation-export-title" className="mt-1 text-[18px] tracking-tight">
            Copiar premissas do programa
          </h2>
          <p className="mt-1 max-w-120 text-(--lp-muted) text-[11px] leading-[1.4]">
            Dados atuais de Financiar, Investir e Comparar. Não inclui resultados calculados, estudos salvos, histórico ou preferências de interface.
          </p>
        </div>
        <div className="flex shrink-0 gap-2 max-[559px]:w-full">
          <button
            type="button"
            className="min-h-11 flex-1 rounded-[7px] border border-(--lp-ink) bg-(--lp-ink) px-3.5 text-white text-[10px] font-black hover:opacity-85 focus-visible:outline-2 focus-visible:outline-(--lp-accent) focus-visible:outline-offset-2"
            aria-label="Copiar todos os dados de entrada"
            onClick={copyValues}
          >
            copiar
          </button>
          <button
            type="button"
            className="min-h-11 flex-1 rounded-[7px] border border-(--lp-line) bg-transparent px-3.5 text-(--lp-ink) text-[10px] font-black hover:bg-(--lp-bg) focus-visible:outline-2 focus-visible:outline-(--lp-accent) focus-visible:outline-offset-2"
            aria-controls="simulation-export-content"
            aria-expanded={open}
            aria-label={open ? "Fechar detalhes" : "Abrir detalhes"}
            onClick={() => setOpen(previous => !previous)}
          >
            detalhes
          </button>
        </div>
      </header>
      {salaryHidden && <p className="text-(--lp-muted) text-[11px]">O salário está oculto nesta prévia. Copiar inclui o salário, mesmo quando ele está oculto na tela.</p>}
      <p className="text-(--lp-muted) text-[10px]" role="status" aria-live="polite">{status}</p>
      {open && <div id="simulation-export-content" className="grid gap-3">
        <textarea
          ref={textAreaRef}
          className="min-h-55 w-full resize-y rounded-[7px] border border-(--lp-line) bg-(--lp-bg) p-3 font-mono text-[11px] leading-[1.55] text-(--lp-ink) outline-none focus-visible:border-(--lp-accent) focus-visible:ring-2 focus-visible:ring-(--lp-accent)"
          aria-label="Dados de entrada atuais do programa"
          readOnly
          value={previewText}
          onFocus={(event) => event.currentTarget.select()}
        />
      </div>}
    </section>
  );
}
