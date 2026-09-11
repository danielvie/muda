import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { INVESTMENT_FIELDS } from "../investmentControls.ts";
import { INVESTMENT_RANGES_KEY, INVESTMENT_VALUES_KEY, INVESTMENT_PERIOD_UNIT_KEY } from "../investmentPreferences.ts";

const hooks = registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith(".css")) return { format: "module", source: "export {};", shortCircuit: true };
    if (url.endsWith(".tsx")) return { format: "module", shortCircuit: true, source: ts.transpileModule(readFileSync(new URL(url), "utf8"), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText };
    return nextLoad(url, context);
  },
});
const { default: InvestmentProjection } = await import("./InvestmentProjection.tsx");
const { MemoryProvider } = await import("../memory.tsx");
hooks.deregister();
function render(data: Record<string, string> = {}, blocked = false) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: (key: string) => { if (blocked) throw Error("blocked"); return data[key] ?? null; }, setItem: () => { throw Error("render must not save"); } } });
  try { return renderToStaticMarkup(createElement(MemoryProvider, { children: createElement(InvestmentProjection) })); }
  finally { if (descriptor) Object.defineProperty(globalThis, "localStorage", descriptor); else Reflect.deleteProperty(globalThis, "localStorage"); }
}
test("investment exposes one shared slider and all four field selectors, with Foco and explicit save/reset actions", () => {
  const html = render();
  for (const { label } of INVESTMENT_FIELDS) assert.ok(html.includes(`aria-label="Ajustar ${label} na barra"`));
  assert.equal((html.match(/type="range"/g) ?? []).length, 1);
  assert.match(html, /aria-label="Ajustar Saldo inicial"/);
  assert.match(html, /aria-label="Arrastar Foco de Saldo inicial"/);
  assert.match(html, /aria-label="Salvar valor atual de Saldo inicial como padrão"/);
  assert.match(html, /aria-label="Salvar faixa atual de Saldo inicial como padrão"/);
  assert.match(html, /Resetar faixa/);
  assert.match(html, /Minha faixa/);
  assert.doesNotMatch(html, /Usar Entrada|investment-shortcuts|class="field-chip"/);
  const selectors = html.match(/<div class="investment-targets"[^>]*>(.*?)<\/div>/s)![1];
  assert.equal((selectors.match(/<button/g) ?? []).length, 4);
  assert.doesNotMatch(selectors, /<input/);
  assert.equal((html.match(/type="text"/g) ?? []).length, 1);
  assert.match(html, /value="50000"/);
  assert.doesNotMatch(html, /aria-invalid="true"/);
});
test("saved value and range are independent, preserve exact values, and expand the displayed slider", () => {
  const html = render({
    "muda:fields": JSON.stringify({ saldoInicial: "100,000.00", aporteMensal: "2,000.00" }),
    [INVESTMENT_VALUES_KEY]: JSON.stringify({ version: 1, values: { saldoInicial: 345678.91 } }),
    [INVESTMENT_RANGES_KEY]: JSON.stringify({ version: 1, ranges: { saldoInicial: { min: 0, max: 100000 } } }),
  });
  assert.match(html, /value="345,678.91"|value="345678.91"/);
  assert.match(html, /max="346000"/);
  assert.match(html, /Padrão salvo/);
  assert.match(html, /Remover valor padrão de Saldo inicial/);
  assert.match(html, /o último valor lembrado/);
  assert.match(html, /O padrão salvo não muda/);
});
test("legacy values are preserved but historical shortcuts and financing entry actions are absent", () => {
  const html = render({ "muda:fields": JSON.stringify({ saldoInicial: "100,000.00" }), "muda:field-history": JSON.stringify({ saldoInicial: ["10000", "50000", "100000"] }) });
  assert.match(html, /value="100,000.00"/);
  for (const label of ["10k", "50k", "100k"]) assert.ok(!html.includes(`>${label}</button>`));
  assert.doesNotMatch(html, /Usar Entrada|Copiar entrada/);
  assert.match(html, /173\.670,25/);
});
test("the period button uses the remembered unit without altering the monthly projection", () => {
  const months = render({ "muda:fields": JSON.stringify({ mesesProj: "24" }) });
  const years = render({ "muda:fields": JSON.stringify({ mesesProj: "24" }), [INVESTMENT_PERIOD_UNIT_KEY]: JSON.stringify({ version: 1, unit: "years" }) });
  assert.match(months, /<span>Período<\/span><strong>24 meses<\/strong>/);
  assert.match(years, /<span>Período<\/span><strong>2 anos<\/strong>/);
  assert.equal(months.match(/<div class="metric-highlight">(.*?)<\/div><\/div>/s)![1], years.match(/<div class="metric-highlight">(.*?)<\/div><\/div>/s)![1]);
});

test("invalid inputs disable the active slider without hiding the saved value in storage, blocked reads remain usable", () => {
  const html = render({ "muda:fields": JSON.stringify({ saldoInicial: "abc" }) });
  assert.match(html, /aria-invalid="true"/);
  assert.doesNotMatch(html, /type="range"/);
  assert.match(html, /Os padrões salvos foram preservados/);
  assert.match(html, /Preencha os campos com números válidos/);
  assert.match(render({}, true), /type="range"/);
});
