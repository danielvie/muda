<script lang="ts">
  import {
    projectInvestment,
    sacInstallmentAt,
    sacSummary,
    type InvestmentProjectionResult,
  } from "./finance";

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

<div class="page">
  <header class="header">
    <div class="container">
      <div class="brand">
        <div class="logo" aria-hidden="true">$</div>
        <div style="min-width: 0;">
          <h1 class="title">Calculadoras: investimento + SAC</h1>
          <p class="subtitle">Aporte no fim do mês • Taxa anual em % (ex: 10 = 10% a.a.)</p>
        </div>
      </div>
    </div>
  </header>

  <div class="container">
    <main class="main">
    <section class="card" aria-labelledby="inv-title">
      <h2 id="inv-title" class="cardTitle">Projeção de investimento</h2>

      <div class="grid2">
        <label class="field">
          <div class="label">Saldo inicial (R$)</div>
          <input
            class="input"
            type="text"
            bind:value={saldoInicial}
            onblur={() => formatMoneyOnBlur(saldoInicial, (v) => (saldoInicial = v))}
          />
        </label>

        <label class="field">
          <div class="label">Aporte mensal (R$)</div>
          <input
            class="input"
            type="text"
            bind:value={aporteMensal}
            onblur={() => formatMoneyOnBlur(aporteMensal, (v) => (aporteMensal = v))}
          />
        </label>

        <label class="field">
          <div class="label">Taxa anual (%)</div>
          <input class="input" type="number" step="0.1" bind:value={taxaInvestAnual} />
        </label>

        <label class="field">
          <div class="label">Meses para projetar</div>
          <input
            class="input"
            type="text"
            bind:value={mesesProj}
            onblur={() => commitExprString(mesesProj, (v) => (mesesProj = v), { int: true, min: 0 })}
            onkeydown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
          />
        </label>
      </div>

      <div class="resultBox" style="margin-top: 12px;">
        {#if investimento}
          <div class="resultGrid">
            <div class="resultItem">
              <div class="resultLabel">Saldo final</div>
              <div class="resultValue">{brl(investimento.saldoFinal)}</div>
            </div>
            <div class="resultItem">
              <div class="resultLabel">Total aportado</div>
              <div class="resultValue">{brl(investimento.totalAportado)}</div>
            </div>
            <div class="resultItem">
              <div class="resultLabel">Ganho</div>
              <div class="resultValue">{brl(investimento.ganho)}</div>
            </div>
          </div>
        {:else}
          <div class="muted">Preencha os campos com números.</div>
        {/if}
      </div>
    </section>

    <section class="card" aria-labelledby="sac-title">
      <h2 id="sac-title" class="cardTitle">Financiamento SAC (resumo)</h2>

      <div class="grid2">
        <label class="field">
          <div class="label">Valor do imóvel (R$)</div>
          <input
            class="input"
            type="text"
            bind:value={valorImovel}
            onblur={() => formatMoneyOnBlur(valorImovel, (v) => (valorImovel = v))}
          />
        </label>

        <label class="field">
          <div class="label">Entrada (R$)</div>
          <input
            class="input"
            type="text"
            bind:value={entrada}
            onblur={() => formatMoneyOnBlur(entrada, (v) => (entrada = v))}
          />
        </label>

        <label class="field">
          <div class="label">Taxa anual (%)</div>
          <input class="input" type="number" step="0.1" bind:value={taxaFinAnual} />
        </label>

        <label class="field">
          <div class="label">Prazo (meses)</div>
          <input
            class="input"
            type="text"
            bind:value={prazoMeses}
            onblur={() => commitExprString(prazoMeses, (v) => (prazoMeses = v), { int: true, min: 1 })}
            onkeydown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
          />
        </label>
      </div>

      <div class="resultBox" style="margin-top: 12px;">
        {#if sac}
          <div class="resultGrid">
            <div class="resultItem">
              <div class="resultLabel">Financiado (PV)</div>
              <div class="resultValue">{brl(sac.pv)}</div>
            </div>
            <div class="resultItem">
              <div class="resultLabel">Amortização</div>
              <div class="resultValue">{brl(sac.amortizacao)} / mês</div>
            </div>
            <div class="resultItem">
              <div class="resultLabel">Prestação mês 1</div>
              <div class="resultValue">{brl(sac.prestacaoMes1)}</div>
            </div>
            <div class="resultItem">
              <div class="resultLabel">Última prestação</div>
              <div class="resultValue">{brl(sac.prestacaoUltima)}</div>
            </div>
          </div>

          <details class="details" style="margin-top: 12px;">
            <summary class="detailsSummary">
              Simulação de prestações por ano (blocos de 12 meses)
            </summary>

            <div class="yearBlocks">
              {#each yearBlocks as block (block.ano)}
                <details class="yearBlock">
                  <summary class="yearSummary">
                    <div>
                      <div class="yearTitle">Ano {block.ano}</div>
                      <div class="yearMeta">Meses {block.mesInicio}–{block.mesFim}</div>
                    </div>

                    <div class="yearRange">{brl(block.primeiraPrestacao)} → {brl(block.ultimaPrestacao)}</div>
                  </summary>

                  <div class="monthGrid" style="margin-top: 12px;">
                    {#each block.meses as m (m.mes)}
                      <div class="monthCell">
                        <div class="monthLabel">M{m.mes}</div>
                        <div class="monthValue">{brl(m.prestacao)}</div>
                      </div>
                    {/each}
                  </div>
                </details>
              {/each}
            </div>
          </details>
        {:else}
          <div class="muted">Preencha os campos com números.</div>
        {/if}
      </div>
    </section>
    </main>
  </div>

  <footer class="footer">
    <div class="container">
      <span>
        Próximo passo: usar a entrada como saldo projetado do investimento para simular “esperar N meses”.
      </span>
    </div>
  </footer>
</div>

<style>
  /* One Dark Pro-ish */
  .page {
    min-height: 100vh;
    background: #282c34;
    color: #abb2bf;
    display: flex;
    flex-direction: column;
  }

  .header {
    position: sticky;
    top: 0;
    z-index: 10;
    background: rgba(33, 37, 43, 0.92);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid rgba(97, 175, 239, 0.25);
  }

  .container {
    width: 100%;
    max-width: 980px;
    margin: 0 auto;
    padding: 0 16px;
  }

  .brand {
    padding: 18px 0;
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  .logo {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: grid;
    place-items: center;
    font-weight: 900;
    background: linear-gradient(135deg, #61afef 0%, #56b6c2 100%);
    color: #282c34;
    box-shadow: 0 14px 30px rgba(0, 0, 0, 0.45);
  }

  .title {
    margin: 0;
    font-size: 18px;
    letter-spacing: 0.2px;
    color: #e6e6e6;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .subtitle {
    margin: 4px 0 0 0;
    font-size: 13px;
    color: rgba(171, 178, 191, 0.85);
  }

  .main {
    padding: 22px 0;
    display: grid;
    gap: 16px;
    min-width: 0;
  }

  .card {
    background: #21252b;
    border: 1px solid rgba(97, 175, 239, 0.18);
    border-radius: 14px;
    padding: 16px;
    box-shadow: 0 18px 45px rgba(0, 0, 0, 0.35);
  }

  .cardTitle {
    margin: 0;
    font-size: 16px;
    color: #e6e6e6;
  }

  .grid2 {
    margin-top: 12px;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    min-width: 0;
  }

  .field {
    display: grid;
    gap: 6px;
  }

  .label {
    font-size: 13px;
    color: rgba(171, 178, 191, 0.92);
  }

  .input {
    width: 100%;
    max-width: 100%;
    border-radius: 12px;
    padding: 10px 12px;
    background: #1e2227;
    color: #abb2bf;
    border: 1px solid rgba(97, 175, 239, 0.35);
    outline: none;
    transition: transform 120ms ease, border-color 120ms ease;
  }

  .input:hover {
    border-color: rgba(97, 175, 239, 0.6);
  }

  .input:focus {
    border-color: rgba(97, 175, 239, 0.9);
  }

  .resultBox {
    padding: 12px;
    border-radius: 12px;
    background: #1e2227;
    border: 1px solid rgba(97, 175, 239, 0.22);
  }

  .resultGrid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
    min-width: 0;
  }

  .resultItem {
    padding: 10px;
    border-radius: 12px;
    background: #1e2227;
    border: 1px solid rgba(198, 120, 221, 0.18);
    min-width: 0;
  }

  .resultLabel {
    font-size: 12px;
    color: rgba(171, 178, 191, 0.78);
    margin-bottom: 6px;
  }

  .resultValue {
    font-size: 14px;
    font-weight: 700;
    color: #e6e6e6;
  }

  .muted {
    font-size: 13px;
    color: rgba(171, 178, 191, 0.85);
  }

  details > summary {
    list-style: none;
  }

  details > summary::-webkit-details-marker {
    display: none;
  }

  .detailsSummary {
    cursor: pointer;
    padding: 10px 12px;
    border-radius: 12px;
    background: #1e2227;
    border: 1px solid rgba(97, 175, 239, 0.22);
    user-select: none;
    font-weight: 800;
    color: #e06c75;
    transition: transform 120ms ease, border-color 120ms ease, background 120ms ease;
  }

  .detailsSummary:hover {
    transform: translateY(-1px);
    border-color: rgba(97, 175, 239, 0.5);
    background: #242a31;
  }

  .yearBlocks {
    margin-top: 12px;
    display: grid;
    gap: 12px;
  }

  .yearBlock {
    padding: 12px;
    border-radius: 14px;
    background: #1e2227;
    border: 1px solid rgba(97, 175, 239, 0.18);
  }

  .yearSummary {
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 10px;
    border-radius: 12px;
    transition: transform 120ms ease, background 120ms ease;
  }

  .yearSummary:hover {
    transform: translateY(-1px);
    background: rgba(97, 175, 239, 0.08);
  }

  .yearTitle {
    font-size: 14px;
    font-weight: 800;
    color: #e6e6e6;
  }

  .yearMeta {
    font-size: 12px;
    color: rgba(171, 178, 191, 0.8);
  }

  .yearRange {
    font-size: 13px;
    font-weight: 800;
    white-space: nowrap;
    color: #98c379;
  }

  .monthGrid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
    min-width: 0;
  }

  .monthCell {
    padding: 10px;
    border-radius: 12px;
    background: #21252b;
    border: 1px solid rgba(152, 195, 121, 0.18);
    transition: transform 120ms ease, border-color 120ms ease, background 120ms ease;
  }

  .monthCell:hover {
    transform: translateY(-1px);
    border-color: rgba(152, 195, 121, 0.45);
    background: #262c34;
  }

  .monthLabel {
    font-size: 11px;
    color: rgba(171, 178, 191, 0.78);
    margin-bottom: 6px;
  }

  .monthValue {
    font-size: 13px;
    font-weight: 800;
    color: #e6e6e6;
  }

  .footer {
    margin-top: auto;
    padding: 18px 16px;
    border-top: 1px solid rgba(97, 175, 239, 0.18);
    color: rgba(171, 178, 191, 0.85);
    font-size: 12px;
    text-align: center;
  }

  @media (max-width: 720px) {
    .grid2 {
      grid-template-columns: 1fr;
    }

    .resultGrid {
      grid-template-columns: 1fr;
    }

    .monthGrid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
</style>
