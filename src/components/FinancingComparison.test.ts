import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { comparisonFixture } from "./FinancingComparison.fixture.ts";
import { brl } from "../format.ts";
import type { FinancingComparisonProps } from "./FinancingComparison.tsx";

// Node strips .ts natively; only JSX and stylesheet imports need a test loader.
const hooks = registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith(".css")) return { format: "module", source: "export {};", shortCircuit: true };
    if (url.endsWith(".tsx")) return {
      format: "module", shortCircuit: true,
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
  return renderToStaticMarkup(createElement(FinancingComparison, { ...comparisonFixture, ...patch }));
}

test("three equally styled strategies expose the same four indicators in the same order", () => {
  const html = render();
  const cards = [...html.matchAll(/<article class="comparison-strategy">(.*?)<\/article>/gs)];
  assert.equal(cards.length, 3);
  for (const [, card] of cards) {
    assert.deepEqual([...card.matchAll(/<dt>(.*?)<\/dt>/g)].map(match => match[1]), [
      "Desembolso mensal inicial", "Quitação", "Juros totais", "FGTS aplicado",
    ]);
    assert.doesNotMatch(card, /Valor efetivo|Total pago|Após o empate/);
  }
  assert.equal((html.match(/type="checkbox"/g) ?? []).length, 1);
  assert.doesNotMatch(html, /featured|Amortização com FGTS|Três cenários de amortização/);
});

test("details and annual evolution start collapsed with corrected totals and limitations", () => {
  const html = render();
  assert.equal((html.match(/<details class="comparison-details">/g) ?? []).length, 2);
  assert.doesNotMatch(html, /<details[^>]*\bopen\b/);
  assert.doesNotMatch(html, /convenção de taxa diferente|aguarda.*revisão|Mantém as prestações previstas/);
  assert.match(html, /cronograma de PRICE \+ diferença ainda não é exibido nesta tabela/);
  assert.match(html, /Soma das prestações pagas/);
  assert.match(html, /Do bolso no financiamento/);
  assert.match(html, /Total com entrada e FGTS/);
  assert.match(html, /sem TR ou outro indexador, seguros, tarifas e custos de posse/);
  assert.match(html, /Não é cotação CAIXA/);
  assert.match(html, /não uma carência obrigatória/);
  assert.match(html, /Não indica empate permanente/);
  assert.match(html, /scope="col"/);
  assert.match(html, /role="region"[^>]*tabindex="0"/);
});

test("FGTS off hides controls and both legacy projections without mutating assumptions", () => {
  const before = structuredClone(comparisonFixture.state);
  const html = render({ includeFgts: false });
  assert.doesNotMatch(html, /type="number"|Detalhes da projeção FGTS|Evolução anual do saldo/);
  assert.match(html, /foram preservados/);
  assert.deepEqual(comparisonFixture.state, before);
  assert.equal((html.match(/<article /g) ?? []).length, 3);
});

test("missing salary keeps comparison visible and asks for it next to FGTS controls", () => {
  const html = render({ state: { ...comparisonFixture.state, fgtsSalary: 0 }, fgtsComparison: null });
  assert.match(html, /Informe o salário para considerar FGTS nas três estratégias/);
  assert.doesNotMatch(html, /Detalhes da projeção FGTS|Evolução anual do saldo/);
  assert.equal((html.match(/<article /g) ?? []).length, 3);
});

test("payment-reduction copy does not call the PRICE installment fixed", () => {
  const html = render({ state: { ...comparisonFixture.state, fgtsMode: "PRESTACAO" } });
  assert.match(html, /O FGTS recalcula as próximas prestações/);
  assert.doesNotMatch(html, /Prestação fixa até/);
});

test("no crossing, no debt and final settlement use explicit labels", () => {
  const html = render({ scenario: {
    ...comparisonFixture.scenario, equalizationMonth: null, payoffMonth: 0, differenceSchedule: [],
    sac: { ...comparisonFixture.scenario.sac, schedule: [] },
  } });
  assert.match(html, /sem cruzamento com ambos os financiamentos ativos/);
  assert.match(html, /Sem dívida/);
  assert.doesNotMatch(html, /NaN|undefined|Infinity/);
});

test("third strategy displays its actual first cash payment rather than the SAC budget", () => {
  const scenario = comparisonFixture.scenario;
  const html = render({ scenario: { ...scenario, differenceSchedule: [{ ...scenario.differenceSchedule[0], payment: 1234.56 }] } });
  const thirdCard = [...html.matchAll(/<article class="comparison-strategy">(.*?)<\/article>/gs)][2][1];
  assert.equal(thirdCard.match(/<dd>(.*?)<\/dd>/)?.[1], brl(1234.56));
});

test("cash extras are not counted twice in totals with FGTS and entry", () => {
  const html = render();
  const scenario = comparisonFixture.scenario;
  const total = html.match(/Total com entrada e FGTS · PRICE \+ diferença<\/dt><dd>(.*?)<\/dd>/)?.[1];
  assert.equal(total, brl(comparisonFixture.state.entry + scenario.totalPaid + scenario.fgtsAmortization));
  assert.notEqual(total, brl(comparisonFixture.state.entry + scenario.totalPaid + scenario.fgtsAmortization + scenario.extraAmortization));
});

test("missing annual rows stay absent, not invented zero-valued payments", () => {
  const comparison = comparisonFixture.fgtsComparison!;
  const html = render({ fgtsComparison: { ...comparison, price: { ...comparison.price, yearBlocks: [] } } });
  assert.equal((html.match(/<td>—<\/td>/g) ?? []).length, comparison.sac.yearBlocks.length * 3);
});
