# Financiamento com barra simples e alça Foco

## Atualização promovida: selo de atalho na Entrada

Promovida por escolha do usuário: variante 5 do protótipo de cinco tratamentos para a Entrada, commit `c6b108b` na branch local `prototype/entry-button`.

A área `Entrada mínima de 20%` saiu do painel. O cartão de Entrada mantém a posição e ganhou um selo discreto `↗ 20%` no canto superior direito. O selo usa `minimumEntry(valor do imóvel)` como alvo, aplica a entrada ao tocar e recebe destaque enquanto a entrada atual estiver abaixo de 20%. Editar o imóvel ou a Entrada continua manual e não impõe esse mínimo automaticamente.

O protótipo completo permanece na branch de origem para consulta. A interface principal mantém apenas a variante promovida.

Histórico da implementação anterior: a variante 2 do protótipo de recorte com alças auxiliares foi promovida. A dinâmica das laterais foi ajustada naquela promoção.

## Comportamento aprovado

A barra simples altera o valor dentro da faixa atual. A alça Foco altera somente a faixa, com prévia durante o arraste e aplicação ao soltar:

- Em imóvel e entrada, soltar Foco a até 28 px do centro do puxador enquadra R$ 100 mil abaixo e R$ 100 mil acima do valor atual. Esse modo tem prioridade sobre o recorte direcional, inclusive quando o puxador está numa extremidade. A prévia destaca o puxador e mostra os limites.
- Fora dessa proximidade, acima do valor atual: mantém o mínimo e corta o máximo no ponto escolhido.
- Fora dessa proximidade, abaixo do valor atual: mantém o máximo e corta o mínimo no ponto escolhido.
- Juros e prazo continuam apenas com o recorte direcional; no empate, cortam o máximo. Todo recorte inclui o valor da simulação e respeita a largura mínima.
- Fora à esquerda: restaura o mínimo para zero, mantendo o máximo. Quando o campo exige um mínimo maior, como a entrada automática de 20% ou o prazo de um ano, usa esse mínimo permitido.
- Fora à direita: dobra o limite máximo, mantendo o mínimo. Limites financeiros podem impedir a duplicação completa.
- Fora da barra e sem extrapolar as laterais: cancela sem mudar a faixa.

Exemplo: faixa de R$ 750 mil a R$ 1,25 milhão. Puxar à direita resulta em R$ 750 mil a R$ 2,5 milhões. Puxar à esquerda depois resulta em R$ 0 a R$ 2,5 milhões. O imóvel não muda.

O enquadramento de ± R$ 100 mil respeita zero, a entrada mínima automática e o limite disponível. Os extremos são alinhados para fora aos ticks monetários. Como usa uma janela fixa, pode ampliar uma faixa que já seja menor que essa janela, sem alterar o valor da simulação.

O botão Resetar faixa aplica o padrão salvo para o campo selecionado, sem mudar o valor. Na ausência de preferência, usa o padrão do aplicativo: imóvel de R$ 0 a R$ 2 milhões, entrada de R$ 0 a R$ 800 mil, juros de 0% a 20% e prazo de 1 a 40 anos. A faixa aplicada inclui o valor atual e respeita os limites financeiros e os ticks, mas essa adaptação nunca modifica o padrão salvo.

O gesto sempre calcula a prévia a partir da faixa inicial. Movimentos repetidos antes de soltar não duplicam o máximo várias vezes. É preciso deslocar pelo menos 8 px; um toque na alça não altera valores.

## Minha faixa

Cada campo tem um painel recolhido com sua faixa padrão. Existem somente três comandos que escrevem essa preferência:

1. Salvar faixa atual como padrão: copia os limites em uso, uma única vez. O atalho Salvar faixa atual fica logo abaixo dos limites da barra, antes do trio Salvar padrão, Foco e Resetar faixa. Usa o mesmo salvamento de Minha faixa, sem abrir o painel, e mostra sucesso ou erro no próprio local.
2. Editar limites e Salvar: valida os dois valores e guarda o novo padrão.
3. Restaurar padrão do aplicativo: remove a personalização daquele campo, sem afetar os demais.

Salvar ou restaurar não altera a faixa em uso. Resetar faixa a aplica explicitamente. Digitar, perder foco, cancelar, fechar o painel, fazer crop ou expandir não grava preferências. Mudar de campo descarta a edição ainda não salva.

As preferências ficam em `localStorage`, na chave `muda.financing.rangePreferences.v1`. Somente campos personalizados são armazenados. A próxima sessão inicia com essas faixas; não há retomada automática da última simulação. Se o valor inicial estiver fora da preferência, a barra inclui o valor sem alterar a configuração salva. O painel explica os limites que serão aplicados.

A interface informa que o salvamento é local a este navegador. Não há sincronização entre aparelhos. Falha ao gravar mantém a preferência anterior e apresenta um erro; dados corrompidos são ignorados na leitura, sem gravação automática.

## Valores padrão por campo

Salvar padrão fica à esquerda do Foco original; Resetar faixa fica à direita. A variante 7, Trio central, foi escolhida para imóvel, entrada, juros e prazo. Os dois botões laterais têm a mesma largura e 48 px de altura, com menos destaque. Foco mantém a alça com pontos, 88 px de largura, 56 px de altura e o gesto original. A ordem de teclado segue Salvar, Foco, Resetar.

Salvar padrão salva somente o valor confirmado do campo selecionado. Não salva a simulação inteira, a faixa, o sistema de amortização, a política de entrada mínima nem as configurações de FGTS.

- A próxima abertura da calculadora usa os campos salvos; os demais mantêm os valores originais do aplicativo. Mudar de campo, trocar de ambiente ou carregar estudo não reaplica os padrões.
- Os valores ficam em `localStorage`, na chave `muda.financing.valuePreferences.v1`, separados de estudos e faixas. A entrada é um valor em reais, não um percentual. O prazo é armazenado em meses e exibido em anos.
- Salvar não altera a simulação ou a faixa atual. Digitar, perder foco, usar a barra, Foco ou Resetar faixa não salva valores automaticamente.
- O controle mostra o valor padrão salvo e permite Remover padrão somente daquele campo. Remover não muda o valor atual; na próxima abertura volta a usar o valor original do aplicativo.
- Na abertura, a entrada respeita o valor inicial do imóvel. Se o padrão de entrada for maior, apenas o valor aplicado é limitado; a preferência salva permanece intacta. A faixa se adapta para incluir os valores iniciais sem sobrescrever os limites salvos.
- Falhas de armazenamento exibem erro e preservam o padrão anterior. Dados inválidos são ignorados sem gravação automática. Salvar e remover leem a configuração mais recente para preservar outros campos salvos por outra aba.

### Verificação dos valores padrão

- Doze testes em `financingValuePreferences.test.ts` cobrem armazenamento individual, unidades, zero, precisão, limites, dados corrompidos, falhas de armazenamento, mesclagem e independência de estudos e faixas. A suíte completa aprovou 125 testes; TypeScript e build passaram. `FinancingRangeActions.test.ts` cobre a ordem dos comandos, a identidade do Foco e a separação entre ação de salvar e detalhes da preferência.
- No navegador, salvar os quatro campos e recarregar preservou apenas os valores escolhidos. Carregar estudo com juros diferentes não mudou o padrão. Remover o padrão dos juros manteve o valor atual e restaurou o valor original na abertura seguinte.
- Clicar em Salvar diretamente após digitar, sem Enter, confirmou e salvou o novo valor. Falha simulada de armazenamento manteve a preferência anterior e mostrou erro.
- Foco e Resetar faixa preservaram o valor e não gravaram padrões. Os quatro campos foram inspecionados em 320, 390 e 1280 px, sem overflow, com ações laterais simétricas de 48 px e Foco de 56 px. O arraste real após a promoção enquadrou R$ 925 mil entre R$ 825 mil e R$ 1,025 milhão, sem alterar o valor nem a preferência. Console sem erros ou avisos.
- Fonte do layout promovido: variante 7 em `prototype/range-actions-focus`, commit `bfdf59a`, arquivos `src/components/RangeActionsPrototype.tsx` e `.css`. As outras variantes e o seletor permanecem apenas no protótipo. A implementação usa os controles reais e o salvamento individual, não as ações simuladas.

## Campos e acessibilidade

- Imóvel e entrada: passos de R$ 1.000; juros: 0,1 ponto percentual; prazo: um ano.
- Valores em formato brasileiro, com digitação incompleta mantida local até Enter ou perda de foco.
- Barra com área de toque de 64 px; alça com altura mínima de 56 px. A barra permite rolagem vertical; somente a alça captura o gesto.
- No teclado, a barra aceita setas, PageUp/PageDown e Home/End. Na alça, esquerda/direita escolhem o ponto; − restaura mínimo; + prepara máximo em dobro; Enter aplica; Escape cancela.
- Soltar ou perder captura encerra o gesto. Mudar de campo ou alterar a simulação cancela qualquer prévia anterior.

O painel principal, os detalhes, os estudos e a comparação usam a mesma largura do contêiner da workspace, limitada a 680 px. O painel principal não tem um limite próprio menor no desktop. As bordas foram conferidas no navegador em 320, 390, 700 e 1280 px.

O seletor SAC/PRICE e Salvar estudo ficam junto à prestação. A Entrada continua manual; o selo de 20% é uma ação explícita e não altera a regra de edição dos campos. Estudos existentes, os dois modos de FGTS e as faixas temporárias são preservados. Apenas comandos explícitos persistem padrões. Os estudos usam a chave de armazenamento existente.

## Comparação atual

O painel único Amortizar agora ou investir para amortizar depois reúne duas estratégias abertas, com o mesmo orçamento e avaliação no cruzamento das curvas originais. A conclusão considera investimento, dívida e FGTS remanescente na mesma data. SAC e PRICE seguem como referências separadas. A regra completa, a memória de salário com ocultação visual e a exportação somente de premissas estão em [amortizationComparison.md](../amortizationComparison.md).

## Histórico anterior à comparação no cruzamento

As seções abaixo registram as etapas anteriores, substituídas pelo painel mesclado descrito acima. Os motores de investimento com quitação por cobertura e o resumo por desembolso foram removidos.

Aprovada a unificação visual de SAC vs PRICE e Amortização com FGTS. O painel principal e os controles de faixa permanecem como estavam.

- Um único controle Considerar FGTS afeta a comparação. Desligá-lo oculta os campos e os detalhes FGTS, sem apagar salário, crescimento ou modo. O controle fica na workspace e mantém seu estado ao trocar de ambiente; não adiciona persistência nem muda o formato dos estudos.
- Reduzir prazo, Reduzir prestação, salário e crescimento ficam antes dos resultados, sem menu intermediário.
- SAC, PRICE, PRICE + diferença e PRICE + investimento aparecem em quatro painéis abertos, um abaixo do outro, em todas as larguras. Não há seletor nem necessidade de abrir cada cenário. A taxa de investimento e a opção de quitar com investimento ficam na workspace e sobrevivem à troca de ambiente. Somente a taxa é lembrada entre visitas, sem mudança no formato dos estudos.
- Os indicadores do financiamento mantêm a ordem: desembolso mensal inicial, quitação, juros totais, pago do bolso, FGTS utilizado e total gasto. O desembolso de PRICE + diferença inclui a amortização extra, não apenas a prestação.
- Nos cenários sem investimento, Pago do bolso inclui entrada, prestações e extras em dinheiro. FGTS utilizado mostra apenas o fundo aplicado na dívida. Total gasto soma os dois, sem duplicar extras nem incluir FGTS não utilizado. PRICE + investimento separa dinheiro aportado de dinheiro gasto no apartamento, conforme as fórmulas abaixo. Esses valores ficam visíveis nos cartões, com a composição explicada abaixo dos números; os custos excluídos continuam indicados no aviso acima.
- Cada painel de cenário ocupa toda a largura disponível, com indicadores em duas colunas e uma coluna até 360 px, para não quebrar os valores monetários. Os valores monetários não são arredondados para milhares na comparação.
- Detalhes da comparação e evolução anual começam recolhidos. O cruzamento das prestações também está no informativo junto ao valor da primeira parcela, com o mês exato, o período em anos e meses e a ressalva de que compara curvas sem FGTS.
- A tabela anual começa por Ano, seguido do grupo SAC e depois PRICE. Cada grupo reúne saldo devedor, juros no ano e FGTS no ano, com cabeçalho próprio e divisória entre os sistemas.
- Os detalhes preservam os totais de PRICE + diferença e, na projeção FGTS, a entrada, soma das prestações, FGTS aplicado, total com entrada e FGTS, prestação após o primeiro uso, quantidade de usos e FGTS não utilizado.

### PRICE + investimento

`priceDifferenceInvestment.ts` usa os cronogramas SAC e PRICE já calculados. O aporte mensal é a diferença positiva entre as prestações efetivamente pagas, inclusive seus acertos finais, somente enquanto ambos os financiamentos estão ativos. A regra é reavaliada a cada mês. Quando PRICE ≥ SAC, não há aporte. Por padrão, o investimento não altera a dívida nem resgata dinheiro para quitá-la.

A opção Quitar quando o investimento cobrir a dívida começa desligada. Quando ligada, o motor testa o saldo total investido, incluindo aportes e rendimentos, depois dos juros do investimento, aporte, prestação PRICE e FGTS do mês. Se o saldo cobre a dívida restante, resgata exatamente essa dívida, registra a quitação e encerra prestações e aportes. A sobra continua rendendo até o fim do prazo original. Não há resgate se o financiamento já foi quitado, inclusive pelo FGTS. A taxa zero também permite quitar usando apenas os aportes.

O resgate e os totais até esse mês ficam em `DifferenceInvestment.payoff`; cada linha registra `redemption`. A conservação do investimento é `saldo final = aportes + rendimentos − resgate`. Os cronogramas SAC, PRICE e PRICE + diferença originais não são alterados. A tabela anual continua mostrando a PRICE original e avisa que não reflete essa quitação.

A taxa começa com o último valor válido salvo neste navegador, ou vazia se não houver preferência. Deve ser informada como rentabilidade efetiva anual líquida estimada, entre 0% e 100%. A interface aceita vírgula decimal. Zero simula somente o acúmulo dos aportes. Aportes ocorrem no fim do mês, depois do rendimento do saldo anterior. O saldo continua rendendo até o fim do prazo original, mesmo se o FGTS antecipar a quitação. A taxa é uma hipótese constante, não uma garantia, e não há cálculo separado de tributação.

A taxa é salva automaticamente ao editar um valor válido, inclusive zero, na chave `muda.financing.investmentRate.v1`. O documento versionado guarda `annualRatePercent` como número; a interface restaura a vírgula decimal sem arredondar a precisão. Apagar o campo remove a taxa salva. Digitação inválida não sobrescreve a preferência anterior. A leitura inicial não grava nada; dados inválidos são ignorados. Falha ao gravar ou remover mostra erro no cenário, preserva o valor salvo e permite continuar a simulação local. A memória não inclui a opção de quitação, FGTS, estudos nem as demais configurações.

O indicador Rendimento acumulado ≥ saldo devedor mostra o primeiro mês em que somente o rendimento líquido acumulado cobre a dívida PRICE restante. Não usa os aportes nem apenas o rendimento daquele mês. Compara os valores no fim do mês, após a prestação e o FGTS, e exibe o mês, o período em anos e meses e os dois valores. Só considera saldo devedor maior que meio centavo, para não anunciar a quitação já concluída como cruzamento. Sem taxa, pede a rentabilidade; sem dívida, informa isso; sem cruzamento, informa que não ocorre antes da quitação no horizonte simulado. O indicador não resgata recursos nem altera os cronogramas. Os testes cobrem os dois modos FGTS, igualdade, primeiro cruzamento, rendimento zero, ausência de dívida e exclusão dos meses após a quitação.

No cenário PRICE + investimento, Pago do bolso agora inclui entrada, prestações pagas e todos os aportes feitos, com a opção ligada ou desligada. Total gasto contabiliza o dinheiro destinado ao apartamento: entrada + prestações pagas + FGTS aplicado + resgate usado na quitação. Não soma os aportes novamente ao resgate e não inclui o saldo que permanece investido. O cenário mostra separadamente aportes acumulados, rendimento líquido estimado, saldo investido no fim do prazo e resgate usado na quitação.

Quando há quitação com investimento, os indicadores usam somente as prestações, juros e FGTS até aquele mês. Sem taxa válida, a opção ligada não apresenta os totais da PRICE original como resultado da quitação. Desligá-la restaura a projeção sem resgate. O indicador de rendimento sozinho continua separado: ele só compara meses com dívida ativa e explica quando a opção quitou a dívida antes desse cruzamento.

### Integração com o cálculo corrigido

O layout usa o motor `calculate` por meio de `calculateSacPriceScenario`, documentado em `src/financingProjection.md`. Os cartões, os detalhes do financiamento e os resumos FGTS derivam desse mesmo cronograma. `buildFgtsComparisonFromCalculations` apenas agrega os meses em blocos anuais; não recalcula o financiamento.

O desembolso inicial de PRICE + diferença vem de `differenceSchedule[0].payment`. Seu total do bolso já inclui extras em dinheiro; a composição com FGTS soma apenas `fgtsAmortization`, e a composição com entrada soma também `state.entry`. Os rótulos distinguem esses totais. O indicador SAC ≤ PRICE compara as curvas originais e ignora o acerto final parcial.

Reduzir prazo preserva a curva original das prestações no SAC e na PRICE. A queda dos juros aumenta a amortização efetiva e antecipa a quitação. O detalhamento identifica o acerto final parcial, mostra ao lado sua prestação original e risca os meses seguintes eliminados pelo FGTS. Reduzir prestação mostra cada novo pagamento junto do valor original sem FGTS. Os avisos de ausência de TR, seguros, tarifas e custos de posse permanecem visíveis fora dos detalhes.

O motor corrigido fornece `differenceSchedule`, mas a tabela anual existente ainda apresenta somente SAC e PRICE. A interface informa esse limite de apresentação, sem indicar que falta um cálculo.

### Verificação dos cenários e dos novos atalhos

- `npm test`: 161 testes passaram. A memória da taxa cobre restauração, zero, vírgula, precisão, remoção, dados inválidos e armazenamento bloqueado. No navegador, 8,5% voltou após recarregar; apagar removeu a preferência, e uma falha simulada exibiu erro sem perder a taxa anterior. A quitação com investimento tem testes de igualdade, taxa zero, sobra investida, primeiro mês elegível, dois modos FGTS, conservação da dívida e dos recursos, ausência de cobranças e aportes posteriores, restauração ao desligar a opção e composição dos totais na interface. `npm run check`, `npm run build` e `git diff --check` passaram. Os testes novos cobrem os quatro cenários, taxa obrigatória, taxa zero, vírgula decimal, os dois modos de FGTS, aportes após diferenças positivas, interrupção dos aportes no cruzamento ou na quitação e rendimento até o horizonte original. O motor PRICE + diferença não foi alterado.
- No navegador, o atalho salvou as faixas dos quatro campos sem abrir Minha faixa nem salvar valores padrão. Foco pelo teclado recortou o imóvel de R$ 800 mil para a faixa de R$ 700 mil a R$ 900 mil, preservando seu valor. Falha de armazenamento simulada mostrou erro junto ao atalho e preservou a preferência anterior.
- O informativo da parcela mostrou mês 111, 9 anos e 3 meses, para as hipóteses iniciais. Os quatro painéis de cenário ficam visíveis ao mesmo tempo, com os mesmos indicadores do financiamento na mesma ordem. Trocar o modo FGTS, desligá-lo e trocar de ambiente preserva a rentabilidade digitada; taxas inválidas ocultaram o saldo calculado e zero mostrou aportes sem rendimento.
- Build de produção inspecionado em 320, 390 e 1280 px, sem overflow da página. Os indicadores usam uma coluna em 320 px e duas nas demais larguras; valores monetários de teste não quebraram. Console sem erros ou avisos.

### Verificação da unificação visual

- `npm run test:comparison`: doze testes de renderização, incluindo pagamento real do terceiro cenário, composição dos três valores nos cartões com FGTS ligado/desligado e nos dois modos, imóvel sem dívida, totais sem duplicar extras e correspondência entre os grupos de colunas anuais e seus valores. Usa Node com `registerHooks`, disponível a partir de 22.15, e TypeScript para carregar TSX nos testes. `FinancingComparison.fixture.ts` agora usa hipóteses fixas avaliadas pelos motores corrigidos.
- A suíte completa aprovou 112 testes; TypeScript, build de produção e verificação de whitespace passaram.
- Aplicativo integrado inspecionado no Chrome em 320, 390 e 1280 px, usando o build de produção. Sem overflow da página, inclusive com detalhes abertos; a tabela tem sua própria rolagem. Os indicadores dos três cartões ficam alinhados no desktop.
- Salvar/carregar estudo restaurou salário, crescimento e modo. Desligar FGTS zerou sua aplicação nas três estratégias sem mudar a prévia principal. Trocar para Investir e voltar preservou o controle desligado; religá-lo recuperou as configurações. Console sem erros ou avisos.
- Dependências existentes foram reutilizadas por uma junction local de `node_modules`; não houve validação de instalação limpa.

## Implementação

- `FinancingRangeControl.tsx` e `.css`: barra, alça, zonas de soltura, prévia e captura do ponteiro.
- `FinancingRangePreferences.tsx` e `.css`: painel Minha faixa, edição manual e comandos de salvamento/restauração.
- `financingRangePreferences.ts`: validação, leitura versionada e gravação explícita dos padrões de faixa por campo.
- `financingValuePreferences.ts`: valores originais, preferências individuais de valor e resolução dos valores iniciais da workspace.
- `FinancingValuePreference.tsx`: salvar/remover o valor padrão do campo e informar sucesso ou falha, junto aos controles de faixa.
- `financingRangeDrop.ts`: recorte, restauração de mínimo, duplicação do máximo e classificação do ponto de soltura.
- `financingGesture.ts`: configuração por unidade, normalização das faixas e controles da barra.
- `financingControls.ts`: regras financeiras, formato brasileiro e ticks.
- `FinancingPanel.tsx` e `FinancingPanel.css`: cartão de Entrada com selo de atalho para aplicar 20%, sem política automática visível.
- `FinancingWorkspace.tsx`: valores, faixas, estudos, FGTS e composição dos painéis.
- `FinancingComparison.tsx` e `.css`: controles FGTS, painel mesclado e referências SAC/PRICE.
- `AmortizationComparisonPanel.tsx`: premissas comuns, estratégias abertas e conclusão integrada, sem fórmulas financeiras.
- `FinancingCrossing.tsx`: texto do cruzamento compartilhado entre o informativo da parcela e os detalhes da comparação.
- `amortizationComparison.ts`: orçamento comum, amortização mensal ou acumulada no cruzamento, projeção posterior e comparação de posição financeira.
- `investmentRatePreference.ts`: memória local versionada da taxa anual de investimento.
- `fgtsPreferences.ts` e `FgtsSalaryField.tsx`: memória de salário/crescimento e controle visual de revelar/limpar.
- `simulationExport.ts` e `SimulationExportPanel.tsx`: exportação de premissas atuais e prévia com salário oculto.
- `financeVsInvestPreferences.ts`: leitura/gravação dos campos de Comparar, mantidos vivos na workspace.
- `FgtsComparison.tsx`: detalhes e evolução anual SAC/PRICE da projeção FGTS.
- `financingProjection.ts` e `loanPayments.ts`: prestações previstas, cronograma SAC/PRICE e cenário com amortizações extras. A regra de redução de prazo está documentada em `src/financingProjection.md`.

O menu bidimensional anterior, o seletor de protótipos e as variantes descartadas não fazem parte da interface principal.

## Fonte do protótipo

Branch local `prototype/financing-focus-drop`, commit `6da870282ace81076d9a5ea28363bd62dc10725d`.

Ela preserva as quatro variantes e o histórico de avaliação antes da promoção. A regra assimétrica das laterais está implementada na versão principal.

## Verificação

- 96 testes de controles, gestos, recorte, reset, preferências, projeções e FGTS; TypeScript e build de produção passaram.
- Navegador em 320, 390 e 1280 px, com os quatro campos sem overflow horizontal.
- Arrastes reais automatizados do Chrome confirmaram recorte, duplicação apenas do máximo e restauração apenas do mínimo, mantendo o imóvel em R$ 800 mil.
- Prévia não aplicou mudanças antes de soltar/confirmar. Cancelamento e limites de entrada, juros e prazo cobertos por testes.
- Recortes direcionais acima/abaixo do valor mantiveram o limite oposto; Resetar faixa restaurou os padrões sem alterar a simulação.
- Foco perto do puxador de R$ 800 mil mostrou e aplicou a faixa de R$ 700 mil a R$ 900 mil. Testes cobrem o raio de proximidade, prioridade nas extremidades e limites financeiros.
- Preferências testadas no navegador: persistência após recarregar, ausência de gravação por crop/expansão/digitação, edição inválida, reset ao padrão salvo e restauração do padrão do aplicativo.
- Falha de armazenamento simulada no navegador apresentou erro sem alterar a preferência. Os dados anteriores do navegador foram restaurados após a validação.
- Painel de preferências e formulário verificados em 320 e 390 px nos quatro campos, sem overflow horizontal.
- Console consultado sem erros ou avisos. O conforto dos gestos ainda precisa ser avaliado em aparelho físico.
