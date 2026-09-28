import { Fragment } from "react";
import { format, parseISO } from "date-fns";
import {
  COMPARISON_METRICS,
  ComparisonTotals,
  DayComparison,
  formatFigure,
} from "@/utils/farmerDayComparison";

interface FarmerDayComparisonTableProps {
  comparison: DayComparison | null;
  dairyName: string;
  emptyText: string;
}

const dayLabel = (d: string) => format(parseISO(d), "dd/MM/yy");

// Yesterday | Today | Difference per farmer, grouped under each VLC.
const FarmerDayComparisonTable = ({ comparison, dairyName, emptyText }: FarmerDayComparisonTableProps) => {
  const cell = "border border-gray-300 px-2 py-1";
  const colCount = 3 + COMPARISON_METRICS.length * 3;

  const figureCells = (t: ComparisonTotals, bold = false) => (
    <>
      {COMPARISON_METRICS.map((m) => (
        <td key={`y-${m.key}`} className={`${cell} text-right`}>{formatFigure(t.yesterday[m.key], m.digits)}</td>
      ))}
      {COMPARISON_METRICS.map((m) => (
        <td key={`t-${m.key}`} className={`${cell} text-right bg-blue-50/40`}>{formatFigure(t.today[m.key], m.digits)}</td>
      ))}
      {COMPARISON_METRICS.map((m) => {
        const v = Number(t.diff[m.key].toFixed(m.digits));
        return (
          <td
            key={`d-${m.key}`}
            className={`${cell} text-right ${bold ? "font-bold" : "font-medium"} ${v < 0 ? "text-red-600" : v > 0 ? "text-emerald-700" : "text-gray-500"}`}
          >
            {formatFigure(t.diff[m.key], m.digits, true)}
          </td>
        );
      })}
    </>
  );

  return (
    <div className="overflow-x-auto mt-6 px-4 md:px-5 pb-6">
      <table className="table-auto border-collapse border border-gray-300 w-full text-sm whitespace-nowrap">
        <thead>
          <tr className="bg-white">
            <th colSpan={colCount} className={`${cell} text-center text-base font-bold`}>{dairyName}</th>
          </tr>
          <tr className="bg-gray-200">
            <th rowSpan={2} className={cell}>Sr No</th>
            <th rowSpan={2} className={cell}>Farmer ID</th>
            <th rowSpan={2} className={`${cell} text-left`}>Farmer Name</th>
            <th colSpan={COMPARISON_METRICS.length} className={cell}>
              Yesterday{comparison ? ` (${dayLabel(comparison.yesterdayDate)})` : ""}
            </th>
            <th colSpan={COMPARISON_METRICS.length} className={`${cell} bg-blue-100`}>
              Today{comparison ? ` (${dayLabel(comparison.todayDate)})` : ""}
            </th>
            <th colSpan={COMPARISON_METRICS.length} className={`${cell} bg-amber-100`}>Difference</th>
          </tr>
          <tr className="bg-gray-100">
            {[0, 1, 2].flatMap((block) =>
              COMPARISON_METRICS.map((m) => (
                <th key={`${block}-${m.key}`} className={`${cell} text-right`}>{m.label}</th>
              ))
            )}
          </tr>
        </thead>
        <tbody>
          {!comparison || comparison.groups.length === 0 ? (
            <tr>
              <td colSpan={colCount} className={`${cell} py-8 text-center text-gray-500`}>{emptyText}</td>
            </tr>
          ) : (
            <>
              {comparison.groups.map((g) => (
                <Fragment key={g.label}>
                  <tr className="bg-blue-50 font-semibold">
                    <td colSpan={2} className={cell}>VSP Name</td>
                    <td colSpan={colCount - 2} className={cell}>{g.label}</td>
                  </tr>
                  {g.farmers.map((f, i) => (
                    <tr key={f.farmerCode} className="hover:bg-gray-50">
                      <td className={`${cell} text-right`}>{i + 1}</td>
                      <td className={cell}>{f.farmerCode}</td>
                      <td className={cell}>{f.farmerName}</td>
                      {figureCells(f)}
                    </tr>
                  ))}
                  <tr className="bg-gray-100 font-semibold">
                    <td colSpan={3} className={cell}>{g.label}</td>
                    {figureCells(g.total, true)}
                  </tr>
                </Fragment>
              ))}
              <tr className="bg-gray-200 font-bold">
                <td colSpan={3} className={cell}>Total :</td>
                {figureCells(comparison.total, true)}
              </tr>
            </>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default FarmerDayComparisonTable;
