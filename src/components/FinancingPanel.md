# Financiamento com barra simples e alça Foco

Promovido por escolha do usuário: variante 2 do protótipo de recorte com alças auxiliares. A dinâmica das laterais foi ajustada na promoção.

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

1. Salvar faixa atual como padrão: copia os limites em uso, uma única vez.
2. Editar limites e Salvar: valida os dois valores e guarda o novo padrão.
3. Restaurar padrão do aplicativo: remove a personalização daquele campo, sem afetar os demais.

Salvar ou restaurar não altera a faixa em uso. Resetar faixa a aplica explicitamente. Digitar, perder foco, cancelar, fechar o painel, fazer crop ou expandir não grava preferências. Mudar de campo descarta a edição ainda não salva.

As preferências ficam em `localStorage`, na chave `muda.financing.rangePreferences.v1`. Somente campos personalizados são armazenados. A próxima sessão inicia com essas faixas; não há retomada automática da última simulação. Se o valor inicial estiver fora da preferência, a barra inclui o valor sem alterar a configuração salva. O painel explica os limites que serão aplicados.

A interface informa que o salvamento é local a este navegador. Não há sincronização entre aparelhos. Falha ao gravar mantém a preferência anterior e apresenta um erro; dados corrompidos são ignorados na leitura, sem gravação automática.

## Campos e acessibilidade

- Imóvel e entrada: passos de R$ 1.000; juros: 0,1 ponto percentual; prazo: um ano.
- Valores em formato brasileiro, com digitação incompleta mantida local até Enter ou perda de foco.
- Barra com área de toque de 64 px; alça com altura mínima de 56 px. A barra permite rolagem vertical; somente a alça captura o gesto.
- No teclado, a barra aceita setas, PageUp/PageDown e Home/End. Na alça, esquerda/direita escolhem o ponto; − restaura mínimo; + prepara máximo em dobro; Enter aplica; Escape cancela.
- Soltar ou perder captura encerra o gesto. Mudar de campo ou alterar a simulação cancela qualquer prévia anterior.

O seletor SAC/PRICE e Salvar estudo ficam junto à prestação. O mínimo automático de 20%, estudos existentes e os dois modos de FGTS são preservados. As faixas temporárias ficam em memória; apenas comandos explícitos persistem padrões. Os estudos usam a chave de armazenamento existente.

## Comparação unificada

Aprovada a unificação visual de SAC vs PRICE e Amortização com FGTS, sem alterar os motores financeiros. O painel principal e os controles de faixa permanecem como estavam.

- Um único controle Considerar FGTS afeta a comparação. Desligá-lo oculta os campos e os detalhes FGTS, sem apagar salário, crescimento ou modo. O controle fica na workspace e mantém seu estado ao trocar de ambiente; não adiciona persistência nem muda o formato dos estudos.
- Reduzir prazo, Reduzir prestação, salário e crescimento ficam antes dos resultados, sem menu intermediário.
- SAC, PRICE e PRICE + diferença têm o mesmo destaque e os mesmos indicadores, na mesma ordem: desembolso mensal inicial, quitação, juros totais e FGTS aplicado. O desembolso de PRICE + diferença inclui a amortização extra, não apenas a prestação.
- Os cartões ficam empilhados abaixo de 700 px e lado a lado nas larguras maiores. Os valores monetários não são arredondados para milhares na comparação.
- Detalhes da comparação e evolução anual começam recolhidos. O cruzamento das prestações fica junto à explicação das amortizações extras.
- Os detalhes preservam os totais de PRICE + diferença e, na projeção FGTS, a entrada, soma das prestações, FGTS aplicado, total com entrada e FGTS, prestação após o primeiro uso, quantidade de usos e FGTS não utilizado.

### Integração com o cálculo corrigido

O layout usa a correção financeira de `9814da4`, documentada em `src/financingProjection.md`. Os três cartões consomem `calculateSacPriceScenario`; os detalhes FGTS e sua tabela anual consomem `buildFgtsComparison`. Ambos usam taxa efetiva anual e têm paridade coberta pelos testes. O aviso antigo sobre taxas divergentes foi removido.

O desembolso inicial de PRICE + diferença vem de `differenceSchedule[0].payment`. Seu total do bolso já inclui extras em dinheiro; a composição com FGTS soma apenas `fgtsAmortization`, e a composição com entrada soma também `state.entry`. Os rótulos distinguem esses totais. O indicador SAC ≤ PRICE considera prestações reais e não promete empate permanente.

Reduzir prazo mantém a quota de principal no SAC e o encargo na PRICE. Os avisos de ausência de TR, seguros, tarifas e custos de posse permanecem visíveis fora dos detalhes. Hipóteses e limites do FGTS ficam explicados nos detalhes, sem tratar o primeiro uso no mês 24 como carência obrigatória.

O motor corrigido fornece `differenceSchedule`, mas a tabela anual existente ainda apresenta somente SAC e PRICE. A interface informa esse limite de apresentação, sem indicar que falta um cálculo.

### Verificação da unificação visual

- `npm run test:comparison`: nove testes de renderização, incluindo pagamento real do terceiro cenário e totais sem duplicar extras. Usa Node com `registerHooks`, disponível a partir de 22.15, e TypeScript para carregar TSX nos testes. `FinancingComparison.fixture.ts` agora usa hipóteses fixas avaliadas pelos motores corrigidos.
- A suíte completa aprovou 109 testes; TypeScript, build de produção e verificação de whitespace passaram.
- Aplicativo integrado inspecionado no Chrome em 320, 390 e 1280 px, usando o build de produção. Sem overflow da página, inclusive com detalhes abertos; a tabela tem sua própria rolagem. Os indicadores dos três cartões ficam alinhados no desktop.
- Salvar/carregar estudo restaurou salário, crescimento e modo. Desligar FGTS zerou sua aplicação nas três estratégias sem mudar a prévia principal. Trocar para Investir e voltar preservou o controle desligado; religá-lo recuperou as configurações. Console sem erros ou avisos.
- Dependências existentes foram reutilizadas por uma junction local de `node_modules`; não houve validação de instalação limpa.

## Implementação

- `FinancingRangeControl.tsx` e `.css`: barra, alça, zonas de soltura, prévia e captura do ponteiro.
- `FinancingRangePreferences.tsx` e `.css`: painel Minha faixa, edição manual e comandos de salvamento/restauração.
- `financingRangePreferences.ts`: validação, leitura versionada e gravação explícita dos padrões por campo.
- `financingRangeDrop.ts`: recorte, restauração de mínimo, duplicação do máximo e classificação do ponto de soltura.
- `financingGesture.ts`: configuração por unidade, normalização das faixas e controles da barra.
- `financingControls.ts`: regras financeiras, formato brasileiro e ticks.
- `FinancingWorkspace.tsx`: valores, faixas, estudos, ativação compartilhada de FGTS e composição dos painéis.
- `FinancingComparison.tsx` e `.css`: controles FGTS e cartões das três estratégias, sem fórmulas financeiras novas.
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
