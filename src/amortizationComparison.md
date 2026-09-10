# Amortizar agora ou investir até o cruzamento

## Objetivo

Comparar duas destinações do mesmo orçamento no mesmo mês: amortizar mensalmente ou investir e amortizar o acumulado depois. Desembolso igual não é empate financeiro se a dívida, o investimento ou o FGTS remanescente forem diferentes.

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

## Conclusão financeira

Na data comum, a posição comparada é `saldo investido + FGTS remanescente − saldo devedor`. O imóvel tem o mesmo valor e o orçamento desembolsado é igual nas duas estratégias. O FGTS remanescente conta como patrimônio, mas não como dinheiro livre para resgate imediato.

O painel mostra desembolso até a data, dívida após amortizações, saldo investido, falta para quitar usando esse saldo e FGTS utilizado e remanescente. A conclusão fica no mesmo painel que as duas estratégias abertas. Quitação prevista, desembolso até quitar e saldo investido na quitação são informações complementares recolhidas, não o critério de vitória.

A ordem dos painéis é SAC, PRICE e, ao final, o painel mesclado de amortizar ou investir. SAC e PRICE permanecem como referências separadas, abertas e empilhadas. Sua tabela anual não representa as duas estratégias novas. Saíram o resumo independente, o checkbox de quitação por cobertura e o indicador de rendimento sozinho cobrindo a dívida.

## Memória e exportação

- A taxa mantém a chave `muda.financing.investmentRate.v1`. Salvar um valor válido preserva a precisão; vazio remove a preferência; erro não substitui o valor anterior.
- Salário e crescimento anual ficam em `muda.financing.fgtsPreferences.v1`. O salário restaurado inicia oculto e somente leitura, com ícones de Revelar/Ocultar e Limpar salário dentro do campo. O X fica antes do olho; ambos mantêm nomes acessíveis e dicas ao passar o ponteiro, sem botões de texto abaixo do input. Limpar remove salário atual e preferência, preservando crescimento. Falha ao limpar mantém o salário e apresenta erro. Carregar estudo com salário também o oculta, sem regravar a preferência.
- A ocultação é visual, não criptografia. A estimativa mensal de FGTS é ocultada junto com o salário; resultados financeiros continuam visíveis. Estudos já salvos não são apagados por Limpar salário.
- Copiar exporta somente as premissas atuais de Financiar, Investir e Comparar. Inclui FGTS e taxa de investimento, sem resultados, datas derivadas, preferências de interface ou histórico. Não exporta o checkbox removido.
- A prévia da exportação mascara o salário quando oculto, mas o botão Copiar inclui o valor real, com aviso explícito. O fallback de cópia também usa o texto completo, não a prévia mascarada.
- Os campos de Comparar ficam na workspace para exportar o estado atual mesmo se o armazenamento falhar. Importar Financiamento usa o financiamento atual, não valores antigos de outro componente.

## Implementação e testes

`amortizationComparison.ts` calcula orçamento, cronogramas e resultado; `AmortizationComparisonPanel.tsx` apenas apresenta os dados. `FinancingComparison.tsx` reúne FGTS, o painel mesclado e as referências. As projeções originais de SAC e PRICE não são mutadas.

Os testes cobrem orçamento e data comuns, dois modos FGTS, igualdade de taxas, investimento mais ou menos rentável, taxa zero, ausência de dívida, amortização parcial, sobra após resgate, quitação antecipada por FGTS e conservação de principal, caixa, investimento e FGTS em todos os meses. Também verificam memória, privacidade visual, exportação de entradas e a organização do painel.

Na entrega do painel mesclado, a suíte aprovou 164 testes; TypeScript, build e verificação de whitespace passaram. A tentativa de inspeção visual pelo Chrome MCP foi bloqueada pelo perfil de navegador já em uso. A renderização responsiva dessa versão ainda requer conferência visual no navegador.
