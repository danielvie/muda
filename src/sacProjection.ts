import { sacSummary, type SacSummary } from "./finance";
import { brl, toNumber } from "./format";
import type { FieldMemory } from "./memory.svelte";
import { buildYearBlocks, type YearBlock } from "./sacSchedule";

export type SacProjectionView = {
    summary: SacSummary;
    metrics: {
        pv: string;
        amortizacao: string;
        prestacaoMes1: string;
        prestacaoUltima: string;
    };
    yearBlocks: YearBlock[];
};

export function buildSacProjection(fields: FieldMemory): SacProjectionView | null {
    const valorImovel = toNumber(fields.valorImovel);
    const entrada = toNumber(fields.entrada);
    const taxaAnual = Number(fields.taxaFinAnual) / 100;
    const prazoMeses = Number(fields.prazoMeses);

    if (
        !Number.isFinite(valorImovel) ||
        !Number.isFinite(entrada) ||
        !Number.isFinite(taxaAnual) ||
        !Number.isFinite(prazoMeses)
    )
        return null;

    const input = { valorImovel, entrada, taxaAnual, prazoMeses };
    const summary = sacSummary(input, 1);

    return {
        summary,
        metrics: {
            pv: brl(summary.pv),
            amortizacao: `${brl(summary.amortizacao)} / mês`,
            prestacaoMes1: brl(summary.prestacaoMes1),
            prestacaoUltima: brl(summary.prestacaoUltima),
        },
        yearBlocks: buildYearBlocks(input),
    };
}
