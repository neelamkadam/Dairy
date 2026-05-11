import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";

if (pdfMake.vfs === undefined) {
  pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts;
}

export const generateVlcCommissionReportPDF = (
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

  const tableBody = [
    [
      { text: "VLC ID", style: "tableHeader", alignment: "left" },
      { text: "Total Quantity (L)", style: "tableHeader", alignment: "right" },
      { text: "Type", style: "tableHeader", alignment: "left" },
      { text: "Rate (₹)", style: "tableHeader", alignment: "right" },
      { text: "Amount (₹)", style: "tableHeader", alignment: "right" },
      { text: "Travel Commission (₹)", style: "tableHeader", alignment: "right" },
    ],
    ...reportData.map((row) => {
      const branch = branches.find(b => b.branch_id.toString() === row.vlc_id);
      const amount = parseFloat(row.total_quantity) * parseFloat(row.rate);
      return [
        { text: branch?.username || row.vlc_id, alignment: "left" },
        { text: parseFloat(row.total_quantity).toFixed(2), alignment: "right" },
        { text: row.type, alignment: "left" },
        { text: parseFloat(row.rate).toFixed(2), alignment: "right" },
        { text: amount.toFixed(2), alignment: "right", bold: true },
        { text: row.travel_commission || (row.type === 'Commission' ? amount.toFixed(2) : parseFloat(row.rate).toFixed(2)), alignment: "right" },
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
              { text: "VLCC Commission Report", style: "header", alignment: "center" },
            ],
            width: "auto",
          },
          { text: `Date: ${formatDate(new Date().toISOString())}`, style: "rightInfo", alignment: "right", width: "*" },
        ],
        margin: [0, 0, 0, 20],
      },
      {
        text: `Period: ${formatDate(fromDate)} to ${formatDate(toDate)}`,
        style: "subheader",
        margin: [0, 0, 0, 20],
      },
      {
        table: {
          headerRows: 1,
          widths: ["*", "auto", "*", "auto", "auto", "auto"],
          body: tableBody,
        },
        layout: {
          fillColor: (rowIndex: number) => {
            if (rowIndex === 0) return "#f9fafb";
            return rowIndex % 2 === 0 ? "#f9fafb" : null;
          },
        },
      },
    ],
    styles: {
      header: {
        fontSize: 18,
        bold: true,
      },
      subheader: {
        fontSize: 11,
        alignment: "center",
      },
      rightInfo: {
        fontSize: 10,
      },
      tableHeader: {
        bold: true,
        fontSize: 10,
        color: "#374151",
      },
    },
  };

  pdfMake.createPdf(docDefinition).download(`VLC_Commission_Report_${fromDate}_${toDate}.pdf`);
};
