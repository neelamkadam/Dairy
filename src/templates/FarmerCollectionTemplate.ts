import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";

if (pdfMake.vfs === undefined) {
  pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts;
}

export const generateFarmerCollectionPDF = (
  reportData: any[],
  vlcName: string,
  dairyName: string,
  fromDate: string,
  toDate: string,
  shift: string,
  milkType: string
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
      { text: "Date", style: "tableHeader", alignment: "center" },
      { text: "Farmer Id", style: "tableHeader", alignment: "center" },
      { text: "Name", style: "tableHeader", alignment: "center" },
      { text: "Liter", style: "tableHeader", alignment: "center" },
      { text: "Kg", style: "tableHeader", alignment: "center" },
      { text: "Fat", style: "tableHeader", alignment: "center" },
      { text: "Snf", style: "tableHeader", alignment: "center" },
      { text: "Clr", style: "tableHeader", alignment: "center" },
      { text: "Milk Type", style: "tableHeader", alignment: "center" },
      { text: "Shift", style: "tableHeader", alignment: "center" },
      { text: "Rate", style: "tableHeader", alignment: "center" },
      { text: "Amount (₹)", style: "tableHeader", alignment: "center" },
    ],
    ...reportData.map((row) => [
      { text: new Date(row.created_at).toLocaleDateString('en-GB'), alignment: "center", fontSize: 8 },
      { text: String(row.farmer_code || ''), alignment: "center", fontSize: 8 },
      { text: String(row.farmer_name || ''), alignment: "center", fontSize: 8 },
      { text: String(row.quantity || ''), alignment: "center", fontSize: 8 },
      { text: (parseFloat(row.quantity) * 1.03).toFixed(2), alignment: "center", fontSize: 8 },
      { text: String(row.fat || ''), alignment: "center", fontSize: 8 },
      { text: String(row.snf || ''), alignment: "center", fontSize: 8 },
      { text: String(row.clr || ''), alignment: "center", fontSize: 8 },
      { text: String(row.type || ''), alignment: "center", fontSize: 8 },
      { text: String(row.shift || ''), alignment: "center", fontSize: 8 },
      { text: String(row.rate || ''), alignment: "center", fontSize: 8 },
      { text: `${row.amount}`, alignment: "center", fontSize: 8 },
    ]),
  ];

  const docDefinition: any = {
    pageOrientation: "landscape",
    pageMargins: [40, 60, 40, 60],
    content: [
      {
        columns: [
          { text: "", width: "*" },
          {
            stack: [
              { text: String(vlcName || ''), style: "branchName", alignment: "center" },
              { text: `Dairy: ${String(dairyName || '')}`, style: "userName", alignment: "center" },
            ],
            width: "auto",
          },
          { text: `Date: ${formatDate(new Date())}`, style: "rightInfo", alignment: "right", width: "*" },
        ],
        margin: [0, 0, 0, 20],
      },
      { text: "Farmer Collection Report", style: "header" },
      {
        text: `Period: ${fromDate} to ${toDate} | Shift: ${shift} | Milk Type: ${milkType}`,
        style: "subheader",
        margin: [0, 0, 0, 20],
      },
      {
        table: {
          headerRows: 1,
          widths: ["auto", "auto", "*", "auto", "auto", "auto", "auto", "auto", "auto", "auto", "auto", "auto"],
          body: tableBody,
        },
        layout: {
          fillColor: (rowIndex: number) => {
            if (rowIndex === 0) return "#d1d5db";
            return rowIndex % 2 === 0 ? "#f9fafb" : null;
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
        fontSize: 9,
      },
    },
  };

  pdfMake.createPdf(docDefinition).download(`Farmer_Collection_${vlcName}_${fromDate}_${toDate}.pdf`);
};
