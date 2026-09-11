# PRICE+

## Objetivo

Responder quanto do apartamento é pago do bolso e com FGTS, qual o total dessas duas fontes e quanto tempo leva para quitar. Rendimentos usados e o total pago incluindo rendimentos ficam nos detalhes. O resumo apresenta projeções até a quitação de cada estratégia, incluindo a entrada, não um histórico de pagamentos reais.

As estratégias continuam sendo amortizar mensalmente ou investir a sobra e amortizar o acumulado no cruzamento. A comparação patrimonial na mesma data permanece nos detalhes. Desembolso igual não é empate financeiro se a dívida, o investimento ou o FGTS remanescente forem diferentes.

## Data e orçamento comuns

- Ambos começam com o mesmo financiamento PRICE e a mesma entrada.
- A data comum é o primeiro mês em que PRICE ≥ SAC nas curvas originais sem FGTS ou extras. Não depende da estratégia, da taxa de investimento nem do método selecionado no cartão principal.
- O orçamento mensal é `max(prestação SAC original, prestação PRICE original)`. A sobra após a prestação própria é usada conforme a estratégia. Com FGTS no modo reduzir prestação, os encargos próprios podem divergir, mas o orçamento permanece igual.
- Até a data comum, todo esse orçamento vai para dívida ou investimento. Se uma estratégia quitar antes, a verba liberada fica investida até a data comum. Isso evita declarar uma vantagem por ter aplicado menos dinheiro.
- Sem dívida ou sem cruzamento, o motor informa esse estado. Não inventa data de resgate.

## Estratégias

### Amortizar todo mês

Paga a prestação própria e destina a sobra do orçamento à amortização extraordinária, limitada à dívida. Se não houver mais dívida antes da data comum, a sobra vai para investimento.

### Investir até o cruzamento e amortizar

Paga a prestação própria e investe a sobra. No cruzamento, usa o saldo acumulado para amortizar, limitado à dívida. O investimento pode cobrir a dívida antes desse mês, mas isso não dispara resgate antecipado. Se faltar dinheiro no cruzamento, ocorre amortização parcial; se sobrar, a sobra permanece investida.

### Depois do cruzamento

Ambas pagam a prestação e destinam a sobra do mesmo orçamento à amortização mensal. Não há novos aportes nem novos resgates. O saldo já investido continua rendendo. As despesas do bolso param quando a dívida termina; FGTS continua acumulando no fundo.

Todos os extras e o resgate reduzem prazo. Somente FGTS no modo reduzir prestação recalcula o encargo próprio. No mês que reúne FGTS e resgate, o recálculo do FGTS ocorre antes do resgate; a amortização acumulada não recalcula a prestação novamente.

## Ordem mensal

1. Rendimento sobre o saldo investido anterior e depósito mensal do FGTS.
2. Prestação PRICE, seguida do extra em dinheiro ou do aporte de fim de mês.
3. FGTS, quando elegível pelo intervalo simulado, limitado à dívida restante.
4. Resgate único no cruzamento, limitado à dívida depois do FGTS.
5. Registro dos saldos e da eventual quitação.

O retorno informado é efetivo anual líquido, entre 0% e 100%, convertido para taxa mensal equivalente. Não há tributação adicional, TR, seguros, tarifas, rendimento do FGTS ou garantia da rentabilidade futura.

## Totais até quitar

O resumo `payoff` é registrado uma única vez, no primeiro mês de dívida zerada. Os campos posteriores do cronograma não alteram esse resumo. Sem quitação, o resumo fica nulo; sem dívida inicial, a interface informa que não há dívida, sem inventar um financiamento.

- Do bolso aplicado no apartamento = entrada + prestações + extras em dinheiro + principal dos aportes usado no resgate.
- FGTS utilizado = somente o fundo aplicado à dívida até quitar.
- Rendimentos usados no pagamento = somente a parte dos rendimentos resgatada para amortizar a dívida.
- Total do bolso + FGTS = do bolso aplicado + FGTS utilizado. É o total principal e a base da diferença de recursos entre as estratégias, sem rendimentos nem sobras investidas.
- Total pago incluindo rendimentos, nos detalhes = do bolso aplicado + FGTS utilizado + rendimentos usados. Também equivale a entrada + prestações + extras + FGTS + resgate, ou valor do imóvel + juros totais no modelo atual.
- Desembolso do bolso, nos detalhes = entrada + prestações + extras + todos os aportes até quitar. Não soma o resgate novamente.
- Sobra investida ao quitar = principal dos aportes remanescente + rendimentos remanescentes. Fica fora do total pago e não inclui crescimento posterior à quitação.

Um resgate parcial é atribuído proporcionalmente ao principal dos aportes e aos rendimentos presentes no saldo imediatamente antes do resgate. A simulação não presume que um deles sai primeiro. Isso é uma regra de atribuição, não uma regra tributária. Exemplo: um saldo com R$ 100 em aportes e R$ 20 em rendimentos, ao resgatar R$ 60, aplica R$ 50 do bolso e R$ 10 de rendimentos; os R$ 60 restantes não entram no gasto.

Tempo para quitar usa o mês da quitação. A antecipação compara esse mês ao prazo original contratado. Valores são nominais em datas possivelmente diferentes, sem desconto de inflação. As diferenças de total do bolso + FGTS e prazo não elegem um vencedor patrimonial.

Taxa ausente ou inválida mantém o resumo de amortizar todo mês disponível, pois esse resultado independe da rentabilidade. O estado `needs-rate` não expõe resultado de investimento nem conclusão na data comum. Zero é uma taxa válida, não um substituto apresentado para taxa ausente.

## Conclusão financeira

Na data comum, a posição comparada é `saldo investido + FGTS remanescente − saldo devedor`. O imóvel tem o mesmo valor e o orçamento desembolsado é igual nas duas estratégias. O FGTS remanescente conta como patrimônio, mas não como dinheiro livre para resgate imediato.

O PRICE+ mostra primeiro as duas estratégias abertas, com os indicadores nesta ordem: saiu do seu bolso, FGTS utilizado, total do bolso + FGTS e tempo para quitar. A sobra investida aparece separadamente quando existir. As estratégias ficam lado a lado quando o painel tem espaço, empilhadas em telas estreitas. Abaixo ficam as diferenças de total do bolso + FGTS e prazo, orçamento inicial, estado do FGTS e taxa de investimento editável. O aviso de custos excluídos permanece visível.

Entender os valores reúne a composição dos totais, os rendimentos usados e o total pago incluindo rendimentos, recolhidos inicialmente. Comparação no mês da amortização reúne o cruzamento, desembolso bruto na data, dívida, investimentos, FGTS e a conclusão patrimonial, também recolhida. Regras das estratégias preserva as hipóteses de orçamento e a ordem dos eventos.

A ordem dos painéis é SAC, PRICE e, ao final, PRICE+. SAC e PRICE permanecem como referências separadas, abertas e empilhadas. Sua tabela anual não representa as duas estratégias do PRICE+.

## Memória e exportação

- A taxa mantém a chave `muda.financing.investmentRate.v1`. Salvar um valor válido preserva a precisão; vazio remove a preferência; erro não substitui o valor anterior.
- Salário e crescimento anual ficam em `muda.financing.fgtsPreferences.v1`. O salário restaurado inicia oculto e somente leitura, com ícones de Revelar/Ocultar e Limpar salário dentro do campo. O X fica antes do olho; ambos mantêm nomes acessíveis e dicas ao passar o ponteiro, sem botões de texto abaixo do input. Limpar remove salário atual e preferência, preservando crescimento. Falha ao limpar mantém o salário e apresenta erro. Carregar estudo com salário também o oculta, sem regravar a preferência.
- A ocultação é visual, não criptografia. A estimativa mensal de FGTS é ocultada junto com o salário; resultados financeiros continuam visíveis. Estudos já salvos não são apagados por Limpar salário.
- Copiar exporta somente as premissas atuais de Financiar, Investir e Comparar. Inclui FGTS e taxa de investimento, sem resultados, datas derivadas, preferências de interface ou histórico. Não exporta o checkbox removido.
- A prévia da exportação mascara o salário quando oculto, mas o botão Copiar inclui o valor real, com aviso explícito. O fallback de cópia também usa o texto completo, não a prévia mascarada.
- Os campos de Comparar ficam na workspace para exportar o estado atual mesmo se o armazenamento falhar. Importar Financiamento usa o financiamento atual, não valores antigos de outro componente.

## Implementação e testes

`amortizationComparison.ts` calcula orçamento, cronogramas e resultado; `AmortizationComparisonPanel.tsx` apenas apresenta os dados. `FinancingComparison.tsx` reúne FGTS, o painel mesclado e as referências. As projeções originais de SAC e PRICE não são mutadas.

Os testes cobrem orçamento e data comuns, dois modos FGTS, igualdade de taxas, investimento mais ou menos rentável, taxa zero, ausência de dívida, amortização parcial, sobra após resgate, quitação antecipada por FGTS e conservação de principal, caixa, investimento e FGTS em todos os meses. O resumo PRICE+ tem verificações de composição das fontes, entrada única, resgate proporcional, aportes não duplicados, sobra excluída e congelamento dos totais na quitação. Também há cobertura de taxa ausente sem bloquear amortização mensal, ausência de quitação e hierarquia de resultados visíveis antes da taxa e dos detalhes. Também verificam memória, privacidade visual, exportação de entradas e a organização do painel.

A suíte aprova 173 testes, incluindo o caso de imóvel de R$ 800 mil, entrada de R$ 120 mil, dívida a 10% e investimento a 14%, com FGTS de salário de R$ 30 mil e crescimento de 3%. Nesse caso, os destaques são R$ 1.198.582,91 e R$ 1.157.165,42; os R$ 1.261.254,71 incluindo rendimentos aparecem apenas nos detalhes. O teste também confere a diferença de R$ 41.417,49 no resumo. Na validação do PRICE+, TypeScript, build e verificação de whitespace passaram. A inspeção no Chrome conferiu larguras de 320, 390, 768 e 1440 px, sem transbordamento horizontal do painel, inclusive com os detalhes abertos. Conferiu também taxa zero, inválida, apagada pelo teclado, sobra investida com retorno alto, restauração de taxa com vírgula após recarregar e troca do modo de FGTS. Não houve erros ou avisos no console.
