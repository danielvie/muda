# Financiamento com barra simples e gesto opcional

O gesto de bandas estáveis, promovido da variante 5, continua disponível nos quatro campos. Para evitar toques acidentais, a interface começa com uma barra horizontal simples. O menu de gesto fica recolhido em "Ajustar alcance e precisão".

## Comportamento aprovado

- Imóvel e entrada: passos de R$ 1.000. Juros: 0,1 ponto percentual. Prazo: um ano, convertido para meses no estado financeiro.
- A barra simples usa os limites inicial e final da faixa atual. As setas movem um tick; PageUp/PageDown movem dez; Home/End alcançam os limites. A barra não expande ao chegar na borda.
- Ao expandir o menu, horizontal diminui ou aumenta o valor. Vertical muda a escala dos próximos trechos horizontais, sem recalcular os anteriores.
- Escalas de 0,25×, 0,5×, 1×, 2× e 4×. Centros separados por 48 px, com margem de 8 px além da divisória para evitar trocas involuntárias.
- Uma linha horizontal discreta marca a altura inicial de 1×. Permanece fixa durante o gesto e desaparece ao encerrar.
- O ponteiro é capturado; o arraste continua fora da área. Soltar, cancelar, perder foco ou mudar de campo encerra a interação, mantendo os ajustes já aplicados.
- Cada campo mantém sua faixa ao alternar entre campos e ambientes. Crop recorta perto do valor sem mudar a simulação.
- O menu começa fechado e volta fechado ao mudar de campo. Ao fechar, o componente de gesto é desmontado; não sobra uma área sensível escondida. A faixa ajustada permanece na barra simples.
- No gesto expandido, esquerda/direita ajustam valor, cima/baixo mudam escala e Enter/Espaço/Escape encerram. O campo numérico continua disponível.

## Regras financeiras preservadas

O mínimo automático de 20% mantém a entrada atual ou a eleva quando necessário. O atalho de 20% continua disponível. Entradas automáticas que não são múltiplos de R$ 1.000 não mudam ao focar/sair do campo ou fazer um gesto puramente vertical.

Juros ficam entre 0% e 20% a.a.; prazo entre 1 e 40 anos. A entrada respeita seu mínimo e o limite disponível. Intervalos sem um tick válido desabilitam o gesto, mantendo a edição direta. Juros, prestações e projeções não são arredondados para ticks monetários.

Os números usam formato brasileiro. Digitação incompleta fica local até Enter ou perda de foco. Ao iniciar um gesto depois de digitar, o campo é confirmado antes de capturar o valor inicial.

O botão Salvar estudo permanece junto à prestação. Estudos antigos, FGTS com redução de prazo/prestação, SAC/PRICE e os demais ambientes são preservados. Valores de gesto ficam em memória; a persistência de estudos mantém a chave existente.

## Implementação

- `FinancingRangeControl.tsx` e `.css`: barra simples, limites visíveis e expansão explícita do menu.
- `FinancingGestureControl.tsx` e `.css`: área de interação, captura do ponteiro, bandas, linha 1× e acessibilidade por teclado.
- `financingGesture.ts`: configuração por unidade, faixas independentes, histerese e integração incremental de movimento.
- `financingControls.ts`: política financeira, parsing/formatação e snapping.
- `FinancingWorkspace.tsx`: valores e faixas compartilhados, estudos e projeções.

A normalização das faixas decimais usa tolerância numérica para evitar que representações como `9.2 / 0.1` ampliem os limites a cada renderização.

## Fonte do protótipo

Branch local `prototype/financing-stable-bands`, commit `1e1082d134502cf1e3cfa374889691281038b966`.

Ela preserva as cinco variantes e o histórico de avaliação. Os arquivos descartáveis foram removidos da versão principal. Não houve push ou deploy nesta promoção.

## Verificação

- 47 testes de controles, barra simples, gestos e FGTS. `test` inclui as três suítes; `test:financing` executa controles e gestos.
- TypeScript e build de produção.
- Quatro campos exercitados no navegador com faixas de 320, 390 e 1280 px; sem overflow horizontal e com área de gesto de 240 px.
- Sequências horizontais/verticais verificaram escala, unidade, linha fixa e remoção da linha ao terminar.
- Barra e menu foram verificados nos quatro campos: estado inicial fechado, passo correto, preservação do valor durante zoom e remoção da área de gesto ao fechar.
- Crop preservou o valor dos quatro campos. Faixas foram preservadas ao trocar de campo, incluindo juros com decimais.
- Um arraste real automatizado do Chrome confirmou a digitação pendente de R$ 1,5 milhão antes de começar; o movimento vertical ampliou só a faixa e liberou a captura ao soltar.
- Console consultado sem erros ou avisos. Falta avaliação dos gestos em aparelho físico.
