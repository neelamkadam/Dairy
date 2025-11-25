import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";

if (pdfMake.vfs === undefined) {
  pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts;
}

export const generateFarmerListPDF = (
  vlcName: string,
  dairyName: string,
  farmers: any[]
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
      { text: "Name", style: "tableHeader", alignment: "center" },
      { text: "Contact", style: "tableHeader", alignment: "center" },
      { text: "Milk Type", style: "tableHeader", alignment: "center" },
      { text: "Rate Chart", style: "tableHeader", alignment: "center" },
    ],
    ...farmers.map((farmer) => [
      { text: farmer.username || '', alignment: "center", fontSize: 9 },
      { text: farmer.fullName || '', alignment: "center", fontSize: 9 },
      { text: farmer.mobile_number || '', alignment: "center", fontSize: 9 },
      { text: farmer.milkType || '', alignment: "center", fontSize: 9 },
      { text: farmer.rateChart || '', alignment: "center", fontSize: 9 },
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
              { text: `Dairy: ${dairyName}`, style: "userName", alignment: "center" },
            ],
            width: "auto",
          },
          { text: `Date: ${formatDate(new Date())}`, style: "rightInfo", alignment: "right", width: "*" },
        ],
        margin: [0, 0, 0, 20],
      },
      { text: "Farmer List", style: "header" },
      { text: `Total Farmers: ${farmers.length}`, style: "subheader", margin: [0, 0, 0, 20] },
      {
        table: {
          headerRows: 1,
          widths: ["*", "*", "*", "*", "*"],
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
        fontSize: 10,
      },
    },
  };

  pdfMake.createPdf(docDefinition).download(`Farmer_List_${vlcName}.pdf`);
};
