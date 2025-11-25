import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";

if (pdfMake.vfs === undefined) {
  pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts;
}

export const generateShiftReportPDF = (
  reportData: any[],
  vlcName: string,
  Dairyname: string,
  date: string,
  shift: string,
  milkType: string,
  totals: any
) => {
  const formatDate = (date: Date) => {
    const day = date.getDate();
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} - ${month} - ${year}`;
  };

  const tableBody = [
    [
      { text: "Farmer ID", style: "tableHeader", alignment: "center" },
      { text: "Quantity", style: "tableHeader", alignment: "center" },
      { text: "Fat", style: "tableHeader", alignment: "center" },
      { text: "SNF", style: "tableHeader", alignment: "center" },
      { text: "Milk Type", style: "tableHeader", alignment: "center" },
      { text: "Rate", style: "tableHeader", alignment: "center" },
      { text: "Total Amount", style: "tableHeader", alignment: "center" },
    ],
    ...reportData.map((record) => [
      { text: record.code, alignment: "center" },
      { text: record.quantity, alignment: "center" },
      { text: record.fat, alignment: "center" },
      { text: record.snf, alignment: "center" },
      { text: record.type, alignment: "center" },
      { text: record.rate, alignment: "center" },
      { text: `₹${record.amount}`, alignment: "center" },
    ]),
  ];

  const docDefinition: any = {
    pageOrientation: "portrait",
    pageMargins: [40, 60, 40, 60],
    content: [
      {
        columns: [
          { text: "", width: "*" },
          {
            stack: [
              { text: vlcName, style: "branchName", alignment: "center" },
              { text: `Dairy: ${Dairyname}`, style: "userName", alignment: "center" },
            ],
            width: "auto",
          },
          { text: `Date: ${formatDate(new Date())}`, style: "rightInfo", alignment: "right", width: "*" },
        ],
        margin: [0, 0, 0, 20],
      },
      { text: "Daily Shift Report", style: "header" },
      {
        text: `Date: ${date} | Shift: ${shift} | Milk Type: ${milkType || 'All'}`,
        style: "subheader",
        margin: [0, 0, 0, 20],
      },
      {
        table: {
          headerRows: 1,
          widths: ["*", "*", "*", "*", "*", "*", "*"],
          body: tableBody,
        },
        layout: {
          fillColor: (rowIndex: number) => {
            if (rowIndex === 0) return "#e5e7eb";
            return rowIndex % 2 === 0 ? "#f9fafb" : null;
          },
        },
      },
      {
        text: "\nSummary Statistics",
        style: "summaryHeader",
        margin: [0, 20, 0, 10],
      },
      {
        table: {
          headerRows: 1,
          widths: ["*", "*", "*", "*"],
          body: [
            [
              { text: "Total Quantity (L)", style: "tableHeader", alignment: "center" },
              { text: "Average Fat (%)", style: "tableHeader", alignment: "center" },
              { text: "Average SNF (%)", style: "tableHeader", alignment: "center" },
              { text: "Total Amount (₹)", style: "tableHeader", alignment: "center" },
            ],
            [
              { text: totals.quantity, alignment: "center", bold: true },
              { text: totals.avgFat, alignment: "center", bold: true },
              { text: totals.avgSnf, alignment: "center", bold: true },
              { text: totals.totalAmount, alignment: "center", bold: true },
            ],
          ],
        },
        layout: {
          fillColor: (rowIndex: number) => {
            return rowIndex === 0 ? "#d1d5db" : "#f3f4f6";
          },
        },
      },
    ],
    styles: {
      header: {
        fontSize: 18,
        bold: true,
        alignment: "center",
        margin: [0, 0, 0, 10],
      },
      subheader: {
        fontSize: 11,
        alignment: "center",
      },
      branchName: {
        fontSize: 12,
        bold: true,
      },
      userName: {
        fontSize: 10,
      },
      rightInfo: {
        fontSize: 10,
      },
      tableHeader: {
        bold: true,
        fontSize: 10,
      },
      summaryHeader: {
        fontSize: 14,
        bold: true,
        alignment: "center",
      },
    },
  };

  pdfMake.createPdf(docDefinition).download(`Shift_Report_${vlcName}_${date}_${shift}.pdf`);
};
