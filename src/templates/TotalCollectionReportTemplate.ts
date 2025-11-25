import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";

if (pdfMake.vfs === undefined) {
  pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts;
}

export const generateTotalCollectionReportPDF = (
  vlcName: string,
  dairyName: string,
  startDate: string,
  startShift: string,
  endDate: string,
  endShift: string,
  milkType: string,
  summary: any
) => {
  const formatDate = (date: Date) => {
    const day = date.getDate();
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} - ${month} - ${year}`;
  };

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
              { text: `Dairy: ${dairyName}`, style: "userName", alignment: "center" },
            ],
            width: "auto",
          },
          { text: `Date: ${formatDate(new Date())}`, style: "rightInfo", alignment: "right", width: "*" },
        ],
        margin: [0, 0, 0, 20],
      },
      { text: "Total Collection Report", style: "header" },
      {
        text: `Period: ${startDate} (${startShift}) to ${endDate} (${endShift}) | Milk Type: ${milkType}`,
        style: "subheader",
        margin: [0, 0, 0, 30],
      },
      {
        table: {
          widths: ["*", "*"],
          body: [
            [
              { text: "Total Collection", style: "tableHeader", alignment: "center" },
              { text: "Average FAT", style: "tableHeader", alignment: "center" },
            ],
            [
              { text: `${parseFloat(summary.total_liters).toFixed(2)} L`, style: "tableValue", alignment: "center" },
              { text: `${parseFloat(summary.avg_fat).toFixed(2)}%`, style: "tableValue", alignment: "center" },
            ],
          ],
        },
        layout: {
          fillColor: (rowIndex: number) => {
            return rowIndex === 0 ? "#3b82f6" : "#f3f4f6";
          },
        },
        margin: [0, 0, 0, 20],
      },
      {
        table: {
          widths: ["*", "*"],
          body: [
            [
              { text: "Average SNF", style: "tableHeader", alignment: "center" },
              { text: "Total Amount", style: "tableHeader", alignment: "center" },
            ],
            [
              { text: `${parseFloat(summary.avg_snf).toFixed(2)}%`, style: "tableValue", alignment: "center" },
              { text: `₹${parseFloat(summary.total_amount).toFixed(2)}`, style: "tableValue", alignment: "center" },
            ],
          ],
        },
        layout: {
          fillColor: (rowIndex: number) => {
            return rowIndex === 0 ? "#3b82f6" : "#f3f4f6";
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
        fontSize: 12,
        color: "white",
        fillColor: "#3b82f6",
      },
      tableValue: {
        fontSize: 16,
        bold: true,
        margin: [0, 10, 0, 10],
      },
    },
  };

  pdfMake.createPdf(docDefinition).download(`Total_Collection_Report_${vlcName}_${startDate}_${endDate}.pdf`);
};
