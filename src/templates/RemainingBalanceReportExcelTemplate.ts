import * as XLSX from "xlsx";

export const generateRemainingBalanceReportExcel = (
  farmers: any[],
  vlcName: string,
  date: string,
  totalBalance: number
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
    [vlcName],
    [`Date: ${formatDate(date)}`],
    ["Remaining Amount Report"],
    [],
    ["Farmer ID", "Farmer Name", "Advance", "Other 1", "Other 2", "Cattle Feed", "Total"],
    ...farmers.map((farmer) => {
      const total = parseFloat(farmer.advance_remaining || 0) + 
        parseFloat(farmer.other1_remaining || 0) + 
        parseFloat(farmer.other2_remaining || 0) + 
        parseFloat(farmer.cattlefeed_remaining || 0);
      return [
        farmer.farmer_id,
        farmer.farmer_name,
        parseFloat(farmer.advance_remaining).toFixed(2),
        parseFloat(farmer.other1_remaining).toFixed(2),
        parseFloat(farmer.other2_remaining).toFixed(2),
        parseFloat(farmer.cattlefeed_remaining).toFixed(2),
        total.toFixed(2),
      ];
    }),
    [],
    ["", "", "", "", "", "Total Remaining Balance", totalBalance.toFixed(2)],
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Remaining Balance Report");
  XLSX.writeFile(wb, `Remaining_Balance_Report_${date}.xlsx`);
};
