import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { comparisonFixture } from "./FinancingComparison.fixture.ts";
import { brl } from "../format.ts";
import { calculateSacPriceScenario } from "../financingProjection.ts";
import { compareAmortization, parseInvestmentRate } from "../amortizationComparison.ts";
import type { FinancingComparisonProps } from "./FinancingComparison.tsx";

const hooks = registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith(".css")) return { format: "module", source: "export {};", shortCircuit: true };
    if (url.endsWith(".tsx")) return { format: "module", shortCircuit: true,
      source: ts.transpileModule(readFileSync(new URL(url), "utf8"), {
        compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
      }).outputText,
    };
    return nextLoad(url, context);
  },
});
const { default: FinancingComparison } = await import("./FinancingComparison.tsx");
hooks.deregister();
function render(patch: Partial<FinancingComparisonProps> = {}) {
  const props = { ...comparisonFixture, ...patch };
  if (!("amortizationComparison" in patch)) props.amortizationComparison = compareAmortization(props.state, props.includeFgts, parseInvestmentRate(props.investmentRate));
  return renderToStaticMarkup(createElement(FinancingComparison, props));
}
function cards(html: string) {
  return [...html.matchAll(/<article class="comparison-strategy[^"\n]*"[^>]*>(.*?)<\/article>/gs)].map(match => match[1]);
}

test("one merged decision panel contains both open strategies, with SAC and PRICE remaining as references", () => {
  const html = render();
  assert.equal((html.match(/class="amortization-comparison"/g) ?? []).length, 1);
  const panels = cards(html);
  assert.equal(panels.length, 4);
  assert.deepEqual(panels.map(card => card.match(/<h4[^>]*>(.*?)<\/h4>/)![1]), [
    "SAC", "PRICE", "Amortizar todo mês", "Investir para amortizar depois",
  ]);
  assert.doesNotMatch(html, /comparison-payoff-summary|comparison-selector|Quitar quando o investimento cobrir|PRICE \+ diferença|Rendimento acumulado ≥ saldo devedor/);
  assert.equal((html.match(/type="checkbox"/g) ?? []).length, 1);
  assert.equal((html.match(/placeholder="Informe a taxa anual"/g) ?? []).length, 1);
});

test("a missing or invalid rate keeps monthly payoff visible, without inventing investment results", () => {
  const missing = render();
  assert.match(cards(missing)[2], /Saiu do seu bolso/);
  assert.match(cards(missing)[2], /Tempo para quitar/);
  assert.match(cards(missing)[3], /Informe a rentabilidade abaixo/);
  assert.doesNotMatch(cards(missing)[3], /Saiu do seu bolso/);
  assert.doesNotMatch(missing, /deixa a posição financeira|menos do bolso \+ FGTS/);
  const invalid = render({ investmentRate: "-1" });
  assert.match(cards(invalid)[2], /Tempo para quitar/);
  assert.doesNotMatch(cards(invalid)[3], /Saiu do seu bolso/);
  assert.match(invalid, /aria-invalid="true"/);
  assert.match(invalid, /Informe uma taxa anual entre 0% e 100%/);
  const state = { ...comparisonFixture.state, financingRate: 11 };
  const html = render({ investmentRate: "0", amortizationComparison: compareAmortization(state, false, 0) });
  assert.match(html, /Amortizar todo mês<\/strong> deixa/);
  assert.doesNotMatch(html, /Aguardando as premissas/);
});

test("14% investing vs 11% debt shows partial amortization and the position advantage, not a cash-only tie", () => {
  const state = { ...comparisonFixture.state, property: 800000, entry: 120000, financingRate: 11, termMonths: 420, fgtsSalary: 0 };
  const comparison = compareAmortization(state, false, 14);
  assert.equal(comparison.status, "ready");
  if (comparison.status !== "ready") return;
  const html = render({ state, scenario: calculateSacPriceScenario(state, false), investmentRate: "14", includeFgts: false, amortizationComparison: comparison });
  assert.match(html, /Comparação no mês 105 · 8 anos e 9 meses/);
  assert.match(html, /Investir para amortizar depois<\/strong> deixa/);
  assert.ok(html.includes(brl(comparison.advantage)));
  assert.match(html, /A dívida não foi quitada; as prestações continuam/);
  assert.match(html, /Um desembolso igual não significa empate/);
  const values = cards(html).slice(2).map(card => [...card.matchAll(/<dd>([^<]*)/g)].map(m => m[1]));
  assert.equal(values[0][0], brl(comparison.amortize.payoff!.cashApplied));
  assert.equal(values[1][0], brl(comparison.invest.payoff!.cashApplied));
  assert.equal(values[1][1], brl(comparison.invest.payoff!.fgtsUsed));
  assert.equal(values[1][2], brl(comparison.invest.payoff!.cashApplied + comparison.invest.payoff!.fgtsUsed));
  assert.notEqual(values[0][0], brl(comparison.amortize.atCrossing.cashCommitted));
});

test("no debt, absent crossing and a genuine financial tie have explicit labels", () => {
  assert.match(render({ investmentRate: "14", amortizationComparison: { status: "no-debt" } }), /Sem dívida a financiar/);
  assert.match(render({ investmentRate: "14", amortizationComparison: { status: "no-crossing" } }), /Nenhuma data de resgate foi inventada/);
  const state = { ...comparisonFixture.state, financingRate: 0 };
  assert.match(render({ investmentRate: "14", amortizationComparison: compareAmortization(state, false, 14) }), /Posição financeira equivalente/);
});

test("reference totals preserve original SAC and PRICE loans in both FGTS modes", () => {
  for (const fgtsMode of ["PRAZO", "PRESTACAO"] as const) {
    for (const includeFgts of [false, true]) {
      const state = { ...comparisonFixture.state, fgtsMode };
      const scenario = calculateSacPriceScenario(state, includeFgts);
      const html = render({ state, scenario, includeFgts });
      cards(html).slice(0, 2).forEach((card, index) => {
        const loan = [scenario.sac, scenario.price][index];
        const values = [...card.matchAll(/<dd>([^<]*)/g)].map(m => m[1]);
        assert.equal(values[0], brl(loan.financingPayment));
        assert.equal(values[2], brl(state.entry + loan.totalPaid));
        assert.equal(values[3], brl(loan.totalInterest));
        assert.equal(values[4], brl(loan.fgtsAmortization));
        assert.equal(values[5], brl(state.entry + loan.totalPaid + loan.fgtsAmortization));
      });
    }
  }
});

test("FGTS controls can be disabled without losing assumptions or the merged scenarios", () => {
  const before = structuredClone(comparisonFixture.state);
  const html = render({ includeFgts: false });
  assert.match(html, /foram preservados/);
  assert.doesNotMatch(html, /type="number"|placeholder="Informe o salário"|Detalhes da projeção FGTS/);
  assert.equal(cards(html).length, 4);
  assert.deepEqual(comparisonFixture.state, before);
});

test("salary is masked and read-only when loaded hidden; its monthly FGTS estimate is not exposed", () => {
  const html = render({ salaryHidden: true });
  assert.match(html, /type="password"[^>]*readOnly=""/);
  assert.match(html, /Revelar salário para editar/);
  assert.match(html, /Limpar salário/);
  assert.match(html, /FGTS estimado oculto junto com o salário/);
  assert.doesNotMatch(html, /FGTS estimado: R\$/);
  assert.match(render({ salaryHidden: false }), /Ocultar salário/);
  assert.match(render({ fgtsMemoryFeedback: { ok: false, message: "Falha na memória" } }), /role="alert">Falha na memória/);
});

test("salary clear and visibility icons are inside the input container, with accessible labels", () => {
  const html = render({ salaryHidden: true });
  const inputGroup = html.match(/<div class="comparison-salary-input">(.*?)<\/div>/s)![1];
  assert.match(inputGroup, /type="password"/);
  const buttons = [...inputGroup.matchAll(/<button[^>]*aria-label="([^"]+)"[^>]*>(.*?)<\/button>/gs)];
  assert.deepEqual(buttons.map(match => match[1]), ["Limpar salário", "Revelar salário para editar"]);
  for (const [, , content] of buttons) {
    assert.match(content, /<svg[^>]*aria-hidden="true"[^>]*focusable="false"/);
    assert.equal(content.replace(/<[^>]+>/g, ""), "");
  }
  assert.doesNotMatch(html, /comparison-salary-actions/);
  const visible = render({ salaryHidden: false });
  assert.match(visible, /aria-label="Ocultar salário"/);
  assert.match(visible, /d="m3 3 18 18"/);
});

test("rate persistence explains local storage and reports failures", () => {
  assert.match(render(), /Taxas válidas são salvas automaticamente/);
  assert.match(render(), /Apagar o campo remove a taxa salva/);
  assert.match(render({ investmentRateStorageError: "Falha ao guardar taxa" }), /role="alert">Falha ao guardar taxa/);
});

test("reference details start collapsed and preserve model limitations", () => {
  const html = render();
  assert.doesNotMatch(html, /<details[^>]*\bopen\b/);
  assert.match(html, /Não é cotação CAIXA/);
  assert.match(html, /não uma carência obrigatória/);
  assert.match(html, /curvas originais sem FGTS/);
  assert.match(html, /Não representa as estratégias de amortizar mensalmente/);
});

test("PRICE+ shows payoff totals before inputs and keeps crossing and composition collapsed", () => {
  const comparison = compareAmortization(comparisonFixture.state, true, 14);
  const html = render({ investmentRate: "14", amortizationComparison: comparison });
  const panel = html.slice(html.indexOf('<section class="amortization-comparison"'));
  const overview = panel.slice(0, panel.indexOf('<details'));
  assert.match(overview, /<h3[^>]*>PRICE\+<\/h3>/);
  assert.match(overview, /Projeção até a quitação de cada estratégia/);
  assert.match(overview, /Não é um histórico/);
  assert.match(overview, /Estimativa sem TR, seguros, tarifas e custos de compra e posse/);
  assert.ok(overview.indexOf("Tempo para quitar") < overview.indexOf('placeholder="Informe a taxa anual"'));
  assert.doesNotMatch(overview, /Dívida após as amortizações|FGTS remanescente|Posição financeira|Comparação no mês \d/);
  assert.match(panel, /<summary>Entender os valores<\/summary>/);
  assert.match(panel, /<summary>Comparação no mês da amortização<\/summary>/);
  assert.doesNotMatch(panel, /<details[^>]*\bopen\b/);
  assert.match(panel, /dividido proporcionalmente entre aportes e rendimentos/);
  assert.match(panel, /antes do prazo contratado/);
  for (const card of cards(html).slice(2)) {
    assert.doesNotMatch(card, /<details/);
    const labels = [...card.matchAll(/<dt>([^<]*)/g)].map(m => m[1]);
    assert.deepEqual(labels, ["Saiu do seu bolso", "FGTS utilizado", "Total do bolso + FGTS", "Tempo para quitar"]);
  }
});

test("investment surplus stays outside apartment cost and no-payoff does not fabricate totals", () => {
  const comparison = compareAmortization(comparisonFixture.state, false, 100);
  assert.equal(comparison.status, "ready");
  if (comparison.status !== "ready") return;
  const html = render({ investmentRate: "100", amortizationComparison: comparison });
  const card = cards(html)[3];
  assert.match(card, /Sobra investida ao quitar/);
  assert.ok(card.includes(brl(comparison.invest.payoff!.investmentRemaining)));
  assert.match(card, /Não entra no total do bolso \+ FGTS/);
  const noPayoff = render({ investmentRate: "100", amortizationComparison: { ...comparison, invest: { ...comparison.invest, payoff: null, payoffMonth: null } } });
  assert.match(cards(noPayoff)[3], /Quitação não ocorre no prazo simulado/);
  assert.doesNotMatch(cards(noPayoff)[3], /Total do bolso \+ FGTS/);
  assert.doesNotMatch(noPayoff, /aria-label="Diferenças até quitar"/);
});

test("PRICE+ highlights cash plus FGTS and preserves the earnings-inclusive total only in details", () => {
  const state = { ...comparisonFixture.state, property: 800000, entry: 120000, financingRate: 10, termMonths: 420, fgtsSalary: 30000, fgtsSalaryGrowth: 3, fgtsMode: "PRAZO" as const };
  const html = render({ state, investmentRate: "14", includeFgts: true });
  const panel = html.slice(html.indexOf('<section class="amortization-comparison"'));
  const overview = panel.slice(0, panel.indexOf('<details'));
  const totals = cards(html).slice(2).map(card => card.match(/<dt>Total do bolso \+ FGTS<\/dt><dd>([^<]*)/)![1]);
  assert.deepEqual(totals, [brl(1198582.91), brl(1157165.42)]);
  assert.match(overview, /Investir para amortizar depois<\/strong> usa/);
  assert.ok(overview.includes(brl(41417.49)));
  assert.match(overview, /menos do bolso \+ FGTS/);
  assert.doesNotMatch(overview, /Rendimentos usados no pagamento|Total pago incluindo rendimentos|As duas usam o mesmo/);
  assert.ok(!overview.includes(brl(1261254.71)));
  assert.ok(!overview.includes(brl(104089.29)));
  assert.match(panel, /<dt>Total pago incluindo rendimentos<\/dt>/);
  assert.ok(panel.includes(brl(1261254.71)));
  assert.ok(panel.includes(brl(104089.29)));
  assert.match(overview, /As duas quitam no mesmo mês/);
});

test("cash plus FGTS summary handles both FGTS modes, zero return, no FGTS and investment leftovers", () => {
  for (const fgtsMode of ["PRAZO", "PRESTACAO"] as const) {
    for (const includeFgts of [false, true]) {
      for (const rate of [0, 14, 100]) {
        const state = { ...comparisonFixture.state, fgtsMode };
        const comparison = compareAmortization(state, includeFgts, rate);
        assert.equal(comparison.status, "ready");
        if (comparison.status !== "ready") continue;
        const html = render({ state, includeFgts, investmentRate: String(rate), amortizationComparison: comparison });
        cards(html).slice(2).forEach((card, i) => {
          const payoff = [comparison.amortize, comparison.invest][i].payoff!;
          const total = card.match(/<dt>Total do bolso \+ FGTS<\/dt><dd>([^<]*)/)![1];
          assert.equal(total, brl(payoff.cashApplied + payoff.fgtsUsed));
          assert.ok(Math.abs(payoff.totalPaid - payoff.earningsUsed - payoff.cashApplied - payoff.fgtsUsed) < 0.005);
          if (!includeFgts) assert.equal(total, brl(payoff.cashApplied));
        });
      }
    }
  }
  const html = render({ state: { ...comparisonFixture.state, financingRate: 0 }, investmentRate: "14", includeFgts: false });
  assert.match(html, /As duas usam o mesmo total do bolso \+ FGTS/);
});

test("annual reference columns retain SAC then PRICE values, and missing years are not zeroed", () => {
  const html = render();
  assert.deepEqual([...html.matchAll(/<th scope="colgroup" colSpan="3">(.*?)<\/th>/g)].map(m => m[1]), ["SAC", "PRICE"]);
  const firstRow = html.match(/<tbody><tr>(.*?)<\/tr>/s)![1];
  const comparison = comparisonFixture.fgtsComparison!;
  const sac = comparison.sac.yearBlocks[0], price = comparison.price.yearBlocks[0];
  assert.deepEqual([...firstRow.matchAll(/<td>(.*?)<\/td>/g)].map(m => m[1]), [sac.saldoFinal, sac.juros, sac.fgtsAmortizacao, price.saldoFinal, price.juros, price.fgtsAmortizacao].map(brl));
  const missing = render({ fgtsComparison: { ...comparison, price: { ...comparison.price, yearBlocks: [] } } });
  assert.equal((missing.match(/<td>—<\/td>/g) ?? []).length, comparison.sac.yearBlocks.length * 3);
});
