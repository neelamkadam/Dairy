import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";

if (pdfMake.vfs === undefined) {
  pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts;
}

export const generateVLCDifferenceReportPDF = (
  reportData: any[],
  vlcId: string,
  fromDate: string,
  toDate: string,
  shift: string,
  branchName: string
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
      { text: "Period", rowSpan: 2, style: "tableHeader", alignment: "center" },
      { text: "Shift", rowSpan: 2, style: "tableHeader", alignment: "center" },
      { text: "Type", rowSpan: 2, style: "tableHeader", alignment: "center" },
      { text: "VLC Collection Data", colSpan: 5, style: "tableHeaderBlue", alignment: "center" },
      {},
      {},
      {},
      {},
      { text: "Dairy Entry", colSpan: 5, style: "tableHeaderGreen", alignment: "center" },
      {},
      {},
      {},
      {},
      { text: "Difference (VLC - Dairy)", colSpan: 5, style: "tableHeaderPurple", alignment: "center" },
      {},
      {},
      {},
      {},
    ],
    [
      {},
      {},
      {},
      { text: "Weight", style: "subHeader", alignment: "center" },
      { text: "Fat", style: "subHeader", alignment: "center" },
      { text: "SNF", style: "subHeader", alignment: "center" },
      { text: "Rate", style: "subHeader", alignment: "center" },
      { text: "Amount", style: "subHeader", alignment: "center" },
      { text: "Weight", style: "subHeader", alignment: "center" },
      { text: "Fat", style: "subHeader", alignment: "center" },
      { text: "SNF", style: "subHeader", alignment: "center" },
      { text: "Rate", style: "subHeader", alignment: "center" },
      { text: "Amount", style: "subHeader", alignment: "center" },
      { text: "Weight", style: "subHeader", alignment: "center" },
      { text: "Fat", style: "subHeader", alignment: "center" },
      { text: "SNF", style: "subHeader", alignment: "center" },
      { text: "Rate", style: "subHeader", alignment: "center" },
      { text: "Amount", style: "subHeader", alignment: "center" },
    ],
    ...reportData.map((period) => [
      { text: period.period, alignment: "center" },
      { text: period.shift, alignment: "center" },
      { text: period.type, alignment: "center" },
      { text: period.vlc.total_weight, alignment: "center" },
      { text: period.vlc.avg_fat, alignment: "center" },
      { text: period.vlc.avg_snf, alignment: "center" },
      { text: period.vlc.avg_rate || '0.00', alignment: "center" },
      { text: period.vlc.total_amount, alignment: "center", bold: true },
      { text: period.dairy.total_weight, alignment: "center" },
      { text: period.dairy.avg_fat, alignment: "center" },
      { text: period.dairy.avg_snf, alignment: "center" },
      { text: period.dairy.avg_rate || '0.00', alignment: "center" },
      { text: period.dairy.total_amount, alignment: "center", bold: true },
      {
        text: period.difference.weight,
        alignment: "center",
        bold: true,
        color: parseFloat(period.difference.weight) < 0 ? "red" : parseFloat(period.difference.weight) > 0 ? "green" : "black",
      },
      {
        text: period.difference.fat,
        alignment: "center",
        bold: true,
        color: parseFloat(period.difference.fat) < 0 ? "red" : parseFloat(period.difference.fat) > 0 ? "green" : "black",
      },
      {
        text: period.difference.snf,
        alignment: "center",
        bold: true,
        color: parseFloat(period.difference.snf) < 0 ? "red" : parseFloat(period.difference.snf) > 0 ? "green" : "black",
      },
      {
        text: period.difference.rate || '0.00',
        alignment: "center",
        bold: true,
        color: parseFloat(period.difference.rate || '0') < 0 ? "red" : parseFloat(period.difference.rate || '0') > 0 ? "green" : "black",
      },
      {
        text: period.difference.amount,
        alignment: "center",
        bold: true,
        color: parseFloat(period.difference.amount) < 0 ? "red" : parseFloat(period.difference.amount) > 0 ? "green" : "black",
      },
    ]),
  ];

  const docDefinition: any = {
    pageOrientation: "landscape",
    pageMargins: [20, 40, 20, 40],
    content: [
      {
        columns: [
          { text: "", width: "*" },
          {
            stack: [
              { text: branchName, style: "branchName", alignment: "center" },
              { text: `Dairy: ${vlcId}`, style: "userName", alignment: "center" },
            ],
            width: "auto",
          },
          { text: `Date: ${formatDate(new Date())}`, style: "rightInfo", alignment: "right", width: "*" },
        ],
        margin: [0, 0, 0, 20],
      },
      { text: "VLCC Difference Report", style: "header" },
      {
        text: `Period: ${fromDate} to ${toDate} | Shift: ${shift}`,
        style: "subheader",
        margin: [0, 0, 0, 20],
      },
      {
        table: {
          headerRows: 2,
          widths: Array(18).fill("*"),
          body: tableBody,
        },
        layout: {
          fillColor: (rowIndex: number) => {
            if (rowIndex === 0 || rowIndex === 1) return "#e3f2fd";
            return rowIndex % 2 === 0 ? "#f9f9f9" : null;
          },
        },
      },
    ],
    styles: {
      header: {
        fontSize: 14,
        bold: true,
        alignment: "center",
        margin: [0, 0, 0, 10],
      },
      subheader: {
        fontSize: 9,
        alignment: "center",
      },
      branchName: {
        fontSize: 11,
        bold: true,
      },
      userName: {
        fontSize: 9,
      },
      rightInfo: {
        fontSize: 9,
      },
      tableHeader: {
        bold: true,
        fontSize: 8,
        fillColor: "#eeeeee",
      },
      tableHeaderBlue: {
        bold: true,
        fontSize: 8,
        color: "#1e40af",
      },
      tableHeaderGreen: {
        bold: true,
        fontSize: 8,
        color: "#15803d",
      },
      tableHeaderPurple: {
        bold: true,
        fontSize: 8,
        color: "#6b21a8",
      },
      subHeader: {
        fontSize: 7,
        bold: true,
      },
    },
    defaultStyle: {
      fontSize: 7,
    },
  };

  pdfMake.createPdf(docDefinition).download(`VLC_Difference_Report_${vlcId}_${fromDate}_${toDate}.pdf`);
};
