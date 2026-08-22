# Muda Financial Planning

Muda is a personal-finance planning context for exploring housing and investment choices. It models standalone investment and property-financing projections, then compares financing a property with investing while renting; its outputs are scenario results, not financial advice.

## Language

### People, choices, and assumptions

**Decision-maker**:
The person or household using the model to explore a financial choice.
_Avoid_: Investor, customer, user

**Scenario**:
A coherent housing-and-investment path evaluated over time under a fixed set of assumptions.
_Avoid_: Plan, recommendation

**Assumption**:
A user-supplied economic condition used to construct a scenario, such as a rate, cost, growth expectation, or time horizon.
_Avoid_: Fact, forecast

**Housing strategy**:
The strategy being compared for the household’s housing need: **Financiar** or **Investir**.
_Avoid_: Option, alternative

**Financiar**:
The housing strategy in which available money becomes a property down payment, the remaining property price is financed, and the household builds property equity while paying the debt and ownership costs.
_Avoid_: Buy, purchase, mortgage

**Investir**:
The housing strategy in which available money remains invested, the household pays rent, and the monthly amount left after rent is invested.
_Avoid_: Rent, save

### Housing and financing

**Imóvel**:
The property acquired in the Financiar strategy, with a current value that may change through appreciation.
_Avoid_: Asset, house

**Valor do imóvel**:
The assumed property price at the start of a scenario.
_Avoid_: Property value, purchase price

**Entrada**:
Cash committed upfront to the property; it reduces the amount that must be financed.
_Avoid_: Initial investment, deposit

**Valor financiado**:
The property price remaining after the Entrada and represented by the financing debt.
_Avoid_: Loan amount, principal paid

**Saldo devedor**:
The financing debt still outstanding at a point in time after scheduled amortization.
_Avoid_: Remaining loan, balance

**Prazo**:
The number of monthly installments over which the financing debt is scheduled to be repaid.
_Avoid_: Duration, horizon

**Prestação**:
A scheduled monthly financing payment composed of amortization and interest.
_Avoid_: Mortgage payment, installment amount

**Juros do financiamento**:
The financing charge for a month, calculated from the outstanding debt and the financing rate.
_Avoid_: Return, investment yield

**Amortização**:
The portion of a Prestação that reduces the Saldo devedor.
_Avoid_: Principal payment

**SAC**:
The amortization method with a constant amortization amount and decreasing Prestação as interest falls with the debt.
_Avoid_: Decreasing-payment loan

**PRICE**:
The amortization method with a constant Prestação and changing portions of interest and Amortização over time.
_Avoid_: Fixed-interest loan

**Custo de posse**:
Recurring monthly costs of owning the Imóvel beyond the Prestação, such as condominium fees, property tax, insurance, or maintenance.
_Avoid_: Property price, financing cost

**Aluguel**:
The recurring monthly housing cost in the Investir strategy, subject to the assumed rent inflation.
_Avoid_: Housing cost, lease

**Orçamento mensal**:
The monthly amount available for housing and investing the resulting surplus. When no explicit amount is supplied, the model anchors it to the larger of the initial rent and the initial financing payment plus Custo de posse.
_Avoid_: Income, cash flow

**Excedente mensal**:
The non-negative part of the Orçamento mensal left after the scenario’s housing cost; it becomes an investment contribution for that scenario.
_Avoid_: Profit, savings

### Investment

**Saldo inicial**:
The amount already invested at the start of a standalone investment projection or at the start of the Investir strategy.
_Avoid_: Entrada

**Aporte mensal**:
A recurring amount added to an investment projection at the end of each month.
_Avoid_: Monthly investment, payment

**Aportes acumulados**:
The sum of recurring Aporte mensal amounts over the projection period, excluding Saldo inicial.
_Avoid_: Total investido

**Saldo investido**:
The value of invested money at a point in time after growth and contributions.
_Avoid_: Savings, cash balance

**Taxa de investimento**:
The assumed effective annual return applied to Saldo inicial and later investment contributions.
_Avoid_: Interest on financing, guaranteed return

**Rendimento**:
The increase in Saldo investido attributable to investment growth after subtracting Saldo inicial and recurring contributions.
_Avoid_: Total return, profit

**Valorização do imóvel**:
The assumed effective annual growth in the Imóvel’s market value in the Financiar strategy.
_Avoid_: Investment return

**Inflação do aluguel**:
The assumed effective annual growth in Aluguel over the scenario.
_Avoid_: General inflation

**Crescimento do orçamento**:
The assumed effective annual growth in Orçamento mensal before the rent constraint is applied.
_Avoid_: Income growth

### Projection and comparison

**Projeção**:
A month-by-month estimate of balances, costs, and values produced from one Scenario’s assumptions.
_Avoid_: Prediction, guarantee

**Horizonte**:
The number of months or years over which a Scenario is evaluated and compared.
_Avoid_: Prazo

**Patrimônio**:
The value attributable to the household at a point in time after accounting for the strategy’s assets and debt. In Financiar, it is property value minus Saldo devedor plus the invested surplus; in Investir, it is the invested balance.
_Avoid_: Saldo, cash

**Resultado da comparação**:
The relative outcome of Financiar and Investir at the end of the Horizonte, based on their projected Patrimônio.
_Avoid_: Recomendação, advice, decision

**Cenário vencedor**:
The strategy with the greater projected Patrimônio at the end of the Horizonte; a tie means the model finds no meaningful difference under the chosen assumptions.
_Avoid_: Best investment, correct choice

**Cruzamento**:
A point where two plotted measures meet or pass one another during a Projeção.
_Avoid_: Ponto de virada

**Ponto de virada**:
The first month from which the Cenário vencedor remains at least as far ahead as the other strategy through the rest of the Horizonte. It can occur later than a temporary Cruzamento, or not occur at all.
_Avoid_: Break-even, first crossing

**Total pago**:
The sum of scheduled financing Prestação amounts across the full Prazo. It excludes Entrada and Custo de posse.
_Avoid_: Total acquisition cost, total housing cost
