import pdfMake from "pdfmake/build/pdfmake";
import { PDF_FONT } from "@/utils/pdfMakeFonts";

export interface FarmerListSection {
  vlcName: string;
  dairyName: string;
  farmers: any[];
}

const formatDate = (date: Date) => {
  const day = date.getDate();
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} - ${month} - ${year}`;
};

const farmerTable = (farmers: any[]) => ({
  table: {
    headerRows: 1,
    widths: ["auto", "*", "auto", "auto", "*", "*", "auto", "auto"],
    body: [
      [
        { text: "Farmer ID", style: "tableHeader", alignment: "center" },
        { text: "Name", style: "tableHeader", alignment: "center" },
        { text: "Contact", style: "tableHeader", alignment: "center" },
        { text: "Milk Type", style: "tableHeader", alignment: "center" },
        { text: "Rate Chart", style: "tableHeader", alignment: "center" },
        { text: "Bank Name", style: "tableHeader", alignment: "center" },
        { text: "Account Number", style: "tableHeader", alignment: "center" },
        { text: "IFSC Code", style: "tableHeader", alignment: "center" },
      ],
      ...farmers.map((farmer) => [
        { text: farmer.username || '', alignment: "center", fontSize: 9 },
        { text: farmer.fullName || '', alignment: "center", fontSize: 9 },
        { text: farmer.mobile_number || '', alignment: "center", fontSize: 9 },
        { text: farmer.milkType || '', alignment: "center", fontSize: 9 },
        { text: farmer.rateChart || '', alignment: "center", fontSize: 9 },
        { text: farmer.bankName || '-', alignment: "center", fontSize: 9 },
        { text: farmer.accountNumber || '-', alignment: "center", fontSize: 9 },
        { text: farmer.ifscCode || '-', alignment: "center", fontSize: 9 },
      ]),
    ],
  },
  layout: {
    fillColor: (rowIndex: number) => {
      if (rowIndex === 0) return "#d1d5db";
      return rowIndex % 2 === 0 ? "#f9fafb" : null;
    },
  },
});

// One dairy's block: its header, count and farmer table. Every dairy after the
// first starts on a new page, so the dairies come one after another.
const sectionContent = (section: FarmerListSection, startOnNewPage: boolean, date: string) => [
  {
    columns: [
      { text: "", width: "*" },
      {
        stack: [
          { text: section.vlcName, style: "branchName", alignment: "center" },
          { text: `Dairy: ${section.dairyName}`, style: "userName", alignment: "center" },
        ],
        width: "auto",
      },
      { text: `Date: ${date}`, style: "rightInfo", alignment: "right", width: "*" },
    ],
    margin: [0, 0, 0, 20],
    ...(startOnNewPage ? { pageBreak: "before" } : {}),
  },
  { text: "Farmer List", style: "header" },
  { text: `Total Farmers: ${section.farmers.length}`, style: "subheader", margin: [0, 0, 0, 20] },
  section.farmers.length
    ? farmerTable(section.farmers)
    : { text: "No farmers registered for this dairy", alignment: "center", color: "#6b7280", margin: [0, 10, 0, 0] },
];

// With several dairies, a first page listing each one and its farmer count.
const summaryContent = (sections: FarmerListSection[], date: string) => {
  const total = sections.reduce((sum, s) => sum + s.farmers.length, 0);
  return [
    { text: `Date: ${date}`, style: "rightInfo", alignment: "right", margin: [0, 0, 0, 10] },
    { text: "Farmer List", style: "header" },
    { text: `${sections.length} dairies · Total Farmers: ${total}`, style: "subheader", margin: [0, 0, 0, 20] },
    {
      table: {
        headerRows: 1,
        widths: ["auto", "*", "*", "auto"],
        body: [
          [
            { text: "#", style: "tableHeader", alignment: "center" },
            { text: "Dairy", style: "tableHeader" },
            { text: "VLC", style: "tableHeader" },
            { text: "Farmers", style: "tableHeader", alignment: "right" },
          ],
          ...sections.map((s, i) => [
            { text: String(i + 1), alignment: "center", fontSize: 10 },
            { text: s.dairyName, fontSize: 10 },
            { text: s.vlcName, fontSize: 10 },
            { text: String(s.farmers.length), alignment: "right", fontSize: 10 },
          ]),
          [
            { text: "", fillColor: "#e2e8f0" },
            { text: "Total", bold: true, fillColor: "#e2e8f0" },
            { text: "", fillColor: "#e2e8f0" },
            { text: String(total), alignment: "right", bold: true, fillColor: "#e2e8f0" },
          ],
        ],
      },
    },
  ];
};

/** Farmer list for one or more dairies, one after another in a single PDF. */
export const generateFarmerListPDFForDairies = (sections: FarmerListSection[]) => {
  const date = formatDate(new Date());
  const multiple = sections.length > 1;

  const docDefinition: any = {
    defaultStyle: { font: PDF_FONT },
    pageOrientation: "landscape",
    pageMargins: [40, 60, 40, 60],
    content: [
      ...(multiple ? summaryContent(sections, date) : []),
      ...sections.flatMap((section, i) => sectionContent(section, multiple || i > 0, date)),
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

  const fileName = multiple
    ? `Farmer_List_${sections.length}_Dairies.pdf`
    : `Farmer_List_${sections[0]?.vlcName ?? ""}.pdf`;
  pdfMake.createPdf(docDefinition).download(fileName);
};

export const generateFarmerListPDF = (vlcName: string, dairyName: string, farmers: any[]) =>
  generateFarmerListPDFForDairies([{ vlcName, dairyName, farmers }]);
