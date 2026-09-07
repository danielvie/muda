# Modelo simplificado de financiamento

As prestações calculadas incluem apenas principal e juros. Não há TR ou outro indexador, MIP, DFI, tarifas, juros proporcionais por data ou arredondamento contratual mensal. Os resultados não são cotações da CAIXA.

A pesquisa pública confirmou amortização do saldo atual e a escolha entre reduzir prazo ou prestação, mas não confirmou o algoritmo interno de recálculo SAC da CAIXA. O recálculo descrito abaixo é uma hipótese matemática explícita. Compare os resultados com uma simulação do contrato antes de tomar uma decisão.

## Taxa efetiva anual

Todos os painéis de financiamento usam `annualToMonthlyRate`: `i = (1 + taxaAnual)^(1/12) - 1`. Na interface, 11,5 representa 11,5% efetivos ao ano, não taxa nominal nem CET. A taxa mensal correspondente é aproximadamente 0,91124684%.

Os valores numéricos dos defaults foram mantidos como hipóteses efetivas, sem conversão silenciosa dos valores digitados. Estudos salvos conservam seus campos, mas sua prestação exibida é recalculada ao carregar a lista. Estudos antigos da workspace usavam divisão nominal por 12; seus resultados mudam sob a convenção corrigida. Confira a taxa efetiva na proposta e revise estudos antigos.

`finance.ts`, `financingProjection.ts` e `fgtsSchedule.ts` compartilham a conversão de taxa e os helpers em `loanPayments.ts`. A suíte compara os motores e os totais anuais com a mesma entrada.

## SAC com redução de prazo

A quota inicial de principal é `A = valorFinanciado / prazoOriginal`. Os juros do mês são `i * saldoInicialDoMes`; o encargo é `A + juros`.

Após a prestação, a amortização extraordinária abate o saldo. No modo `PRAZO`, a projeção preserva em cada mês a prestação da curva original sem FGTS. Como os juros passam a incidir sobre um saldo menor, a diferença aumenta a amortização efetiva de principal naquele mês:

`amortização efetiva = prestação original do mês - taxa mensal * saldo com FGTS`

A prestação segue a curva SAC original até a quitação antecipada. A última prestação pode ser parcial. As prestações restantes da curva original são marcadas na interface como eliminadas pelo FGTS.

No PRICE, a prestação original é constante. O FGTS reduz o saldo e aumenta a parte de principal de cada pagamento, encurtando o prazo pela mesma lógica.

O indicador SAC ≤ PRICE compara as curvas originais dos dois sistemas. Ele ignora o pagamento parcial da quitação antecipada, que não representa um cruzamento normal entre as prestações.

## PRICE e redução de prestação

PRICE usa a fórmula da anuidade. Na taxa zero, o encargo é saldo dividido pelo prazo. Em reduzir prazo, mantém o encargo e antecipa a quitação após o FGTS.

No modo reduzir prestação, depois do FGTS ambos os sistemas recalculam com o saldo real e os meses restantes do prazo original. SAC define uma nova quota constante; PRICE define um novo encargo constante. FGTS que quita a dívida encerra o cronograma mesmo nesse modo.

## FGTS

A projeção é uma estratégia hipotética: saldo inicial zero, depósitos mensais de 8% do salário, reajuste anual informado e uso do saldo acumulado no fim de cada 24 meses, depois da prestação. Não inclui 13º, remuneração do fundo nem distribuição de resultados. O saldo aplicado nunca excede a dívida e sobra do fundo não é gasto.

O primeiro uso no mês 24 não é carência obrigatória. A interface não recebe saldo atual, data do último uso, elegibilidade, data da amortização nem depósitos personalizados. As regras vigentes, o histórico de usos e o contrato precisam ser conferidos separadamente. Não há cálculo diário de juros ou atualização.

## PRICE + diferença

É uma estratégia de orçamento, não uma regra bancária. Todo mês, o orçamento de referência é a prestação SAC real, já afetada pelo FGTS e limitada ao saldo no acerto final. A extra em dinheiro é `max(0, prestacaoSACReal - encargoPRICEProprio)`, limitada ao principal que sobra depois da amortização regular. Não há extra sem SAC ativa.

Extras mensais em dinheiro reduzem prazo e não recalculam o encargo. FGTS segue o modo selecionado. Em reduzir prestação, após o FGTS o cenário recalcula seu próprio encargo PRICE com seu próprio saldo, não com o saldo da PRICE sem extras, e com o prazo original restante. As duas políticas são distintas de propósito.

`differenceSchedule` registra pagamento, extra, FGTS e saldo para conferir essa estratégia. O indicador SAC ≤ PRICE usa as curvas originais sem FGTS como teste de consistência e não considera o acerto final parcial.

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

Os testes cobrem a preservação da curva original no modo prazo, juros pós-FGTS, recálculo no modo prestação, fórmula logarítmica do prazo PRICE, paridade dos resumos com o motor único, taxa efetiva, taxa zero, conservação de principal e fundos, FGTS que quita, saldo zero, acerto final e PRICE + diferença usando saldo próprio. Não há validação contra uma cotação contratual real da CAIXA nesta suíte.
