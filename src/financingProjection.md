# Modelo simplificado de financiamento

As prestações calculadas incluem apenas principal e juros. Não há TR ou outro indexador, MIP, DFI, tarifas, juros proporcionais por data ou arredondamento contratual mensal. Os resultados não são cotações da CAIXA.

A pesquisa pública confirmou amortização do saldo atual e a escolha entre reduzir prazo ou prestação, mas não confirmou o algoritmo interno de recálculo SAC da CAIXA. A quota constante abaixo é uma hipótese matemática explícita. Compare os resultados com uma simulação do contrato antes de tomar uma decisão.

## Taxa efetiva anual

Todos os painéis de financiamento usam `annualToMonthlyRate`: `i = (1 + taxaAnual)^(1/12) - 1`. Na interface, 11,5 representa 11,5% efetivos ao ano, não taxa nominal nem CET. A taxa mensal correspondente é aproximadamente 0,91124684%.

Os valores numéricos dos defaults foram mantidos como hipóteses efetivas, sem conversão silenciosa dos valores digitados. Estudos salvos conservam seus campos, mas sua prestação exibida é recalculada ao carregar a lista. Estudos antigos da workspace usavam divisão nominal por 12; seus resultados mudam sob a convenção corrigida. Confira a taxa efetiva na proposta e revise estudos antigos.

`finance.ts`, `financingProjection.ts` e `fgtsSchedule.ts` compartilham a conversão de taxa e os helpers em `loanPayments.ts`. A suíte compara os motores e os totais anuais com a mesma entrada.

## SAC com redução de prazo

A quota de principal é `A = valorFinanciado / prazoOriginal`. Os juros do mês são `i * saldoInicialDoMes`; o encargo é `A + juros`.

Após a prestação, a amortização extraordinária abate o saldo. A quota A não muda. No mês seguinte, os juros e a prestação caem, sem reinvestimento automático dessa economia. O prazo termina quando a dívida acaba. A última prestação cobra somente o principal restante e os juros do mês.

Exemplo da pesquisa, sem encargos: R$ 300.000 em 240 meses, taxa mensal de 0,8%, R$ 50.000 extras após a quarta prestação. Quota R$ 1.250, novo saldo R$ 245.000, prestação seguinte R$ 3.210 e 196 meses restantes. O teste exercita o helper SAC com esse saldo, pois a interface atual não permite eventos extraordinários em datas arbitrárias.

## PRICE e redução de prestação

PRICE usa a fórmula da anuidade. Na taxa zero, o encargo é saldo dividido pelo prazo. Em reduzir prazo, mantém o encargo e antecipa a quitação após o FGTS.

No modo reduzir prestação, depois do FGTS ambos os sistemas recalculam com o saldo real e os meses restantes do prazo original. SAC define uma nova quota constante; PRICE define um novo encargo constante. FGTS que quita a dívida encerra o cronograma mesmo nesse modo.

## FGTS

A projeção é uma estratégia hipotética: saldo inicial zero, depósitos mensais de 8% do salário, reajuste anual informado e uso do saldo acumulado no fim de cada 24 meses, depois da prestação. Não inclui 13º, remuneração do fundo nem distribuição de resultados. O saldo aplicado nunca excede a dívida e sobra do fundo não é gasto.

O primeiro uso no mês 24 não é carência obrigatória. A interface não recebe saldo atual, data do último uso, elegibilidade, data da amortização nem depósitos personalizados. As regras vigentes, o histórico de usos e o contrato precisam ser conferidos separadamente. Não há cálculo diário de juros ou atualização.

## PRICE + diferença

É uma estratégia de orçamento, não uma regra bancária. Todo mês, o orçamento de referência é a prestação SAC real, já afetada pelo FGTS e limitada ao saldo no acerto final. A extra em dinheiro é `max(0, prestacaoSACReal - encargoPRICEProprio)`, limitada ao principal que sobra depois da amortização regular. Não há extra sem SAC ativa.

Extras mensais em dinheiro reduzem prazo e não recalculam o encargo. FGTS segue o modo selecionado. Em reduzir prestação, após o FGTS o cenário recalcula seu próprio encargo PRICE com seu próprio saldo, não com o saldo da PRICE sem extras, e com o prazo original restante. As duas políticas são distintas de propósito.

`differenceSchedule` registra pagamento, extra, FGTS e saldo para conferir essa estratégia. O indicador SAC ≤ PRICE mostra apenas o primeiro mês em que a prestação real SAC não supera a PRICE de referência, com ambos ativos, incluindo acertos finais. Não promete empate permanente; outros recálculos podem inverter a comparação.

## Custos e conservação

`totalPaid` é dinheiro do bolso no financiamento: prestações, inclusive extras em dinheiro no terceiro cenário. Não inclui entrada nem FGTS. `fgtsAmortization` é registrado separadamente. Total do financiamento = `totalPaid + fgtsAmortization = valorFinanciado + totalInterest`. A extra em dinheiro já está em `totalPaid`; não deve ser somada novamente.

No painel FGTS, total com entrada e FGTS = entrada + prestações do bolso + FGTS aplicado. Nenhum desses totais inclui indexação, seguros, tarifas ou custos de posse.

## Fontes da pesquisa

Os downloads e arquivos temporários foram removidos da raiz. As fontes oficiais podem ser consultadas diretamente:

- [CAIXA: amortização e serviços do contrato](https://www.caixa.gov.br/voce/habitacao/perguntas-frequentes-contrato/Paginas/default.aspx#amortizacao).
- [CAIXA: sistemas de amortização, indexadores e composição do encargo](https://www.caixa.gov.br/voce/habitacao/perguntas-frequentes-novos-financiamentos/Paginas/default.aspx).
- [CAIXA: App Habitação e simulação contratual](https://www.caixa.gov.br/atendimento/aplicativos/habitacao/Paginas/default.aspx).
- [Manual FGTS Moradia Própria, versão 035, vigência 02/12/2025](https://www.caixa.gov.br/Downloads/fgts-moradia/MANUAL_DA_MORADIA_PROPRIA_02_12_2025_V_035.pdf). Conferir atualizações antes de usar as regras.
- [CDC, artigo 52: liquidação antecipada com redução proporcional dos juros e acréscimos](https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm#art52).

## Validação

Os testes cobrem quota SAC, juros pós-FGTS, recálculo de prestação, fórmula logarítmica do prazo PRICE, paridade de motores por sistema e modo, taxa efetiva, taxa zero inclusive consumidores de `finance.ts`, conservação de principal e fundos, FGTS que quita, saldo zero, acerto final e PRICE + diferença usando saldo próprio. Não há validação contra uma cotação contratual real da CAIXA nesta suíte.
