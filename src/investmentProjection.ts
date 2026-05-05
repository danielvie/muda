import {
    projectInvestment,
    type InvestmentProjectionResult,
} from "./finance";
import { brl, toNumber } from "./format";
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
    const meses = Number(fields.mesesProj);
    const taxaAnual = Number(fields.taxaInvestAnual) / 100;
    const saldoInicial = toNumber(fields.saldoInicial);
    const aporteMensal = toNumber(fields.aporteMensal);

    if (
        !Number.isFinite(meses) ||
        !Number.isFinite(taxaAnual) ||
        !Number.isFinite(saldoInicial) ||
        !Number.isFinite(aporteMensal)
    )
        return null;

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
