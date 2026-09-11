import {
    projectInvestment,
    type InvestmentProjectionResult,
} from "./finance.ts";
import { brl } from "./format.ts";
import { parseInvestmentInput } from "./investmentControls.ts";
import type { FieldMemory } from "./memory.tsx";

export type InvestmentProjectionView = {
    result: InvestmentProjectionResult;
    metrics: {
        saldoFinal: string;
        totalAportado: string;
        ganho: string;
    };
};

export function buildInvestmentProjection(
    fields: FieldMemory,
): InvestmentProjectionView | null {
    const meses = parseInvestmentInput("mesesProj", fields.mesesProj);
    const taxa = parseInvestmentInput("taxaInvestAnual", fields.taxaInvestAnual);
    const saldoInicial = parseInvestmentInput("saldoInicial", fields.saldoInicial);
    const aporteMensal = parseInvestmentInput("aporteMensal", fields.aporteMensal);
    if (meses === null || taxa === null || saldoInicial === null || aporteMensal === null) return null;
    const taxaAnual = taxa / 100;

    const result = projectInvestment({
        saldoInicial,
        aporteMensal,
        taxaAnual,
        meses,
    });

    return {
        result,
        metrics: {
            saldoFinal: brl(result.saldoFinal),
            totalAportado: brl(result.totalAportado),
            ganho: brl(result.ganho),
        },
    };
}
