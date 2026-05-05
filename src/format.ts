export function toNumber(raw: string): number {
    const s = (raw ?? "").toString().trim();
    if (!s) return NaN;

    const hasComma = s.includes(",");
    const hasDot = s.includes(".");

    if (hasComma && hasDot) {
        const lastComma = s.lastIndexOf(",");
        const lastDot = s.lastIndexOf(".");
        const decimalSep = lastComma > lastDot ? "," : ".";
        const thousandSep = decimalSep === "," ? "." : ",";

        const normalized = s
            .split(thousandSep)
            .join("")
            .replace(decimalSep, ".")
            .replace(/[^0-9.+-]/g, "");

        return Number(normalized);
    }

    if (hasComma && !hasDot) {
        const parts = s.split(",");
        const normalized =
            parts.length === 2 && parts[1].length <= 2
                ? parts[0].replace(/[^0-9+-]/g, "") +
                  "." +
                  parts[1].replace(/[^0-9]/g, "")
                : s.replace(/,/g, "").replace(/[^0-9.+-]/g, "");
        return Number(normalized);
    }

    return Number(s.replace(/[^0-9.+-]/g, ""));
}

export function formatNumber(n: number) {
    return new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(n);
}

export function brl(v: number) {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 2,
    }).format(v);
}
