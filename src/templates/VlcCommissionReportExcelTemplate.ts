import * as XLSX from "xlsx";

export const generateVlcCommissionReportExcel = (
  reportData: any[],
  branches: any[],
  fromDate: string,
  toDate: string
) => {
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = d.getDate();
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} - ${month} - ${year}`;
  };

  const data = [
    ["VLCC Commission Report"],
    [`Period: ${formatDate(fromDate)} to ${formatDate(toDate)}`],
    [],
    ["VLC ID", "Total Quantity (L)", "Type", "Rate (₹)", "Amount (₹)", "Travel Commission (₹)"],
    ...reportData.map((row) => {
      const branch = branches.find(b => b.branch_id.toString() === row.vlc_id);
      const amount = parseFloat(row.total_quantity) * parseFloat(row.rate);
      return [
        branch?.username || row.vlc_id,
        parseFloat(row.total_quantity).toFixed(2),
        row.type,
        parseFloat(row.rate).toFixed(2),
        amount.toFixed(2),
        row.travel_commission || (row.type === 'Commission' ? amount.toFixed(2) : parseFloat(row.rate).toFixed(2)),
      ];
    }),
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "VLC Commission Report");
  XLSX.writeFile(wb, `VLC_Commission_Report_${fromDate}_${toDate}.xlsx`);
};
