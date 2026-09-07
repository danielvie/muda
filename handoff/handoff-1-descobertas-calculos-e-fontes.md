# Handoff: descobertas dos cálculos e fontes

## Objetivo

Continuar a partir da pesquisa sobre amortização habitacional na CAIXA, distinguindo evidência oficial, matemática do modelo e dados necessários para conferir um contrato. O usuário pediu reescrever o handoff com foco nas descobertas e referências, não alterar o programa.

## Leitura principal

`src/financingProjection.md` contém a especificação atual: conversão de taxa, SAC, PRICE, modos de FGTS, estratégia PRICE + diferença, composição dos totais, limitações e links oficiais. Usar esse documento como referência das fórmulas e exemplos, sem reconstruí-los a partir de respostas antigas da conversa.

A correção está no commit `9814da4`, `Fix financing amortization and unify effective interest calculations`. A comparação entre implementação anterior e corrigida deve ser feita pelo commit, não por cópias de código neste handoff.

## Descoberta central e limite da conclusão

A CAIXA descreve amortização extraordinária como um pagamento adicional que reduz o saldo devedor atual. Reduzir prazo diminui o número de prestações restantes. Isso não equivale a somar os valores nominais dos últimos boletos e pagá-los integralmente hoje.

A pesquisa não encontrou uma fórmula pública completa do algoritmo interno de recálculo SAC da CAIXA. A resposta inicial desta conversa tratou a preservação da quota SAC de forma excessivamente categórica. O aplicativo corrigido usa essa hipótese como modelo simplificado, não como regra contratual universal confirmada.

Preservar o sistema SAC durante a evolução normal e escolher a quota depois de uma amortização extraordinária são questões distintas. A definição genérica do SAC, sozinha, não comprova qual critério a CAIXA usa para recalcular o prazo de cada modalidade.

Não afirmar que testes internos demonstram aderência exata à CAIXA. Para isso ainda falta uma simulação real ou memória de cálculo contratual.

## Mapa de evidências oficiais

As fontes abaixo foram consultadas pelos search subagents na pesquisa desta conversa. Não foram consultadas novamente ao escrever este handoff; páginas e regras podem ter mudado.

| Questão | Fonte | O que sustenta e o que não sustenta |
| --- | --- | --- |
| O que é amortização e qual a diferença entre reduzir prazo e prestação? | [FAQ CAIXA de contratos](https://www.caixa.gov.br/voce/habitacao/perguntas-frequentes-contrato/Paginas/default.aspx#amortizacao) | Confirma abatimento do saldo e opções. Não publica algoritmo completo nem garante boleto nominal inalterado. |
| Como se compõem encargo, saldo e indexação? | [FAQ CAIXA de novos financiamentos](https://www.caixa.gov.br/voce/habitacao/perguntas-frequentes-novos-financiamentos/Paginas/default.aspx) | Explica SAC/PRICE, atualização mensal pela TR, juros, MIP, DFI e tarifa. Informa dependência do saldo atualizado, taxa, sistema e prazo. |
| Material didático dos sistemas | [Cartilha CAIXA](https://www.caixa.gov.br/Downloads/habitacao-documentos-gerais/passos_indexadores_amortizacao.pdf) e [Guia rápido](https://www.caixa.gov.br/Downloads/habitacao-documentos-gerais/guia_CCFGTS_CCSBPE.pdf) | Corroboram composição e evolução dos encargos; não substituem o contrato individual. |
| Onde simular e solicitar? | [App Habitação CAIXA](https://www.caixa.gov.br/atendimento/aplicativos/habitacao/Paginas/default.aspx) e [Serviços por canal](https://www.caixa.gov.br/voce/habitacao/servicos/Paginas/default.aspx#amortizacao) | Confirmam simulação e escolha de redução. A cotação depende do contrato e da data. |
| Por que não pagar juros futuros integrais? | [CDC, artigo 52, parágrafo 2º](https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm#art52) | Assegura liquidação antecipada total ou parcial com redução proporcional de juros e demais acréscimos. Não define por si só o novo cronograma SAC. |
| Quais são as condições do FGTS? | [Manual Moradia Própria v035, vigência 02/12/2025](https://www.caixa.gov.br/Downloads/fgts-moradia/MANUAL_DA_MORADIA_PROPRIA_02_12_2025_V_035.pdf) e [CAIXA: utilização do FGTS](https://www.caixa.gov.br/voce/habitacao/Paginas/utilizacao-fgts.aspx) | A pesquisa identificou intervalo mínimo de dois anos entre amortizações/liquidações pelo mesmo trabalhador e requisitos de elegibilidade. O limite de 80% trata do pagamento de parte das prestações, não de um teto genérico para amortização do saldo. Conferir versão vigente. |

### Referências complementares recuperadas na pesquisa

- [Banco Central: FAQ de liquidação antecipada, resposta JSON oficial](https://www.bcb.gov.br/api/servico/sitebcb/PerguntasFrequentes/Subgrupo?subgrupo=faq_liquidacaoantecipada). Explica redução de juros, desconto de pagamentos futuros em operações prefixadas e fornecimento de informação/planilha para conferência. Não extrapolar automaticamente para toda regra operacional de um financiamento indexado.
- [Banco Central: FAQ de crédito imobiliário, resposta JSON oficial](https://www.bcb.gov.br/api/servico/sitebcb/PerguntasFrequentes/Subgrupo?subgrupo=faq_creditoimobiliario). Informa que o cálculo das prestações depende do contrato e do sistema; não há critério único de prestação determinado pelo BC/CMN.
- [Estudo acadêmico no repositório da UFGD](https://repositorio.ufgd.edu.br/jspui/bitstream/prefix/3143/1/LucasSilvaRamos.pdf). Referência matemática complementar de SAC, Price e TR, não prova do procedimento interno da CAIXA.

Os downloads, cookies, HTML e extrações temporárias foram removidos na limpeza anterior. Permanecem links e documentação do modelo, não um arquivo local de evidência bruta. Para nova pesquisa, usar diretório temporário fora da raiz do repositório.

## Onde conferir a matemática implementada

Consultar as seções correspondentes de `src/financingProjection.md` junto destas implementações e testes:

| Parte | Implementação | Evidência executável |
| --- | --- | --- |
| Taxa anual efetiva para mensal | `annualToMonthlyRate` em `src/finance.ts`; consumidores em `src/financingProjection.ts` e `src/fgtsSchedule.ts` | Testes de paridade entre painéis e projeções básicas em `src/financingProjection.test.ts`. |
| SAC sobre saldo real, quota preservada em PRAZO | `sacPayment` em `src/loanPayments.ts`; loops nos dois motores | Testes SAC PRAZO e exemplo da pesquisa após amortização no mês 4. O exemplo valida o helper, não uma operação real CAIXA. |
| PRICE por anuidade e quitação antecipada | `fixedPricePayment` em `src/loanPayments.ts` | Teste de prazo restante por fórmula logarítmica, taxa zero e conservação. |
| PRESTACAO | Recalcular quota/encargo após FGTS com saldo real e prazo original restante | Testes dos dois sistemas e de paridade. |
| PRICE + diferença | `calculateSacPriceScenario`, saldo e encargo próprios; auditoria em `differenceSchedule` | Testes de orçamento SAC real, recálculo próprio após FGTS e limite do pagamento final. |
| FGTS e totais anuais | `src/fgtsSchedule.ts` | `src/fgtsSchedule.test.ts` e testes de conservação e paridade no outro motor. |

A estratégia PRICE + diferença é uma decisão do aplicativo, não uma modalidade bancária descoberta na pesquisa. Suas regras de orçamento e tratamento distinto de FGTS e extras em dinheiro estão documentadas na especificação.

## Origem dos dados e uso correto

- Valores de imóvel, entrada, prazo e juros são entradas do usuário. Defaults e fixtures de testes são cenários ilustrativos, não ofertas atuais da CAIXA.
- `FinancingState.financingRate` usa pontos percentuais anuais efetivos. `FgtsScheduleInput.taxaAnual` usa fração anual. A taxa dos helpers é fração mensal. Conferir as unidades antes de comparar APIs ou importar dados.
- Não substituir juros contratuais por CET. Se a proposta traz taxa nominal, obter a efetiva ou a mensal equivalente antes de preencher a interface.
- A disponibilidade de FGTS é uma projeção hipotética baseada no salário, não consulta a extrato. Saldo inicial zero e primeiro uso no mês 24 não significam exigência legal de esperar 24 meses para todo primeiro uso.
- O aplicativo não projeta TR, seguros, tarifas, atualização diária ou regras de arredondamento contratual. O resultado é principal e juros, não o boleto total.

## Dados que faltam para validar contra a CAIXA

Solicitar apenas dados necessários, preferencialmente anonimizados:

1. Sistema e modalidade contratual, indexador e taxa mensal ou efetiva anual.
2. Saldo devedor e data-base, prazo restante, decomposição da prestação entre principal, juros, seguros e tarifa.
3. Valor extraordinário, data prevista e opção escolhida.
4. Simulação oficial antes/depois com saldo, novo prazo e próximo encargo; se possível, memória de cálculo.
5. Se usar FGTS, saldo efetivamente disponível e histórico/data da última utilização, sem credenciais ou identificadores pessoais.

Comparar primeiro os saldos na mesma data e o encargo de principal e juros. Depois isolar atualização monetária, juros proporcionais, seguros e arredondamentos. Não ajustar fórmulas para forçar coincidência com um único boleto sem esclarecer esses componentes.

## Estado do repositório nesta escrita

A árvore avançou desde a correção financeira. HEAD observado: `3a6d2fd`, `Add payment information toggle and reorganize controls`. O diretório `handoff/` não existia na inspeção atual; por isso este documento usa o próximo número disponível, 1. Os handoffs anteriores mencionados na conversa não estão presentes nesta árvore.

Já havia alterações alheias a este pedido, preservadas:

- `package.json` e `src/components/FinancingWorkspace.tsx` modificados.
- `src/components/SimulationExportPanel.tsx`, `src/simulationExport.test.ts` e `src/simulationExport.ts` não rastreados.

Não concluir que a interface atual é idêntica à que existia no commit financeiro. Inspecionar sua composição antes de explicar controles ou integrar exportação. Não houve nova execução de testes neste pedido documental. Os 100 testes, TypeScript e build aprovados citados na conversa se referem à validação da correção/limpeza anterior, não ao estado atual com exportação em andamento.

## suggested skills

- `web-search-subagent`: atualizar as referências oficiais ou buscar memória de cálculo pública, mantendo a busca isolada.
- `research`: registrar novas evidências e limites de aplicabilidade sem confundir modelo matemático com contrato.
- `how`: explicar o fluxo de cálculo e a tradução de unidades entre APIs e interface.
- `shared-understanding`: fechar hipóteses quando a simulação contratual divergir do modelo simplificado.
- `domain-modeling`: registrar decisões sobre encargo, saldo, desembolso, FGTS e taxa se houver mudança de significado.
- `unslop`: manter explicações claras e evitar promessas não demonstradas de aderência à CAIXA.
