# Continuação: unificação dos painéis de financiamento

## Objetivo pendente

Unificar os painéis SAC vs PRICE e Amortização com FGTS para aproximar configurações e resultados. A disposição final ainda não foi aprovada. Não redesenhar a calculadora principal: preservar prestação, SAC/PRICE, Salvar estudo e controles de faixa.

## Cálculo atual

A descrição financeira anterior deste handoff foi substituída pela correção posterior à pesquisa. Consulte `src/financingProjection.md` e os testes, não a antiga hipótese de preservar a curva original de pagamentos SAC.

- Todos os painéis usam taxa anual efetiva, convertida por `annualToMonthlyRate`.
- SAC com redução de prazo preserva a quota de principal; juros e prestação caem após FGTS.
- PRICE com redução de prazo preserva o encargo de principal e juros.
- Redução de prestação recalcula pelo saldo real e prazo original restante.
- PRICE + diferença usa a prestação SAC real como orçamento e o encargo do próprio cenário PRICE. Extras em dinheiro reduzem prazo; FGTS segue o modo selecionado.
- A projeção não inclui TR, seguros, tarifas ou cálculo diário. A regra SAC é uma hipótese matemática, não um algoritmo interno da CAIXA confirmado.

## Arquivos de referência

- `src/financingProjection.ts`, `src/loanPayments.ts` e `src/financingProjection.test.ts`: cronogramas, estratégia com extras e testes matemáticos.
- `src/fgtsSchedule.ts` e `src/fgtsSchedule.test.ts`: agregação anual e projeção FGTS. Os testes verificam paridade com o outro motor.
- `src/components/FinancingPanel.md`: decisões de UX e preferências de faixa.
- `CONTEXT.md`: linguagem do projeto, especialmente totais e cenários.

## Onde unificar

`src/components/FinancingWorkspace.tsx` renderiza `SacPriceScenario` e `FgtsComparison` separadamente. A workspace compartilha salário, crescimento e modo FGTS, mas `SacPriceScenario` mantém seu próprio checkbox `includeFgts`.

Definir um controle explícito de considerar FGTS e quais resultados ele afeta. Desligar FGTS não deve apagar salário, crescimento ou modo. Preservar detalhes anuais, indicadores e a terceira estratégia PRICE + diferença.

## Cuidados de UX e números

- Priorizar mobile e proximidade entre configuração e resultado.
- Não reintroduzir editor lateral longo, controles principais escondidos ou áreas bidimensionais que alteram valores durante a rolagem.
- Preferências de faixa só persistem por comandos explícitos. Não autosalvar simulações nem alterar valores financeiros ao ajustar a visualização.
- Não inventar parcelas após quitação. Distinguir encargo previsto de acerto final.
- Distinguir entrada, pagamentos do bolso, extras e FGTS. Extras em dinheiro já integram o desembolso.
- Estudos antigos podem apresentar resultados diferentes sob a taxa efetiva corrigida; conferir a taxa da proposta.

## Validação

Executar `npm test`, `npm run check` e `npm run build`. Depois de alterações visuais, conferir mobile em 320 e 390 px, desktop, salvar/carregar estudos, troca de ambientes e configurações de faixa.

Os testes atuais não validam uma cotação contratual real da CAIXA nem uma instalação limpa de dependências. Conferir `git status` antes de trabalhar; não presumir o estado de uma sessão anterior.
