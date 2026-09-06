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

## Implementação

- `FinancingRangeControl.tsx` e `.css`: barra, alça, zonas de soltura, prévia e captura do ponteiro.
- `FinancingRangePreferences.tsx` e `.css`: painel Minha faixa, edição manual e comandos de salvamento/restauração.
- `financingRangePreferences.ts`: validação, leitura versionada e gravação explícita dos padrões por campo.
- `financingRangeDrop.ts`: recorte, restauração de mínimo, duplicação do máximo e classificação do ponto de soltura.
- `financingGesture.ts`: configuração por unidade, normalização das faixas e controles da barra.
- `financingControls.ts`: regras financeiras, formato brasileiro e ticks.
- `FinancingWorkspace.tsx`: valores, faixas, estudos e composição dos painéis.
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
