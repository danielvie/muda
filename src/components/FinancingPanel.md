# Financiamento mobile com zoom de ponto fixo

Promovido por escolha do usuário: rodada 6, variante 3.

## Comportamento aprovado

- Prestação e editor no mesmo painel. Imóvel, Entrada, Juros e Prazo são selecionados diretamente, sem Anterior/Próximo.
- Toggle de entrada mínima automática de 20%, preservando entradas maiores ao mudar o imóvel.
- Régua sem painel de fundo, área de arraste de 64 px, puxador de 44 px e botões de pelo menos 48 px.
- Ao soltar na borda da régua do imóvel, a faixa se expande. Não altera a escala durante o arraste.
- “Ajustar alcance” começa recolhido. O zoom fixa Mínimo, Imóvel ou Máximo. O crop recupera precisão perto do imóvel, sem mudar seu valor.
- Detalhes das parcelas, estudos salvos, comparação SAC/PRICE e FGTS continuam disponíveis abaixo do editor.

## Implementação

`FinancingPanel.tsx` contém a interface aprovada. `financingControls.ts` contém as regras de atualização, limites, zoom e recorte, testadas independentemente da UI. A workspace mantém valores, política de entrada e faixa ao trocar de ambiente. Estudos existentes continuam carregáveis; restaurá-los com a política ativa respeita o mínimo de entrada.

Campos numéricos guardam digitação incompleta localmente e confirmam ao sair ou tocar Enter. Isso evita reduzir o imóvel ou a entrada ao apagar temporariamente um campo. Barras e botões atualizam a prestação imediatamente.

A regra do mínimo arredonda 20% para cima ao real inteiro. Se a entrada preservada superar o valor do imóvel, o painel avisa que não há saldo a financiar. O toggle começa desligado e não é persistido. Os estudos continuam usando a chave de armazenamento existente.

## Integração com FGTS

Os modos de reduzir prazo e reduzir prestação de `origin/main` permanecem disponíveis no painel FGTS. O estado compartilhado aceita mudanças de modo, preserva a seleção ao editar a calculadora e a inclui nos estudos salvos. Estudos antigos sem modo de FGTS usam redução de prazo. A regra de entrada mínima continua aplicada ao restaurar estudos.

## Fonte do protótipo

Branch local `prototype/financing-ux-round-6`, commit `7124c6b06339ca021b83570277313a0c2fc8e030`.

Ela preserva as cinco alternativas, o seletor e o histórico de avaliação. A versão principal não importa o protótipo, não consulta `?variant=` e não exibe estado de depuração. Não houve push ou deploy nesta promoção.

## Verificação

- `pnpm test`: 20 testes de controles e FGTS. `pnpm run test:financing` executa os 19 testes de controles. Requer Node com suporte nativo a TypeScript, verificado no Node 24.
- `pnpm run check` e `pnpm run build`.
- Navegador em 320, 390 e 1280 px: sem overflow horizontal, controles de pelo menos 48 px, barra de 64 px.
- Rota padrão e antiga URL `?variant=3` mostram o painel promovido, sem seletor.
- Imóvel acima do antigo teto, confirmação numérica, mínimo automático, zoom com máximo fixo e crop exercitados no navegador.

Gestos em aparelho físico ainda precisam de avaliação.
