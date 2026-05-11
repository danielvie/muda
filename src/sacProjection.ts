import { financingSummary, type SacSummary } from "./finance";
import { brl, toNumber } from "./format";
import type { FieldMemory } from "./memory.tsx";
import { buildYearBlocks, type YearBlock } from "./sacSchedule";

export type SacProjectionView = {
    summary: SacSummary;
    metrics: {
        pv: string;
        amortizacao: string;
        prestacaoMes1: string;
        prestacaoUltima: string;
        totalPago: string;
    };
    yearBlocks: YearBlock[];
};

export function buildSacProjection(fields: FieldMemory): SacProjectionView | null {
    const valorImovel = toNumber(fields.valorImovel);
    const entrada = toNumber(fields.entrada);
    const taxaAnual = Number(fields.taxaFinAnual) / 100;
    const prazoMeses = Number(fields.prazoMeses);
    const metodo = fields.metodoAmortizacao;

    if (
        !Number.isFinite(valorImovel) ||
        !Number.isFinite(entrada) ||
        !Number.isFinite(taxaAnual) ||
        !Number.isFinite(prazoMeses)
    )
        return null;

    const input = { valorImovel, entrada, taxaAnual, prazoMeses };
    const summary = financingSummary(input, 1, metodo);

    return {
        summary,
        metrics: {
            pv: brl(summary.pv),
            amortizacao: summary.amortizacao === "Varia" ? "Variável" : `${brl(summary.amortizacao)} / mês`,
            prestacaoMes1: brl(summary.prestacaoMes1),
            prestacaoUltima: brl(summary.prestacaoUltima),
            totalPago: brl(summary.totalPago),
        },
        yearBlocks: buildYearBlocks(input, metodo),
    };
}
