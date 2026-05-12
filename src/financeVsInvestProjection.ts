import { annualToMonthlyRate, priceInstallmentAt, sacInstallmentAt, type SacInput } from "./finance";
import { toNumber } from "./format";

export type AmortizationMethod = "SAC" | "PRICE";

export type FinanceVsInvestFields = {
  availableMoney: string;
  propertyPrice: string;
  financingAnnualRate: string;
  financingTermMonths: string;
  amortizationMethod: AmortizationMethod;
  monthlyRent: string;
  investmentAnnualReturn: string;
  propertyAppreciationAnnual: string;
  rentInflationAnnual: string;
  budgetGrowthAnnual: string;
  monthlyOwnershipCost: string;
  monthlyBudget: string;
  horizonYears: string;
};

export type FinanceVsInvestMonth = {
  month: number;
  budget: number;
  rent: number;
  mortgageCost: number;
  financeSurplus: number;
  investSurplus: number;
  financeNetWorth: number;
  investNetWorth: number;
  propertyValue: number;
  loanBalance: number;
  financeInvestmentBalance: number;
  investBalance: number;
  rentForcedBudget: boolean;
};

export type FinanceVsInvestProjection = {
  months: FinanceVsInvestMonth[];
  winner: "finance" | "invest" | "tie";
  finalFinanceNetWorth: number;
  finalInvestNetWorth: number;
  difference: number;
  differencePercent: number;
  breakEvenMonth: number | null;
};

export const defaultFinanceVsInvestFields: FinanceVsInvestFields = {
  availableMoney: "100000",
  propertyPrice: "500000",
  financingAnnualRate: "10",
  financingTermMonths: "360",
  amortizationMethod: "SAC",
  monthlyRent: "2500",
  investmentAnnualReturn: "10",
  propertyAppreciationAnnual: "4",
  rentInflationAnnual: "5",
  budgetGrowthAnnual: "0",
  monthlyOwnershipCost: "0",
  monthlyBudget: "",
  horizonYears: "10",
};

function parsePercent(raw: string) {
  return Number(raw) / 100;
}

function remainingLoanBalance(input: SacInput, method: AmortizationMethod, month: number) {
  const financed = Math.max(0, input.valorImovel - input.entrada);
  const term = Math.max(1, Math.trunc(input.prazoMeses));
  const paidMonths = Math.min(Math.max(0, month), term);

  if (paidMonths >= term) return 0;
  if (method === "SAC") return financed * (1 - paidMonths / term);

  const monthlyRate = annualToMonthlyRate(input.taxaAnual);
  if (monthlyRate === 0) return financed * (1 - paidMonths / term);

  const factorN = Math.pow(1 + monthlyRate, term);
  const factorK = Math.pow(1 + monthlyRate, paidMonths);
  return financed * (factorN - factorK) / (factorN - 1);
}

function mortgagePaymentAt(input: SacInput, method: AmortizationMethod, month: number) {
  if (month > input.prazoMeses) return 0;
  const installment = method === "SAC" ? sacInstallmentAt(input, month) : priceInstallmentAt(input, month);
  return installment.prestacao;
}

export function getInitialComparisonBudget(fields: FinanceVsInvestFields) {
  const propertyPrice = toNumber(fields.propertyPrice);
  const availableMoney = toNumber(fields.availableMoney);
  const financingAnnualRate = parsePercent(fields.financingAnnualRate);
  const financingTermMonths = Number(fields.financingTermMonths);
  const monthlyRent = toNumber(fields.monthlyRent);
  const monthlyOwnershipCost = toNumber(fields.monthlyOwnershipCost);

  if (
    !Number.isFinite(propertyPrice) ||
    !Number.isFinite(availableMoney) ||
    !Number.isFinite(financingAnnualRate) ||
    !Number.isFinite(financingTermMonths) ||
    !Number.isFinite(monthlyRent) ||
    !Number.isFinite(monthlyOwnershipCost)
  ) return NaN;

  const loanInput = {
    valorImovel: propertyPrice,
    entrada: availableMoney,
    taxaAnual: financingAnnualRate,
    prazoMeses: financingTermMonths,
  };

  return Math.max(mortgagePaymentAt(loanInput, fields.amortizationMethod, 1) + monthlyOwnershipCost, monthlyRent);
}

export function buildFinanceVsInvestProjection(fields: FinanceVsInvestFields): FinanceVsInvestProjection | null {
  const availableMoney = toNumber(fields.availableMoney);
  const propertyPrice = toNumber(fields.propertyPrice);
  const financingAnnualRate = parsePercent(fields.financingAnnualRate);
  const financingTermMonths = Number(fields.financingTermMonths);
  const monthlyRent = toNumber(fields.monthlyRent);
  const investmentAnnualReturn = parsePercent(fields.investmentAnnualReturn);
  const propertyAppreciationAnnual = parsePercent(fields.propertyAppreciationAnnual);
  const rentInflationAnnual = parsePercent(fields.rentInflationAnnual);
  const budgetGrowthAnnual = parsePercent(fields.budgetGrowthAnnual);
  const monthlyOwnershipCost = toNumber(fields.monthlyOwnershipCost);
  const horizonYears = Number(fields.horizonYears);

  if (
    !Number.isFinite(availableMoney) ||
    !Number.isFinite(propertyPrice) ||
    !Number.isFinite(financingAnnualRate) ||
    !Number.isFinite(financingTermMonths) ||
    !Number.isFinite(monthlyRent) ||
    !Number.isFinite(investmentAnnualReturn) ||
    !Number.isFinite(propertyAppreciationAnnual) ||
    !Number.isFinite(rentInflationAnnual) ||
    !Number.isFinite(budgetGrowthAnnual) ||
    !Number.isFinite(monthlyOwnershipCost) ||
    !Number.isFinite(horizonYears) ||
    availableMoney < 0 ||
    propertyPrice <= 0 ||
    availableMoney > propertyPrice ||
    financingTermMonths <= 0 ||
    horizonYears <= 0
  ) return null;

  const automaticBudget = getInitialComparisonBudget(fields);
  const manualBudget = toNumber(fields.monthlyBudget);
  let budget = Number.isFinite(manualBudget) && manualBudget > 0 ? manualBudget : automaticBudget;
  if (!Number.isFinite(budget)) return null;

  const loanInput = {
    valorImovel: propertyPrice,
    entrada: availableMoney,
    taxaAnual: financingAnnualRate,
    prazoMeses: Math.trunc(financingTermMonths),
  };

  const horizonMonths = Math.max(1, Math.trunc(horizonYears * 12));
  const investmentMonthlyRate = annualToMonthlyRate(investmentAnnualReturn);
  const propertyMonthlyRate = annualToMonthlyRate(propertyAppreciationAnnual);
  const rentMonthlyRate = annualToMonthlyRate(rentInflationAnnual);
  const budgetMonthlyRate = annualToMonthlyRate(budgetGrowthAnnual);

  let financeInvestmentBalance = 0;
  let investBalance = availableMoney;
  const months: FinanceVsInvestMonth[] = [];

  for (let month = 1; month <= horizonMonths; month += 1) {
    const rent = monthlyRent * Math.pow(1 + rentMonthlyRate, month - 1);
    const grownBudget = budget * (1 + budgetMonthlyRate);
    const rentForcedBudget = rent > grownBudget;
    budget = Math.max(grownBudget, rent);

    const mortgageCost = mortgagePaymentAt(loanInput, fields.amortizationMethod, month) + monthlyOwnershipCost;
    const financeSurplus = Math.max(0, budget - mortgageCost);
    const investSurplus = Math.max(0, budget - rent);

    financeInvestmentBalance = financeInvestmentBalance * (1 + investmentMonthlyRate) + financeSurplus;
    investBalance = investBalance * (1 + investmentMonthlyRate) + investSurplus;

    const propertyValue = propertyPrice * Math.pow(1 + propertyMonthlyRate, month);
    const loanBalance = remainingLoanBalance(loanInput, fields.amortizationMethod, month);
    const financeNetWorth = propertyValue - loanBalance + financeInvestmentBalance;

    months.push({
      month,
      budget,
      rent,
      mortgageCost,
      financeSurplus,
      investSurplus,
      financeNetWorth,
      investNetWorth: investBalance,
      propertyValue,
      loanBalance,
      financeInvestmentBalance,
      investBalance,
      rentForcedBudget,
    });
  }

  const finalMonth = months[months.length - 1];
  const difference = finalMonth.financeNetWorth - finalMonth.investNetWorth;
  const winner = Math.abs(difference) < 1 ? "tie" : difference > 0 ? "finance" : "invest";
  const base = winner === "finance" ? finalMonth.investNetWorth : finalMonth.financeNetWorth;
  const differencePercent = base > 0 ? Math.abs(difference) / base : 0;
  const breakEvenMonth = findStableBreakEven(months, winner);

  return {
    months,
    winner,
    finalFinanceNetWorth: finalMonth.financeNetWorth,
    finalInvestNetWorth: finalMonth.investNetWorth,
    difference,
    differencePercent,
    breakEvenMonth,
  };
}

function findStableBreakEven(months: FinanceVsInvestMonth[], winner: FinanceVsInvestProjection["winner"]) {
  if (winner === "tie") return null;

  for (const candidate of months) {
    const staysAhead = months
      .filter((month) => month.month >= candidate.month)
      .every((month) =>
        winner === "finance"
          ? month.financeNetWorth >= month.investNetWorth
          : month.investNetWorth >= month.financeNetWorth,
      );
    if (staysAhead) return candidate.month;
  }

  return null;
}
