import { sacInstallmentAt } from "./finance";

export type YearBlock = {
    ano: number;
    mesInicio: number;
    mesFim: number;
    primeiraPrestacao: number;
    ultimaPrestacao: number;
    meses: { mes: number; prestacao: number }[];
};

export function buildYearBlocks(input: {
    valorImovel: number;
    entrada: number;
    taxaAnual: number;
    prazoMeses: number;
}): YearBlock[] {
    const n = Math.max(1, Math.trunc(input.prazoMeses));
    const blocks: YearBlock[] = [];

    const totalAnos = Math.ceil(n / 12);
    for (let ano = 1; ano <= totalAnos; ano++) {
        const mesInicio = (ano - 1) * 12 + 1;
        const mesFim = Math.min(ano * 12, n);

        const meses: { mes: number; prestacao: number }[] = [];
        for (let mes = mesInicio; mes <= mesFim; mes++) {
            const inst = sacInstallmentAt(input, mes);
            meses.push({ mes, prestacao: inst.prestacao });
        }

        const primeiraPrestacao = meses[0]?.prestacao ?? 0;
        const ultimaPrestacao = meses[meses.length - 1]?.prestacao ?? 0;

        blocks.push({
            ano,
            mesInicio,
            mesFim,
            primeiraPrestacao,
            ultimaPrestacao,
            meses,
        });
    }

    return blocks;
}
