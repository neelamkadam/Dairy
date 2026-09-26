import pdfMake from "pdfmake/build/pdfmake";
import { PDF_FONT } from "@/utils/pdfMakeFonts";

export interface FarmerListSection {
  vlcName: string;
  dairyName?: string;
  farmers: any[];
}

const COLUMNS = ["Farmer ID", "Name", "Contact", "Milk Type", "Rate Chart", "Bank Name", "Account Number", "IFSC Code"];

const formatDate = (date: Date) => {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${date.getDate()} - ${months[date.getMonth()]} - ${date.getFullYear()}`;
};

// A row spanning the whole table (dairy heading, "no farmers" note).
const spanRow = (cell: Record<string, unknown>) => [
  { ...cell, colSpan: COLUMNS.length },
  ...Array(COLUMNS.length - 1).fill({}),
];

/**
 * Farmer list for one or more dairies as one continuous table, laid out like
 * the on-screen list: each dairy's heading row followed by its farmers. The
 * column header repeats on every page and rows never split across pages.
 */
export const generateFarmerListPDFForDairies = (sections: FarmerListSection[]) => {
  const date = formatDate(new Date());
  const total = sections.reduce((sum, s) => sum + s.farmers.length, 0);

  const body: any[][] = [COLUMNS.map((text) => ({ text, style: "tableHeader", alignment: "center" }))];

  sections.forEach((section) => {
    body.push(spanRow({
      text: [
        { text: section.vlcName, bold: true },
        { text: `   (${section.farmers.length} Farmers)`, color: "#1d4ed8" },
      ],
      fontSize: 10,
      color: "#1e3a8a",
      fillColor: "#dbeafe",
    }));

    if (!section.farmers.length) {
      body.push(spanRow({ text: "No farmers registered for this dairy", alignment: "center", color: "#6b7280", fontSize: 9 }));
      return;
    }
    section.farmers.forEach((farmer) =>
      body.push([
        farmer.username || "",
        farmer.fullName || "",
        farmer.mobile_number || "",
        farmer.milkType || "",
        farmer.rateChart || "",
        farmer.bankName || "-",
        farmer.accountNumber || "-",
        farmer.ifscCode || "-",
      ].map((text, i) => ({ text: String(text), fontSize: 9, alignment: i === 1 ? "left" : "center" })))
    );
  });

  body.push(spanRow({ text: `Total Farmers: ${total}`, bold: true, alignment: "right", fontSize: 10, fillColor: "#e5e7eb" }));

  const docDefinition: any = {
    defaultStyle: { font: PDF_FONT },
    pageOrientation: "landscape",
    pageSize: "A4",
    pageMargins: [30, 40, 30, 40],
    content: [
      {
        columns: [
          { text: "", width: "*" },
          { text: "Farmer List", style: "header", width: "auto" },
          { text: `Date: ${date}`, style: "rightInfo", alignment: "right", width: "*" },
        ],
      },
      {
        text: sections.length > 1 ? `${sections.length} dairies · Total Farmers: ${total}` : `Total Farmers: ${total}`,
        style: "subheader",
        margin: [0, 0, 0, 12],
      },
      {
        table: {
          headerRows: 1,
          dontBreakRows: true,
          widths: ["auto", "*", "auto", "auto", "*", "*", "auto", "auto"],
          body,
        },
        layout: {
          fillColor: (rowIndex: number) => (rowIndex === 0 ? "#d1d5db" : null),
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => "#9ca3af",
          vLineColor: () => "#9ca3af",
        },
      },
    ],
    footer: (currentPage: number, pageCount: number) => ({
      text: `Page ${currentPage} of ${pageCount}`,
      alignment: "center",
      fontSize: 8,
      color: "#6b7280",
      margin: [0, 10, 0, 0],
    }),
    styles: {
      header: { fontSize: 18, bold: true, alignment: "center" },
      subheader: { fontSize: 11, alignment: "center" },
      rightInfo: { fontSize: 10 },
      tableHeader: { bold: true, fontSize: 10 },
    },
  };

  const fileName = sections.length > 1
    ? `Farmer_List_${sections.length}_Dairies.pdf`
    : `Farmer_List_${sections[0]?.vlcName ?? ""}.pdf`;
  pdfMake.createPdf(docDefinition).download(fileName.replace(/[\\/:*?"<>|]/g, "-"));
};

export const generateFarmerListPDF = (vlcName: string, dairyName: string, farmers: any[]) =>
  generateFarmerListPDFForDairies([{ vlcName, dairyName, farmers }]);
