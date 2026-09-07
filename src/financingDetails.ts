import type { FgtsMode } from "./fgtsPolicy.ts";
import type { Calculation, ScheduleRow } from "./financingProjection.ts";

export type FinancingDetailRow = {
  month: number;
  current: ScheduleRow;
  reference: ScheduleRow;
  eliminatedByFgts: boolean;
  earlyPayoff: boolean;
  partialPayoff: boolean;
};

export function buildFinancingDetailRows(
  current: Calculation,
  reference: Calculation,
  fgtsMode: FgtsMode,
): FinancingDetailRow[] {
  const hasFgts = current.fgtsAmortization > 0.005;
  const decorate = (row: ScheduleRow, referenceRow: ScheduleRow, index: number): FinancingDetailRow => {
    const earlyPayoff = hasFgts && index === current.schedule.length - 1 && current.schedule.length < reference.schedule.length;
    return {
      month: row.month,
      current: row,
      reference: referenceRow,
      eliminatedByFgts: false,
      earlyPayoff,
      partialPayoff: earlyPayoff && row.payment < referenceRow.payment - 0.005,
    };
  };

  if (!hasFgts || fgtsMode === "PRESTACAO") {
    return current.schedule.map((row, index) =>
      decorate(row, reference.schedule[index] ?? row, index),
    );
  }

  return reference.schedule.map((referenceRow, index) => {
    const row = current.schedule[index];
    if (row) return decorate(row, referenceRow, index);
    return {
      month: referenceRow.month,
      current: referenceRow,
      reference: referenceRow,
      eliminatedByFgts: true,
      earlyPayoff: false,
      partialPayoff: false,
    };
  });
}
