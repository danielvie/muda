import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { brl } from "../format.ts";

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
const { default: RangeControl } = await import("./FinancingRangeControl.tsx");
const { default: ValuePreference } = await import("./FinancingValuePreference.tsx");
hooks.deregister();

test("central trio keeps Save, original Foco and Reset in visual and keyboard order", () => {
  let saves = 0;
  const html = renderToStaticMarkup(createElement(ValuePreference, {
    label: "Valor do imóvel", value: 800000, saved: 750000, format: brl,
    onSave: () => { saves++; return { ok: true as const, preferences: { property: 800000 } }; },
    onRemove: () => ({ ok: true as const, preferences: {} }),
    render: (action: ReactNode, details: ReactNode) => createElement(RangeControl, {
      label: "Valor do imóvel", spec: { value: 800000, min: 0, max: 2000000, step: 1000, monetary: true },
      bounds: { min: 500000, max: 1050000 }, stepLabel: "R$ 1.000", format: brl,
      onChange: () => {}, onBoundsChange: () => {}, onResetRange: () => {},
      valuePreferenceAction: action, valuePreferenceDetails: details,
    }),
  }));
  const labels = [...html.matchAll(/<button\b[^>]*>(.*?)<\/button>/gs)].map(match => match[1].replace(/<[^>]+>/g, ""));
  assert.deepEqual(labels, ["Salvar padrão", "⠿Foco", "Resetar faixa", "Remover padrão"]);
  assert.match(html, /aria-label="Arrastar Foco de Valor do imóvel"/);
  assert.match(html, /aria-label="Salvar valor atual de Valor do imóvel como padrão"/);
  assert.match(html, /Padrão salvo:/);
  assert.match(html, /Não altera a faixa nem os estudos/);
  assert.ok(html.indexOf('class="frc-step"') > html.indexOf('class="frc-feedback"'));
  assert.equal(saves, 0);
});
