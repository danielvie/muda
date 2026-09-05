# Financiamento com barra simples e alça Foco

Promovido por escolha do usuário: variante 2 do protótipo de recorte com alças auxiliares. A dinâmica das laterais foi ajustada na promoção.

## Comportamento aprovado

A barra simples altera o valor dentro da faixa atual. A alça Foco altera somente a faixa, com prévia durante o arraste e aplicação ao soltar:

- Sobre a barra: recorta perto do ponto escolhido, tentando usar um quarto da largura atual. O recorte sempre inclui o valor da simulação e respeita a largura mínima.
- Fora à esquerda: restaura o mínimo para zero, mantendo o máximo. Quando o campo exige um mínimo maior, como a entrada automática de 20% ou o prazo de um ano, usa esse mínimo permitido.
- Fora à direita: dobra o limite máximo, mantendo o mínimo. Limites financeiros podem impedir a duplicação completa.
- Fora da barra e sem extrapolar as laterais: cancela sem mudar a faixa.

Exemplo: faixa de R$ 750 mil a R$ 1,25 milhão. Puxar à direita resulta em R$ 750 mil a R$ 2,5 milhões. Puxar à esquerda depois resulta em R$ 0 a R$ 2,5 milhões. O imóvel não muda.

O gesto sempre calcula a prévia a partir da faixa inicial. Movimentos repetidos antes de soltar não duplicam o máximo várias vezes. É preciso deslocar pelo menos 8 px; um toque na alça não altera valores.

## Campos e acessibilidade

- Imóvel e entrada: passos de R$ 1.000; juros: 0,1 ponto percentual; prazo: um ano.
- Valores em formato brasileiro, com digitação incompleta mantida local até Enter ou perda de foco.
- Barra com área de toque de 64 px; alça com altura mínima de 56 px. A barra permite rolagem vertical; somente a alça captura o gesto.
- No teclado, a barra aceita setas, PageUp/PageDown e Home/End. Na alça, esquerda/direita escolhem o ponto; − restaura mínimo; + prepara máximo em dobro; Enter aplica; Escape cancela.
- Soltar ou perder captura encerra o gesto. Mudar de campo ou alterar a simulação cancela qualquer prévia anterior.

O seletor SAC/PRICE e Salvar estudo ficam junto à prestação. O mínimo automático de 20%, estudos existentes e os dois modos de FGTS são preservados. As faixas ficam em memória; os estudos usam a chave de armazenamento existente.

## Implementação

- `FinancingRangeControl.tsx` e `.css`: barra, alça, zonas de soltura, prévia e captura do ponteiro.
- `financingRangeDrop.ts`: recorte, restauração de mínimo, duplicação do máximo e classificação do ponto de soltura.
- `financingGesture.ts`: configuração por unidade, normalização das faixas e controles da barra.
- `financingControls.ts`: regras financeiras, formato brasileiro e ticks.
- `FinancingWorkspace.tsx`: valores, faixas, estudos e projeções.

O menu bidimensional anterior, o seletor de protótipos e as variantes descartadas não fazem parte da interface principal.

## Fonte do protótipo

Branch local `prototype/financing-focus-drop`, commit `6da870282ace81076d9a5ea28363bd62dc10725d`.

Ela preserva as quatro variantes e o histórico de avaliação antes da promoção. A regra assimétrica das laterais está implementada na versão principal.

## Verificação

- 58 testes de controles, gestos, recorte e FGTS; TypeScript e build de produção passaram.
- Navegador em 320, 390 e 1280 px, com os quatro campos sem overflow horizontal.
- Arrastes reais automatizados do Chrome confirmaram recorte, duplicação apenas do máximo e restauração apenas do mínimo, mantendo o imóvel em R$ 800 mil.
- Prévia não aplicou mudanças antes de soltar/confirmar. Cancelamento e limites de entrada, juros e prazo cobertos por testes.
- Console consultado sem erros ou avisos. O conforto dos gestos ainda precisa ser avaliado em aparelho físico.
