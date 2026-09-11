# Investir com slider e Foco

## Ajuste dos valores

Quatro botões mostram saldo inicial, aporte mensal, taxa anual e período. Tocar em um botão seleciona o campo, sem alterar seu valor nem abrir o teclado. Há uma única barra e um único input de apoio para o campo selecionado, como em Financiar. O slider é o controle principal.

Os atalhos de histórico e Usar Entrada foram removidos. O investimento é independente do financiamento. A memória antiga dos valores continua disponível, mas os botões de histórico não são renderizados.

| Campo | Faixa inicial | Passo da barra | Limites aceitos |
| --- | --- | --- | --- |
| Saldo inicial | R$ 0 a R$ 1 milhão | R$ 1 mil | 0 a Number.MAX_SAFE_INTEGER |
| Aporte mensal | R$ 0 a R$ 20 mil | R$ 100 | 0 a Number.MAX_SAFE_INTEGER |
| Taxa anual efetiva | 0% a 20% | 0,1 ponto percentual | -99,9% a 100% |
| Período | 0 a 480 meses, ou 0 a 40 anos | 1 mês ou 1 ano, conforme a unidade | 0 a 1.200 meses inteiros, equivalentes a 100 anos |

Digitar aceita reais em formato brasileiro ou no formato americano da memória anterior, taxa com vírgula e expressões aritméticas simples. Enter ou sair do campo confirma a formatação. Digitação não arredonda o valor ao passo do slider. Valores inválidos não viram zero: o painel pede correção, suspende o cálculo e preserva os padrões salvos.

## Período em meses ou anos

Ao selecionar Período, os botões Meses e Anos mudam a unidade do input, do botão seletor, dos limites da barra e da edição de Minha faixa. A troca não muda a duração, o cálculo ou a faixa real. Os cálculos, as preferências de valor/faixa e a exportação continuam em meses inteiros.

Em meses, a barra avança de um em um mês; em anos, de um em um ano. A digitação em anos permite durações equivalentes a meses inteiros: 2,5 anos salva 30 meses. Uma fração que não equivale a meses inteiros, como 0,1 ano, é rejeitada com aviso e mantém a duração anterior. Uma duração de 25 meses pode ser exibida em anos sem perdê-la por arredondamento; apenas trocar unidade não confirma uma nova duração. A equivalência exata em meses aparece junto ao input em anos.

`muda.investment.periodUnit.v1` lembra a unidade visual. Sem preferência válida, começa em meses. A edição dos limites em anos converte para meses antes da validação e da gravação. Ler, trocar unidade ou formatar não converte a unidade dos dados armazenados.

## Faixas

A implementação reutiliza `FinancingRangeControl`, `FinancingRangePreferences`, `FinancingValuePreference`, `financingGesture` e `financingRangeDrop`. As APIs visuais recebem um resultado de sucesso/erro independente do formato de armazenamento. A política do financiamento permanece a mesma.

- Foco recorta somente a faixa, sem mudar o valor. O gesto tem prévia, cancelamento, arraste por ponteiro e alternativa por teclado.
- Perto do puxador, saldo inicial usa R$ 100 mil de cada lado; aporte mensal usa R$ 1 mil de cada lado. O campo declara `focusHalfWidth`; a omissão preserva os R$ 100 mil do financiamento.
- Taxa e meses usam recorte direcional, sem janela monetária.
- Soltar fora à esquerda restaura o mínimo do campo; fora à direita dobra o máximo, respeitando os limites.
- Salvar faixa atual guarda somente os limites daquele campo.
- Resetar faixa aplica o padrão salvo ou a faixa inicial do aplicativo. A faixa se expande quando necessário para incluir o valor atual, sem regravar a preferência.
- Minha faixa permite editar limites e restaurar o padrão do aplicativo. Salvar limites não altera a barra em uso; Resetar faixa os aplica.

Os valores, o campo selecionado e as faixas temporárias permanecem ao trocar de aba, pois pertencem ao `MemoryProvider`, não ao componente desmontado.

## Memória

- `muda.investment.valuePreferences.v1` guarda os valores padrão, somente após comando explícito. Mantém centavos, precisão da taxa e meses sem convertê-los em anos.
- `muda.investment.rangePreferences.v1` guarda as faixas padrão, separadas dos valores e das preferências de Financiar.
- A memória já existente `muda:fields` continua lembrando os últimos valores. Na abertura da aplicação, um padrão explícito de investimento tem precedência sobre o último valor daquele campo. Sem padrão explícito, o último valor é mantido; na ausência dos dois, vale o padrão original do aplicativo.
- Remover um valor padrão não muda o valor atual; devolve à memória dos últimos valores a escolha da próxima abertura.
- Mudar um valor ou explorar uma faixa não sobrescreve seus padrões explícitos. Salvar um campo mescla as preferências mais recentes dos outros campos.
- Erros de leitura usam os padrões disponíveis. Erros ao salvar são exibidos e não substituem a preferência anterior. A memória legada não derruba a interface se o armazenamento estiver bloqueado.

## Aba inicial

`environmentPreference.ts` guarda a aba escolhida em `muda.workspace.environment.v1`. As opções aceitas são `financing`, `investment` e `comparison`. A aplicação abre diretamente na aba lembrada, sem passar primeiro pela tela de financiamento.

Ausência, conteúdo inválido, versão desconhecida ou armazenamento bloqueado usam Financiar como fallback. A troca de aba ocorre mesmo se salvar falhar; nesse caso, aparece um aviso. Ler a preferência não grava dados. A aba lembrada não altera as premissas exportadas nem os padrões de valor/faixa.

## Verificação

Os testes cobrem parsing, precisão, zero, taxas negativas, limites, Foco monetário por campo, passos do teclado, faixas que incluem o valor atual, isolamento de armazenamento, precedência sobre memória legada, mesclagem entre campos, corrupção e falhas de armazenamento. A renderização verifica quatro botões seletores, somente um input e um slider, ausência de atalhos/Usar Entrada, valor padrão e faixa salvos, além do estado inválido. A conversão de período cobre ida e volta para todas as durações de 0 a 1.200 meses, anos fracionários e isolamento da preferência de unidade.

Validação da entrega: 196 testes, TypeScript e build aprovados. No Chrome, foram conferidos botões seletores, arraste de Foco, teclado do slider/Foco, recorte e reset sem alterar o valor, salvamento independente de valor e faixa, erro de armazenamento sem perda do padrão, troca de abas e restauração após recarregar nas três abas. Em período, 24 meses virou 2 anos sem alterar o resultado; 2,5 anos salvou 30 meses; limites de 1 a 5 anos salvaram 12 a 60 meses. As larguras de 320, 390 e 1440 px não apresentaram transbordamento horizontal.
