import { Fragment } from "react";
import {
  CollectionSummary,
  SUMMARY_COLUMNS,
  SummaryColumn,
  SummaryFarmerRow,
  SummaryTotals,
  formatSummaryValue,
} from "@/utils/farmerCollectionSummary";

interface FarmerCollectionSummaryTableProps {
  summary: CollectionSummary;
  dairyName: string;
  fromDate: string;
  toDate: string;
  emptyText: string;
  columns?: SummaryColumn[];
}

const FarmerCollectionSummaryTable = ({
  summary,
  dairyName,
  fromDate,
  toDate,
  emptyText,
  columns = SUMMARY_COLUMNS,
}: FarmerCollectionSummaryTableProps) => {
  const cell = "border border-gray-300 px-2 py-1";
  const colCount = 2 + columns.length;
  const values = (t: SummaryTotals | SummaryFarmerRow) =>
    columns.map((c) => (
      <td key={c.key} className={`${cell} ${c.text ? "text-center" : "text-right"}`}>{formatSummaryValue(t, c)}</td>
    ));

  return (
    <div className="overflow-x-auto mt-6 px-4 md:px-5 pb-6">
      <table className="table-auto border-collapse border border-gray-300 w-full text-sm whitespace-nowrap">
        <thead>
          <tr className="bg-white">
            <th colSpan={colCount} className={`${cell} text-center text-base font-bold`}>{dairyName}</th>
          </tr>
          <tr className="bg-white">
            <td className={cell}></td>
            <td className={`${cell} font-medium`}>From Date: {fromDate}</td>
            <td colSpan={columns.length} className={`${cell} font-medium`}>To Date: {toDate}</td>
          </tr>
          <tr className="bg-gray-200">
            <th className={cell}>Sr No</th>
            <th className={`${cell} text-left`}>Farmer Name</th>
            {columns.map((c) => <th key={c.key} className={cell}>{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {summary.groups.length === 0 ? (
            <tr>
              <td colSpan={colCount} className={`${cell} py-8 text-center text-gray-500`}>{emptyText}</td>
            </tr>
          ) : (
            <>
              {summary.groups.map((g) => (
                <Fragment key={g.label}>
                  <tr className="bg-blue-50 font-semibold">
                    <td className={cell}>VSP Name</td>
                    <td colSpan={colCount - 1} className={cell}>{g.label}</td>
                  </tr>
                  {g.farmers.map((f, i) => (
                    <tr key={f.farmerCode} className="hover:bg-gray-50">
                      <td className={`${cell} text-right`}>{i + 1}</td>
                      <td className={cell}>{f.farmerName}</td>
                      {values(f)}
                    </tr>
                  ))}
                  <tr className="bg-gray-100 font-semibold">
                    <td className={cell}></td>
                    <td className={cell}>{g.label}</td>
                    {values(g.total)}
                  </tr>
                </Fragment>
              ))}
              <tr className="bg-gray-200 font-bold">
                <td className={cell}></td>
                <td className={cell}>Total :</td>
                {values(summary.total)}
              </tr>
            </>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default FarmerCollectionSummaryTable;
