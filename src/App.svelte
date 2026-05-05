<script lang="ts">
  import {
    projectInvestment,
    sacInstallmentAt,
    sacSummary,
    type InvestmentProjectionResult,
  } from "./finance";

  import { Agentation } from "sv-agentation";

  const agentationEnabled = typeof window !== "undefined" && import.meta.env.DEV;
  const agentationWorkspaceRoot = agentationEnabled ? __AGENTATION_WORKSPACE_ROOT__ : null;

  // Svelte 5 (runes): estado reativo
  let saldoInicial = $state("50000");
  let aporteMensal = $state("2000");
  let taxaInvestAnual = $state(10); // %
  let mesesProj = $state("24"); // permite expressão matemática

  // Financiamento SAC
  let valorImovel = $state("800000");
  let entrada = $state("180000");
  let taxaFinAnual = $state(12); // %
  let prazoMeses = $state("360"); // permite expressão matemática

  const investimento = $derived.by(() => calcInvestimento());
  const sac = $derived.by(() => calcSac());
  const yearBlocks = $derived.by(() =>
    sac
      ? buildYearBlocks({
          valorImovel: toNumber(valorImovel),
          entrada: toNumber(entrada),
          taxaAnual: taxaFinAnual / 100,
          prazoMeses: Number(prazoMeses),
        })
      : [],
  );

  function calcInvestimento(): InvestmentProjectionResult | null {
    const meses = Number(mesesProj);
    const taxa = Number(taxaInvestAnual) / 100;
    const saldo = toNumber(saldoInicial);
    const aporte = toNumber(aporteMensal);

    if (
      !Number.isFinite(meses) ||
      !Number.isFinite(taxa) ||
      !Number.isFinite(saldo) ||
      !Number.isFinite(aporte)
    )
      return null;

    return projectInvestment({
      saldoInicial: saldo,
      aporteMensal: aporte,
      taxaAnual: taxa,
      meses,
    });
  }

  function calcSac() {
    const v = toNumber(valorImovel);
    const e = toNumber(entrada);
    const taxa = Number(taxaFinAnual) / 100;
    const prazo = Number(prazoMeses);

    if (!Number.isFinite(v) || !Number.isFinite(e) || !Number.isFinite(taxa) || !Number.isFinite(prazo))
      return null;

    return sacSummary({ valorImovel: v, entrada: e, taxaAnual: taxa, prazoMeses: prazo }, 1);
  }

  type YearBlock = {
    ano: number;
    mesInicio: number;
    mesFim: number;
    primeiraPrestacao: number;
    ultimaPrestacao: number;
    meses: { mes: number; prestacao: number }[];
  };

  function buildYearBlocks(input: {
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
        const inst = sacInstallmentAt(
          {
            valorImovel: input.valorImovel,
            entrada: input.entrada,
            taxaAnual: input.taxaAnual,
            prazoMeses: input.prazoMeses,
          },
          mes,
        );
        meses.push({ mes, prestacao: inst.prestacao });
      }

      const primeiraPrestacao = meses[0]?.prestacao ?? 0;
      const ultimaPrestacao = meses[meses.length - 1]?.prestacao ?? 0;

      blocks.push({ ano, mesInicio, mesFim, primeiraPrestacao, ultimaPrestacao, meses });
    }

    return blocks;
  }

  function toNumber(raw: string): number {
    // aceita entradas tipo "500,000.00" ou "500.000,00" e também "500000"
    const s = (raw ?? "").toString().trim();
    if (!s) return NaN;

    const hasComma = s.includes(",");
    const hasDot = s.includes(".");

    if (hasComma && hasDot) {
      // último separador é o decimal
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
      // ambíguo: pode ser milhar ou decimal; assume decimal se tiver 1 vírgula e <=2 casas
      const parts = s.split(",");
      const normalized =
        parts.length === 2 && parts[1].length <= 2
          ? parts[0].replace(/[^0-9+-]/g, "") + "." + parts[1].replace(/[^0-9]/g, "")
          : s.replace(/,/g, "").replace(/[^0-9.+-]/g, "");
      return Number(normalized);
    }

    return Number(s.replace(/[^0-9.+-]/g, ""));
  }

  function formatNumber(n: number) {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  }

  function parseMathExpression(raw: string): number | null {
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

  function brl(v: number) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 2,
    }).format(v);
  }

  function commitExprString(
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

  function formatMoneyOnBlur(current: string, setter: (v: string) => void) {
    const n = toNumber(current);
    if (!Number.isFinite(n)) return;
    setter(formatNumber(n));
  }
</script>

<div class="min-h-screen flex flex-col bg-(--color-bg) text-(--color-text) font-sans">
  <!-- Header -->
  <header class="sticky top-0 z-10 bg-(--color-bg)/80 backdrop-blur-md border-b border-(--color-border)">
    <div class="w-full max-w-[980px] mx-auto px-4 py-3 flex items-center justify-between">
      <h1 class="m-0 text-sm font-semibold text-(--color-text-heading) tracking-tight">
        <span class="text-(--color-accent) text-4xl">muda</span><span class="text-(--color-text-muted) font-normal ml-2 text-xs">investimento + SAC</span>
      </h1>
    </div>
  </header>

  <!-- Main -->
  <div class="w-full max-w-[980px] mx-auto px-4">
    <main class="py-5 grid gap-4 min-w-0">

      <!-- Investimento -->
      <section class="bg-(--color-surface) border border-(--color-border) rounded-(--radius-lg) p-4" aria-labelledby="inv-title">
        <h2 id="inv-title" class="m-0 text-sm font-semibold text-(--color-text-heading) tracking-tight">Projeção de investimento</h2>

        <div class="mt-3 grid grid-cols-2 gap-3 min-w-0 max-md:grid-cols-1">
          <label class="grid gap-1.5">
            <span class="text-xs text-(--color-text-muted)">Saldo inicial (R$)</span>
            <input
              class="input-field"
              type="text"
              bind:value={saldoInicial}
              onblur={() => formatMoneyOnBlur(saldoInicial, (v) => (saldoInicial = v))}
            />
          </label>

          <label class="grid gap-1.5">
            <span class="text-xs text-(--color-text-muted)">Aporte mensal (R$)</span>
            <input
              class="input-field"
              type="text"
              bind:value={aporteMensal}
              onblur={() => formatMoneyOnBlur(aporteMensal, (v) => (aporteMensal = v))}
            />
          </label>

          <label class="grid gap-1.5">
            <span class="text-xs text-(--color-text-muted)">Taxa anual (%)</span>
            <input class="input-field" type="number" step="0.1" bind:value={taxaInvestAnual} />
          </label>

          <label class="grid gap-1.5">
            <span class="text-xs text-(--color-text-muted)">Meses para projetar</span>
            <input
              class="input-field"
              type="text"
              bind:value={mesesProj}
              onblur={() => commitExprString(mesesProj, (v) => (mesesProj = v), { int: true, min: 0 })}
              onkeydown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
            />
          </label>
        </div>

        <div class="mt-3 p-3 rounded-(--radius-md) bg-(--color-surface-alt) border border-(--color-border)">
          {#if investimento}
            <div class="grid grid-cols-3 gap-2.5 min-w-0 max-md:grid-cols-1">
              <div class="result-cell">
                <div class="text-[11px] text-(--color-text-muted) mb-1">Saldo final</div>
                <div class="text-sm font-semibold text-(--color-text-heading) font-mono">{brl(investimento.saldoFinal)}</div>
              </div>
              <div class="result-cell">
                <div class="text-[11px] text-(--color-text-muted) mb-1">Total aportado</div>
                <div class="text-sm font-semibold text-(--color-text-heading) font-mono">{brl(investimento.totalAportado)}</div>
              </div>
              <div class="result-cell">
                <div class="text-[11px] text-(--color-text-muted) mb-1">Ganho</div>
                <div class="text-sm font-semibold text-(--color-positive) font-mono">{brl(investimento.ganho)}</div>
              </div>
            </div>
          {:else}
            <div class="text-xs text-(--color-text-muted)">Preencha os campos com números.</div>
          {/if}
        </div>
      </section>

      <!-- SAC -->
      <section class="bg-(--color-surface) border border-(--color-border) rounded-(--radius-lg) p-4" aria-labelledby="sac-title">
        <h2 id="sac-title" class="m-0 text-sm font-semibold text-(--color-text-heading) tracking-tight">Financiamento SAC (resumo)</h2>

        <div class="mt-3 grid grid-cols-2 gap-3 min-w-0 max-md:grid-cols-1">
          <label class="grid gap-1.5">
            <span class="text-xs text-(--color-text-muted)">Valor do imóvel (R$)</span>
            <input
              class="input-field"
              type="text"
              bind:value={valorImovel}
              onblur={() => formatMoneyOnBlur(valorImovel, (v) => (valorImovel = v))}
            />
          </label>

          <label class="grid gap-1.5">
            <span class="text-xs text-(--color-text-muted)">Entrada (R$)</span>
            <input
              class="input-field"
              type="text"
              bind:value={entrada}
              onblur={() => formatMoneyOnBlur(entrada, (v) => (entrada = v))}
            />
          </label>

          <label class="grid gap-1.5">
            <span class="text-xs text-(--color-text-muted)">Taxa anual (%)</span>
            <input class="input-field" type="number" step="0.1" bind:value={taxaFinAnual} />
          </label>

          <label class="grid gap-1.5">
            <span class="text-xs text-(--color-text-muted)">Prazo (meses)</span>
            <input
              class="input-field"
              type="text"
              bind:value={prazoMeses}
              onblur={() => commitExprString(prazoMeses, (v) => (prazoMeses = v), { int: true, min: 1 })}
              onkeydown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
            />
          </label>
        </div>

        <div class="mt-3 p-3 rounded-(--radius-md) bg-(--color-surface-alt) border border-(--color-border)">
          {#if sac}
            <div class="grid grid-cols-2 gap-2.5 min-w-0 max-md:grid-cols-1">
              <div class="result-cell">
                <div class="text-[11px] text-(--color-text-muted) mb-1">Financiado (PV)</div>
                <div class="text-sm font-semibold text-(--color-text-heading) font-mono">{brl(sac.pv)}</div>
              </div>
              <div class="result-cell">
                <div class="text-[11px] text-(--color-text-muted) mb-1">Amortização</div>
                <div class="text-sm font-semibold text-(--color-text-heading) font-mono">{brl(sac.amortizacao)} / mês</div>
              </div>
              <div class="result-cell">
                <div class="text-[11px] text-(--color-text-muted) mb-1">Prestação mês 1</div>
                <div class="text-sm font-semibold text-(--color-warm) font-mono">{brl(sac.prestacaoMes1)}</div>
              </div>
              <div class="result-cell">
                <div class="text-[11px] text-(--color-text-muted) mb-1">Última prestação</div>
                <div class="text-sm font-semibold text-(--color-positive) font-mono">{brl(sac.prestacaoUltima)}</div>
              </div>
            </div>

            <details class="mt-3">
              <summary class="cursor-pointer select-none py-2 px-3 rounded-(--radius-md) bg-(--color-surface) border border-(--color-border) text-xs font-semibold text-(--color-accent) transition-colors hover:border-(--color-border-focus) hover:bg-(--color-accent-soft)">
                Simulação de prestações por ano (blocos de 12 meses)
              </summary>

              <div class="mt-3 grid gap-3">
                {#each yearBlocks as block (block.ano)}
                  <details class="p-3 rounded-(--radius-md) bg-(--color-surface-alt) border border-(--color-border)">
                    <summary class="cursor-pointer flex items-center justify-between gap-3 py-2 px-2 rounded-(--radius-sm) transition-colors hover:bg-(--color-accent-soft)">
                      <div>
                        <div class="text-xs font-semibold text-(--color-text-heading)">Ano {block.ano}</div>
                        <div class="text-[11px] text-(--color-text-muted)">Meses {block.mesInicio}–{block.mesFim}</div>
                      </div>
                      <div class="text-xs font-semibold whitespace-nowrap text-(--color-positive) font-mono">
                        {brl(block.primeiraPrestacao)} → {brl(block.ultimaPrestacao)}
                      </div>
                    </summary>

                    <div class="mt-3 grid grid-cols-4 gap-2 min-w-0 max-md:grid-cols-2">
                      {#each block.meses as m (m.mes)}
                        <div class="p-2 rounded-(--radius-sm) bg-(--color-surface) border border-(--color-border) transition-colors hover:border-(--color-border-focus)">
                          <div class="text-[10px] text-(--color-text-muted) mb-1">M{m.mes}</div>
                          <div class="text-xs font-semibold text-(--color-text-heading) font-mono">{brl(m.prestacao)}</div>
                        </div>
                      {/each}
                    </div>
                  </details>
                {/each}
              </div>
            </details>
          {:else}
            <div class="text-xs text-(--color-text-muted)">Preencha os campos com números.</div>
          {/if}
        </div>
      </section>

    </main>
  </div>

  <!-- Footer -->
  <footer class="mt-auto py-4 px-4 border-t border-(--color-border) text-(--color-text-muted) text-[11px] text-center">
    <div class="w-full max-w-[980px] mx-auto">
      Próximo passo: usar a entrada como saldo projetado do investimento para simular "esperar N meses".
    </div>
  </footer>

  {#if agentationEnabled}
    <Agentation
      workspaceRoot={agentationWorkspaceRoot}
      openSourceOnClick
      toolbarPosition="bottom-right"
      outputMode="standard"
      includeComponentContext
    />
  {/if}
</div>

<style>
  /* Only component-specific styles that Tailwind can't cover */
  .input-field {
    width: 100%;
    padding: 8px 10px;
    border-radius: var(--radius-md);
    background: var(--color-surface-alt);
    color: var(--color-text);
    border: 1px solid var(--color-border);
    outline: none;
    font-family: var(--font-mono);
    font-size: 13px;
    transition: border-color 150ms ease;
  }

  .input-field:hover {
    border-color: var(--color-border-focus);
  }

  .input-field:focus {
    border-color: var(--color-accent);
  }

  .result-cell {
    padding: 8px 10px;
    border-radius: var(--radius-md);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
  }

  details > summary {
    list-style: none;
  }

  details > summary::-webkit-details-marker {
    display: none;
  }
</style>
