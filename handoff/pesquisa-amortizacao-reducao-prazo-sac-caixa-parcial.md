# Evidências técnicas — SAC após amortização extraordinária

**Escopo.** Pesquisa encerrada em 7 de setembro de 2026. O exemplo abaixo é uma conta financeira auditável, deliberadamente sem TR/IPCA, seguros, tarifa, dias corridos ou arredondamento intermediário. Esses componentes existem em contratos habitacionais reais e podem mudar o boleto. “Prestação” no exemplo significa apenas amortização + juros; não é o encargo mensal completo.

## Conclusão curta

A hipótese é matematicamente possível **se “preservar a prestação” significar manter o mesmo valor total em todos os vencimentos seguintes**. Nesse caso, depois do abatimento, os juros caem e a amortização do principal sobe; o saldo zera antes e os meses finais são eliminados. Mas essa trajetória deixa de ser SAC: em SAC a amortização do principal é constante e a prestação cai.

Há duas regras distintas:

1. **Preservar a quota SAC de amortização** (`A`): conserva-se a amortização constante original. O prazo cai e a prestação cai imediatamente porque os juros passam a incidir sobre saldo menor.
2. **Preservar a prestação corrente para sempre** (`P`): conserva-se o total mensal. A amortização vira crescente (`P − juros`), portanto é uma anuidade de prestação fixa (mecânica semelhante à PRICE), não SAC. “Manter a prestação no próximo vencimento” sozinho não prova que ela ficará fixa para sempre.

As fontes CAIXA provam que a instituição oferece SAC, simulação/boleto de amortização e opções de reduzir prazo ou prestação, mas **não encontrei nelas uma regra pública que prove que, em todo contrato SAC após amortização própria, a CAIXA congela a prestação corrente para todos os meses**. Isso deve ser confirmado no contrato, no demonstrativo da simulação e no atendimento da operação.

## Matemática

Se `B0` é o principal, `n` o número de períodos e `i` a taxa efetiva por período:

### SAC puro

\[
 A=\frac{B_0}{n};\qquad J_j=iB_{j-1};\qquad P_j=A+J_j;
\]
\[
 B_j=B_{j-1}-A=B_0-jA.
\]

Após `k` pagamentos, uma amortização extraordinária `E` aplicada integralmente ao principal, na mesma data de avaliação, produz:

\[
 B^*=B_k-E.
\]

Se a quota de amortização original `A` for preservada:

\[
 m_{SAC}=B^*/A,
\quad P_j=A+i[B^*-(j-1)A].
\]

Assim, o primeiro juro novo cai em `iE`; a amortização não sobe, pois continua sendo `A`. Se `B*/A` não for inteiro, há uma última quota parcial (e a prática pode arredondar).

A CAIXA descreve esse conceito na cartilha: **“o valor mensal da parcela de amortização é constante [...]”** e, na versão consultada, diz que ela é recalculada dividindo o saldo pelo prazo restante na data de aniversário do contrato. Isso é importante: um recálculo anual/por aniversário não deve ser confundido com uma promessa de manter a prestação corrente fixa até o fim.

### Prestação total fixa após o abatimento

Se a regra contratual for `P_j=P` em todos os vencimentos, o saldo obedece a:

\[
 B_j=(1+i)B_{j-1}-P,
\qquad A_j=P-iB_{j-1}.
\]

Logo, a amortização cresce: `A_{j+1}=(1+i)A_j`. O número fracionário de pagamentos é obtido por:

\[
 B^*=P\frac{1-(1+i)^{-m}}{i},
\qquad
 m=-\frac{\ln(1-iB^*/P)}{\ln(1+i)}.
\]

O último pagamento é parcial quando `m` não é inteiro. Essa fórmula é útil para auditar a alegação “mantém a prestação e reduz prazo”, mas descreve uma série de pagamentos fixos, não o SAC puro.

## Exemplo numérico verificável

Hipóteses: `B0=R$120.000`, `n=120`, `i=1% a.m.`, sem correção/encargos. Logo `A=120.000/120=R$1.000`.

Após 24 pagamentos SAC:

- `B24=120.000−24×1.000=R$96.000`;
- juros da 25ª prestação: `0,01×96.000=R$960`;
- prestação corrente (amortização + juros): `P25=1.000+960=R$1.960`.

Faça `E=R$20.000` após o 24º pagamento: `B*=96.000−20.000=R$76.000`. O juro do próximo mês passa a R$760, queda de R$200 (= `iE`).

| regra após E | 1º mês | meses/último pagamento | efeito sobre principal |
|---|---:|---:|---|
| SAC, quota `A=R$1.000` preservada | `P1=1.000+760=R$1.760` | 76 meses; último `R$1.010` | `R$1.000` em cada mês |
| total `P=R$1.960` fixo | `J1=760`, `A1=1.200`, `P1=1.960` | 49 parcelas de R$1.960 + 50ª de **R$604,18** | cresce: R$1.200, R$1.212, ... |

Verificação da primeira linha: `m=76.000/1.000=76`; a última prestação é `1.000+0,01×1.000=R$1.010`. A soma dos juros futuros é

`0,01×(76.000+75.000+...+1.000)=R$29.260`, total futuro `R$105.260`.

Verificação da segunda: `m=−ln(1−0,01×76.000/1.960)/ln(1,01)=49,3072`. Após 49 pagamentos, o saldo é aproximadamente R$598,20; com o juro de R$5,98, a quitação no 50º é R$604,18. Total futuro aproximado: `49×1.960+604,18=R$96.644,18`; juros aproximados: R$20.644,18.

Sem o pagamento extraordinário, a referência SAC seria 96 meses restantes e juros `0,01×(96.000+...+1.000)=R$46.560`. Portanto, no modelo: a quota SAC reduz prazo de 96 para 76 e a prestação inicial para R$1.760; a prestação fixa reduz para 50 pagamentos e conserva R$1.960, mas não é SAC.

Uma planilha pode reproduzir a segunda linha iniciando `B=76000` e repetindo: `J=0,01*B; A=1960-J; P=J+A; B=B-A`, limitando `A` ao saldo no último mês. Para a primeira, use `A=1000` em todas as linhas.

## Evidência primária de instituições e o que ela demonstra

### CAIXA — fonte institucional

- **CAIXA Econômica Federal, _Cartilha do crédito imobiliário_, seção “Sistemas de amortização”, p. 5 (arquivo capturado em 2016).** Citação curta: **“o valor mensal da parcela de amortização é constante pelo período de doze meses, sendo recalculada (divisão do saldo devedor pelo prazo restante do financiamento) sempre na data do aniversário do contrato”**. A mesma seção distingue juros recalculados mensalmente e TP/PRICE com prestações iguais. URL original: [Cartilha_Credito_Imobiliario.pdf](http://www.caixa.gov.br/Downloads/habitacao-documentos-gerais/Cartilha_Credito_Imobiliario.pdf). Cópia auditável consultada: [Wayback, captura 2016-11-23](https://web.archive.org/web/20161123045402id_/http://www.caixa.gov.br/Downloads/habitacao-documentos-gerais/Cartilha_Credito_Imobiliario.pdf). **Limitação:** material antigo e geral; não é uma regra atual específica para amortização extraordinária.
- **CAIXA, _Financiamento Imobiliário — Passos, Indexadores e Sistemas de Amortização_, versão 6.0, jul. 2022, pp. 5–6 e 14–15.** Citações: **“Amortização é o processo de redução de uma dívida”**; no SAC, a parcela de amortização é constante e os juros decrescentes; a CAIXA informa que oferece SAC ou SFA/TP (PRICE). URL original: [passos-indexadores-amortizacao.pdf](https://www.caixa.gov.br/Downloads/habitacao-documentos-gerais/passos-indexadores-amortizacao.pdf). Cópia auditável: [Wayback, captura usada](https://web.archive.org/web/20230714154348id_/https://www.caixa.gov.br/Downloads/habitacao-documentos-gerais/passos-indexadores-amortizacao.pdf). **Limitação:** explica os sistemas e indexadores, não publica a fórmula operacional da amortização extraordinária nem diz que a prestação corrente fica fixa para sempre.
- **CAIXA, página institucional do App Habitação CAIXA (captura de 1º jul. 2025).** A página lista **“Simulação e emissão de boleto de amortização com recursos próprios”** e afirma: **“Você pode reduzir o prazo ou o valor da prestação”**. URL original: [App Habitação CAIXA](https://www.caixa.gov.br/atendimento/aplicativos/habitacao/Paginas/default.aspx); [cópia auditável Wayback](https://web.archive.org/web/20250701030449id_/https://www.caixa.gov.br/atendimento/aplicativos/habitacao/Paginas/default.aspx). **O que prova:** existem as duas finalidades e uma simulação/boleto no canal oficial. **O que não prova:** qual quota/prestação o motor usa no contrato concreto, em que data recalcula, ou que “redução de prazo” significa prestação fixa em toda a vida do saldo.

### Outro banco — Bradesco

- **Banco Bradesco, Crédito Imobiliário, formulário oficial 4840-287E, versão 11/2025, p. 2.** No campo “O valor será usado para”, oferece separadamente: **“Amortizar o saldo devedor reduzindo o prazo”** e **“Amortizar o saldo devedor reduzindo o valor da parcela”** (além de quitar e abater parte das próximas 12 prestações). [PDF oficial](https://wspf.banco.bradesco/wsImoveis/Manager/Download/Documentos/4840287E.pdf). **O que prova:** outro agente financeiro operacionaliza escolhas explícitas de prazo versus parcela; confirma que as duas metas não são sinônimas. **Limitação:** formulário de uso de FGTS; não revela a fórmula do recálculo nem permite atribuir sua regra à CAIXA.
- **Bradesco, página de Crédito Imobiliário – Aquisição de Imóveis.** Citação curta: o produto informa comprometimento de renda de **“30% (SAC) ou 15% (TP)”** e permite usar FGTS para “amortizar ou liquidar o saldo devedor”. [Página oficial](https://banco.bradesco/html/classic/produtos-servicos/emprestimo-e-financiamento/imoveis/credito-imobiliario-aquisicao-de-imoveis.shtm). **Limitação:** evidencia oferta/terminologia do produto, não uma política universal de recálculo após aporte próprio.

## Fontes acadêmicas e planilha auditável

- **Tatiana Lemes Martin e Clarissa de Assis Olgin (ULBRA), 2019, _A Didactic Engineering for the development of the Amortization System theme using the HP 12C Calculator Emulator_, Acta Scientiae 21(6), pp. 173–191, DOI 10.17648/acta.scientiae.5507.** Na tabela de matemática financeira (p. 181), apresenta `A=PV/n`, `SD=saldo anterior−A` e `PMT=A+J`, e afirma que no SAC as amortizações do principal são constantes e as prestações decrescem em progressão aritmética. [DOI](https://doi.org/10.17648/acta.scientiae.5507) · [PDF](http://www.periodicos.ulbra.br/index.php/acta/article/download/5507/pdf). **Limitação:** artigo didático, não manual de banco; sustenta a matemática, não o procedimento CAIXA.
- **Maria Rachel Pinheiro Pessoa Pinto de Queiroz, Jonei Cerqueira Barbosa, Richard Noss e Celia Hoyles, 2018, _The Gap between the Financial Mathematics Expressed in Textbooks and that Practiced in Banks_, Acta Scientiae 20(2), pp. 96–118, DOI 10.17648/acta.scientiae.v20iss2id3816.** O estudo observa dois bancos (anonimizados) e registra que um deles oferece SAC e PRICE; resume a diferença: SAC com amortizações constantes/prestações decrescentes, PRICE com amortizações crescentes/prestações constantes. [DOI](https://doi.org/10.17648/acta.scientiae.v20iss2id3816) · [PDF](http://www.periodicos.ulbra.br/index.php/acta/article/download/3816/2977). **Limitação:** observação qualitativa de 2010–2011, sem identificar banco ou algoritmo; não é prova da política CAIXA hoje.

## Regra legal relevante

O **art. 52, §2º, do Código de Defesa do Consumidor (Lei 8.078/1990)** assegura: **“a liquidação antecipada do débito, total ou parcialmente, mediante redução proporcional dos juros e demais acréscimos”**. [Texto oficial na Câmara dos Deputados](https://www2.camara.leg.br/legin/fed/lei/1990/lei-8078-11-setembro-1990-365086-publicacaooriginal-1-pl.html). Isso sustenta o abatimento proporcional dos encargos futuros, mas não escolhe entre reduzir prazo, reduzir quota/prestação, ou manter total fixo; essas condições dependem do contrato/produto e da solicitação registrada.

## Checklist para provar o procedimento no contrato concreto

1. Guardar a simulação/boleto antes do pagamento e o demonstrativo depois: saldo imediatamente antes/depois, valor aplicado a principal, taxa e data-base.
2. Identificar se o documento chama “prestação” somente `A+J` ou “encargo” incluindo seguro/tarifa.
3. Comparar os próximos 3–6 boletos: amortização constante e total decrescente indicam SAC; total constante e amortização crescente indicam série de pagamento fixo.
4. Verificar se a CAIXA recalcula na data de aniversário, por atualização TR/IPCA, ou por outra data prevista no contrato.
5. Não usar esta conta para exigir resultado sem conferir arredondamentos, indexador, juros pró-rata, seguro e eventual parcela final.

### Riscos residuais

- As cartilhas CAIXA localizadas são versões de 2016/2022; a página do app foi auditada em cópia de 2025, e telas/regras podem ter mudado.
- Não há, nas fontes públicas localizadas, evidência suficiente para afirmar uma regra única da CAIXA sobre “manter a prestação corrente para sempre” após amortização extraordinária.
- TR/IPCA, seguros, tarifa, recálculo anual e arredondamento podem fazer o boleto real divergir substancialmente do exemplo sem indexador.
