import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";

if (pdfMake.vfs === undefined) {
  pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts;
}

export const generateRemainingBalanceReportPDF = (
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

  const tableBody = [
    [
      { text: "Farmer ID", style: "tableHeader", alignment: "left" },
      { text: "Farmer Name", style: "tableHeader", alignment: "left" },
      { text: "Advance", style: "tableHeader", alignment: "right" },
      { text: "Other 1", style: "tableHeader", alignment: "right" },
      { text: "Other 2", style: "tableHeader", alignment: "right" },
      { text: "Cattle Feed", style: "tableHeader", alignment: "right" },
      { text: "Total", style: "tableHeader", alignment: "right" },
    ],
    ...farmers.map((farmer) => {
      const total = parseFloat(farmer.advance_remaining || 0) + 
        parseFloat(farmer.other1_remaining || 0) + 
        parseFloat(farmer.other2_remaining || 0) + 
        parseFloat(farmer.cattlefeed_remaining || 0);
      return [
        { text: farmer.farmer_id, alignment: "left" },
        { text: farmer.farmer_name, alignment: "left" },
        { text: `₹${parseFloat(farmer.advance_remaining).toFixed(2)}`, alignment: "right" },
        { text: `₹${parseFloat(farmer.other1_remaining).toFixed(2)}`, alignment: "right" },
        { text: `₹${parseFloat(farmer.other2_remaining).toFixed(2)}`, alignment: "right" },
        { text: `₹${parseFloat(farmer.cattlefeed_remaining).toFixed(2)}`, alignment: "right" },
        { text: `₹${total.toFixed(2)}`, alignment: "right", bold: true },
      ];
    }),
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
              { text: `Date: ${formatDate(date)}`, style: "dateInfo", alignment: "center" },
            ],
            width: "auto",
          },
          { text: `Report Date: ${formatDate(new Date().toISOString())}`, style: "rightInfo", alignment: "right", width: "*" },
        ],
        margin: [0, 0, 0, 20],
      },
      { text: "Remaining Amount Report", style: "header" },
      {
        table: {
          headerRows: 1,
          widths: ["auto", "*", "auto", "auto", "auto", "auto", "auto"],
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
        columns: [
          { text: "Total Remaining Balance", style: "totalLabel", width: "*" },
          { text: `₹${totalBalance.toFixed(2)}`, style: "totalAmount", width: "auto" },
        ],
        margin: [0, 20, 0, 0],
      },
    ],
    styles: {
      header: {
        fontSize: 18,
        bold: true,
        alignment: "center",
        margin: [0, 0, 0, 20],
      },
      branchName: {
        fontSize: 12,
        bold: true,
      },
      dateInfo: {
        fontSize: 10,
      },
      rightInfo: {
        fontSize: 10,
      },
      tableHeader: {
        bold: true,
        fontSize: 10,
        color: "#374151",
      },
      totalLabel: {
        fontSize: 14,
        bold: true,
        alignment: "right",
      },
      totalAmount: {
        fontSize: 16,
        bold: true,
        color: "#059669",
      },
    },
  };

  pdfMake.createPdf(docDefinition).download(`Remaining_Balance_Report_${date}.pdf`);
};
