import React from "react";
import { brl } from "../format";
import type { YearBlock } from "../sacSchedule";

export default function YearBlockList({ blocks }: { blocks: YearBlock[] }) {
  return (
    <details className="mt-3 group">
      <summary className="
        cursor-pointer select-none
        py-4
        px-3
        rounded-sm
        bg-accent/90
        border
        border-border
        text-sm
        font-semibold
        text-surface
        transition-colors
        font-mono
        uppercase
        text-center
        hover:border-border-focus
        hover:bg-accent
        list-none
        [&::-webkit-details-marker]:hidden">
        Simulação de prestações por ano
      </summary>

      <div className="mt-3 grid gap-3">
        {blocks.map((block) => (
          <details key={block.ano} className="p-3 rounded-md bg-surface-alt border border-border [&>summary::-webkit-details-marker]:hidden">
            <summary className="cursor-pointer flex items-center justify-between gap-3 py-2 px-2 rounded-sm transition-colors hover:bg-accent-soft list-none">
              <div>
                <div className="text-xs font-semibold text-text-heading">Ano {block.ano}</div>
                <div className="text-[11px] text-text-muted">
                  Meses {block.mesInicio}-{block.mesFim}
                </div>
              </div>
              <div className="text-xs font-semibold whitespace-nowrap text-positive font-mono">
                {brl(block.primeiraPrestacao)} {"->"} {brl(block.ultimaPrestacao)}
              </div>
            </summary>

            <div className="mt-3 grid grid-cols-4 gap-2 min-w-0 max-md:grid-cols-2">
              {block.meses.map((m) => (
                <div
                  key={m.mes}
                  className="p-2 rounded-sm bg-surface border border-border transition-colors hover:border-border-focus"
                >
                  <div className="text-[10px] text-text-muted mb-1">M{m.mes}</div>
                  <div className="text-xs font-semibold text-text-heading font-mono">{brl(m.prestacao)}</div>
                </div>
              ))}
            </div>
          </details>
        ))}
      </div>
    </details>
  );
}
