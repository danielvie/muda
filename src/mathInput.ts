import { formatNumber, toNumber } from "./format";

export function parseMathExpression(raw: string): number | null {
    if (raw == null) return null;
    const s = raw.toString().trim();
    if (!s) return null;

    if (!/^[0-9+\-*/().\s]+$/.test(s)) return null;

    let bal = 0;
    for (const ch of s) {
        if (ch === "(") bal++;
        else if (ch === ")") {
            bal--;
            if (bal < 0) return null;
        }
    }
    if (bal !== 0) return null;

    try {
        const fn = new Function(`return (${s});`);
        const out = fn();
        return Number.isFinite(out) ? Number(out) : null;
    } catch {
        return null;
    }
}

export function commitExprString(
    current: string,
    setter: (v: string) => void,
    opts?: { int?: boolean; min?: number },
) {
    const n = parseMathExpression(current);
    if (n == null) return;
    const int = opts?.int ? Math.trunc(n) : n;
    const min = opts?.min ?? -Infinity;
    setter(String(Math.max(min, int)));
}

export function formatMoneyOnBlur(current: string, setter: (v: string) => void) {
    const n = toNumber(current);
    if (!Number.isFinite(n)) return;
    setter(formatNumber(n));
}
