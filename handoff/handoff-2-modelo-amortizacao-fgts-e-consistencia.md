# Handoff: modelo de amortização por FGTS e consistência dos resultados

## Foco da próxima sessão

Entender e conferir o modelo de amortização por FGTS implementado nesta conversa. O usuário pediu este registro, não uma nova alteração nas fórmulas.

A especificação das fórmulas, unidades, hipóteses do FGTS e composição dos totais está em `src/financingProjection.md`. Consultar esse arquivo junto do código atual, sem reconstruir a regra a partir das respostas antigas da conversa. Este handoff registra as decisões, as correções de interpretação e os limites da validação.

## Decisão central do usuário

No modo reduzir prazo, preservar **cada prestação da curva original**, até a quitação. Não basta preservar apenas a primeira prestação após o uso do FGTS.

A dívida menor produz menos juros. Mantendo o pagamento previsto para aquele mês, a diferença amortiza mais principal e elimina pagamentos do final. Para SAC, a curva de pagamentos continua decrescente. Para PRICE, continua constante. O pagamento de quitação pode ser menor que a prestação prevista, pois não pode ultrapassar o saldo restante mais juros.

Essa é uma política de simulação escolhida pelo usuário. Não foi comprovada como algoritmo contratual da CAIXA. Em particular, a amortização efetiva de principal do cenário chamado SAC deixa de ser a quota constante original depois dos aportes. O que se preserva nesse modo é a curva de pagamentos derivada do SAC original, não a propriedade de quota constante do saldo ajustado.

## Como chegamos à implementação atual

Houve três interpretações sucessivas. Somente a última permanece válida:

1. Preservar a quota original SAC. Isso reduzia tanto o prazo quanto a prestação imediatamente após cada FGTS. Foi rejeitado como representação da intenção do usuário.
2. Recalcular uma quota maior para preservar a próxima prestação. Foi implementado provisoriamente, mas as prestações posteriores passavam a cair mais rápido que a curva original. Também foi rejeitado.
3. Preservar a prestação original de **cada mês** e calcular a amortização efetiva sobre o saldo reduzido. É a regra atual de `PRAZO`.

O usuário usou o mês de cruzamento SAC ≤ PRICE como teste de sanidade. A explicação repetida de que a tabela estava sem FGTS e o indicador com FGTS era insuficiente: com a curva preservada, os pagamentos anteriores à quitação devem coincidir, independentemente do saldo e dos juros diferentes.

## Caminho de execução para conferir

| Etapa | Onde ler | O que conferir |
| --- | --- | --- |
| Formação do FGTS | `src/fgtsPolicy.ts` | Depósito mensal de 8%, crescimento salarial em degraus anuais, intervalo de 24 meses. A função recebe crescimento como fração. |
| Cronograma básico | `calculate` em `src/financingProjection.ts` | Juros sobre saldo inicial do mês, escolha da prestação prevista, limite da amortização ao saldo, pagamento, aporte FGTS e saldo final. |
| Curva original | `originalSacPayment` e `fixedPricePayment` em `src/loanPayments.ts` | A referência SAC usa principal e prazo originais; não usa o saldo abatido pelo FGTS. |
| Reduzir prestação | Ramo `PRESTACAO` em `calculate` | Recalcula quota SAC ou encargo PRICE sobre o saldo real e o prazo original restante. Não foi substituído pela regra de preservar curva. |
| Três estratégias | `calculateSacPriceScenario` | SAC, PRICE, referências sem FGTS e estratégia PRICE + diferença. Esta última mantém saldo, extras e FGTS próprios. |
| Resumos anuais | `src/fgtsSchedule.ts` | Agregação dos cronogramas, não outro loop de evolução da dívida. |
| Composição da tela | `FinancingWorkspace.tsx` | `result` selecionado de `comparisonScenario.sac` ou `.price`; `referenceResult` separado e explicitamente sem FGTS. |
| Comparação das linhas | `src/financingDetails.ts` | Pareamento de meses efetivos e originais, quitação antecipada e parcelas eliminadas. |

### Ordem temporal importante

O depósito do FGTS entra no fundo no mês correspondente. A prestação regular é paga antes do uso extraordinário. O aporte abate somente o principal ainda devido e não reduz retroativamente os juros já cobrados naquele mês. Se o fundo exceder a dívida, usa-se apenas o necessário.

Se a prestação regular quitar a dívida, não há aplicação de FGTS naquele mês. Se o FGTS quitar depois da prestação, essa prestação foi paga normalmente e os meses seguintes deixam de existir no cronograma efetivo. Não se somam boletos futuros nominais para abatê-los do saldo; o desconto dos juros futuros resulta da evolução do saldo e da ausência de pagamentos após a quitação.

A tolerância monetária do motor é R$ 0,005. O motor não arredonda juros e amortização a centavos a cada mês como um contrato poderia fazer. A apresentação arredonda os números, inclusive para milhares em algumas colunas da tabela.

## O que significa fonte única agora

`calculate` é o motor usado pelos cenários SAC e PRICE desta workspace. `buildFgtsComparisonFromCalculations` recebe esses resultados para produzir os totais anuais e detalhes FGTS. O wrapper `buildFgtsComparison` ainda existe para compatibilidade e testes, mas chama `calculate` em vez de possuir sua própria fórmula de evolução.

O painel principal, o detalhamento e a exportação passaram a receber o resultado efetivo selecionado. O cronograma sem FGTS não é uma segunda verdade concorrente: é uma referência contrafactual identificada para comparação.

Não interpretar isso como remoção de todas as fórmulas financeiras do repositório. `finance.ts`, `sacProjection.ts`, `sacSchedule.ts` e consumidores antigos ainda existem. A consolidação foi feita no fluxo ativo da workspace e no antigo motor FGTS duplicado. Antes de mudar outro consumidor, verificar se ele está renderizado e quais hipóteses utiliza.

## Indicador SAC ≤ PRICE

A implementação atual calcula o cruzamento das **curvas originais sem FGTS**, usando `scheduledPayment`. O rótulo explica essa referência. Assim, ligar FGTS não altera esse indicador, mesmo em `PRESTACAO`.

Consequência importante: esse mês pode estar depois da quitação efetiva de uma estratégia. Não é uma promessa de que haverá dois pagamentos reais naquele mês. Também não representa o cruzamento das prestações recalculadas no modo reduzir prestação.

Essa mudança de significado ocorreu junto da implementação para apoiar o teste de consistência pedido. Não voltar silenciosamente a comparar o pagamento parcial de quitação com uma prestação integral PRICE. Se for necessário mostrar também um cruzamento efetivo com FGTS, criar uma métrica distinta e definir como tratar estratégias já quitadas.

## Detalhamento e último problema corrigido

No modo prazo, a tabela exibe as prestações efetivas até a quitação e depois as referências originais riscadas, marcadas como eliminadas pelo FGTS. Elas não entram nos totais pagos.

No modo prestação, cada pagamento alterado mostra abaixo seu valor original sem FGTS. O saldo, os juros e a amortização principais são os do cenário efetivo.

O usuário apontou uma linha de quitação no mês 130 de aproximadamente R$ 1.623, seguida de uma referência riscada acima de R$ 5 mil. A interface misturava acerto final e curva original sem distingui-los. Foram adicionados:

- `earlyPayoff` e `partialPayoff` em `FinancingDetailRow`;
- rótulos de quitação antecipada ou quitação com FGTS;
- valor original sem FGTS riscado abaixo do acerto parcial;
- divisor antes das parcelas originais eliminadas.

A visualização anual inclui o mês de quitação mesmo fora dos múltiplos de 12. Por isso pode mostrar 130 seguido de 132; não significa que o cronograma mensal pulou 131.

Limites da última verificação: o cenário exato da imagem não foi reproduzido numericamente com todos os parâmetros. A classificação de acerto parcial foi testada também com uma linha sintética. Além disso, `partialPayoff` compara o pagamento final com a referência **sem FGTS**, não com a prestação corrente recalculada; em `PRESTACAO`, isso pode classificar como parcial uma prestação integral recalculada no mês em que o FGTS quita o restante. Revisar essa distinção caso a rotulagem seja refinada.

## Evidência e limites bancários

Consultar `handoff/handoff-1-descobertas-calculos-e-fontes.md` para o mapa de fontes oficiais e os dados necessários para validar um contrato. Sua descrição da preservação de quota é histórica e foi superada pela decisão desta conversa.

Consultar `handoff/pesquisa-amortizacao-reducao-prazo-sac-caixa-parcial.md` para a pesquisa técnica adicional. Ela não confirmou o algoritmo CAIXA e se concentrou demais na hipótese de prestação fixa para sempre, diferente da curva decrescente preservada pedida aqui.

A pesquisa paralela com três agentes `searcher` concluiu apenas a frente técnica; as frentes CAIXA e normas expiraram após 30 minutos. Não há conclusão normativa completa. As fontes oficiais sustentam abatimento do saldo e opções de redução, não a fórmula operacional implementada. Testes internos não provam aderência à CAIXA.

As exclusões do modelo estão na especificação: TR/indexação, seguros, tarifas, datas diárias, arredondamento contratual, 13º e remuneração do FGTS. O primeiro uso no mês 24 e saldo inicial do fundo zero são hipóteses do simulador, não comprovação de elegibilidade ou carência universal.

## Validação e próximos cuidados

Últimos comandos executados nesta conversa:

- `npm test`: 131 testes aprovados.
- `npm run check`: aprovado.
- `npm run build`: aprovado.
- `git diff --check`: sem erros, com avisos de conversão LF/CRLF.
- ESLint foi tentado antes e falhou por ausência de configuração compatível com ESLint 9. Não foi corrigido.

Ler `src/financingProjection.test.ts`, `src/fgtsSchedule.test.ts` e `src/financingDetails.test.ts` para os contratos executáveis. Preservar conservação do principal, separação de FGTS e dinheiro do bolso, limite da última parcela, ausência de cobrança após quitação e identidade da curva no modo prazo.

Houve conferência no navegador dos dois modos antes da última correção de rotulagem, sem erros no console. A última correção de quitação parcial passou por testes e build, mas não por nova inspeção visual. Não afirmar cobertura completa de interação/renderização: os testes novos do detalhamento exercitam principalmente o modelo das linhas.

## Estado do trabalho

Branch `main`, HEAD observado `3a6d2fddc7b30ab4ab4140201fa0de1fb5186c2c`. As mudanças desta conversa não foram commitadas. Consultar o diff atual em vez de reproduzi-lo neste documento.

Há arquivos novos relevantes ainda não rastreados: `src/fgtsPolicy.ts`, `src/financingDetails.ts`, `src/financingDetails.test.ts` e os arquivos de exportação da simulação. `package.json` já tinha alterações antes desta tarefa e agora inclui também o teste do detalhamento.

A exportação foi adicionada em trabalho anterior e recebeu dois botões, copiar e detalhes. Não remover esse trabalho. Há uma pendência observável no componente: a mensagem de status da cópia ainda fica dentro dos detalhes recolhidos e o fallback com `execCommand` não tem limpeza em `finally` se lançar exceção.

A raiz contém muitos arquivos de pesquisa não rastreados com prefixo `_`. Não foram limpos nesta tarefa. A frase de limpeza presente na especificação financeira refere-se a uma etapa anterior e não descreve o estado atual. Verificar propriedade dos arquivos antes de removê-los. Não usar `git clean` indiscriminadamente.

## suggested skills

- `how`: explicar o fluxo entre cronograma, resumos e apresentação antes de alterar consumidores.
- `shared-understanding`: fechar o significado de prestação original, pagamento efetivo, cruzamento e quitação parcial.
- `domain-modeling`: registrar termos financeiros aprovados sem tratar hipóteses do simulador como regras bancárias.
- `web-search-subagent`: usar agentes `searcher` para buscar novas evidências oficiais, se solicitado.
- `research`: registrar fontes adicionais e seus limites sem duplicar a especificação do modelo.
- `unslop`: manter textos claros e não prometer validação contratual que não foi feita.
